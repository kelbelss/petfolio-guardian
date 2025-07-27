// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.29;

// Imports
import {IInteractionNotificationReceiver} from "./interfaces/IInteractionNotificationReceiver.sol";

import {IAggregationRouterV6} from "./interfaces/IAggregationRouterV6.sol";

/**
 * @title TwapDcaHook
 * @notice 1inch Limit Order Protocol v3 hook that enforces a time delay between consecutive fills,
 *         enabling TWAP/DCA behaviour.
 * @author Kelly Smulian
 */
contract TwapDcaHook is IInteractionNotificationReceiver {
    // --- Events ---
    event TwapDcaExecuted(); // TODO: decide on params

    // --- Errors ---
    error OnlyLimitOrderProtocol();

    // --- State ---
    /// @dev Hard‑coded Limit Order Protocol address
    address public immutable LIMIT_ORDER_PROTOCOL;

    /// @notice The next timestamp that an order (id by 712 hash) can be filled again
    mapping(bytes32 => uint64) public nextFillTime;

    /// @dev Immutable params packed into `order.interaction`
    struct TwapParams {
        address user; // Wallet DCA‑ing for
        uint64 intervalSecs; // Minimum seconds between fills
        uint256 chunkIn; // Maker amount per fill
        uint256 minOut; // Slippage guard for taker amount
        address router; // 1inch Aggregation Router
        bytes swapCalldata; // Encoded call data for router
    }

    // --- Modifiers ---
    modifier onlyLOP() {
        if (msg.sender != LIMIT_ORDER_PROTOCOL) revert OnlyLimitOrderProtocol();
        _;
    }

    // --- Constructor ---
    constructor(address _limitOrderProtocol) {
        LIMIT_ORDER_PROTOCOL = _limitOrderProtocol;
    }

    // --- Functions ---
}
