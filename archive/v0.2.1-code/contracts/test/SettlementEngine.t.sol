// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../src/ParticipantRegistry.sol";
import "../src/CredentialRegistry.sol";
import "../src/RecoveryAsset.sol";
import "../src/DemoINR.sol";
import "../src/SettlementEngine.sol";

contract SettlementActor {
    function mintDinr(DemoINR dinr, address to, uint256 amount) external {
        dinr.mint(to, amount);
    }

    function approveDinr(DemoINR dinr, address spender, uint256 amount) external {
        dinr.approve(spender, amount);
    }

    function approveAsset(RecoveryAsset recoveryAsset, address operator) external {
        recoveryAsset.setApprovalForAll(operator, true);
    }

    function mintAsset(
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

    function createSettlement(
        SettlementEngine engine,
        bytes32 settlementId,
        bytes32 contractIdHash,
        address buyer,
        address seller,
        uint256 tokenId,
        uint256 quantity,
        uint256 paymentAmount,
        uint64 expiry
    ) external {
        engine.createSettlement(settlementId, contractIdHash, buyer, seller, tokenId, quantity, paymentAmount, expiry);
    }

    function fundSettlement(SettlementEngine engine, bytes32 settlementId) external {
        engine.fundSettlement(settlementId);
    }

    function lockAsset(SettlementEngine engine, bytes32 settlementId) external {
        engine.lockAsset(settlementId);
    }

    function evaluateSettlement(SettlementEngine engine, bytes32 settlementId) external returns (SettlementEngine.SettlementState) {
        return engine.evaluateSettlement(settlementId);
    }

    function settle(SettlementEngine engine, bytes32 settlementId) external {
        engine.settle(settlementId);
    }
}

contract SettlementEngineTest {
    uint8 private constant ROLE_RECOVERY_ORIGINATOR = 1;
    uint8 private constant ROLE_BUYER = 2;
    uint8 private constant ROLE_TOKENISER = 5;

    uint256 private constant TOKEN_ID = 1000001;
    uint256 private constant ASSET_QTY = 500;
    uint256 private constant PAYMENT = 10_000 ether;
    bytes32 private constant ASSET_ID_HASH = keccak256("RWA-RAI-2026-000001");
    bytes32 private constant EVIDENCE_ROOT = keccak256("EVM-000001");
    bytes32 private constant ATTESTATION_HASH = keccak256("ATT-000001");
    bytes32 private constant SETTLEMENT_ID = keccak256("STL-000001");
    bytes32 private constant CONTRACT_ID_HASH = keccak256("CTR-000123");

    ParticipantRegistry private participantRegistry;
    CredentialRegistry private credentialRegistry;
    RecoveryAsset private recoveryAsset;
    DemoINR private dinr;
    SettlementEngine private settlementEngine;
    SettlementActor private treasury;
    SettlementActor private tokeniser;
    SettlementActor private buyer;
    SettlementActor private seller;
    SettlementActor private outsider;

    function setUp() public {
        participantRegistry = new ParticipantRegistry();
        credentialRegistry = new CredentialRegistry(address(participantRegistry));
        recoveryAsset = new RecoveryAsset(address(credentialRegistry));
        treasury = new SettlementActor();
        tokeniser = new SettlementActor();
        buyer = new SettlementActor();
        seller = new SettlementActor();
        outsider = new SettlementActor();

        dinr = new DemoINR(address(credentialRegistry));
        settlementEngine = new SettlementEngine(address(dinr), address(recoveryAsset));
        dinr.setSystemAccount(address(settlementEngine), true);

        participantRegistry.registerParticipant(keccak256("ORG-SUMA-001"), address(tokeniser));
        participantRegistry.registerParticipant(keccak256("ORG-BUYER-001"), address(buyer));
        participantRegistry.registerParticipant(keccak256("ORG-AAMHI-001"), address(seller));
        credentialRegistry.setEligibility(address(tokeniser), ROLE_TOKENISER, true, uint64(block.timestamp + 30 days));
        credentialRegistry.setEligibility(address(buyer), ROLE_BUYER, true, uint64(block.timestamp + 30 days));
        credentialRegistry.setEligibility(address(seller), ROLE_RECOVERY_ORIGINATOR, true, uint64(block.timestamp + 30 days));

        recoveryAsset.recordVerifiedAsset(ASSET_ID_HASH, EVIDENCE_ROOT, ATTESTATION_HASH);
        tokeniser.mintAsset(
            recoveryAsset,
            address(seller),
            TOKEN_ID,
            1000,
            "ipfs://bafy-local-recovery-asset",
            ASSET_ID_HASH,
            EVIDENCE_ROOT
        );
    }

    function testOnlyTreasuryCanMintDinr() public {
        dinr.mint(address(buyer), PAYMENT);
        assert(dinr.balanceOf(address(buyer)) == PAYMENT);

        try buyer.mintDinr(dinr, address(buyer), 1 ether) {
            assert(false);
        } catch (bytes memory) {
            assert(true);
        }
    }

    function testBuyerFundsSellerLocksReadyAndSettleMovesBothLegs() public {
        dinr.mint(address(buyer), PAYMENT);
        buyer.approveDinr(dinr, address(settlementEngine), PAYMENT);
        seller.approveAsset(recoveryAsset, address(settlementEngine));

        buyer.createSettlement(
            settlementEngine,
            SETTLEMENT_ID,
            CONTRACT_ID_HASH,
            address(buyer),
            address(seller),
            TOKEN_ID,
            ASSET_QTY,
            PAYMENT,
            uint64(block.timestamp + 1 days)
        );

        buyer.fundSettlement(settlementEngine, SETTLEMENT_ID);
        assert(dinr.balanceOf(address(buyer)) == 0);
        assert(dinr.balanceOf(address(settlementEngine)) == PAYMENT);

        seller.lockAsset(settlementEngine, SETTLEMENT_ID);
        assert(recoveryAsset.lockedBalanceOf(address(seller), TOKEN_ID) == ASSET_QTY);

        SettlementEngine.SettlementState readyState = buyer.evaluateSettlement(settlementEngine, SETTLEMENT_ID);
        assert(uint8(readyState) == uint8(SettlementEngine.SettlementState.READY));

        buyer.settle(settlementEngine, SETTLEMENT_ID);
        assert(recoveryAsset.balanceOf(address(buyer), TOKEN_ID) == ASSET_QTY);
        assert(recoveryAsset.balanceOf(address(seller), TOKEN_ID) == 500);
        assert(recoveryAsset.lockedBalanceOf(address(seller), TOKEN_ID) == 0);
        assert(dinr.balanceOf(address(seller)) == PAYMENT);
        assert(dinr.balanceOf(address(settlementEngine)) == 0);
    }

    function testFundingFailsWithInsufficientDinr() public {
        dinr.mint(address(buyer), PAYMENT - 1 ether);
        buyer.approveDinr(dinr, address(settlementEngine), PAYMENT);
        buyer.createSettlement(
            settlementEngine,
            SETTLEMENT_ID,
            CONTRACT_ID_HASH,
            address(buyer),
            address(seller),
            TOKEN_ID,
            ASSET_QTY,
            PAYMENT,
            uint64(block.timestamp + 1 days)
        );

        try buyer.fundSettlement(settlementEngine, SETTLEMENT_ID) {
            assert(false);
        } catch (bytes memory) {
            assert(true);
        }
    }

    function testAssetLockFailsWithoutApproval() public {
        dinr.mint(address(buyer), PAYMENT);
        buyer.approveDinr(dinr, address(settlementEngine), PAYMENT);
        buyer.createSettlement(
            settlementEngine,
            SETTLEMENT_ID,
            CONTRACT_ID_HASH,
            address(buyer),
            address(seller),
            TOKEN_ID,
            ASSET_QTY,
            PAYMENT,
            uint64(block.timestamp + 1 days)
        );
        buyer.fundSettlement(settlementEngine, SETTLEMENT_ID);

        try seller.lockAsset(settlementEngine, SETTLEMENT_ID) {
            assert(false);
        } catch (bytes memory) {
            assert(true);
        }
    }

    function testIneligibleHolderCannotReceiveDinrMint() public {
        try dinr.mint(address(outsider), PAYMENT) {
            assert(false);
        } catch (bytes memory) {
            assert(true);
        }
    }
}
