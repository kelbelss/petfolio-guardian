// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.29;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {TwapDcaHook} from "../src/TwapDcaHook.sol";

contract DeployTwap is Script {
    function run() external {
        // 1. read key from the env
        uint256 privateK = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(privateK);

        // 2. deploy twap hook, pointing at real LOP
        address limitOrderProtocol = 0x111111125421cA6dc452d289314280a0f8842A65;
        TwapDcaHook twapHook = new TwapDcaHook(limitOrderProtocol);
        console.log("TwapDcaHook deployed at:", address(twapHook));

        vm.stopBroadcast();
    }
}
