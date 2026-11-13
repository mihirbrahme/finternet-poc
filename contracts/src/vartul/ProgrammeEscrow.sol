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
    IVartulMoney,
    IRecoveryLots,
    IPayoutRouter,
    IVartulClaims
} from "./VartulTypes.sol";

/// @title ProgrammeEscrow
/// @notice Outcome-linked sponsorship programmes. One or more sponsors fund a programme in full
/// before the originator commits; only lots tokenised after that commitment count (additionality).
/// Money moves only when independently verified lots finalise, atomically with collector payouts,
/// verifier fees and sponsor claims. Changes to agreed outcomes need every party's approval of an
/// exact proposal. There is no administrator release path.
contract ProgrammeEscrow {
    uint8 public constant FIXED_ON_TARGET = 1;
    uint8 public constant PER_KG_CAPPED = 2;

    uint8 public constant EXCEPTION_SETTLE = 1;
    uint8 public constant EXCEPTION_EXTEND = 2;
    uint8 public constant EXCEPTION_RESUME = 3;

    uint256 private constant MAX_SPONSORS = 16;

    enum Status { NONE, PROPOSED, ACTIVE, COMPLETED, DISPUTED, EXPIRED, RESOLVED, CANCELLED }

    struct ProgrammeInput {
        bytes32 id;
        bytes32 termsHash;
        bytes32 originator;
        bytes32 verifier;
        bytes32 material;
        bytes32 region;
        uint8 policy;
        uint32 milestones;
        uint16 collectorBps;
        uint16 verifierBps;
        uint64 challengeWindow;
        uint64 deadline;
        uint64 grace;
        uint256 targetGrams;
        uint256 ratePerKg;
        address[] sponsors;
        uint256[] shares;
    }

    struct Programme {
        bytes32 termsHash;
        bytes32 originator;
        bytes32 verifier;
        bytes32 material;
        bytes32 region;
        address leadSponsor;
        uint8 policy;
        Status status;
        uint32 milestones;
        uint16 collectorBps;
        uint16 verifierBps;
        uint64 challengeWindow;
        uint64 deadline;
        uint64 grace;
        uint64 commitmentTime;
        uint256 targetGrams;
        uint256 ratePerKg;
        uint256 budget;
        uint256 funded;
        uint256 paid;
        uint256 refunded;
        uint256 acceptedGrams;
        uint256 settledGrams;
        uint256 exceptionEpoch;
    }

    struct Exception {
        uint8 kind;
        uint256 amount;
        uint64 newDeadline;
        bytes32 reason;
        uint256 epoch;
        uint256 approvals;
        bool executed;
    }

    IVartulRegistry public immutable registry;
    IVartulAttestations public immutable attestations;
    IVartulMoney public immutable money;
    IRecoveryLots public immutable lots;
    IVartulClaims public claims;
    IPayoutRouter public router;

    mapping(bytes32 => Programme) private programmes;
    mapping(bytes32 => address[]) private sponsorList;
    mapping(bytes32 => uint256[]) private shareList;
    mapping(bytes32 => mapping(address => uint256)) private sponsorSlot; // index + 1
    mapping(bytes32 => mapping(address => bool)) public hasFunded;
    mapping(bytes32 => uint256[]) private pendingLots;
    mapping(uint256 => bool) public lotAccepted;
    mapping(bytes32 => mapping(bytes32 => Exception)) private exceptions;
    bytes32[] private programmeIds;

    event ProgrammeProposed(bytes32 indexed id, address indexed leadSponsor, bytes32 originator, bytes32 verifier, uint256 budget);
    event SponsorFunded(bytes32 indexed id, address indexed sponsor, uint256 amount);
    event ProgrammeAccepted(bytes32 indexed id, address indexed by, uint64 commitmentTime);
    event ProgrammeCancelled(bytes32 indexed id);
    event LotAccepted(bytes32 indexed id, uint256 indexed lotId, uint256 eligibleGrams);
    event ProgrammeSettled(
        bytes32 indexed id, uint256 amount, uint256 collectorAmount, uint256 originatorAmount, uint256 verifierAmount,
        uint256 grams, uint256 lotCount
    );
    event ProgrammeCompleted(bytes32 indexed id);
    event Refunded(bytes32 indexed id, address indexed sponsor, uint256 amount);
    event ExceptionProposed(bytes32 indexed id, bytes32 indexed hash, uint8 kind, uint256 amount, uint64 newDeadline, bytes32 reason);
    event ExceptionApproved(bytes32 indexed id, bytes32 indexed hash, address indexed by);
    event ExceptionExecuted(bytes32 indexed id, bytes32 indexed hash);
    event Disputed(bytes32 indexed id, address indexed by, bytes32 reason);
    event AwardApplied(bytes32 indexed id, bytes32 attestation, uint256 amount);
    event ProgrammeExpired(bytes32 indexed id);

    error Denied();
    error InvalidInput();
    error InvalidState();
    error Exhausted();

    constructor(address registryAddress, address attestationsAddress, address moneyAddress, address lotsAddress) {
        if (
            registryAddress == address(0) || attestationsAddress == address(0) || moneyAddress == address(0)
                || lotsAddress == address(0)
        ) revert InvalidInput();
        registry = IVartulRegistry(registryAddress);
        attestations = IVartulAttestations(attestationsAddress);
        money = IVartulMoney(moneyAddress);
        lots = IRecoveryLots(lotsAddress);
    }

    function wire(address claimsAddress, address routerAddress) external {
        if (!registry.hasRole(msg.sender, Roles.FACILITATOR)) revert Denied();
        if (address(claims) != address(0) || claimsAddress == address(0) || routerAddress == address(0)) {
            revert InvalidState();
        }
        claims = IVartulClaims(claimsAddress);
        router = IPayoutRouter(routerAddress);
    }

    // ----- Formation -----

    function propose(ProgrammeInput calldata input) external {
        Programme storage p = programmes[input.id];
        if (input.id == bytes32(0) || p.status != Status.NONE) revert InvalidInput();
        if (!registry.hasRole(msg.sender, Roles.SPONSOR)) revert Denied();
        if (input.sponsors.length == 0 || input.sponsors[0] != msg.sender) revert InvalidInput();
        if (input.verifier == input.originator || input.verifier == bytes32(0) || input.originator == bytes32(0)) {
            revert InvalidInput();
        }
        if (uint256(input.collectorBps) + input.verifierBps > 10_000 || input.deadline <= block.timestamp) {
            revert InvalidInput();
        }
        if (input.milestones == 0 || input.termsHash == bytes32(0)) revert InvalidInput();
        if (input.policy == FIXED_ON_TARGET) {
            if (input.targetGrams == 0) revert InvalidInput();
        } else if (input.policy == PER_KG_CAPPED) {
            if (input.ratePerKg == 0) revert InvalidInput();
        } else {
            revert InvalidInput();
        }
        uint256 budget = _registerSponsors(input.id, input.sponsors, input.shares, input.verifier, input.originator);

        p.termsHash = input.termsHash;
        p.originator = input.originator;
        p.verifier = input.verifier;
        p.material = input.material;
        p.region = input.region;
        p.leadSponsor = msg.sender;
        p.policy = input.policy;
        p.status = Status.PROPOSED;
        p.milestones = input.milestones;
        p.collectorBps = input.collectorBps;
        p.verifierBps = input.verifierBps;
        p.challengeWindow = input.challengeWindow;
        p.deadline = input.deadline;
        p.grace = input.grace;
        p.targetGrams = input.targetGrams;
        p.ratePerKg = input.ratePerKg;
        p.budget = budget;
        programmeIds.push(input.id);
        emit ProgrammeProposed(input.id, msg.sender, input.originator, input.verifier, budget);
    }

    /// @notice Each sponsor confirms participation by funding exactly their share.
    function fund(bytes32 id) external {
        Programme storage p = programmes[id];
        uint256 slot = sponsorSlot[id][msg.sender];
        if (p.status != Status.PROPOSED || slot == 0 || hasFunded[id][msg.sender]) revert InvalidState();
        uint256 share = shareList[id][slot - 1];
        hasFunded[id][msg.sender] = true;
        p.funded += share;
        if (!money.transferFrom(msg.sender, address(this), share)) revert Denied();
        emit SponsorFunded(id, msg.sender, share);
    }

    /// @notice The originator accepts the exact terms of a fully funded programme. This fixes the
    /// commitment time from which recovered material becomes eligible.
    function accept(bytes32 id, bytes32 termsHash) external {
        Programme storage p = programmes[id];
        if (p.status != Status.PROPOSED || p.funded != p.budget || block.timestamp >= p.deadline) revert InvalidState();
        if (!_isOriginator(p, msg.sender)) revert Denied();
        if (termsHash != p.termsHash) revert InvalidInput();
        p.status = Status.ACTIVE;
        p.commitmentTime = uint64(block.timestamp);
        emit ProgrammeAccepted(id, msg.sender, p.commitmentTime);
    }

    /// @notice Before acceptance, the lead sponsor may withdraw the proposal; after the deadline anyone may.
    function cancel(bytes32 id) external {
        Programme storage p = programmes[id];
        if (p.status != Status.PROPOSED) revert InvalidState();
        if (msg.sender != p.leadSponsor && block.timestamp < p.deadline) revert Denied();
        p.status = Status.CANCELLED;
        address[] storage sponsors = sponsorList[id];
        for (uint256 i = 0; i < sponsors.length; i++) {
            if (!hasFunded[id][sponsors[i]]) continue;
            uint256 share = shareList[id][i];
            p.refunded += share;
            if (!money.transfer(sponsors[i], share)) revert Denied();
            emit Refunded(id, sponsors[i], share);
        }
        emit ProgrammeCancelled(id);
    }

    // ----- Hooks used by the recovery-lot token manager -----

    function validateLot(bytes32 id, uint32 milestone, bytes32 originator, uint64 windowStart)
        external
        view
        returns (bool)
    {
        Programme storage p = programmes[id];
        // Recovery continues during a dispute; only settlement pauses.
        return (p.status == Status.ACTIVE || p.status == Status.DISPUTED) && p.originator == originator && milestone >= 1 && milestone <= p.milestones
            && windowStart >= p.commitmentTime && block.timestamp <= p.deadline;
    }

    function isAppointedVerifier(bytes32 id, bytes32 participant) external view returns (bool) {
        return participant != bytes32(0) && programmes[id].verifier == participant;
    }

    function isSponsor(bytes32 id, address account) external view returns (bool) {
        return sponsorSlot[id][account] != 0;
    }

    function challengeWindowOf(bytes32 id) external view returns (uint64) {
        return programmes[id].challengeWindow;
    }

    /// @notice Called by the lot token manager when a verified lot clears its challenge window.
    function acceptLot(uint256 lotId) external {
        if (msg.sender != address(lots)) revert Denied();
        LotView memory lot = lots.getLot(lotId);
        bytes32 id = lot.programmeId;
        Programme storage p = programmes[id];
        if (p.status != Status.ACTIVE || lot.state != LotState.VERIFIED || lotAccepted[lotId]) revert InvalidState();
        lotAccepted[lotId] = true;
        emit LotAccepted(id, lotId, lot.eligibleGrams);

        if (p.policy == PER_KG_CAPPED) {
            uint256 available = p.funded - p.paid;
            if (available == 0) revert Exhausted();
            uint256 amount = lot.eligibleGrams * p.ratePerKg / 1000;
            uint256 grams = lot.eligibleGrams;
            if (amount > available) {
                amount = available;
                grams = available * 1000 / p.ratePerKg;
            }
            uint256[] memory ids = new uint256[](1);
            uint256[] memory claimGrams = new uint256[](1);
            ids[0] = lotId;
            claimGrams[0] = grams;
            p.acceptedGrams += lot.eligibleGrams;
            _settle(id, ids, claimGrams, amount);
        } else {
            pendingLots[id].push(lotId);
            p.acceptedGrams += lot.eligibleGrams;
            if (p.acceptedGrams >= p.targetGrams) {
                (uint256[] memory ids, uint256[] memory claimGrams) = _drainPending(id, false);
                _settle(id, ids, claimGrams, p.funded - p.paid);
            }
        }
    }

    // ----- Exceptions, disputes, awards and expiry -----

    /// @notice Propose an exact change. A new proposal supersedes any earlier one and its approvals.
    function proposeException(bytes32 id, uint8 kind, uint256 amount, uint64 newDeadline, bytes32 reason)
        external
        returns (bytes32 hash)
    {
        Programme storage p = programmes[id];
        uint256 bit = _partyBit(id, p, msg.sender);
        if (bit == 0) revert Denied();
        if (kind == EXCEPTION_SETTLE) {
            if (p.status != Status.ACTIVE && p.status != Status.DISPUTED) revert InvalidState();
            if (amount > p.funded - p.paid) revert InvalidInput();
        } else if (kind == EXCEPTION_EXTEND) {
            if (p.status != Status.ACTIVE || newDeadline <= p.deadline) revert InvalidInput();
        } else if (kind == EXCEPTION_RESUME) {
            if (p.status != Status.DISPUTED) revert InvalidState();
        } else {
            revert InvalidInput();
        }
        p.exceptionEpoch += 1;
        hash = keccak256(abi.encode(id, kind, amount, newDeadline, reason, p.exceptionEpoch));
        exceptions[id][hash] = Exception(kind, amount, newDeadline, reason, p.exceptionEpoch, 0, false);
        emit ExceptionProposed(id, hash, kind, amount, newDeadline, reason);
        _approve(id, p, hash, bit);
    }

    function approveException(bytes32 id, bytes32 hash) external {
        Programme storage p = programmes[id];
        uint256 bit = _partyBit(id, p, msg.sender);
        if (bit == 0) revert Denied();
        _approve(id, p, hash, bit);
    }

    /// @notice Any party may raise a dispute. Lot finalisation pauses and pending proposals lapse.
    function dispute(bytes32 id, bytes32 reason) external {
        Programme storage p = programmes[id];
        if (p.status != Status.ACTIVE) revert InvalidState();
        if (_partyBit(id, p, msg.sender) == 0) revert Denied();
        p.status = Status.DISPUTED;
        p.exceptionEpoch += 1;
        emit Disputed(id, msg.sender, reason);
    }

    /// @notice Apply an arbitral award recorded by the network facilitator. The award quantity is the
    /// amount payable under the programme split; the rest is refunded to sponsors.
    function resolveByAward(bytes32 id, Attestation calldata a, bytes calldata signature) external {
        Programme storage p = programmes[id];
        if (p.status != Status.DISPUTED) revert InvalidState();
        if (a.kind != Kinds.ARBITRAL_AWARD || a.subject != id || a.quantity > p.funded - p.paid) revert InvalidInput();
        (bytes32 attId,) = attestations.record(a, signature, Roles.FACILITATOR, msg.sender);
        emit AwardApplied(id, attId, a.quantity);
        _closeWith(id, p, a.quantity);
    }

    /// @notice After the deadline and grace period, unspent funds return to sponsors pro rata.
    function expire(bytes32 id) external {
        Programme storage p = programmes[id];
        if (p.status != Status.ACTIVE || block.timestamp <= uint256(p.deadline) + p.grace) revert InvalidState();
        p.status = Status.EXPIRED;
        delete pendingLots[id];
        _refundRemaining(id, p);
        emit ProgrammeExpired(id);
    }

    // ----- Views -----

    function getProgramme(bytes32 id) external view returns (Programme memory) {
        return programmes[id];
    }

    function sponsorsOf(bytes32 id) external view returns (address[] memory, uint256[] memory) {
        return (sponsorList[id], shareList[id]);
    }

    function pendingLotsOf(bytes32 id) external view returns (uint256[] memory) {
        return pendingLots[id];
    }

    function getException(bytes32 id, bytes32 hash) external view returns (Exception memory) {
        return exceptions[id][hash];
    }

    function requiredApprovals(bytes32 id) public view returns (uint256) {
        return (uint256(1) << (sponsorList[id].length + 1)) - 1;
    }

    function programmeCount() external view returns (uint256) {
        return programmeIds.length;
    }

    function programmeAt(uint256 index) external view returns (bytes32) {
        return programmeIds[index];
    }

    // ----- Internal -----

    function _registerSponsors(
        bytes32 id,
        address[] calldata sponsors,
        uint256[] calldata shares,
        bytes32 verifier,
        bytes32 originator
    ) private returns (uint256 budget) {
        if (sponsors.length != shares.length || sponsors.length > MAX_SPONSORS) revert InvalidInput();
        for (uint256 i = 0; i < sponsors.length; i++) {
            address s = sponsors[i];
            bytes32 participant = registry.participantOf(s);
            if (!registry.hasRole(s, Roles.SPONSOR) || participant == verifier || participant == originator) {
                revert InvalidInput();
            }
            if (sponsorSlot[id][s] != 0 || shares[i] == 0) revert InvalidInput();
            sponsorSlot[id][s] = i + 1;
            sponsorList[id].push(s);
            shareList[id].push(shares[i]);
            budget += shares[i];
        }
    }

    function _isOriginator(Programme storage p, address account) private view returns (bool) {
        return registry.hasRole(account, Roles.ORIGINATOR) && registry.participantOf(account) == p.originator;
    }

    function _partyBit(bytes32 id, Programme storage p, address account) private view returns (uint256) {
        if (_isOriginator(p, account)) return 1;
        uint256 slot = sponsorSlot[id][account];
        return slot == 0 ? 0 : uint256(1) << slot;
    }

    function _approve(bytes32 id, Programme storage p, bytes32 hash, uint256 bit) private {
        Exception storage e = exceptions[id][hash];
        if (e.kind == 0 || e.executed || e.epoch != p.exceptionEpoch) revert InvalidState();
        e.approvals |= bit;
        emit ExceptionApproved(id, hash, msg.sender);
        if (e.approvals != requiredApprovals(id)) return;
        e.executed = true;
        emit ExceptionExecuted(id, hash);
        if (e.kind == EXCEPTION_SETTLE) {
            if (p.status != Status.ACTIVE && p.status != Status.DISPUTED) revert InvalidState();
            _closeWith(id, p, e.amount);
        } else if (e.kind == EXCEPTION_EXTEND) {
            if (p.status != Status.ACTIVE) revert InvalidState();
            p.deadline = e.newDeadline;
        } else {
            if (p.status != Status.DISPUTED) revert InvalidState();
            p.status = Status.ACTIVE;
        }
    }

    /// @dev Pay `amount` against the still-verified pending lots, refund the rest, and close.
    function _closeWith(bytes32 id, Programme storage p, uint256 amount) private {
        (uint256[] memory ids, uint256[] memory claimGrams) = _drainPending(id, true);
        if (amount > 0) _settle(id, ids, claimGrams, amount);
        p.status = Status.RESOLVED;
        _refundRemaining(id, p);
    }

    function _drainPending(bytes32 id, bool skipUnverified)
        private
        returns (uint256[] memory ids, uint256[] memory claimGrams)
    {
        uint256[] storage pending = pendingLots[id];
        uint256[] memory bufferIds = new uint256[](pending.length);
        uint256[] memory bufferGrams = new uint256[](pending.length);
        uint256 n;
        for (uint256 i = 0; i < pending.length; i++) {
            LotView memory lot = lots.getLot(pending[i]);
            if (lot.state != LotState.VERIFIED) {
                if (skipUnverified) continue;
                revert InvalidState();
            }
            bufferIds[n] = pending[i];
            bufferGrams[n] = lot.eligibleGrams;
            n++;
        }
        delete pendingLots[id];
        ids = new uint256[](n);
        claimGrams = new uint256[](n);
        for (uint256 i = 0; i < n; i++) {
            ids[i] = bufferIds[i];
            claimGrams[i] = bufferGrams[i];
        }
    }

    function _settle(bytes32 id, uint256[] memory ids, uint256[] memory claimGrams, uint256 amount) private {
        Programme storage p = programmes[id];
        if (amount > p.funded - p.paid) revert Exhausted();
        p.paid += amount;
        (uint256 collectorAmount, uint256 verifierAmount) = _payParties(p, ids, amount);

        uint256 totalGrams;
        for (uint256 i = 0; i < ids.length; i++) {
            lots.markSettled(ids[i]);
            totalGrams += claimGrams[i];
            _allocateSponsorClaims(id, p.budget, ids[i], claimGrams[i]);
        }
        p.settledGrams += totalGrams;
        emit ProgrammeSettled(
            id, amount, collectorAmount, amount - collectorAmount - verifierAmount, verifierAmount, totalGrams, ids.length
        );
        if (p.paid == p.funded && p.status == Status.ACTIVE) {
            p.status = Status.COMPLETED;
            emit ProgrammeCompleted(id);
        }
    }

    /// @dev Collector share via the payout router, verifier fee, and the originator receives the rest.
    function _payParties(Programme storage p, uint256[] memory ids, uint256 amount)
        private
        returns (uint256 collectorAmount, uint256 verifierAmount)
    {
        collectorAmount = amount * p.collectorBps / 10_000;
        verifierAmount = amount * p.verifierBps / 10_000;
        address originatorTreasury = registry.treasuryOf(p.originator);
        address verifierTreasury = registry.treasuryOf(p.verifier);
        if (originatorTreasury == address(0) || verifierTreasury == address(0)) revert InvalidState();
        if (collectorAmount > 0) {
            if (!money.transfer(address(router), collectorAmount)) revert Denied();
            router.distribute(ids, collectorAmount, originatorTreasury);
        }
        if (verifierAmount > 0 && !money.transfer(verifierTreasury, verifierAmount)) revert Denied();
        uint256 originatorAmount = amount - collectorAmount - verifierAmount;
        if (originatorAmount > 0 && !money.transfer(originatorTreasury, originatorAmount)) revert Denied();
    }

    function _allocateSponsorClaims(bytes32 id, uint256 budget, uint256 lotId, uint256 grams) private {
        address[] storage sponsors = sponsorList[id];
        uint256[] storage shares = shareList[id];
        uint256 assigned;
        for (uint256 i = 0; i < sponsors.length; i++) {
            uint256 g = i + 1 == sponsors.length ? grams - assigned : grams * shares[i] / budget;
            assigned += g;
            if (g > 0) claims.allocate(1, sponsors[i], lotId, g, id);
        }
    }

    function _refundRemaining(bytes32 id, Programme storage p) private {
        uint256 remaining = p.funded - p.paid - p.refunded;
        if (remaining == 0) return;
        address[] storage sponsors = sponsorList[id];
        uint256[] storage shares = shareList[id];
        uint256 given;
        for (uint256 i = 0; i < sponsors.length; i++) {
            uint256 r = i + 1 == sponsors.length ? remaining - given : remaining * shares[i] / p.budget;
            given += r;
            if (r == 0) continue;
            if (!money.transfer(sponsors[i], r)) revert Denied();
            emit Refunded(id, sponsors[i], r);
        }
        p.refunded += remaining;
    }
}
