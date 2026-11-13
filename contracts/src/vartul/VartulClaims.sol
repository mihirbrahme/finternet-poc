// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IRecoveryLots, IVartulRegistry, LotState, LotView, Roles} from "./VartulTypes.sol";

/// @title VartulClaims
/// @notice Exclusive claim registry. Each claim is a non-transferable statement that a holder may
/// make about verified grams of a specific lot. For every lot and claim type, allocations can
/// never exceed the verified eligible grams (no double counting). Cross-type coexistence is
/// governed by a published compatibility policy. Claim status is derived live from lot state,
/// so a revoked attestation upstream is visible on every claim downstream.
contract VartulClaims {
    uint8 public constant FUNDED_RECOVERY = 1;
    uint8 public constant EPR_READY_SUPPLY = 2;
    uint8 public constant OBP_READY_RECOVERY = 3;
    uint8 public constant PROCESSING_CONFIRMED = 4;
    uint8 private constant MAX_TYPE = 4;

    uint8 public constant ALLOWED = 0;
    uint8 public constant DISCLOSE = 1;
    uint8 public constant EXCLUDE = 2;

    enum Status { NONE, VALID, CONTESTED, REVOKED }

    struct Claim {
        uint8 claimType;
        address holder;
        uint256 lotId;
        uint256 grams;
        bytes32 programmeId;
        uint64 issuedAt;
        bool revoked;
    }

    IVartulRegistry public immutable registry;
    IRecoveryLots public immutable lots;
    mapping(address => bool) public allocators;
    mapping(uint8 => mapping(uint8 => uint8)) public compatibility;
    mapping(uint256 => mapping(uint8 => uint256)) public allocatedGrams;
    mapping(uint256 => uint256[]) private lotClaims;
    mapping(address => uint256[]) private holderClaims;
    Claim[] private claims;

    event AllocatorSet(address indexed allocator, bool allowed);
    event CompatibilitySet(uint8 indexed a, uint8 indexed b, uint8 rule);
    event ClaimAllocated(
        uint256 indexed claimId, uint256 indexed lotId, address indexed holder, uint8 claimType, uint256 grams,
        bytes32 programmeId
    );
    event ClaimRevoked(uint256 indexed claimId, bytes32 reason);

    error Denied();
    error InvalidInput();
    error OverAllocated();
    error NotFinal();
    error Incompatible(uint8 existing, uint8 requested);

    constructor(address registryAddress, address lotsAddress) {
        if (registryAddress == address(0) || lotsAddress == address(0)) revert InvalidInput();
        registry = IVartulRegistry(registryAddress);
        lots = IRecoveryLots(lotsAddress);
        // Published default policy. A funded-recovery claim and an EPR supply claim on the same
        // grams may coexist only with disclosure; an OBP-ready claim excludes an EPR claim.
        _setRule(FUNDED_RECOVERY, EPR_READY_SUPPLY, DISCLOSE);
        _setRule(FUNDED_RECOVERY, OBP_READY_RECOVERY, DISCLOSE);
        _setRule(EPR_READY_SUPPLY, OBP_READY_RECOVERY, EXCLUDE);
        claims.push(); // claim ids start at 1
    }

    modifier onlyFacilitator() {
        if (!registry.hasRole(msg.sender, Roles.FACILITATOR)) revert Denied();
        _;
    }

    function setAllocator(address allocator, bool allowed) external onlyFacilitator {
        allocators[allocator] = allowed;
        emit AllocatorSet(allocator, allowed);
    }

    function setCompatibility(uint8 a, uint8 b, uint8 rule) external onlyFacilitator {
        if (a == 0 || b == 0 || a > MAX_TYPE || b > MAX_TYPE || a == b || rule > EXCLUDE) revert InvalidInput();
        _setRule(a, b, rule);
    }

    /// @notice Allocation by an authorised settlement contract (programme escrow or material sale).
    function allocate(uint8 claimType, address holder, uint256 lotId, uint256 grams, bytes32 programmeId)
        external
        returns (uint256)
    {
        if (!allocators[msg.sender]) revert Denied();
        return _allocate(claimType, holder, lotId, grams, programmeId);
    }

    /// @notice An accredited assessor marks settled grams as ready for an offset/biodiversity-style registry.
    function issueObpReady(address holder, uint256 lotId, uint256 grams) external returns (uint256) {
        if (!registry.hasRole(msg.sender, Roles.ASSESSOR)) revert Denied();
        LotView memory lot = lots.getLot(lotId);
        if (lot.state != LotState.SETTLED) revert InvalidInput();
        return _allocate(OBP_READY_RECOVERY, holder, lotId, grams, lot.programmeId);
    }

    /// @notice The receiving facility confirms processed grams after recording processing.
    function issueProcessingConfirmed(address holder, uint256 lotId) external returns (uint256) {
        if (!registry.hasRole(msg.sender, Roles.FACILITY)) revert Denied();
        LotView memory lot = lots.getLot(lotId);
        if (lot.processedGrams == 0) revert InvalidInput();
        if (registry.participantOf(msg.sender) != registry.participantOf(lot.receiver)) revert Denied();
        uint256 grams = lot.processedGrams < lot.eligibleGrams ? lot.processedGrams : lot.eligibleGrams;
        return _allocate(PROCESSING_CONFIRMED, holder, lotId, grams, lot.programmeId);
    }

    function revoke(uint256 claimId, bytes32 reason) external onlyFacilitator {
        if (claimId == 0 || claimId >= claims.length || claims[claimId].revoked) revert InvalidInput();
        claims[claimId].revoked = true;
        emit ClaimRevoked(claimId, reason);
    }

    // ----- Views -----

    function statusOf(uint256 claimId) public view returns (Status) {
        if (claimId == 0 || claimId >= claims.length) return Status.NONE;
        Claim storage c = claims[claimId];
        if (c.revoked) return Status.REVOKED;
        LotState s = lots.getLot(c.lotId).state;
        if (s == LotState.VOIDED || s == LotState.REJECTED) return Status.REVOKED;
        if (s == LotState.UNDER_REVIEW || s == LotState.CHALLENGED) return Status.CONTESTED;
        return Status.VALID;
    }

    /// @notice Other claim types on the same lot that must be disclosed alongside this claim.
    function disclosuresOf(uint256 claimId) external view returns (uint8[] memory types) {
        Claim storage c = claims[claimId];
        uint256 present = _typesOnLot(c.lotId);
        uint8[] memory buffer = new uint8[](MAX_TYPE);
        uint256 n;
        for (uint8 t = 1; t <= MAX_TYPE; t++) {
            if (t != c.claimType && (present & (1 << t)) != 0 && compatibility[c.claimType][t] == DISCLOSE) {
                buffer[n++] = t;
            }
        }
        types = new uint8[](n);
        for (uint256 i = 0; i < n; i++) types[i] = buffer[i];
    }

    function getClaim(uint256 claimId) external view returns (Claim memory) {
        if (claimId == 0 || claimId >= claims.length) revert InvalidInput();
        return claims[claimId];
    }

    function claimCount() external view returns (uint256) {
        return claims.length - 1;
    }

    function claimsOfLot(uint256 lotId) external view returns (uint256[] memory) {
        return lotClaims[lotId];
    }

    function claimsOfHolder(address holder) external view returns (uint256[] memory) {
        return holderClaims[holder];
    }

    // ----- Internal -----

    function _allocate(uint8 claimType, address holder, uint256 lotId, uint256 grams, bytes32 programmeId)
        private
        returns (uint256 claimId)
    {
        if (claimType == 0 || claimType > MAX_TYPE || holder == address(0) || grams == 0) revert InvalidInput();
        LotView memory lot = lots.getLot(lotId);
        if (lot.eligibleGrams == 0) revert InvalidInput();
        if (
            lot.state == LotState.UNDER_REVIEW || lot.state == LotState.VOIDED || lot.state == LotState.REJECTED
                || lot.state == LotState.CHALLENGED
        ) revert InvalidInput();
        // Eligible grams are final only once the challenge window has closed.
        if (lot.state == LotState.VERIFIED && block.timestamp < lot.challengeDeadline) revert NotFinal();
        uint256 present = _typesOnLot(lotId);
        for (uint8 t = 1; t <= MAX_TYPE; t++) {
            if (t != claimType && (present & (1 << t)) != 0 && compatibility[claimType][t] == EXCLUDE) {
                revert Incompatible(t, claimType);
            }
        }
        uint256 next = allocatedGrams[lotId][claimType] + grams;
        if (next > lot.eligibleGrams) revert OverAllocated();
        allocatedGrams[lotId][claimType] = next;
        claimId = claims.length;
        claims.push(Claim(claimType, holder, lotId, grams, programmeId, uint64(block.timestamp), false));
        lotClaims[lotId].push(claimId);
        holderClaims[holder].push(claimId);
        emit ClaimAllocated(claimId, lotId, holder, claimType, grams, programmeId);
    }

    function _typesOnLot(uint256 lotId) private view returns (uint256 mask) {
        for (uint8 t = 1; t <= MAX_TYPE; t++) {
            if (allocatedGrams[lotId][t] > 0) mask |= 1 << t;
        }
    }

    function _setRule(uint8 a, uint8 b, uint8 rule) private {
        compatibility[a][b] = rule;
        compatibility[b][a] = rule;
        emit CompatibilitySet(a, b, rule);
    }
}
