// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface ISponsorshipMoney {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
}

/// @notice Local reference implementation. Records are non-transferable commitments,
/// not ERC-1155 material ownership or official environmental credits.
contract SponsorshipEscrow {
    struct Milestone {
        bytes32 termsHash;
        uint256 budget;
        uint256 targetKg;
        bytes32 evidenceHash;
        uint256 receivedKg;
        uint256 verifiedKg;
        bool funded;
        bool termsAccepted;
        bool verified;
        bool disputed;
        bool closed;
        bytes32 exceptionHash;
        uint256 proposedPayment;
        bool sponsorApproved;
        bool aamhiApproved;
    }

    ISponsorshipMoney public immutable money;
    address public immutable sponsor;
    address public immutable aamhi;
    address public immutable facility;
    address public immutable verifier;
    bytes32 public immutable programmeHash;
    mapping(uint256 => Milestone) private milestones;
    mapping(bytes32 => bool) public usedEvidence;
    mapping(uint256 => bytes32) public attributionHash;

    event MilestoneCreated(uint256 indexed id, bytes32 termsHash, uint256 budget, uint256 targetKg);
    event Funded(uint256 indexed id, uint256 amount);
    event TermsAccepted(uint256 indexed id, bytes32 termsHash);
    event EvidenceSubmitted(uint256 indexed id, bytes32 evidenceHash);
    event ReceiptConfirmed(uint256 indexed id, bytes32 evidenceHash, uint256 quantityKg);
    event Verified(uint256 indexed id, bytes32 evidenceHash, uint256 quantityKg);
    event DisputeOpened(uint256 indexed id, bytes32 reasonHash);
    event ExceptionProposed(uint256 indexed id, bytes32 proposalHash, uint256 payment);
    event ExceptionApproved(uint256 indexed id, bytes32 proposalHash, address approver);
    event Released(uint256 indexed id, uint256 paid, uint256 refunded, bytes32 attribution);

    error Denied();
    error InvalidState();
    error InvalidInput();
    error TransferFailed();

    constructor(address token, address s, address a, address f, address v, bytes32 programme) {
        if (token == address(0) || s == address(0) || a == address(0) || f == address(0) || v == address(0)
            || s == a || s == f || s == v || a == f || a == v || f == v || programme == bytes32(0)) revert InvalidInput();
        money = ISponsorshipMoney(token);
        sponsor = s; aamhi = a; facility = f; verifier = v; programmeHash = programme;
    }

    // Sponsor proposes; Aamhi accepts the exact terms hash before funding.
    function createMilestone(uint256 id, bytes32 terms, uint256 budget, uint256 targetKg) external {
        if (msg.sender != sponsor) revert Denied();
        if (id == 0 || terms == bytes32(0) || budget == 0 || targetKg == 0 || milestones[id].budget != 0) revert InvalidInput();
        Milestone storage m = milestones[id];
        m.termsHash = terms; m.budget = budget; m.targetKg = targetKg;
        emit MilestoneCreated(id, terms, budget, targetKg);
    }

    function acceptTerms(uint256 id, bytes32 terms) external {
        if (msg.sender != aamhi) revert Denied();
        Milestone storage m = milestones[id];
        if (m.budget == 0 || m.funded || m.termsAccepted || terms != m.termsHash) revert InvalidState();
        m.termsAccepted = true;
        emit TermsAccepted(id, terms);
    }

    function fund(uint256 id) external {
        if (msg.sender != sponsor) revert Denied();
        Milestone storage m = milestones[id];
        if (m.budget == 0 || m.funded || !m.termsAccepted) revert InvalidState();
        m.funded = true;
        if (!money.transferFrom(sponsor, address(this), m.budget)) revert TransferFailed();
        emit Funded(id, m.budget);
    }

    function submitEvidence(uint256 id, bytes32 terms, bytes32 evidence) external {
        if (msg.sender != aamhi) revert Denied();
        Milestone storage m = _open(id);
        if (m.disputed || m.evidenceHash != bytes32(0) || terms != m.termsHash) revert InvalidState();
        if (evidence == bytes32(0) || usedEvidence[evidence]) revert InvalidInput();
        usedEvidence[evidence] = true;
        m.evidenceHash = evidence;
        emit EvidenceSubmitted(id, evidence);
    }

    function confirmReceipt(uint256 id, bytes32 evidence, uint256 quantityKg) external {
        if (msg.sender != facility) revert Denied();
        Milestone storage m = _open(id);
        if (m.disputed || m.receivedKg != 0 || evidence == bytes32(0) || evidence != m.evidenceHash || quantityKg == 0) revert InvalidState();
        m.receivedKg = quantityKg;
        emit ReceiptConfirmed(id, evidence, quantityKg);
    }

    function verify(uint256 id, bytes32 evidence, uint256 quantityKg) external {
        if (msg.sender != verifier) revert Denied();
        Milestone storage m = _open(id);
        if (m.disputed || m.verified || evidence != m.evidenceHash || quantityKg == 0 || quantityKg > m.receivedKg) revert InvalidState();
        m.verified = true; m.verifiedKg = quantityKg;
        emit Verified(id, evidence, quantityKg);
        // The qualifying attestation settles payment in this same transaction.
        if (quantityKg >= m.targetKg) _release(id, m);
    }

    function dispute(uint256 id, bytes32 reason) external {
        if (msg.sender != sponsor && msg.sender != aamhi && msg.sender != verifier) revert Denied();
        Milestone storage m = _open(id);
        if (reason == bytes32(0)) revert InvalidInput();
        m.disputed = true;
        // A new dispute invalidates earlier approvals, including an approved exception.
        m.sponsorApproved = false; m.aamhiApproved = false;
        emit DisputeOpened(id, reason);
    }

    function proposeException(uint256 id, bytes32 reason, uint256 payment) external {
        if (msg.sender != sponsor && msg.sender != aamhi) revert Denied();
        Milestone storage m = _open(id);
        if (reason == bytes32(0) || payment > m.budget) revert InvalidInput();
        // Bind approvals to immutable terms, current evidence/outcome, reason and amount.
        m.exceptionHash = keccak256(abi.encode(address(this), block.chainid, id, m.termsHash, m.evidenceHash, m.verifiedKg, reason, payment));
        m.proposedPayment = payment;
        m.sponsorApproved = false; m.aamhiApproved = false; m.disputed = true;
        emit ExceptionProposed(id, m.exceptionHash, payment);
    }

    function approveException(uint256 id, bytes32 proposal) external {
        if (msg.sender != sponsor && msg.sender != aamhi) revert Denied();
        Milestone storage m = _open(id);
        if (proposal == bytes32(0) || proposal != m.exceptionHash) revert InvalidInput();
        if (msg.sender == sponsor) m.sponsorApproved = true;
        else m.aamhiApproved = true;
        emit ExceptionApproved(id, proposal, msg.sender);
        if (m.sponsorApproved && m.aamhiApproved && (m.verified || m.proposedPayment == 0)) {
            _release(id, m);
        }
    }

    function release(uint256 id) external {
        Milestone storage m = _open(id);
        _release(id, m);
    }

    function _release(uint256 id, Milestone storage m) private {
        bool jointlyApproved = m.sponsorApproved && m.aamhiApproved;
        if (m.disputed && !jointlyApproved) revert InvalidState();
        uint256 payment = jointlyApproved ? m.proposedPayment : m.budget;
        // A zero-payment joint cancellation can refund without inventing an outcome.
        if (payment > 0 && (!m.verified || (!jointlyApproved && m.verifiedKg < m.targetKg))) revert InvalidState();
        m.closed = true;
        bytes32 attribution = bytes32(0);
        if (payment > 0) {
            attribution = keccak256(abi.encode(programmeHash, id, sponsor, m.evidenceHash, m.verifiedKg, payment));
            attributionHash[id] = attribution;
            if (!money.transfer(aamhi, payment)) revert TransferFailed();
        }
        uint256 refund = m.budget - payment;
        if (refund > 0 && !money.transfer(sponsor, refund)) revert TransferFailed();
        emit Released(id, payment, refund, attribution);
    }

    function getMilestone(uint256 id) external view returns (Milestone memory) { return milestones[id]; }

    function _open(uint256 id) private view returns (Milestone storage m) {
        m = milestones[id];
        if (!m.funded || m.closed) revert InvalidState();
    }
}
