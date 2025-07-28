// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.29;

import {IAggregationRouterV6} from "../../src/interfaces/IAggregationRouterV6.sol";

contract MockRouter is IAggregationRouterV6 {
    bool public fail; // toggles slippage failure

    function setFail(bool _fail) external {
        fail = _fail;
    }

    function swap(address, SwapDescription calldata lastDescription, bytes calldata)
        external
        payable
        override
        returns (uint256 returnAmount, uint256 gasLeft)
    {
        if (fail) return (lastDescription.minReturnAmount - 1, gasleft());
        return (lastDescription.minReturnAmount, gasleft());
    }
}
