// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

interface IAllowanceTransfer {
    function transferFrom(address token, address from, address to, uint256 amount) external;
}
