// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

// --- Minimal 1inch Aggregation Router v6 interface
// Just the pieces needed for hooks and tests

import {IERC20} from "../../lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";

interface IAggregationRouterV6 {
    // --- Structs ---
    struct SwapDescription {
        IERC20 srcToken; // Token being swapped from
        IERC20 dstToken; // Token being swapped to
        address payable srcReceiver; // Who sends srcToken
        address payable dstReceiver; // Who receives dstToken
        uint256 amount; // Amount of srcToken to swap
        uint256 minReturnAmount; // Minimum acceptable dstToken (slippage guard)
        uint256 flags; // Additional router flags
        bytes permit; // Optional ERC‑20 permit data
    }

    // --- Core Function ---
    /// @notice Executes a swap according to `desc` and extra `data` produced by the 1inch API
    /// @param executor  Address that executes low‑level calls inside the router (passed from API)
    /// @param desc      Swap description struct
    /// @param data      Arbitrary calldata with routes & executors (API‑generated)
    /// @return returnAmount   Amount of `dstToken` actually received
    /// @return gasLeft        Gas left after execution (router feature; rarely used)
    function swap(address executor, SwapDescription calldata desc, bytes calldata data)
        external
        payable
        returns (uint256 returnAmount, uint256 gasLeft);
}
