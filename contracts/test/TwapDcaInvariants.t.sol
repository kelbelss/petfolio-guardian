// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.29;

// --- Imports ---
import {Test} from "forge-std/Test.sol";
import {StdInvariant} from "forge-std/StdInvariant.sol";

import {TwapDcaHook} from "../src/TwapDcaHook.sol";
import {MockPermit2} from "./mocks/MockPermit2.sol";
import {MockRouter} from "./mocks/MockRouter.sol";

// OpenZeppelin ERC-20 types for the test
import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {ERC20Mock} from "../lib/openzeppelin-contracts/contracts/mocks/token/ERC20Mock.sol";

contract TwapDcaInvariants is StdInvariant, Test {
    TwapDcaHook public twapDcaHook;
    MockPermit2 public permit2;
    MockRouter public router;

    address public constant user = address(0x1234);
    bytes32 public hash; // order hash used by the fuzzer
    uint64 public lastFillTime; // running maximum
    IERC20 public usdc;
    bytes private interactionBlob;

    function setUp() public {
        permit2 = new MockPermit2();
        router = new MockRouter();
        twapDcaHook = new TwapDcaHook(address(this)); // this contract is mock LOP

        // create test token
        ERC20Mock usdcMock = new ERC20Mock();
        usdcMock.mint(user, 1e24); // 1 million USDC
        usdc = IERC20(address(usdcMock));

        (interactionBlob, hash) = _buildParams(user, 1 hours);

        // limit fuzzing to our wrapper
        targetContract(address(this));
        bytes4[] memory selectors = new bytes4[](1);
        selectors[0] = this.callPreInteraction.selector;

        targetSelector(FuzzSelector({addr: address(this), selectors: selectors}));
    }

    // ----- helper the fuzzer can call -----
    // Fuzzer calls this to execute the preInteraction hook.
    function callPreInteraction() external {
        vm.prank(address(this)); // mimic LOP
        twapDcaHook.preInteraction(interactionBlob);
    }

    /// --- INVARIANT 1 -------------------------------------------------------
    /// `nextFillTime[hash]` never decreases
    // Prevents DOS or sandwich-style griefing where the bot/gas-briber could spam tiny fills by resetting the window.
    // Confirms the TooEarly check is airtight.
    function invariant_nextFillTimeMonotone() public {
        uint64 current = twapDcaHook.nextFillTime(hash);
        assertTrue(current >= lastFillTime, "nextFillTime decreased");
        lastFillTime = current;
    }

    /// --- INVARIANT 2 -------------------------------------------------------
    /// Router allowance is always 0 after a fill
    // The temporary approval you grant the router is always revoked, even if the router itself re-enters you.
    function invariant_routerAllowanceIsZero() public view {
        uint256 allowance = usdc.allowance(address(twapDcaHook), address(router));
        assertEq(allowance, 0);
    }

    function _buildParams(address user_, uint64 interval)
        internal
        view
        returns (bytes memory _interaction, bytes32 _hash)
    {
        // --- fabricate rawOrder exactly like in the unit test
        bytes memory rawOrder = abi.encode(
            user_, // maker
            address(0), // taker
            address(usdc), // makerAsset
            address(0), // takerAsset
            uint256(100e6), // makingAmount
            uint256(0), // takingAmount
            uint256(123), // salt
            bytes("") // inner interaction
        );

        _hash = keccak256(rawOrder);

        TwapDcaHook.TwapParams memory p = TwapDcaHook.TwapParams({
            rawOrder: rawOrder,
            orderHash: _hash,
            user: user_,
            intervalSecs: interval,
            chunkIn: 10e6,
            minOut: 1,
            router: address(router),
            swapCalldata: bytes(""),
            srcToken: address(usdc),
            dstToken: address(0xBEEF),
            permit2: address(permit2),
            permit2Data: bytes("")
        });

        _interaction = abi.encode(p);
    }
}
