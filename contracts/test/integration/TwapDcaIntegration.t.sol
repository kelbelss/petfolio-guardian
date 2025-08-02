// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.29;

import {Test} from "forge-std/Test.sol";
import {TwapDcaHook} from "../../src/TwapDcaHook.sol";
import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";

// temporary mocks
import {MockPermit2} from "../mocks/MockPermit2.sol";
import {MockRouter} from "../mocks/MockRouter.sol";

contract TwapDcaIntegration is Test {
    TwapDcaHook twapDcaHook;
    IERC20 constant USDC = IERC20(0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48); // mainnet
    address constant LOP = 0x111111125421cA6dc452d289314280a0f8842A65;
    address constant PERMIT2 = 0x000000000022D473030F116dDEE9F6B43aC78BA3;
    address router = LOP; // same address for v6 router

    // temporary mock instances
    MockPermit2 permit2;
    MockRouter routerMock;

    // Circle’s USDC treasury wallet as whale
    address constant whale = 0x55FE002aefF02F77364de339a1292923A15844B8;

    function setUp() public {
        // fork url passed via terminal
        // vm.createSelectFork(vm.envUint("MAINNET_RPC_URL"));

        // deploy mocks locally
        permit2 = new MockPermit2();
        routerMock = new MockRouter();

        // impersonate whale and fund with ETH for gas
        vm.startPrank(whale);
        vm.deal(whale, 10 ether);
        vm.stopPrank();

        // deploy hook as mock LOP owner (use this contract as deployer, but prank as LOP)
        twapDcaHook = new TwapDcaHook(LOP); // deployed from address(this)
    }

    function testFirstFillOnRealRouter() public {
        // read the pre‑built blob - when script works
        // string memory hexBlob = vm.readFile("bot/interactionBlob.hex");
        // bytes memory interaction = vm.parseBytes(hexBlob);

        // ─── STUBBING blob in-code for now ───
        TwapDcaHook.TwapParams memory params = TwapDcaHook.TwapParams({
            rawOrder: abi.encodePacked(uint8(0x01)), // dummy rawOrder
            orderHash: keccak256(abi.encodePacked(uint8(0x01))), // must match rawOrder
            user: whale,
            intervalSecs: 3600,
            chunkIn: 1e6,
            minOut: 1,
            router: address(routerMock), // mock router
            swapCalldata: bytes(""), // no-op swap
            srcToken: address(USDC),
            dstToken: address(USDC), // reuse USDC to simplify
            permit2: address(permit2), // mock permit2
            permit2Data: bytes(""), // no-op permit
            depositToAave: false, // normal wallet flow
            recipient: address(0), // 0 ⇒ whale receives
            aavePool: address(0) // unused when depositToAave==false
        });
        bytes memory interaction = abi.encode(params);

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

// forge test --match-path test/integration/TwapDcaIntegration.t.sol
