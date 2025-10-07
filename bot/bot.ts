import "dotenv/config";
import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";

// Default‐import the JSON ABI files:
import twapAbi from "./twapAbi.json";
import lopAbi  from "./LimitOrderProtocol.json";

import { supabase } from "./supabase";

// === ENV ===
const RPC       = process.env.MAINNET_RPC_URL!;
const PK        = process.env.MAKER_PK as `0x${string}`;
const TWAP_HOOK = "0xd05d137ce36c4ddec5cddf5e1e2181179153a1a6";
const LOP       = "0x111111125421Ca6dC452d289314280a0f8842A65";

// === Clients ===
const account = privateKeyToAccount(PK);
const pub     = createPublicClient({ chain: base, transport: http(RPC) });
const wallet  = createWalletClient({ account, chain: base, transport: http(RPC) });

// === Fetch feeds due for execution ===
async function getOrdersFromSupabase() {
  const { data, error } = await supabase.rpc("get_feeds_for_bot_execution");
  if (error) {
    console.error("❌ Supabase RPC error:", error.message);
    return [];
  }
  return data;
}

// === Bot Loop ===
async function runOnce() {
  const feeds = await getOrdersFromSupabase();
  if (!feeds.length) {
    console.log("⏳ No eligible orders");
    return;
  }

  for (const feed of feeds) {
    const { id, wallet_address, metadata } = feed;
    const order        = metadata?.order;
    const signature    = metadata?.signature;
    const orderHash    = metadata?.orderHash;
    const interactions = metadata?.interactions ?? "0x";
    const permit       = metadata?.permit      ?? "0x";

    if (!order || !signature || !orderHash) {
      console.warn(`⚠️ Incomplete metadata for feed ${id}`);
      continue;
    }

    try {
      // check next fill time onchain
      const nextFill = await pub.readContract({
        address:      TWAP_HOOK,
        abi:          twapAbi,
        functionName: "nextFillTime",
        args:         [orderHash],
      });

      const now = Math.floor(Date.now() / 1000);
      if (now < Number(nextFill)) {
        console.log(`⏳ ${orderHash} not ready (next: ${nextFill})`);
        continue;
      }

      console.log(`🔫 Filling ${orderHash}…`);
      const txHash = await wallet.writeContract({
        address:      LOP,
        abi:          lopAbi,
        functionName: "fillOrderTo",
        args:         [order, signature, interactions, permit],
      });

      console.log(`✅ Tx sent: ${txHash}`);
      await supabase.rpc("log_bot_execution", {
        p_feed_id:           id,
        p_wallet_address:    wallet_address,
        p_transaction_hash:  txHash,
        p_status:            "success",
      });
    } catch (err: any) {
      console.error(`❌ Failed to fill ${orderHash}:`, err.message || err);
      await supabase.rpc("log_bot_execution", {
        p_feed_id:        id,
        p_wallet_address: wallet_address,
        p_status:         "failed",
        p_error_message:  err.message || "Unknown error",
      });
    }
  }
}

// ——— Run every 60 seconds —————————————————————————————————————————————
setInterval(runOnce, 60_000);
console.log("🤖 Supabase keeper bot started on Base chain...");
