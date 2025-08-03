# Petfolio-Guardian TWAP/DCA Hook for 1inch Limit Orders

## 📖 Overview

`TwapDcaHook` is a custom on‑chain extension (hook) for the 1inch Limit Order Protocol (v3/v4) enabling time‑weighted average price (TWAP) or dollar‑cost averaging (DCA) behavior. By enforcing a minimum delay between consecutive fills of the same limit order and optionally routing proceeds into Aave, this hook automates recurring purchases or investments.

This repository contains:

* **`TwapDcaHook.sol`**: Main hook contract implementing `IInteractionNotificationReceiver`.
* **Interfaces**: Minimal on‑chain interfaces for 1inch Aggregation Router (v6), Permit2, and allowance transfer.
* **Deployment script**: Forge script to deploy the hook to any EVM chain.
* **Unit tests**: Comprehensive tests for correct behavior and invariants.

## 📐 Architecture & Flow

1. **Order Creation** (off‑chain):

   * Use 1inch SDK to build a LimitOrder with `interaction` set to ABI‑encoded `TwapParams`.
   * `TwapParams` include raw order data, desired DCA interval, chunk amount, slippage guard, router calldata, recipient flags, and optional Aave routing.

2. **Order Execution** (on‑chain via 1inch LOP):

   * 1inch Protocol calls `preInteraction(bytes data)` on `TwapDcaHook` before filling.
   * The hook decodes `TwapParams`, verifies the EIP‑712 order hash, and checks the time gate (`nextFillTime`).
   * Pulls `chunkIn` of source token via Permit2, approves 1inch router, and executes the swap.
   * Optionally deposits the output token to Aave or forwards to a custom recipient.
   * Updates `nextFillTime` and emits:

     * `DstRouted(orderHash, to, toAave)` when routing proceeds.
     * `TwapDcaExecuted(orderHash, chunkIn, minOut, nextFillTime)` on each fill.

## 📚 Contracts & Interfaces

### `TwapDcaHook.sol`

* Implements `IInteractionNotificationReceiver`.
* **Constructor**:

  ```solidity
  constructor(address _limitOrderProtocol)
  ```

  * `LIMIT_ORDER_PROTOCOL`: 1inch Limit Order Protocol address (immutable).
* **Core Function**: `preInteraction(bytes calldata data)`

  * Only callable by LOP (`onlyLOP` modifier).
  * Decodes `TwapParams`, enforces time delay, orchestrates swap + routing, and updates state.
* **`TwapParams` struct**:

  ```solidity
  struct TwapParams {
    bytes   rawOrder;
    bytes32 orderHash;
    address user;
    uint64  intervalSecs;
    uint256 chunkIn;
    uint256 minOut;
    address router;
    bytes   swapCalldata;
    address srcToken;
    address dstToken;
    address permit2;
    bytes   permit2Data;
    bool    depositToAave;
    address recipient;
    address aavePool;
  }
  ```
* **Events**:

  * `TwapDcaExecuted(bytes32 orderHash, uint256 chunkIn, uint256 minOut, uint64 nextFillTime)`
  * `DstRouted(bytes32 orderHash, address to, bool toAave)`

### Interfaces

* **`IInteractionNotificationReceiver.sol`**: 1inch hook callback interface.
* **`IAggregationRouterV6.sol`**: Minimal 1inch Aggregation Router v6 for `swap()`.
* **`IPermit2.sol`** & **`IAllowanceTransfer.sol`**: Hooks into Permit2 payload + allowance pull.
* **`IAavePool`** (in `TwapDcaHook.sol`): For optional Aave deposit via `supply()`.

## 🔧 Deployment

Use Foundry (Forge) script to deploy:

```bash
echo "PRIVATE_KEY=..." > .env
forge script script/DeployTwap.s.sol:DeployTwap \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast \
  --verify
```

* Ensure `limitOrderProtocol` matches chain’s LOP deployment.

## ✅ Tests

### Unit Tests (`TwapDcaHook.t.sol`)

* **`testFirstFillSucceeds`**: Fills once without revert.
* **`testLOPOnlyModifier`**: Rejects non‑LOP callers.
* **`testTwapDcaExecutedEvent`**: Emits correct fill event.
* **`testTooEarlyReverts`**: Blocks rapid fills.
* **`testInvalidHashReverts`**: Detects tampered orders.
* **`testSwapFailureReverts`**: Detects insufficient slippage.
* **`testCustomRecipientGetsRouted`**: Routes to custom address.
* **`testAaveDepositBranch`**: Deposits into Aave when flagged.

### Invariants (`TwapDcaInvariants.t.sol`)

* **`invariant_nextFillTimeMonotone`**: `nextFillTime` only increases.
* **`invariant_routerAllowanceIsZero`**: Router allowance always reset to zero.

> **Note**: Integration test stub exists but is currently disabled—core logic is covered by unit + invariants.

## 🛡️ Security & Best Practices

* **Time‑gate** prevents sandwich or repeated fill griefing.
* **Permit2** for gas‑efficient approvals and safe pull of tokens.
* **SafeERC20** for robust token interactions.
* **Zero‑allowance reset** to mitigate re‑entrancy.

