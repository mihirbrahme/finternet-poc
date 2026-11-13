// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../src/ParticipantRegistry.sol";
import "../src/CredentialRegistry.sol";
import "../src/AttestationRegistry.sol";
import "../src/ClaimRegistry.sol";

contract ClaimsAttestationsActor {
    function submitReceipt(
        AttestationRegistry registry,
        bytes32 attestationHash,
        bytes32 assetIdHash,
        bytes32 settlementIdHash,
        uint256 quantity
    ) external {
        registry.submitAttestation(
            attestationHash,
            AttestationRegistry.AttestationType.RECEIPT_CONFIRMED,
            assetIdHash,
            settlementIdHash,
            quantity
        );
    }

    function createObpReadyClaim(
        ClaimRegistry registry,
        bytes32 claimIdHash,
        bytes32 assetIdHash,
        bytes32 sourceAttestationHash,
        address holder,
        uint256 quantity,
        bool isOfficialCredit
    ) external {
        registry.createClaim(
            claimIdHash,
            ClaimRegistry.ClaimType.OBP_READY_RECOVERY_CLAIM,
            assetIdHash,
            sourceAttestationHash,
            holder,
            quantity,
            true,
            isOfficialCredit
        );
    }
}

contract ClaimsAttestationsTest {
    uint8 private constant ROLE_PROCESSOR = 3;

    bytes32 private constant ASSET_ID_HASH = keccak256("RWA-RAI-2026-000001");
    bytes32 private constant OTHER_ASSET_ID_HASH = keccak256("RWA-RAI-2026-000002");
    bytes32 private constant SETTLEMENT_ID_HASH = keccak256("STL-000001");
    bytes32 private constant RECEIPT_HASH = keccak256("ATT-RECEIPT-000001");
    bytes32 private constant OTHER_RECEIPT_HASH = keccak256("ATT-RECEIPT-000002");

    ParticipantRegistry private participantRegistry;
    CredentialRegistry private credentialRegistry;
    AttestationRegistry private attestationRegistry;
    ClaimRegistry private claimRegistry;
    ClaimsAttestationsActor private processor;
    ClaimsAttestationsActor private holder;
    ClaimsAttestationsActor private outsider;

    function setUp() public {
        participantRegistry = new ParticipantRegistry();
        credentialRegistry = new CredentialRegistry(address(participantRegistry));
        attestationRegistry = new AttestationRegistry(address(credentialRegistry));
        claimRegistry = new ClaimRegistry(address(attestationRegistry));
        processor = new ClaimsAttestationsActor();
        holder = new ClaimsAttestationsActor();
        outsider = new ClaimsAttestationsActor();

        participantRegistry.registerParticipant(keccak256("ORG-PROCESSOR-001"), address(processor));
        participantRegistry.registerParticipant(keccak256("ORG-SPONSOR-001"), address(holder));
        credentialRegistry.setEligibility(address(processor), ROLE_PROCESSOR, true, uint64(block.timestamp + 30 days));
    }

    function testCredentialledProcessorCanSubmitReceiptConfirmed() public {
        processor.submitReceipt(attestationRegistry, RECEIPT_HASH, ASSET_ID_HASH, SETTLEMENT_ID_HASH, 500);

        AttestationRegistry.Attestation memory attestation = attestationRegistry.getAttestation(RECEIPT_HASH);
        assert(attestation.attestor == address(processor));
        assert(attestation.quantity == 500);
        assert(
            attestationRegistry.activeQuantity(
                ASSET_ID_HASH,
                AttestationRegistry.AttestationType.RECEIPT_CONFIRMED
            ) == 500
        );
    }

    function testUncredentialledAccountCannotSubmitReceiptConfirmed() public {
        try outsider.submitReceipt(attestationRegistry, RECEIPT_HASH, ASSET_ID_HASH, SETTLEMENT_ID_HASH, 500) {
            assert(false);
        } catch (bytes memory) {
            assert(true);
        }
    }

    function testObpReadyRecoveryClaimCannotExceedEligibleQuantity() public {
        processor.submitReceipt(attestationRegistry, RECEIPT_HASH, ASSET_ID_HASH, SETTLEMENT_ID_HASH, 500);

        try processor.createObpReadyClaim(
            claimRegistry,
            keccak256("CLM-000001"),
            ASSET_ID_HASH,
            RECEIPT_HASH,
            address(holder),
            501,
            false
        ) {
            assert(false);
        } catch (bytes memory) {
            assert(true);
        }
    }

    function testObpReadyRecoveryClaimRequiresMatchingSourceAttestation() public {
        processor.submitReceipt(attestationRegistry, RECEIPT_HASH, ASSET_ID_HASH, SETTLEMENT_ID_HASH, 500);
        processor.submitReceipt(attestationRegistry, OTHER_RECEIPT_HASH, OTHER_ASSET_ID_HASH, SETTLEMENT_ID_HASH, 500);

        try processor.createObpReadyClaim(
            claimRegistry,
            keccak256("CLM-000001"),
            ASSET_ID_HASH,
            OTHER_RECEIPT_HASH,
            address(holder),
            500,
            false
        ) {
            assert(false);
        } catch (bytes memory) {
            assert(true);
        }
    }

    function testDuplicateActiveExclusiveClaimIsRejected() public {
        processor.submitReceipt(attestationRegistry, RECEIPT_HASH, ASSET_ID_HASH, SETTLEMENT_ID_HASH, 500);

        processor.createObpReadyClaim(
            claimRegistry,
            keccak256("CLM-000001"),
            ASSET_ID_HASH,
            RECEIPT_HASH,
            address(holder),
            500,
            false
        );

        try processor.createObpReadyClaim(
            claimRegistry,
            keccak256("CLM-000002"),
            ASSET_ID_HASH,
            RECEIPT_HASH,
            address(holder),
            1,
            false
        ) {
            assert(false);
        } catch (bytes memory) {
            assert(true);
        }
    }
}
