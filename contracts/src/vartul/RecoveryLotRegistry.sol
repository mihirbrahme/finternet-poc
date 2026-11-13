// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {
    Attestation,
    Kinds,
    LotState,
    LotView,
    Roles,
    IVartulRegistry,
    IVartulAttestations,
    IProgrammeEscrow
} from "./VartulTypes.sol";

interface IERC1155Receiver {
    function onERC1155Received(address operator, address from, uint256 id, uint256 value, bytes calldata data)
        external
        returns (bytes4);
}

/// @title RecoveryLotRegistry
/// @notice Token manager for recovery lots: semi-fungible ERC-1155 tokens denominated in grams.
/// Each lot carries its proof-chain root, mass balance, contributing collectors and lifecycle state.
/// Material entitlements move only through the authorised settlement contract to eligible buyers.
contract RecoveryLotRegistry {
    struct MintInput {
        bytes32 lotId;
        bytes32 programmeId;
        uint32 milestone;
        bytes32 material;
        bytes32 region;
        uint64 windowStart;
        uint64 windowEnd;
        uint256 inputGrams;
        uint256 contaminationGrams;
        uint256 aggregatedGrams;
        address[] collectors;
        uint256[] collectorGrams;
    }

    struct Exclusion {
        address collector;
        uint256 grams;
    }

    IVartulRegistry public immutable registry;
    IVartulAttestations public immutable attestations;
    IProgrammeEscrow public escrow;
    address public materialSettlement;
    uint16 public massBalanceToleranceBps = 100;
    uint16 public receiptToleranceBps = 200;
    string private baseUri = "vartul://lot/";

    mapping(uint256 => LotView) private lots;
    mapping(uint256 => address[]) private collectors;
    mapping(uint256 => uint256[]) private collectorGrams;
    mapping(uint256 => mapping(address => uint256)) private excludedGrams;
    mapping(uint256 => mapping(address => uint256)) private balances;
    mapping(address => mapping(address => bool)) private operatorApprovals;
    uint256[] private lotIds;

    event TransferSingle(address indexed operator, address indexed from, address indexed to, uint256 id, uint256 value);
    event TransferBatch(
        address indexed operator, address indexed from, address indexed to, uint256[] ids, uint256[] values
    );
    event ApprovalForAll(address indexed account, address indexed operator, bool approved);
    event URI(string value, uint256 indexed id);
    event LotMinted(
        uint256 indexed lotId, bytes32 indexed programmeId, bytes32 originator, bytes32 material, uint256 aggregatedGrams,
        bytes32 proofRoot, bytes32 attestation
    );
    event LotStateChanged(uint256 indexed lotId, LotState state, bytes32 attestation);
    event LotReceived(uint256 indexed lotId, uint256 receivedGrams, bytes32 attestation);
    event LotVerified(uint256 indexed lotId, uint256 eligibleGrams, uint64 challengeDeadline, bytes32 attestation);
    event LotChallenged(uint256 indexed lotId, address indexed by, bytes32 reason);
    event CollectorExcluded(uint256 indexed lotId, address indexed collector, uint256 grams);
    event LotProcessed(uint256 indexed lotId, uint256 processedGrams, bytes32 attestation);
    event PolicyUpdated(uint16 massBalanceToleranceBps, uint16 receiptToleranceBps);

    error Denied();
    error InvalidInput();
    error InvalidState();
    error MassBalance();
    error NotSupported();

    constructor(address registryAddress, address attestationsAddress) {
        if (registryAddress == address(0) || attestationsAddress == address(0)) revert InvalidInput();
        registry = IVartulRegistry(registryAddress);
        attestations = IVartulAttestations(attestationsAddress);
    }

    modifier onlyFacilitator() {
        if (!registry.hasRole(msg.sender, Roles.FACILITATOR)) revert Denied();
        _;
    }

    // ----- Administration (one-time wiring and published network policy) -----

    function wire(address escrowAddress, address settlementAddress) external onlyFacilitator {
        if (address(escrow) != address(0) || escrowAddress == address(0) || settlementAddress == address(0)) {
            revert InvalidState();
        }
        escrow = IProgrammeEscrow(escrowAddress);
        materialSettlement = settlementAddress;
    }

    function setTolerances(uint16 massBalanceBps, uint16 receiptBps) external onlyFacilitator {
        if (massBalanceBps > 1000 || receiptBps > 1000) revert InvalidInput();
        massBalanceToleranceBps = massBalanceBps;
        receiptToleranceBps = receiptBps;
        emit PolicyUpdated(massBalanceBps, receiptBps);
    }

    // ----- Lifecycle -----

    /// @notice Tokenise an aggregated batch weighed at the material recovery centre.
    function mintLot(MintInput calldata m, Attestation calldata a, bytes calldata signature) external {
        uint256 id = uint256(m.lotId);
        if (m.lotId == bytes32(0) || lots[id].state != LotState.NONE) revert InvalidInput();
        if (a.kind != Kinds.AGGREGATION_WEIGH || a.subject != m.lotId || a.quantity != m.aggregatedGrams) {
            revert InvalidInput();
        }
        if (m.windowStart == 0 || m.windowEnd < m.windowStart || m.windowEnd > block.timestamp) revert InvalidInput();
        if (m.aggregatedGrams == 0 || m.contaminationGrams > m.inputGrams) revert InvalidInput();
        (bytes32 attId, address signer) = attestations.record(a, signature, Roles.MRC_OPERATOR, msg.sender);
        bytes32 originator = registry.participantOf(signer);
        if (!escrow.validateLot(m.programmeId, m.milestone, originator, m.windowStart)) revert InvalidInput();
        _setContributions(id, originator, m.collectors, m.collectorGrams, m.inputGrams);
        // Mass balance: the weighed lot cannot exceed captured inputs less recorded contamination.
        if (m.aggregatedGrams * 10_000 > (m.inputGrams - m.contaminationGrams) * (10_000 + massBalanceToleranceBps)) {
            revert MassBalance();
        }
        address holder = registry.treasuryOf(originator);
        if (holder == address(0)) revert InvalidState();

        LotView storage lot = lots[id];
        lot.originator = originator;
        lot.programmeId = m.programmeId;
        lot.milestone = m.milestone;
        lot.material = m.material;
        lot.region = m.region;
        lot.proofRoot = a.ref;
        lot.windowStart = m.windowStart;
        lot.windowEnd = m.windowEnd;
        lot.mintedAt = uint64(block.timestamp);
        lot.inputGrams = m.inputGrams;
        lot.contaminationGrams = m.contaminationGrams;
        lot.aggregatedGrams = m.aggregatedGrams;
        lot.state = LotState.MINTED;
        lot.aggregationAtt = attId;
        lotIds.push(id);

        balances[id][holder] = m.aggregatedGrams;
        emit TransferSingle(msg.sender, address(0), holder, id, m.aggregatedGrams);
        emit LotMinted(id, m.programmeId, originator, m.material, m.aggregatedGrams, a.ref, attId);
        emit LotStateChanged(id, LotState.MINTED, attId);
    }

    function dispatch(uint256 id, address receiver, Attestation calldata a, bytes calldata signature) external {
        LotView storage lot = lots[id];
        if (lot.state != LotState.MINTED) revert InvalidState();
        if (a.kind != Kinds.DISPATCH || uint256(a.subject) != id) revert InvalidInput();
        if (!registry.hasRole(receiver, Roles.FACILITY)) revert InvalidInput();
        (bytes32 attId, address signer) = attestations.record(a, signature, Roles.ORIGINATOR, msg.sender);
        if (registry.participantOf(signer) != lot.originator) revert Denied();
        lot.receiver = receiver;
        lot.dispatchAtt = attId;
        lot.state = LotState.IN_TRANSIT;
        emit LotStateChanged(id, LotState.IN_TRANSIT, attId);
    }

    function confirmReceipt(uint256 id, Attestation calldata a, bytes calldata signature) external {
        LotView storage lot = lots[id];
        if (lot.state != LotState.IN_TRANSIT) revert InvalidState();
        if (a.kind != Kinds.RECEIPT || uint256(a.subject) != id || a.quantity == 0) revert InvalidInput();
        if (a.quantity * 10_000 > lot.aggregatedGrams * (10_000 + receiptToleranceBps)) revert MassBalance();
        (bytes32 attId, address signer) = attestations.record(a, signature, Roles.FACILITY, msg.sender);
        if (registry.participantOf(signer) != registry.participantOf(lot.receiver)) revert Denied();
        lot.receivedGrams = a.quantity;
        lot.receiptAtt = attId;
        lot.state = LotState.RECEIVED;
        emit LotReceived(id, a.quantity, attId);
        emit LotStateChanged(id, LotState.RECEIVED, attId);
    }

    /// @notice The appointed independent verifier accepts an eligible quantity. With no challenge
    /// window, the programme settles in this same transaction; any failure reverts the verification.
    function verify(uint256 id, Exclusion[] calldata exclusions, Attestation calldata a, bytes calldata signature)
        external
    {
        LotView storage lot = lots[id];
        if (lot.state != LotState.RECEIVED) revert InvalidState();
        if (a.kind != Kinds.VERIFICATION || uint256(a.subject) != id || a.quantity > lot.receivedGrams) {
            revert InvalidInput();
        }
        (bytes32 attId, address signer) = attestations.record(a, signature, Roles.VERIFIER, msg.sender);
        bytes32 verifier = registry.participantOf(signer);
        if (
            verifier == lot.originator || verifier == registry.participantOf(lot.receiver)
                || !escrow.isAppointedVerifier(lot.programmeId, verifier)
        ) revert Denied();
        _applyExclusions(id, exclusions);
        lot.eligibleGrams = a.quantity;
        lot.verificationAtt = attId;
        if (a.quantity == 0) {
            lot.state = LotState.REJECTED;
            emit LotStateChanged(id, LotState.REJECTED, attId);
            return;
        }
        uint64 window = escrow.challengeWindowOf(lot.programmeId);
        lot.challengeDeadline = uint64(block.timestamp) + window;
        lot.state = LotState.VERIFIED;
        emit LotVerified(id, a.quantity, lot.challengeDeadline, attId);
        emit LotStateChanged(id, LotState.VERIFIED, attId);
        if (window == 0) escrow.acceptLot(id);
    }

    function challenge(uint256 id, bytes32 reason) external {
        LotView storage lot = lots[id];
        if (lot.state != LotState.VERIFIED || block.timestamp >= lot.challengeDeadline || reason == bytes32(0)) {
            revert InvalidState();
        }
        bytes32 caller = registry.participantOf(msg.sender);
        bool permitted = escrow.isSponsor(lot.programmeId, msg.sender)
            || (registry.hasRole(msg.sender, Roles.ORIGINATOR) && caller == lot.originator)
            || (registry.hasRole(msg.sender, Roles.VERIFIER) && escrow.isAppointedVerifier(lot.programmeId, caller))
            || registry.hasRole(msg.sender, Roles.PANCHAYAT) || registry.hasRole(msg.sender, Roles.FACILITATOR);
        if (!permitted) revert Denied();
        lot.state = LotState.CHALLENGED;
        emit LotChallenged(id, msg.sender, reason);
        emit LotStateChanged(id, LotState.CHALLENGED, bytes32(0));
    }

    /// @notice Resolve a challenge with a (possibly adjusted) eligible quantity; settlement may then finalise.
    function resolveChallenge(uint256 id, Attestation calldata a, bytes calldata signature) external {
        LotView storage lot = lots[id];
        if (lot.state != LotState.CHALLENGED) revert InvalidState();
        if (a.kind != Kinds.RESOLUTION || uint256(a.subject) != id || a.quantity > lot.receivedGrams) {
            revert InvalidInput();
        }
        (bytes32 attId, address signer) = attestations.record(a, signature, Roles.VERIFIER | Roles.FACILITATOR, msg.sender);
        bytes32 resolver = registry.participantOf(signer);
        if (!registry.hasRole(signer, Roles.FACILITATOR) && !escrow.isAppointedVerifier(lot.programmeId, resolver)) {
            revert Denied();
        }
        lot.eligibleGrams = a.quantity;
        lot.verificationAtt = attId;
        lot.challengeDeadline = uint64(block.timestamp);
        lot.state = a.quantity == 0 ? LotState.REJECTED : LotState.VERIFIED;
        emit LotStateChanged(id, lot.state, attId);
        if (a.quantity > 0) escrow.acceptLot(id);
    }

    /// @notice After the challenge window, anyone may finalise a verified lot into programme settlement.
    function finalize(uint256 id) external {
        LotView storage lot = lots[id];
        if (lot.state != LotState.VERIFIED || block.timestamp < lot.challengeDeadline) revert InvalidState();
        escrow.acceptLot(id);
    }

    function markSettled(uint256 id) external {
        if (msg.sender != address(escrow)) revert Denied();
        LotView storage lot = lots[id];
        if (lot.state != LotState.VERIFIED) revert InvalidState();
        lot.state = LotState.SETTLED;
        emit LotStateChanged(id, LotState.SETTLED, bytes32(0));
    }

    /// @notice Revocation cascade: if any attestation in the lot's proof chain was revoked, anyone may
    /// place the lot under review. Claims derived from the lot then report CONTESTED.
    function markUnderReview(uint256 id) external {
        LotView storage lot = lots[id];
        if (lot.state == LotState.NONE || lot.state == LotState.UNDER_REVIEW || lot.state == LotState.VOIDED) {
            revert InvalidState();
        }
        if (
            !attestations.isRevoked(lot.aggregationAtt) && !attestations.isRevoked(lot.dispatchAtt)
                && !attestations.isRevoked(lot.receiptAtt) && !attestations.isRevoked(lot.verificationAtt)
        ) revert InvalidState();
        lot.stateBeforeReview = lot.state;
        lot.state = LotState.UNDER_REVIEW;
        emit LotStateChanged(id, LotState.UNDER_REVIEW, bytes32(0));
    }

    function concludeReview(uint256 id, bool voidLot, Attestation calldata a, bytes calldata signature) external {
        LotView storage lot = lots[id];
        if (lot.state != LotState.UNDER_REVIEW) revert InvalidState();
        if (a.kind != Kinds.RESOLUTION || uint256(a.subject) != id) revert InvalidInput();
        (bytes32 attId,) = attestations.record(a, signature, Roles.FACILITATOR, msg.sender);
        lot.state = voidLot ? LotState.VOIDED : lot.stateBeforeReview;
        emit LotStateChanged(id, lot.state, attId);
    }

    function recordProcessing(uint256 id, Attestation calldata a, bytes calldata signature) external {
        LotView storage lot = lots[id];
        if (lot.state != LotState.SETTLED || lot.processedGrams != 0) revert InvalidState();
        if (a.kind != Kinds.PROCESSING || uint256(a.subject) != id || a.quantity == 0 || a.quantity > lot.receivedGrams) {
            revert InvalidInput();
        }
        (bytes32 attId, address signer) = attestations.record(a, signature, Roles.FACILITY, msg.sender);
        if (balances[id][signer] == 0 && registry.participantOf(signer) != registry.participantOf(lot.receiver)) {
            revert Denied();
        }
        lot.processedGrams = a.quantity;
        emit LotProcessed(id, a.quantity, attId);
    }

    // ----- Material entitlement transfer (delivery versus payment only) -----

    function settlementTransfer(address from, address to, uint256 id) external returns (uint256 grams) {
        if (msg.sender != materialSettlement) revert Denied();
        if (!registry.hasRole(to, Roles.BUYER)) revert Denied();
        grams = balances[id][from];
        if (grams == 0) revert InvalidState();
        balances[id][from] = 0;
        balances[id][to] += grams;
        emit TransferSingle(msg.sender, from, to, id, grams);
        if (to.code.length > 0) {
            if (
                IERC1155Receiver(to).onERC1155Received(msg.sender, from, id, grams, "")
                    != IERC1155Receiver.onERC1155Received.selector
            ) revert Denied();
        }
    }

    // ----- ERC-1155 surface (transfers restricted) -----

    function balanceOf(address account, uint256 id) external view returns (uint256) {
        return balances[id][account];
    }

    function balanceOfBatch(address[] calldata accounts, uint256[] calldata ids) external view returns (uint256[] memory out) {
        if (accounts.length != ids.length) revert InvalidInput();
        out = new uint256[](accounts.length);
        for (uint256 i = 0; i < accounts.length; i++) {
            out[i] = balances[ids[i]][accounts[i]];
        }
    }

    function setApprovalForAll(address operator, bool approved) external {
        operatorApprovals[msg.sender][operator] = approved;
        emit ApprovalForAll(msg.sender, operator, approved);
    }

    function isApprovedForAll(address account, address operator) external view returns (bool) {
        return operatorApprovals[account][operator];
    }

    /// @dev Free transfer is disabled: material moves only through delivery-versus-payment settlement.
    function safeTransferFrom(address, address, uint256, uint256, bytes calldata) external pure {
        revert NotSupported();
    }

    function safeBatchTransferFrom(address, address, uint256[] calldata, uint256[] calldata, bytes calldata)
        external
        pure
    {
        revert NotSupported();
    }

    function uri(uint256) external view returns (string memory) {
        return baseUri;
    }

    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return interfaceId == 0x01ffc9a7 || interfaceId == 0xd9b67a26 || interfaceId == 0x0e89341c;
    }

    // ----- Views -----

    function getLot(uint256 id) external view returns (LotView memory) {
        return lots[id];
    }

    function getContributions(uint256 id)
        external
        view
        returns (address[] memory addrs, uint256[] memory grams, uint256[] memory excluded)
    {
        addrs = collectors[id];
        grams = collectorGrams[id];
        excluded = new uint256[](addrs.length);
        for (uint256 i = 0; i < addrs.length; i++) {
            excluded[i] = excludedGrams[id][addrs[i]];
        }
    }

    function lotCount() external view returns (uint256) {
        return lotIds.length;
    }

    function lotAt(uint256 index) external view returns (uint256) {
        return lotIds[index];
    }

    // ----- Internal -----

    function _setContributions(
        uint256 id,
        bytes32 originator,
        address[] calldata addrs,
        uint256[] calldata grams,
        uint256 inputGrams
    ) private {
        if (addrs.length == 0 || addrs.length != grams.length || addrs.length > 64) revert InvalidInput();
        uint256 total;
        for (uint256 i = 0; i < addrs.length; i++) {
            if (!registry.hasRole(addrs[i], Roles.COLLECTOR) || registry.participantOf(addrs[i]) != originator) {
                revert InvalidInput();
            }
            for (uint256 j = 0; j < i; j++) {
                if (addrs[j] == addrs[i]) revert InvalidInput();
            }
            total += grams[i];
        }
        if (total != inputGrams) revert MassBalance();
        collectors[id] = addrs;
        collectorGrams[id] = grams;
    }

    function _applyExclusions(uint256 id, Exclusion[] calldata exclusions) private {
        address[] storage addrs = collectors[id];
        uint256[] storage grams = collectorGrams[id];
        for (uint256 i = 0; i < exclusions.length; i++) {
            bool found;
            for (uint256 j = 0; j < addrs.length; j++) {
                if (addrs[j] == exclusions[i].collector) {
                    if (exclusions[i].grams > grams[j]) revert InvalidInput();
                    excludedGrams[id][addrs[j]] = exclusions[i].grams;
                    found = true;
                    emit CollectorExcluded(id, addrs[j], exclusions[i].grams);
                    break;
                }
            }
            if (!found) revert InvalidInput();
        }
    }
}
