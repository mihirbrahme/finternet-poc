// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../src/ParticipantRegistry.sol";
import "../src/CredentialRegistry.sol";

contract ParticipantCredentialTest {
    uint8 private constant ROLE_RECOVERY_ORIGINATOR = 1;

    ParticipantRegistry private participantRegistry;
    CredentialRegistry private credentialRegistry;

    address private constant AAMHI_ACCOUNT = address(0x2222222222222222222222222222222222222222);
    bytes32 private constant AAMHI_ID_HASH = keccak256("ORG-AAMHI-001");

    function setUp() public {
        participantRegistry = new ParticipantRegistry();
        credentialRegistry = new CredentialRegistry(address(participantRegistry));
    }

    function testAdminRegistersAamhiAccount() public {
        participantRegistry.registerParticipant(AAMHI_ID_HASH, AAMHI_ACCOUNT);

        (bytes32 participantIdHash, address account, bool active) = participantRegistry.getParticipant(AAMHI_ID_HASH);

        assert(participantIdHash == AAMHI_ID_HASH);
        assert(account == AAMHI_ACCOUNT);
        assert(active);
    }

    function testActiveAccountLookupWorks() public {
        participantRegistry.registerParticipant(AAMHI_ID_HASH, AAMHI_ACCOUNT);

        assert(participantRegistry.isActiveAccount(AAMHI_ACCOUNT));
        assert(participantRegistry.getParticipantIdHash(AAMHI_ACCOUNT) == AAMHI_ID_HASH);
    }

    function testEligibilityReturnsTrueForValidRole() public {
        participantRegistry.registerParticipant(AAMHI_ID_HASH, AAMHI_ACCOUNT);
        credentialRegistry.setEligibility(AAMHI_ACCOUNT, ROLE_RECOVERY_ORIGINATOR, true, uint64(block.timestamp + 30 days));

        assert(credentialRegistry.hasValidRole(AAMHI_ACCOUNT, ROLE_RECOVERY_ORIGINATOR));
    }

    function testRevokedEligibilityReturnsFalse() public {
        participantRegistry.registerParticipant(AAMHI_ID_HASH, AAMHI_ACCOUNT);
        credentialRegistry.setEligibility(AAMHI_ACCOUNT, ROLE_RECOVERY_ORIGINATOR, true, uint64(block.timestamp + 30 days));
        credentialRegistry.revokeEligibility(AAMHI_ACCOUNT, ROLE_RECOVERY_ORIGINATOR);

        assert(!credentialRegistry.hasValidRole(AAMHI_ACCOUNT, ROLE_RECOVERY_ORIGINATOR));
    }

    function testDisabledParticipantReturnsFalse() public {
        participantRegistry.registerParticipant(AAMHI_ID_HASH, AAMHI_ACCOUNT);
        credentialRegistry.setEligibility(AAMHI_ACCOUNT, ROLE_RECOVERY_ORIGINATOR, true, uint64(block.timestamp + 30 days));
        participantRegistry.setParticipantStatus(AAMHI_ID_HASH, false);

        assert(!credentialRegistry.hasValidRole(AAMHI_ACCOUNT, ROLE_RECOVERY_ORIGINATOR));
    }

    function testExpiredEligibilityReturnsFalse() public {
        participantRegistry.registerParticipant(AAMHI_ID_HASH, AAMHI_ACCOUNT);
        credentialRegistry.setEligibility(AAMHI_ACCOUNT, ROLE_RECOVERY_ORIGINATOR, true, uint64(block.timestamp));

        assert(!credentialRegistry.hasValidRole(AAMHI_ACCOUNT, ROLE_RECOVERY_ORIGINATOR));
    }
}
