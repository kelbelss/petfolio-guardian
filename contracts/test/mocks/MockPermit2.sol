// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.29;

import {IPermit2} from "../../src/interfaces/IPermit2.sol";
import {IAllowanceTransfer} from "../../src/interfaces/IAllowanceTransfer.sol";

contract MockPermit2 is IPermit2, IAllowanceTransfer {
    function permitTransferFrom(bytes calldata) external override {}
    function transferFrom(address, address, address, uint256) external override {}
}
