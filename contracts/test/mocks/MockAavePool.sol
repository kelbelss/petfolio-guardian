// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.29;

import {IAavePool} from "../../src/TwapDcaHook.sol";

contract MockAavePool is IAavePool {
    bool public called;
    address public asset;
    uint256 public amount;
    address public onBehalfOf;

    function supply(address asset_, uint256 amt, address onBehalfOf_, uint16) external override {
        called = true;
        asset = asset_;
        amount = amt;
        onBehalfOf = onBehalfOf_;
    }
}
