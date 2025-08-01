// src/lib/limitOrder.ts
import {
  zeroAddress,
  createPublicClient,
  createWalletClient,
  http,
  custom,              
  encodeAbiParameters,
  keccak256,
  parseAbiParameters
} from 'viem';
import { base }                          from 'viem/chains';
import LIMIT_ORDER_ABI                   from '@/abis/LimitOrderProtocol.json';
import {
  CONTRACT_ADDRESSES,
  ONEINCH_CONFIG,
  PERMIT2_DOMAIN,
} from '@/config/base';
import { toWei } from '@/lib/utils';

const client = createWalletClient({
  chain     : base,
  transport : custom(window.ethereum!)
});

// ─────────────────────────────────────────────────────────────────────────
// Tiny builder – we only need fields required by the on-chain contract
// ─────────────────────────────────────────────────────────────────────────

type OrderStruct = {
  maker: `0x${string}`;
  receiver: `0x${string}`;
  makerAsset: `0x${string}`;
  takerAsset: `0x${string}`;
  makingAmount: bigint;
  takingAmount: bigint;
  salt: bigint;
  permit: `0x${string}`;
  predicates: `0x${string}`;
  interactions: `0x${string}`;
};

function buildLimitOrder(params: {
  maker: `0x${string}`;
  makerAsset: `0x${string}`;
  takerAsset: `0x${string}`;
  makingAmount: bigint;
  takingAmount: bigint;
  receiver?: `0x${string}`;
}): OrderStruct {
  const salt = BigInt(Date.now());                   // simple uniqueness
  return {
    maker: params.maker,
    receiver: params.receiver ?? params.maker,
    makerAsset: params.makerAsset,
    takerAsset: params.takerAsset,
    makingAmount: params.makingAmount,
    takingAmount: params.takingAmount,
    salt,
    permit: "0x",
    predicates: "0x",
    interactions: "0x",
  };
}

function orderHash(order: OrderStruct): `0x${string}` {
  // keccak256(abi.encode(...)) exactly like the LOP contract does
  const encoded = encodeAbiParameters(
    // match the Solidity struct layout
    parseAbiParameters(
      "address maker,address receiver,address makerAsset,address takerAsset,uint256 makingAmount,uint256 takingAmount,uint256 salt,bytes permit,bytes predicates,bytes interactions"
    ),
    [
      order.maker,
      order.receiver,
      order.makerAsset,
      order.takerAsset,
      order.makingAmount,
      order.takingAmount,
      order.salt,
      order.permit,
      order.predicates,
      order.interactions,
    ]
  );
  return keccak256(encoded);
}

// ---------- helpers -------------------------------------------------
export async function buildAndSignOrder(params: {
  makerAsset : `0x${string}`;
  takerAsset : `0x${string}`;
  makingHuman: number;
  takingHuman: number;
  maker      : `0x${string}`;
  receiver   ?: `0x${string}`;
}) {
  console.log('🔧 buildAndSignOrder params:', params);
  
  const makingAmount = BigInt(toWei(params.makingHuman, params.makerAsset));
  const takingAmount = BigInt(toWei(params.takingHuman, params.takerAsset));

  const order = buildLimitOrder({
    makerAsset  : params.makerAsset,
    takerAsset  : params.takerAsset,
    makingAmount,
    takingAmount,
    maker       : params.maker,
    receiver    : params.receiver ?? params.maker,
  });

  const hash = orderHash(order);
  
  // TODO: Add EIP-712 signing here when we have wallet client
  const signature = "0x" as `0x${string}`; // Placeholder for now
  
  return { order: { ...order, hash }, signature };
}

export async function fillOrderTx(order: any, signature: `0x${string}`) {
  // TODO: Implement proper order filling logic
  // For now, return a placeholder
  console.log('Filling order:', order, signature);
  throw new Error('fillOrderTx not yet implemented');
}

export async function remaining(orderHash: `0x${string}`) {
  return client.readContract({
    address      : CONTRACT_ADDRESSES.LIMIT_ORDER_PROTOCOL,
    abi          : LIMIT_ORDER_ABI,
    functionName : 'remaining',
    args         : [orderHash]
  }) as Promise<bigint>;
} 