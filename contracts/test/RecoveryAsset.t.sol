// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../src/ParticipantRegistry.sol";
import "../src/CredentialRegistry.sol";
import "../src/RecoveryAsset.sol";

contract RecoveryAssetActor {
    function mint(
        RecoveryAsset recoveryAsset,
        address to,
        uint256 tokenId,
        uint256 quantity,
        string memory metadataUri,
        bytes32 assetIdHash,
        bytes32 evidenceRoot
    ) external {
        recoveryAsset.mintAsset(to, tokenId, quantity, metadataUri, assetIdHash, evidenceRoot);
    }

    function lock(RecoveryAsset recoveryAsset, uint256 tokenId, uint256 quantity, bytes32 settlementId) external {
        recoveryAsset.lock(address(this), tokenId, quantity, settlementId);
    }

    function unlock(RecoveryAsset recoveryAsset, uint256 tokenId, uint256 quantity, bytes32 settlementId) external {
        recoveryAsset.unlock(address(this), tokenId, quantity, settlementId);
    }
}

contract RecoveryAssetTest {
    uint8 private constant ROLE_TOKENISER = 5;

    ParticipantRegistry private participantRegistry;
    CredentialRegistry private credentialRegistry;
    RecoveryAsset private recoveryAsset;

    RecoveryAssetActor private tokeniser;
    RecoveryAssetActor private unauthorized;
    address private constant HOLDER = address(0x2222222222222222222222222222222222222222);

    bytes32 private constant TOKENISER_ID_HASH = keccak256("ORG-SUMA-001");
    bytes32 private constant ASSET_ID_HASH = keccak256("RWA-RAI-2026-000001");
    bytes32 private constant EVIDENCE_ROOT = keccak256("EVM-000001");
    bytes32 private constant ATTESTATION_HASH = keccak256("ATT-000001");
    uint256 private constant TOKEN_ID = 1000001;

    function setUp() public {
        participantRegistry = new ParticipantRegistry();
        credentialRegistry = new CredentialRegistry(address(participantRegistry));
        recoveryAsset = new RecoveryAsset(address(credentialRegistry));
        tokeniser = new RecoveryAssetActor();
        unauthorized = new RecoveryAssetActor();

        participantRegistry.registerParticipant(TOKENISER_ID_HASH, address(tokeniser));
        credentialRegistry.setEligibility(address(tokeniser), ROLE_TOKENISER, true, uint64(block.timestamp + 30 days));
        recoveryAsset.recordVerifiedAsset(ASSET_ID_HASH, EVIDENCE_ROOT, ATTESTATION_HASH);
    }

    function testVerifiedAssetMintsForTokeniser() public {
        tokeniser.mint(
            recoveryAsset,
            HOLDER,
            TOKEN_ID,
            1000,
            "ipfs://bafy-local-recovery-asset",
            ASSET_ID_HASH,
            EVIDENCE_ROOT
        );

        assert(recoveryAsset.totalSupply(TOKEN_ID) == 1000);
        assert(recoveryAsset.balanceOf(HOLDER, TOKEN_ID) == 1000);
        assert(recoveryAsset.assetHashByTokenId(TOKEN_ID) == ASSET_ID_HASH);
    }

    function testUnverifiedAssetCannotMint() public {
        try tokeniser.mint(
            recoveryAsset,
            HOLDER,
            TOKEN_ID,
            1000,
            "ipfs://bafy-local-recovery-asset",
            keccak256("RWA-RAI-2026-UNVERIFIED"),
            EVIDENCE_ROOT
        ) {
            assert(false);
        } catch (bytes memory) {
            assert(true);
        }
    }

    function testUnauthorizedCallerCannotMint() public {
        try unauthorized.mint(
            recoveryAsset,
            HOLDER,
            TOKEN_ID,
            1000,
            "ipfs://bafy-local-recovery-asset",
            ASSET_ID_HASH,
            EVIDENCE_ROOT
        ) {
            assert(false);
        } catch (bytes memory) {
            assert(true);
        }
    }

    function testLockAndUnlockAccountForAvailableBalance() public {
        tokeniser.mint(
            recoveryAsset,
            address(tokeniser),
            TOKEN_ID,
            1000,
            "ipfs://bafy-local-recovery-asset",
            ASSET_ID_HASH,
            EVIDENCE_ROOT
        );

        tokeniser.lock(recoveryAsset, TOKEN_ID, 400, keccak256("STL-000001"));

        assert(recoveryAsset.lockedBalanceOf(address(tokeniser), TOKEN_ID) == 400);
        assert(recoveryAsset.availableBalanceOf(address(tokeniser), TOKEN_ID) == 600);

        tokeniser.unlock(recoveryAsset, TOKEN_ID, 150, keccak256("STL-000001"));

        assert(recoveryAsset.lockedBalanceOf(address(tokeniser), TOKEN_ID) == 250);
        assert(recoveryAsset.availableBalanceOf(address(tokeniser), TOKEN_ID) == 750);
    }
}
