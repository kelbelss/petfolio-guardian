// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.29;

// --- Imports ---
import {IInteractionNotificationReceiver} from "./interfaces/IInteractionNotificationReceiver.sol";
import {IAggregationRouterV6} from "./interfaces/IAggregationRouterV6.sol";
import {IERC20} from "../lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "../lib/openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";
import {IPermit2} from "./interfaces/IPermit2.sol";
import {IAllowanceTransfer} from "./interfaces/IAllowanceTransfer.sol";

interface IAavePool {
    function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode) external;
}

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
    event DstRouted(bytes32 indexed orderHash, address indexed to, bool toAave);

    // --- Errors ---
    error OnlyLimitOrderProtocol();
    error InvalidOrderHash();
    error TooEarly(uint256 currentTime, uint256 allowedTime);
    error SwapFailed();

    // --- State ---
    /// @dev Hard‑coded Limit Order Protocol address
    address public immutable LIMIT_ORDER_PROTOCOL;

    /// @notice The next timestamp that an order (id by 712 hash) can be filled again
    mapping(bytes32 => uint64) public nextFillTime;

    /// @dev Immutable params packed into `order.interaction`
    struct TwapParams {
        bytes rawOrder; // abi.encode(LimitOrder) blob
        bytes32 orderHash; // maker’s EIP-712 hash (must match rawOrder)
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
        bool depositToAave; // optional deposit to Aave
        address recipient; // (0-addr = use `user`)
        address aavePool; // Aave pool address (if depositing to Aave)
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
        // verify the orderHash matches the rawOrder
        bytes32 verifiedHash = _verifyOrderHash(params.rawOrder, params.orderHash);

        // time-gate check
        uint64 allowedAt = nextFillTime[verifiedHash];
        if (allowedAt != 0 && block.timestamp < allowedAt) {
            revert TooEarly(block.timestamp, allowedAt);
        }

        // execute router swap & token transfers

        // 1) pull srcToken from user (Permit2)
        IPermit2(params.permit2).permitTransferFrom(params.permit2Data);
        IAllowanceTransfer(params.permit2).transferFrom(params.srcToken, params.user, address(this), params.chunkIn);
        // @dev permit2 will revert if insufficient balance

        // 2) decide who receives the dstToken
        address destination;

        if (params.depositToAave) {
            // when depositing to Aave we keep the tokens in the hook first
            destination = address(this);
        } else if (params.recipient != address(0)) {
            // custom recipient
            destination = params.recipient;
        } else {
            // default: send proceeds back to the maker (user)
            destination = params.user;
        }

        // 3) build the typed SwapDescription
        IAggregationRouterV6.SwapDescription memory description = IAggregationRouterV6.SwapDescription({
            srcToken: IERC20(params.srcToken),
            dstToken: IERC20(params.dstToken),
            srcReceiver: payable(address(this)),
            dstReceiver: payable(destination), // <── updated
            amount: params.chunkIn,
            minReturnAmount: params.minOut,
            flags: 0, // use any router flags here
            permit: "" // if you use ERC-20 permits, include them
        });

        // 4) approve the router to spend this chunk - gives the router permission to pull chunkIn of srcToken from hook for the swap
        IERC20(params.srcToken).forceApprove(params.router, params.chunkIn);

        // 5) execute the swap - returns how many dstToken units were actually received and gasLeft
        (uint256 received,) = IAggregationRouterV6(params.router).swap(address(this), description, params.swapCalldata);

        // 6) reset the allowance to 0 to prevent re-entrancy
        IERC20(params.srcToken).safeApprove(params.router, 0);

        // 7) enforce slippage guard - ensures the router delivered at least minOut amount
        if (received < params.minOut) revert SwapFailed();

        // 8) Aave deposit if elected ───────────────────────────────────────
        if (params.depositToAave) {
            IERC20(params.dstToken).forceApprove(params.aavePool, received);
            IAavePool(params.aavePool).supply(params.dstToken, received, params.user, 0);
            IERC20(params.dstToken).safeApprove(params.aavePool, 0); // hygiene
            emit DstRouted(params.orderHash, params.user, true);
        } else if (params.recipient != address(0)) {
            emit DstRouted(params.orderHash, params.recipient, false);
        }

        // 6) update the next fill time for this order
        uint64 newNextFillTime = uint64(block.timestamp) + params.intervalSecs;
        nextFillTime[verifiedHash] = newNextFillTime;

        // 7) emit event
        emit TwapDcaExecuted(verifiedHash, params.chunkIn, params.minOut, newNextFillTime);
    }

    function _verifyOrderHash(bytes memory rawOrder, bytes32 claimed) internal pure returns (bytes32 verifiedHash) {
        verifiedHash = keccak256(rawOrder);
        if (verifiedHash != claimed) revert InvalidOrderHash();
    }
}
