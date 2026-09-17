// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IAttestationCredentialRegistry {
    function hasValidRole(address account, uint8 role) external view returns (bool);
}

contract AttestationRegistry {
    uint8 public constant ROLE_PROCESSOR = 3;

    enum AttestationType {
        ASSET_VERIFIED,
        RECEIPT_CONFIRMED,
        PROCESSING_CONFIRMED
    }

    enum AttestationStatus {
        NONE,
        ACTIVE,
        REVOKED,
        DISPUTED
    }

    struct Attestation {
        bytes32 attestationHash;
        AttestationType attestationType;
        address attestor;
        bytes32 assetIdHash;
        bytes32 settlementIdHash;
        uint256 quantity;
        AttestationStatus status;
    }

    IAttestationCredentialRegistry public immutable credentialRegistry;

    mapping(bytes32 => Attestation) private attestationsByHash;
    mapping(bytes32 => mapping(AttestationType => uint256)) private activeQuantityByAssetAndType;

    event AttestationSubmitted(
        bytes32 indexed attestationHash,
        AttestationType indexed attestationType,
        address indexed attestor,
        bytes32 assetIdHash,
        bytes32 settlementIdHash,
        uint256 quantity
    );
    event AttestationStatusChanged(bytes32 indexed attestationHash, AttestationStatus status);

    error InvalidAccount();
    error InvalidAttestation();
    error InvalidQuantity();
    error AttestationAlreadyExists();
    error MissingProcessorRole();
    error AttestationNotFound();
    error InvalidStatus();

    constructor(address credentialRegistryAddress) {
        if (credentialRegistryAddress == address(0)) revert InvalidAccount();
        credentialRegistry = IAttestationCredentialRegistry(credentialRegistryAddress);
    }

    function submitAttestation(
        bytes32 attestationHash,
        AttestationType attestationType,
        bytes32 assetIdHash,
        bytes32 settlementIdHash,
        uint256 quantity
    ) external {
        if (attestationHash == bytes32(0) || assetIdHash == bytes32(0)) revert InvalidAttestation();
        if (quantity == 0) revert InvalidQuantity();
        if (attestationsByHash[attestationHash].status != AttestationStatus.NONE) revert AttestationAlreadyExists();

        if (
            attestationType == AttestationType.RECEIPT_CONFIRMED
                || attestationType == AttestationType.PROCESSING_CONFIRMED
        ) {
            if (!credentialRegistry.hasValidRole(msg.sender, ROLE_PROCESSOR)) revert MissingProcessorRole();
        }

        attestationsByHash[attestationHash] = Attestation({
            attestationHash: attestationHash,
            attestationType: attestationType,
            attestor: msg.sender,
            assetIdHash: assetIdHash,
            settlementIdHash: settlementIdHash,
            quantity: quantity,
            status: AttestationStatus.ACTIVE
        });
        activeQuantityByAssetAndType[assetIdHash][attestationType] += quantity;

        emit AttestationSubmitted(attestationHash, attestationType, msg.sender, assetIdHash, settlementIdHash, quantity);
    }

    function revokeAttestation(bytes32 attestationHash) external {
        _setStatus(attestationHash, AttestationStatus.REVOKED);
    }

    function disputeAttestation(bytes32 attestationHash) external {
        _setStatus(attestationHash, AttestationStatus.DISPUTED);
    }

    function getAttestation(bytes32 attestationHash) external view returns (Attestation memory) {
        Attestation memory attestation = attestationsByHash[attestationHash];
        if (attestation.status == AttestationStatus.NONE) revert AttestationNotFound();
        return attestation;
    }

    function activeQuantity(bytes32 assetIdHash, AttestationType attestationType) external view returns (uint256) {
        return activeQuantityByAssetAndType[assetIdHash][attestationType];
    }

    function _setStatus(bytes32 attestationHash, AttestationStatus status) private {
        Attestation storage attestation = attestationsByHash[attestationHash];
        if (attestation.status == AttestationStatus.NONE) revert AttestationNotFound();
        if (attestation.attestor != msg.sender) revert InvalidAccount();
        if (attestation.status != AttestationStatus.ACTIVE) revert InvalidStatus();

        activeQuantityByAssetAndType[attestation.assetIdHash][attestation.attestationType] -= attestation.quantity;
        attestation.status = status;

        emit AttestationStatusChanged(attestationHash, status);
    }
}
