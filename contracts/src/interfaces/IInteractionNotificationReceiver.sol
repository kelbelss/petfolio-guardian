// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

/// @dev 1inch Limit Order Protocol v3 hook callback interface.
interface IInteractionNotificationReceiver {
    /// Called before the Limit Order Protocol transfers assets.
    function preInteraction(bytes calldata data) external;

    /// Called *after* settlement
    // function postInteraction(bytes calldata data) external;
}
