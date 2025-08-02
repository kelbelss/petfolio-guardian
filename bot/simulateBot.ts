
import "dotenv/config";
import { formatUnits } from "viem";
import { base } from "viem/chains";
import { abi as twapAbi } from "../web/src/abis/twapAbi.json";
import { abi as lopAbi } from "../web/src/abis/LimitOrderProtocol.json";
import { supabase } from "./supabase"; 

const TWAP_HOOK = "0x0B5c1388D02346820E40aDa23754baD5d6702E3C";

async function simulate() {
  const { data, error } = await supabase.rpc("get_feeds_for_bot_execution");

  if (error) {
    console.error("❌ Supabase RPC failed:", error);
    return;
  }

  if (!data || data.length === 0) {
    console.log("✅ No feeds ready for execution");
    return;
  }

  for (const feed of data) {
    const {
      id,
      wallet_address,
      feed_type,
      chunk_size,
      src_token,
      dst_token,
      next_fill_time,
      metadata,
      bot_execution_count,
    } = feed;

    const order = metadata.order;
    const signature = metadata.signature;
    const now = new Date().toISOString();

    console.log("🌊 Simulating order:", order);
    console.log(`→ Wallet: ${wallet_address}`);
    console.log(`→ Chunk: ${chunk_size} ${src_token} ➞ ${dst_token}`);
    console.log(`→ Next Fill Time: ${next_fill_time}`);
    console.log(`→ Order Hash: ${metadata.orderHash}`);
    console.log(`→ Signature (first 10): ${signature?.slice(0, 10)}…`);
    console.log(`→ Fill Count: ${bot_execution_count}`);
    console.log(`→ Simulated at: ${now}`);
    console.log("---------------------------------------------------\n");
  }
}

simulate();
