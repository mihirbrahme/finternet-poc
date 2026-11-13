// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {LotState, LotView, Roles, IVartulRegistry, IVartulMoney, IRecoveryLots, IVartulClaims} from "./VartulTypes.sol";

/// @title MaterialSettlement
/// @notice Delivery versus payment for verified material. The lot holder offers its entitlement at a
/// price; an eligible buyer accepts, and payment, entitlement transfer and the buyer's EPR-ready
/// supply claim happen in one transaction or not at all.
contract MaterialSettlement {
    uint8 private constant EPR_READY_SUPPLY = 2;

    enum OfferStatus { NONE, OPEN, FILLED, WITHDRAWN }

    struct Offer {
        uint256 lotId;
        address seller;
        address buyer; // zero = any eligible buyer
        uint256 price;
        uint64 expiresAt;
        OfferStatus status;
    }

    IVartulRegistry public immutable registry;
    IVartulMoney public immutable money;
    IRecoveryLots public immutable lots;
    IVartulClaims public immutable claims;
    Offer[] private offers;

    event OfferCreated(uint256 indexed offerId, uint256 indexed lotId, address indexed seller, address buyer, uint256 price, uint64 expiresAt);
    event OfferWithdrawn(uint256 indexed offerId);
    event MaterialSettled(
        uint256 indexed offerId, uint256 indexed lotId, address indexed buyer, address seller, uint256 grams,
        uint256 price, uint256 claimId
    );

    error Denied();
    error InvalidInput();
    error InvalidState();

    constructor(address registryAddress, address moneyAddress, address lotsAddress, address claimsAddress) {
        if (
            registryAddress == address(0) || moneyAddress == address(0) || lotsAddress == address(0)
                || claimsAddress == address(0)
        ) revert InvalidInput();
        registry = IVartulRegistry(registryAddress);
        money = IVartulMoney(moneyAddress);
        lots = IRecoveryLots(lotsAddress);
        claims = IVartulClaims(claimsAddress);
        offers.push(); // offer ids start at 1
    }

    function createOffer(uint256 lotId, address buyer, uint256 price, uint64 expiresAt) external returns (uint256 id) {
        LotView memory lot = lots.getLot(lotId);
        if (lot.state != LotState.VERIFIED && lot.state != LotState.SETTLED) revert InvalidState();
        if (block.timestamp < lot.challengeDeadline) revert InvalidState();
        if (registry.participantOf(msg.sender) != lot.originator || !registry.hasRole(msg.sender, Roles.ORIGINATOR)) {
            revert Denied();
        }
        if (price == 0 || expiresAt <= block.timestamp) revert InvalidInput();
        if (buyer != address(0) && !registry.hasRole(buyer, Roles.BUYER)) revert InvalidInput();
        address seller = registry.treasuryOf(lot.originator);
        id = offers.length;
        offers.push(Offer(lotId, seller, buyer, price, expiresAt, OfferStatus.OPEN));
        emit OfferCreated(id, lotId, seller, buyer, price, expiresAt);
    }

    function withdrawOffer(uint256 id) external {
        Offer storage o = _openOffer(id);
        LotView memory lot = lots.getLot(o.lotId);
        if (registry.participantOf(msg.sender) != lot.originator) revert Denied();
        o.status = OfferStatus.WITHDRAWN;
        emit OfferWithdrawn(id);
    }

    /// @notice The buyer must have approved this contract for `price` dINR.
    function acceptOffer(uint256 id) external returns (uint256 claimId) {
        Offer storage o = _openOffer(id);
        if (block.timestamp > o.expiresAt) revert InvalidState();
        if (o.buyer != address(0) && o.buyer != msg.sender) revert Denied();
        if (!registry.hasRole(msg.sender, Roles.BUYER)) revert Denied();
        LotView memory lot = lots.getLot(o.lotId);
        if (lot.state != LotState.VERIFIED && lot.state != LotState.SETTLED) revert InvalidState();
        o.status = OfferStatus.FILLED;
        if (!money.transferFrom(msg.sender, o.seller, o.price)) revert Denied();
        uint256 grams = lots.settlementTransfer(o.seller, msg.sender, o.lotId);
        claimId = claims.allocate(EPR_READY_SUPPLY, msg.sender, o.lotId, lot.eligibleGrams, lot.programmeId);
        emit MaterialSettled(id, o.lotId, msg.sender, o.seller, grams, o.price, claimId);
    }

    function getOffer(uint256 id) external view returns (Offer memory) {
        if (id == 0 || id >= offers.length) revert InvalidInput();
        return offers[id];
    }

    function offerCount() external view returns (uint256) {
        return offers.length - 1;
    }

    function _openOffer(uint256 id) private view returns (Offer storage o) {
        if (id == 0 || id >= offers.length) revert InvalidInput();
        o = offers[id];
        if (o.status != OfferStatus.OPEN) revert InvalidState();
    }
}
