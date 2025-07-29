// buildInteraction.ts
import "dotenv/config";
import fs from "fs";
import { fetch } from "undici";
import type {
    Api as ApiType,
    Address as AddressType,
    MakerTraits as MakerTraitsType,
    LimitOrder as LimitOrderType
} from "@1inch/limit-order-sdk";
import { UINT_40_MAX } from "@1inch/byte-utils";
import { JsonRpcProvider, Wallet, Interface, Contract } from "ethers";
import { createRequire } from "module";

// Dynamically load the CJS bundle so Node won’t try to ESM‑import a directory:
const requireCJS = createRequire(import.meta.url);
const {
    Api,
    Address,
    MakerTraits,
    LimitOrder,
} = requireCJS("@1inch/limit-order-sdk") as {
    Api: typeof ApiType;
    Address: typeof AddressType;
    MakerTraits: typeof MakerTraitsType;
    LimitOrder: typeof LimitOrderType;
};

interface OneInchSwapResponse { tx: { data: string } }

async function main() {
    const RPC = "http://127.0.0.1:8545";
    const MAKER_PK = process.env.MAKER_PK!;
    const ONEINCH_KEY = process.env.ONEINCH_KEY!;  // your Developer-Portal API key

    const provider = new JsonRpcProvider(RPC);
    const wallet = new Wallet(MAKER_PK, provider);

    // ── Init the 1inch SDK client (httpConnector is required by types) ──
    const sdk = new Api({
        networkId: 1,           // mainnet chain ID
        authKey: ONEINCH_KEY, // optional but we'll use fetch directly below
        httpConnector: {} as any,   // stub; replace if you wire in a connector
    });

    // ── Addresses ──
    const LOP = "0x111111125421Ca6dC452d289314280a0f8842A65";
    const USDC = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
    const DAI = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
    const PERMIT2 = "0x000000000022D473030F116dDEE9F6B43aC78BA3";

    // 1) Impersonate
    const USDC_WHALE = "0x55FE002aefF02F77364de339a1292923A15844B8";
await provider.send("anvil_impersonateAccount", [USDC_WHALE]);

// 2) Transfer
const whaleSigner = await provider.getSigner(USDC_WHALE);
const usdc = new Contract(
  USDC,
  ["function transfer(address to, uint256 amount) external returns (bool)"],
  whaleSigner
);
const tx1 = await usdc.transfer(wallet.address, 1_000_000n);
await tx1.wait(); 

const usdcReader = new Contract(
    USDC,
    ["function balanceOf(address) view returns (uint256)"],
    provider
  );
  const bal = await usdcReader.balanceOf(wallet.address);
  console.log("➡️ Maker USDC balance after mint:", bal.toString());

// 3) Stop impersonation
await provider.send("anvil_stopImpersonatingAccount", [USDC_WHALE]);



    // 1) Build your limit order + traits ──
    const makerTraits = MakerTraits.default()
        .withExpiration(BigInt(Math.floor(Date.now() / 1000) + 3600)) // +1h
        .withNonce(UINT_40_MAX - 1n);

    const order = new LimitOrder(
        {
            makerAsset: new Address(USDC),
            takerAsset: new Address(DAI),
            makingAmount: 1_000_000n, // 1 USDC (6 decimals)
            takingAmount: 1n,         // 1 DAI (18 decimals)
            maker: new Address(wallet.address),
        },
        makerTraits
    );

    // 2) Sign it via EIP‑712 (pass chainId=1) ──
    const typedData = order.getTypedData(1);
    const signature = await wallet.signTypedData(
        typedData.domain,
        { Order: typedData.types.Order },
        typedData.message
    );

    // 3) Stubbed Permit‑2 payload (swap in your real builder) ──
    const permitData = "0x";

    // 4) Fetch swap calldata from the **Developer Portal** API ──
    const swapUrl =
        `https://api.1inch.dev/swap/v6.1/1/swap` +
        `?fromTokenAddress=${USDC}` +
        `&toTokenAddress=${DAI}` +
        `&amount=1000000` +
        `&fromAddress=${wallet.address}` +
        `&slippage=50`;

    console.log("Fetching 1inch swap calldata from:", swapUrl);

    const resp = await fetch(swapUrl, {
        headers: {
            Authorization: `Bearer ${ONEINCH_KEY}`,
            "Content-Type": "application/json",
            Accept: "application/json",
        },
    });

    if (!resp.ok) {
        const body = await resp.text();
        throw new Error(`1inch Portal API error ${resp.status}: ${body}`);
    }

    const contentType = resp.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
        const body = await resp.text();
        throw new Error(`Expected JSON but got "${contentType}":\n${body}`);
    }

    const { tx } = (await resp.json()) as OneInchSwapResponse;

    // 5) Pack your TWAP interaction params ──
    const rawOrder: Uint8Array = (order as any).encode();  // .encode() exists at runtime
    const orderHash = order.getOrderHash(1);

    const params = [
        rawOrder,
        orderHash,
        wallet.address,
        3600n,
        1_000_000n,
        1n,
        LOP,
        tx.data,
        USDC,
        DAI,
        PERMIT2,
        permitData,
    ];

    // 6) ABI‑encode and write the blob ──
    const iface = new Interface([
        "function dummy((bytes,bytes32,address,uint64,uint256,uint256,address,bytes,address,address,address,bytes))"
    ]);
    const hex = iface.encodeFunctionData("dummy", [params]).slice(10);

    fs.writeFileSync("interactionBlob.hex", hex);
    console.log("✅ interactionBlob.hex written");
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
