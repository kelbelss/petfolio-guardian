// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.29;

import {Test} from "forge-std/Test.sol";
import {TwapDcaHook} from "../../src/TwapDcaHook.sol";
import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";

contract TwapDcaIntegration is Test {
    TwapDcaHook twapDcaHook;
    IERC20 constant USDC = IERC20(0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48); // mainnet
    address constant LOP = 0x111111125421cA6dc452d289314280a0f8842A65;
    address constant PERMIT2 = 0x000000000022D473030F116dDEE9F6B43aC78BA3;
    address router = LOP; // same address for v6 router

    // Circle’s USDC treasury wallet as whale
    address constant whale = 0x55FE002aefF02F77364de339a1292923A15844B8;

    function setUp() public {
        // fork url passed via terminal
        vm.createSelectFork(vm.rpcUrl("mainnet"));

        // impersonate whale and fund with ETH for gas
        vm.startPrank(whale);
        vm.deal(whale, 10 ether);
        vm.stopPrank();

        // deploy hook as mock LOP owner (use this contract as deployer, but prank as LOP)
        twapDcaHook = new TwapDcaHook(LOP); // deployed from address(this)
    }

    function testFirstFillOnRealRouter() public {
        // read the pre‑built blob
        string memory hexBlob = vm.readFile("bot/interactionBlob.hex");
        bytes memory interaction = vm.parseBytes(hexBlob);

        // expect event
        vm.expectEmit(true, false, false, false);
        bytes32 orderHash = bytes32(abi.decode(interaction, (TwapDcaHook.TwapParams)).orderHash);
        uint64 nextFillTime = uint64(block.timestamp + 3600); // 1 hour from now
        emit TwapDcaHook.TwapDcaExecuted(orderHash, 1e6, 1, nextFillTime);

        // call as LOP
        vm.prank(LOP);
        twapDcaHook.preInteraction(interaction);

        // assert gate updated
        uint64 next = twapDcaHook.nextFillTime(orderHash);
        assertGt(next, uint64(block.timestamp));
    }
}
