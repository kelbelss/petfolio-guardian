// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.29;

// Imports
import {IInteractionNotificationReceiver} from "./interfaces/IInteractionNotificationReceiver.sol";
import {IAggregationRouterV6} from "./interfaces/IAggregationRouterV6.sol";
import {IERC20} from "../lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "../lib/openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";
import {IPermit2} from "./interfaces/IPermit2.sol";
import {IAllowanceTransfer} from "./interfaces/IAllowanceTransfer.sol";

/**
 * @title TwapDcaHook
 * @notice 1inch Limit Order Protocol v3 hook that enforces a time delay between consecutive fills,
 *         enabling TWAP/DCA behaviour.
 * @author Kelly Smulian
 */
contract TwapDcaHook is IInteractionNotificationReceiver {
    using SafeERC20 for IERC20;

    // --- Events ---
    event TwapDcaExecuted(bytes32 indexed orderHash, uint256 chunkIn, uint256 minOut, uint64 nextFillTime);

    // --- Errors ---
    error OnlyLimitOrderProtocol();
    error TooEarly(uint256 currentTime, uint256 allowedTime);
    error SwapFailed();

    // --- State ---
    /// @dev Hard‑coded Limit Order Protocol address
    address public immutable LIMIT_ORDER_PROTOCOL;

    /// @notice The next timestamp that an order (id by 712 hash) can be filled again
    mapping(bytes32 => uint64) public nextFillTime;

    /// @dev Immutable params packed into `order.interaction`
    /// TODO: currently trusting maker-provided orderHash, implement on-chain derivation or verification before prod
    struct TwapParams {
        bytes32 orderHash; // Unique ID for this order (EIP-712 hash)
        address user; // Wallet DCA‑ing for
        uint64 intervalSecs; // Minimum seconds between fills
        uint256 chunkIn; // Maker amount per fill
        uint256 minOut; // Slippage guard for taker amount
        address router; // 1inch Aggregation Router
        bytes swapCalldata; // Encoded call data for router
        address srcToken; // e.g. WETH
        address dstToken; // e.g. USDC
        address permit2; // Permit2 contract address
        bytes permit2Data; // EIP-712 signature + payload
    }

    // --- Modifiers ---
    modifier onlyLOP() {
        if (msg.sender != LIMIT_ORDER_PROTOCOL) revert OnlyLimitOrderProtocol();
        _;
    }

    // --- Constructor ---
    constructor(address _limitOrderProtocol) {
        LIMIT_ORDER_PROTOCOL = _limitOrderProtocol;
    }

    // --- Functions ---
    /**
     * @notice Called by Limit Order Protocol before it attempts settlement
     * @param data ABI‑encoded `TwapParams` struct from `order.interaction`.
     */
    function preInteraction(bytes calldata data) external onlyLOP {
        // decode data (order.interaction) into the TwapParams struct
        TwapParams memory params = abi.decode(data, (TwapParams));
        // pull out the orderHash key directly
        bytes32 orderHash = params.orderHash;

        // time-gate check
        uint64 allowedAt = nextFillTime[orderHash];
        if (allowedAt != 0 && block.timestamp < allowedAt) {
            revert TooEarly(block.timestamp, allowedAt);
        }

        // execute router swap & token transfers

        // 1) Pull srcToken from user (Permit2)
        IPermit2(params.permit2).permitTransferFrom(params.permit2Data);
        IAllowanceTransfer(params.permit2).transferFrom(params.srcToken, params.user, address(this), params.chunkIn);

        // 2) approve the router to spend this chunk - gives the router permission to pull chunkIn of srcToken from hook for the swap
        IERC20(params.srcToken).safeApprove(params.router, params.chunkIn);

        // 3) build the typed SwapDescription
        IAggregationRouterV6.SwapDescription memory description = IAggregationRouterV6.SwapDescription({
            srcToken: IERC20(params.srcToken),
            dstToken: IERC20(params.dstToken),
            srcReceiver: payable(address(this)),
            dstReceiver: payable(params.user),
            amount: params.chunkIn,
            minReturnAmount: params.minOut,
            flags: 0, // use any router flags here
            permit: "" // if you use ERC-20 permits, include them
        });

        // 4) execute the swap - returns how many dstToken units were actually received and gasLeft
        (uint256 received,) = IAggregationRouterV6(params.router).swap(
            address(this), // executor
            description,
            params.swapCalldata
        );

        // 5. reset the allowance to 0 to prevent re-entrancy
        IERC20(params.srcToken).safeApprove(params.router, 0);

        // 5) enforce slippage guard - ensures the router delivered at least minOut amount
        if (received < params.minOut) revert SwapFailed();

        // 6) update the next fill time for this order
        uint64 newNextFillTime = uint64(block.timestamp) + params.intervalSecs;
        nextFillTime[orderHash] = newNextFillTime;

        // 7) emit event
        emit TwapDcaExecuted(orderHash, params.chunkIn, params.minOut, newNextFillTime);
    }

    /// @notice Post‑interaction hook (unused in v1 at this stage)
    function postInteraction(bytes calldata /*data*/ ) external onlyLOP {}
}
