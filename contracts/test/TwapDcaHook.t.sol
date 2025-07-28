// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.29;

// --- Imports ---
import {Test} from "forge-std/Test.sol";

import {TwapDcaHook} from "../src/TwapDcaHook.sol";
import {MockPermit2} from "./mocks/MockPermit2.sol";
import {MockRouter} from "./mocks/MockRouter.sol";

// OpenZeppelin ERC-20 types for the test
import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {ERC20Mock} from "../lib/openzeppelin-contracts/contracts/mocks/token/ERC20Mock.sol";

contract TwapDcaHookTest is Test {
    TwapDcaHook public twapDcaHook;
    MockPermit2 public permit2;
    MockRouter public router;

    address maker = vm.addr(1);
    address taker = vm.addr(2);
    IERC20 usdc;

    function setUp() public {
        permit2 = new MockPermit2();
        router = new MockRouter();
        twapDcaHook = new TwapDcaHook(address(this)); // this acting as mock LOP
        ERC20Mock usdcMock = new ERC20Mock();
        usdcMock.mint(maker, 1e24); // 1 million USDC
        usdc = IERC20(address(usdcMock));
        // maker pre-mints USDC; bot/taker holds ETH (ignored here)
    }

    function _buildParams(uint64 interval) internal view returns (bytes memory interaction, bytes32 hash) {
        // 1. fabricate a minimal LimitOrder struct and encode it
        bytes memory rawOrder = abi.encode(
            address(maker), // maker
            address(0), // taker
            address(usdc), // makerAsset
            address(0), // takerAsset (unused)
            uint256(100e6), // makingAmount (100 USDC)
            uint256(0), // takingAmount
            uint256(123), // salt
            bytes("") // empty interaction (outer)
        );

        // 2. compute the hash (same as hook does)
        bytes32 orderHash = keccak256(rawOrder);

        // 3. populate TwapParams
        TwapDcaHook.TwapParams memory params = TwapDcaHook.TwapParams({
            rawOrder: rawOrder,
            orderHash: orderHash,
            user: maker,
            intervalSecs: interval,
            chunkIn: 10e6, // 10 USDC
            minOut: 1, // router will return 1
            router: address(router),
            swapCalldata: bytes(""), // mock
            srcToken: address(usdc),
            dstToken: address(0xBEEF), // fake
            permit2: address(permit2),
            permit2Data: bytes("") // skip validation in mocks
        });

        interaction = abi.encode(params);
        return (interaction, orderHash);
    }

    function testFirstFillSucceeds() public {
        (bytes memory interaction, bytes32 hash) = _buildParams(1 hours);

        vm.prank(address(this)); // act as the LOP
        twapDcaHook.preInteraction(interaction); // should NOT revert

        // nextFillTime in the future
        uint64 stored = twapDcaHook.nextFillTime(hash);
        assertGt(stored, uint64(block.timestamp));
    }

    function testLOPOnlyModifier() public {
        (bytes memory interaction,) = _buildParams(1 hours);

        // should revert if not called by LOP
        vm.expectRevert(TwapDcaHook.OnlyLimitOrderProtocol.selector);
        vm.prank(taker); // not the LOP
        twapDcaHook.preInteraction(interaction);
    }

    function testTwapDcaExecutedEvent() public {
        (bytes memory interaction, bytes32 hash) = _buildParams(1 hours);

        vm.expectEmit(true, false, false, false);
        vm.prank(address(this));
        twapDcaHook.preInteraction(interaction);

        emit TwapDcaHook.TwapDcaExecuted(hash, 10e6, 1, twapDcaHook.nextFillTime(hash));
    }

    function testTooEarlyReverts() public {
        (bytes memory interaction,) = _buildParams(1 hours);

        // first fill OK
        vm.prank(address(this));
        twapDcaHook.preInteraction(interaction);

        // second fill too early → should revert
        vm.expectRevert(abi.encodeWithSelector(TwapDcaHook.TooEarly.selector, block.timestamp, block.timestamp + 3600));
        vm.prank(address(this));
        twapDcaHook.preInteraction(interaction);
    }

    function testInvalidHashReverts() public {
        (bytes memory interaction,) = _buildParams(1 hours);

        // decode to corrupt rawOrder
        TwapDcaHook.TwapParams memory params = abi.decode(interaction, (TwapDcaHook.TwapParams));
        params.rawOrder[0] = bytes1(uint8(params.rawOrder[0]) ^ 0x01); // flip first byte
        bytes memory tampered = abi.encode(params);

        vm.expectRevert(TwapDcaHook.InvalidOrderHash.selector);
        vm.prank(address(this));
        twapDcaHook.preInteraction(tampered);
    }

    function testSwapFailureReverts() public {
        // turn on failure mode in mock router
        router.setFail(true);

        (bytes memory interaction,) = _buildParams(1 hours);

        vm.prank(address(this));
        vm.expectRevert(TwapDcaHook.SwapFailed.selector);
        twapDcaHook.preInteraction(interaction);
    }
}
