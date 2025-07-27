// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

interface IPermit2 {
    function permitTransferFrom(bytes calldata permit2Data) external;
}
