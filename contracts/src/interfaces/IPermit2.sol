// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

interface IPermit2 {
    function permitTransferFrom(bytes calldata permit2Data) external;
}
