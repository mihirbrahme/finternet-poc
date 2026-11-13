// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Role bits held by registered accounts. An account may hold several roles.
library Roles {
    uint256 internal constant SPONSOR = 1 << 0;
    uint256 internal constant ORIGINATOR = 1 << 1;
    uint256 internal constant MRC_OPERATOR = 1 << 2;
    uint256 internal constant SUPERVISOR = 1 << 3;
    uint256 internal constant COLLECTOR = 1 << 4;
    uint256 internal constant FACILITY = 1 << 5;
    uint256 internal constant VERIFIER = 1 << 6;
    uint256 internal constant PANCHAYAT = 1 << 7;
    uint256 internal constant FACILITATOR = 1 << 8;
    uint256 internal constant BUYER = 1 << 9;
    uint256 internal constant RELAYER = 1 << 10;
    uint256 internal constant ISSUER = 1 << 11;
    uint256 internal constant ASSESSOR = 1 << 12;
}

/// @notice Attestation kinds. Each is the keccak256 of its name.
library Kinds {
    bytes32 internal constant AGGREGATION_WEIGH = keccak256("AGGREGATION_WEIGH");
    bytes32 internal constant DISPATCH = keccak256("DISPATCH");
    bytes32 internal constant RECEIPT = keccak256("RECEIPT");
    bytes32 internal constant VERIFICATION = keccak256("VERIFICATION");
    bytes32 internal constant PROCESSING = keccak256("PROCESSING");
    bytes32 internal constant RESOLUTION = keccak256("RESOLUTION");
    bytes32 internal constant ARBITRAL_AWARD = keccak256("ARBITRAL_AWARD");
}

/// @notice A typed statement signed off-chain (EIP-712) by an accountable participant.
struct Attestation {
    bytes32 kind;
    bytes32 subject;
    uint256 quantity;
    bytes32 evidence;
    bytes32 ref;
    uint64 issuedAt;
    uint64 nonce;
}

enum LotState { NONE, MINTED, IN_TRANSIT, RECEIVED, VERIFIED, CHALLENGED, SETTLED, REJECTED, UNDER_REVIEW, VOIDED }

struct LotView {
    bytes32 originator;
    bytes32 programmeId;
    uint32 milestone;
    bytes32 material;
    bytes32 region;
    bytes32 proofRoot;
    uint64 windowStart;
    uint64 windowEnd;
    uint64 mintedAt;
    uint64 challengeDeadline;
    uint256 inputGrams;
    uint256 contaminationGrams;
    uint256 aggregatedGrams;
    uint256 receivedGrams;
    uint256 eligibleGrams;
    uint256 processedGrams;
    address receiver;
    LotState state;
    LotState stateBeforeReview;
    bytes32 aggregationAtt;
    bytes32 dispatchAtt;
    bytes32 receiptAtt;
    bytes32 verificationAtt;
}

interface IVartulRegistry {
    function hasRole(address account, uint256 role) external view returns (bool);
    function participantOf(address account) external view returns (bytes32);
    function treasuryOf(bytes32 participant) external view returns (address);
    function isEligibleHolder(address account) external view returns (bool);
}

interface IVartulAttestations {
    function record(Attestation calldata a, bytes calldata signature, uint256 requiredRole, address submitter)
        external
        returns (bytes32 id, address signer);
    function isRevoked(bytes32 id) external view returns (bool);
}

interface IVartulMoney {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

interface IRecoveryLots {
    function getLot(uint256 lotId) external view returns (LotView memory);
    function getContributions(uint256 lotId)
        external
        view
        returns (address[] memory collectors, uint256[] memory grams, uint256[] memory excludedGrams);
    function markSettled(uint256 lotId) external;
    function settlementTransfer(address from, address to, uint256 lotId) external returns (uint256 grams);
}

interface IProgrammeEscrow {
    function validateLot(bytes32 programmeId, uint32 milestone, bytes32 originator, uint64 windowStart)
        external
        view
        returns (bool);
    function isAppointedVerifier(bytes32 programmeId, bytes32 participant) external view returns (bool);
    function isSponsor(bytes32 programmeId, address account) external view returns (bool);
    function challengeWindowOf(bytes32 programmeId) external view returns (uint64);
    function acceptLot(uint256 lotId) external;
}

interface IPayoutRouter {
    function distribute(uint256[] calldata lotIds, uint256 amount, address remainderTo) external;
}

interface IVartulClaims {
    function allocate(uint8 claimType, address holder, uint256 lotId, uint256 grams, bytes32 programmeId)
        external
        returns (uint256 claimId);
}
