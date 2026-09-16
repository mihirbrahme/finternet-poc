// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface ISettlementDemoINR {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

interface ISettlementRecoveryAsset {
    function lock(address owner, uint256 tokenId, uint256 quantity, bytes32 settlementId) external;
    function unlock(address owner, uint256 tokenId, uint256 quantity, bytes32 settlementId) external;
    function safeTransferFrom(address from, address to, uint256 tokenId, uint256 quantity) external;
}

contract SettlementEngine {
    enum SettlementState {
        CREATED,
        FUNDED,
        ASSET_LOCKED,
        READY,
        SETTLED,
        REFUNDED,
        EXPIRED
    }

    struct Settlement {
        bytes32 settlementId;
        bytes32 contractIdHash;
        address buyer;
        address seller;
        uint256 tokenId;
        uint256 quantity;
        uint256 paymentAmount;
        uint64 expiry;
        bool funded;
        bool assetLocked;
        SettlementState state;
    }

    ISettlementDemoINR public immutable dinr;
    ISettlementRecoveryAsset public immutable recoveryAsset;

    mapping(bytes32 => Settlement) private settlements;

    event SettlementCreated(
        bytes32 indexed settlementId,
        bytes32 indexed contractIdHash,
        address indexed buyer,
        address seller,
        uint256 tokenId,
        uint256 quantity,
        uint256 paymentAmount,
        uint64 expiry
    );
    event SettlementFunded(bytes32 indexed settlementId, address indexed buyer, uint256 amount);
    event AssetLocked(bytes32 indexed settlementId, address indexed seller, uint256 tokenId, uint256 quantity);
    event SettlementReady(bytes32 indexed settlementId);
    event SettlementExecuted(bytes32 indexed settlementId, address indexed buyer, address indexed seller);
    event SettlementRefunded(bytes32 indexed settlementId, address indexed buyer, address indexed seller);
    event SettlementExpired(bytes32 indexed settlementId);

    error InvalidAccount();
    error InvalidAmount();
    error InvalidSettlementId();
    error SettlementAlreadyExists();
    error SettlementNotFound();
    error WrongCaller();
    error InvalidState();
    error SettlementExpiredError();
    error SettlementNotExpired();
    error TransferFailed();

    constructor(address dinrAddress, address recoveryAssetAddress) {
        if (dinrAddress == address(0) || recoveryAssetAddress == address(0)) revert InvalidAccount();
        dinr = ISettlementDemoINR(dinrAddress);
        recoveryAsset = ISettlementRecoveryAsset(recoveryAssetAddress);
    }

    function createSettlement(
        bytes32 settlementId,
        bytes32 contractIdHash,
        address buyer,
        address seller,
        uint256 tokenId,
        uint256 quantity,
        uint256 paymentAmount,
        uint64 expiry
    ) external {
        if (settlementId == bytes32(0)) revert InvalidSettlementId();
        if (settlements[settlementId].settlementId != bytes32(0)) revert SettlementAlreadyExists();
        if (buyer == address(0) || seller == address(0)) revert InvalidAccount();
        if (tokenId == 0 || quantity == 0 || paymentAmount == 0) revert InvalidAmount();
        if (expiry <= block.timestamp) revert SettlementExpiredError();

        settlements[settlementId] = Settlement({
            settlementId: settlementId,
            contractIdHash: contractIdHash,
            buyer: buyer,
            seller: seller,
            tokenId: tokenId,
            quantity: quantity,
            paymentAmount: paymentAmount,
            expiry: expiry,
            funded: false,
            assetLocked: false,
            state: SettlementState.CREATED
        });

        emit SettlementCreated(settlementId, contractIdHash, buyer, seller, tokenId, quantity, paymentAmount, expiry);
    }

    function fundSettlement(bytes32 settlementId) external {
        Settlement storage settlement = _requireSettlement(settlementId);
        _requireOpen(settlement);
        if (msg.sender != settlement.buyer) revert WrongCaller();
        if (settlement.funded) revert InvalidState();

        bool ok = dinr.transferFrom(settlement.buyer, address(this), settlement.paymentAmount);
        if (!ok) revert TransferFailed();

        settlement.funded = true;
        _updateReadyState(settlement);
        emit SettlementFunded(settlementId, settlement.buyer, settlement.paymentAmount);
    }

    function lockAsset(bytes32 settlementId) external {
        Settlement storage settlement = _requireSettlement(settlementId);
        _requireOpen(settlement);
        if (msg.sender != settlement.seller) revert WrongCaller();
        if (settlement.assetLocked) revert InvalidState();

        recoveryAsset.lock(settlement.seller, settlement.tokenId, settlement.quantity, settlementId);
        settlement.assetLocked = true;
        _updateReadyState(settlement);
        emit AssetLocked(settlementId, settlement.seller, settlement.tokenId, settlement.quantity);
    }

    function evaluateSettlement(bytes32 settlementId) external returns (SettlementState) {
        Settlement storage settlement = _requireSettlement(settlementId);
        _requireOpen(settlement);
        _updateReadyState(settlement);
        return settlement.state;
    }

    function settle(bytes32 settlementId) external {
        Settlement storage settlement = _requireSettlement(settlementId);
        _requireOpen(settlement);
        _updateReadyState(settlement);
        if (settlement.state != SettlementState.READY) revert InvalidState();

        settlement.state = SettlementState.SETTLED;
        recoveryAsset.unlock(settlement.seller, settlement.tokenId, settlement.quantity, settlementId);
        recoveryAsset.safeTransferFrom(settlement.seller, settlement.buyer, settlement.tokenId, settlement.quantity);
        bool ok = dinr.transfer(settlement.seller, settlement.paymentAmount);
        if (!ok) revert TransferFailed();

        emit SettlementExecuted(settlementId, settlement.buyer, settlement.seller);
    }

    function refund(bytes32 settlementId) external {
        Settlement storage settlement = _requireSettlement(settlementId);
        if (settlement.state == SettlementState.SETTLED || settlement.state == SettlementState.REFUNDED) {
            revert InvalidState();
        }
        if (msg.sender != settlement.buyer && msg.sender != settlement.seller) revert WrongCaller();

        if (settlement.assetLocked) {
            recoveryAsset.unlock(settlement.seller, settlement.tokenId, settlement.quantity, settlementId);
            settlement.assetLocked = false;
        }
        if (settlement.funded) {
            bool ok = dinr.transfer(settlement.buyer, settlement.paymentAmount);
            if (!ok) revert TransferFailed();
            settlement.funded = false;
        }

        settlement.state = SettlementState.REFUNDED;
        emit SettlementRefunded(settlementId, settlement.buyer, settlement.seller);
    }

    function expire(bytes32 settlementId) external {
        Settlement storage settlement = _requireSettlement(settlementId);
        if (settlement.state == SettlementState.SETTLED || settlement.state == SettlementState.REFUNDED) {
            revert InvalidState();
        }
        if (block.timestamp <= settlement.expiry) revert SettlementNotExpired();
        settlement.state = SettlementState.EXPIRED;
        emit SettlementExpired(settlementId);
    }

    function getSettlement(bytes32 settlementId) external view returns (Settlement memory) {
        return _requireSettlement(settlementId);
    }

    function _updateReadyState(Settlement storage settlement) private {
        if (settlement.funded && settlement.assetLocked) {
            if (settlement.state != SettlementState.READY) {
                settlement.state = SettlementState.READY;
                emit SettlementReady(settlement.settlementId);
            }
        } else if (settlement.funded) {
            settlement.state = SettlementState.FUNDED;
        } else if (settlement.assetLocked) {
            settlement.state = SettlementState.ASSET_LOCKED;
        } else {
            settlement.state = SettlementState.CREATED;
        }
    }

    function _requireOpen(Settlement storage settlement) private view {
        if (settlement.state == SettlementState.SETTLED || settlement.state == SettlementState.REFUNDED) {
            revert InvalidState();
        }
        if (settlement.state == SettlementState.EXPIRED || block.timestamp > settlement.expiry) {
            revert SettlementExpiredError();
        }
    }

    function _requireSettlement(bytes32 settlementId) private view returns (Settlement storage) {
        Settlement storage settlement = settlements[settlementId];
        if (settlement.settlementId == bytes32(0)) revert SettlementNotFound();
        return settlement;
    }
}
