// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IRecoveryLots, IVartulMoney} from "./VartulTypes.sol";

/// @title PayoutRouter
/// @notice Splits the collector share of a settlement across the safai saathis who contributed
/// to the settled lots, pro rata on their verified (non-excluded) grams. Collector accounts are
/// pseudonymous; the off-ledger payout rail (UPI) maps them to bank accounts. Any rounding
/// remainder, or the whole share when no grams qualify, goes to the originator's treasury.
contract PayoutRouter {
    IVartulMoney public immutable money;
    IRecoveryLots public immutable lots;
    address public immutable escrow;

    event CollectorPaid(uint256 indexed lotId, address indexed collector, uint256 grams, uint256 amount);
    event RemainderPaid(address indexed to, uint256 amount);

    error Denied();
    error InvalidInput();

    constructor(address moneyAddress, address lotsAddress, address escrowAddress) {
        if (moneyAddress == address(0) || lotsAddress == address(0) || escrowAddress == address(0)) {
            revert InvalidInput();
        }
        money = IVartulMoney(moneyAddress);
        lots = IRecoveryLots(lotsAddress);
        escrow = escrowAddress;
    }

    /// @dev The escrow transfers `amount` to this contract before calling.
    function distribute(uint256[] calldata lotIds, uint256 amount, address remainderTo) external {
        if (msg.sender != escrow) revert Denied();
        if (remainderTo == address(0)) revert InvalidInput();
        uint256 totalGrams;
        for (uint256 i = 0; i < lotIds.length; i++) {
            (, uint256[] memory grams, uint256[] memory excluded) = lots.getContributions(lotIds[i]);
            for (uint256 j = 0; j < grams.length; j++) {
                totalGrams += grams[j] - excluded[j];
            }
        }
        uint256 paid;
        if (totalGrams > 0 && amount > 0) {
            for (uint256 i = 0; i < lotIds.length; i++) {
                (address[] memory addrs, uint256[] memory grams, uint256[] memory excluded) =
                    lots.getContributions(lotIds[i]);
                for (uint256 j = 0; j < addrs.length; j++) {
                    uint256 net = grams[j] - excluded[j];
                    if (net == 0) continue;
                    uint256 share = amount * net / totalGrams;
                    if (share == 0) continue;
                    paid += share;
                    if (!money.transfer(addrs[j], share)) revert Denied();
                    emit CollectorPaid(lotIds[i], addrs[j], net, share);
                }
            }
        }
        uint256 remainder = amount - paid;
        if (remainder > 0) {
            if (!money.transfer(remainderTo, remainder)) revert Denied();
            emit RemainderPaid(remainderTo, remainder);
        }
    }
}
