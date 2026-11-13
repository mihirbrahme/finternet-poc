// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./AttestationRegistry.sol";

contract ClaimRegistry {
    enum ClaimType {
        RECOVERY_COLLECTED,
        ASSET_VERIFIED,
        RECEIPT_CONFIRMED,
        PROCESSING_CONFIRMED,
        OBP_READY_RECOVERY_CLAIM,
        SPONSOR_ATTRIBUTION,
        EPR_REFERENCE
    }

    enum ClaimStatus {
        NONE,
        ACTIVE,
        CONSUMED,
        REVOKED,
        DISPUTED
    }

    struct Claim {
        bytes32 claimIdHash;
        ClaimType claimType;
        bytes32 assetIdHash;
        bytes32 sourceAttestationHash;
        address issuer;
        address holder;
        uint256 quantity;
        bool exclusive;
        bool isOfficialCredit;
        ClaimStatus status;
    }

    AttestationRegistry public immutable attestationRegistry;

    mapping(bytes32 => Claim) private claimsById;
    mapping(bytes32 => mapping(ClaimType => uint256)) private activeExclusiveQuantityByAssetAndType;

    event ClaimCreated(
        bytes32 indexed claimIdHash,
        ClaimType indexed claimType,
        bytes32 indexed assetIdHash,
        bytes32 sourceAttestationHash,
        address issuer,
        address holder,
        uint256 quantity,
        bool exclusive
    );
    event ClaimConsumed(bytes32 indexed claimIdHash);
    event ClaimRevoked(bytes32 indexed claimIdHash);
    event ClaimDisputed(bytes32 indexed claimIdHash);

    error InvalidClaim();
    error InvalidAccount();
    error InvalidQuantity();
    error ClaimAlreadyExists();
    error ClaimNotFound();
    error InvalidStatus();
    error OfficialCreditNotAllowed();
    error ClaimQuantityExceedsEligible();
    error InvalidSourceAttestation();

    constructor(address attestationRegistryAddress) {
        if (attestationRegistryAddress == address(0)) revert InvalidAccount();
        attestationRegistry = AttestationRegistry(attestationRegistryAddress);
    }

    function createClaim(
        bytes32 claimIdHash,
        ClaimType claimType,
        bytes32 assetIdHash,
        bytes32 sourceAttestationHash,
        address holder,
        uint256 quantity,
        bool exclusive,
        bool isOfficialCredit
    ) external {
        if (claimIdHash == bytes32(0) || assetIdHash == bytes32(0) || sourceAttestationHash == bytes32(0)) {
            revert InvalidClaim();
        }
        if (holder == address(0)) revert InvalidAccount();
        if (quantity == 0) revert InvalidQuantity();
        if (claimsById[claimIdHash].status != ClaimStatus.NONE) revert ClaimAlreadyExists();

        if (claimType == ClaimType.OBP_READY_RECOVERY_CLAIM) {
            if (isOfficialCredit) revert OfficialCreditNotAllowed();
            if (!exclusive) revert InvalidClaim();
            _requireEligibleSourceAttestation(assetIdHash, sourceAttestationHash, quantity);
            _requireWithinEligibleQuantity(assetIdHash, claimType, quantity);
        }

        claimsById[claimIdHash] = Claim({
            claimIdHash: claimIdHash,
            claimType: claimType,
            assetIdHash: assetIdHash,
            sourceAttestationHash: sourceAttestationHash,
            issuer: msg.sender,
            holder: holder,
            quantity: quantity,
            exclusive: exclusive,
            isOfficialCredit: isOfficialCredit,
            status: ClaimStatus.ACTIVE
        });

        if (exclusive) {
            activeExclusiveQuantityByAssetAndType[assetIdHash][claimType] += quantity;
        }

        emit ClaimCreated(
            claimIdHash,
            claimType,
            assetIdHash,
            sourceAttestationHash,
            msg.sender,
            holder,
            quantity,
            exclusive
        );
    }

    function consumeClaim(bytes32 claimIdHash) external {
        Claim storage claim = _requireActiveClaim(claimIdHash);
        if (claim.holder != msg.sender && claim.issuer != msg.sender) revert InvalidAccount();
        _closeClaim(claim, ClaimStatus.CONSUMED);
        emit ClaimConsumed(claimIdHash);
    }

    function revokeClaim(bytes32 claimIdHash) external {
        Claim storage claim = _requireActiveClaim(claimIdHash);
        if (claim.issuer != msg.sender) revert InvalidAccount();
        _closeClaim(claim, ClaimStatus.REVOKED);
        emit ClaimRevoked(claimIdHash);
    }

    function disputeClaim(bytes32 claimIdHash) external {
        Claim storage claim = _requireActiveClaim(claimIdHash);
        if (claim.holder != msg.sender && claim.issuer != msg.sender) revert InvalidAccount();
        _closeClaim(claim, ClaimStatus.DISPUTED);
        emit ClaimDisputed(claimIdHash);
    }

    function getClaim(bytes32 claimIdHash) external view returns (Claim memory) {
        Claim memory claim = claimsById[claimIdHash];
        if (claim.status == ClaimStatus.NONE) revert ClaimNotFound();
        return claim;
    }

    function activeExclusiveQuantity(bytes32 assetIdHash, ClaimType claimType) external view returns (uint256) {
        return activeExclusiveQuantityByAssetAndType[assetIdHash][claimType];
    }

    function eligibleObpReadyQuantity(bytes32 assetIdHash) public view returns (uint256) {
        uint256 processed = attestationRegistry.activeQuantity(
            assetIdHash,
            AttestationRegistry.AttestationType.PROCESSING_CONFIRMED
        );
        if (processed > 0) return processed;
        return attestationRegistry.activeQuantity(assetIdHash, AttestationRegistry.AttestationType.RECEIPT_CONFIRMED);
    }

    function _requireWithinEligibleQuantity(bytes32 assetIdHash, ClaimType claimType, uint256 quantity) private view {
        uint256 activeExclusive = activeExclusiveQuantityByAssetAndType[assetIdHash][claimType];
        uint256 eligible = eligibleObpReadyQuantity(assetIdHash);
        if (activeExclusive + quantity > eligible) revert ClaimQuantityExceedsEligible();
    }

    function _requireEligibleSourceAttestation(
        bytes32 assetIdHash,
        bytes32 sourceAttestationHash,
        uint256 quantity
    ) private view {
        AttestationRegistry.Attestation memory source = attestationRegistry.getAttestation(sourceAttestationHash);
        bool sourceTypeEligible = source.attestationType == AttestationRegistry.AttestationType.RECEIPT_CONFIRMED
            || source.attestationType == AttestationRegistry.AttestationType.PROCESSING_CONFIRMED;
        if (
            source.status != AttestationRegistry.AttestationStatus.ACTIVE
                || source.assetIdHash != assetIdHash
                || !sourceTypeEligible
                || source.quantity < quantity
        ) {
            revert InvalidSourceAttestation();
        }
    }

    function _requireActiveClaim(bytes32 claimIdHash) private view returns (Claim storage) {
        Claim storage claim = claimsById[claimIdHash];
        if (claim.status == ClaimStatus.NONE) revert ClaimNotFound();
        if (claim.status != ClaimStatus.ACTIVE) revert InvalidStatus();
        return claim;
    }

    function _closeClaim(Claim storage claim, ClaimStatus status) private {
        if (claim.exclusive) {
            activeExclusiveQuantityByAssetAndType[claim.assetIdHash][claim.claimType] -= claim.quantity;
        }
        claim.status = status;
    }
}
