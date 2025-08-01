// src/lib/limitOrder.ts
import { LimitOrderBuilder }             from '@1inch/limit-order-sdk';
import { zeroAddress, createWalletClient } from 'viem';
import { base }                          from 'viem/chains';
import LIMIT_ORDER_ABI                   from '@/abis/LimitOrderProtocol.json';
import {
  CONTRACT_ADDRESSES,
  ONEINCH_CONFIG,
  PERMIT2_DOMAIN,
} from '@/config/base';

const client = createWalletClient({
  chain     : base,
  transport : custom(window.ethereum!)
});

const builder = new LimitOrderBuilder(
  {
    chainId          : ONEINCH_CONFIG.NETWORK_ID,
    verifyingContract: CONTRACT_ADDRESSES.LIMIT_ORDER_PROTOCOL,
  },
  window.ethereum                                    // provider for EIP-712
);

// ---------- helpers -------------------------------------------------
export async function buildAndSignOrder(params: {
  makerAsset : `0x${string}`;
  takerAsset : `0x${string}`;
  makingHuman: number;
  takingHuman: number;
  maker      : `0x${string}`;
  receiver   ?: `0x${string}`;
}) {
  const makingAmount = toWei(params.makingHuman, params.makerAsset);
  const takingAmount = toWei(params.takingHuman, params.takerAsset);

  const order = await builder.buildLimitOrder({
    makerAsset  : params.makerAsset,
    takerAsset  : params.takerAsset,
    makingAmount,
    takingAmount,
    maker       : params.maker,
    receiver    : params.receiver ?? params.maker,
    salt        : Date.now().toString(),
    allowedSender: zeroAddress,               // public order
  });

  const signature = await builder.buildOrderSignature(params.maker, order);
  return { order, signature };
}

export async function fillOrderTx(order: any, signature: `0x${string}`) {
  const calldata = builder.buildOrderTxData(order, signature);
  return client.writeContract({
    account : order.maker as `0x${string}`,
    address : CONTRACT_ADDRESSES.LIMIT_ORDER_PROTOCOL,
    abi     : LIMIT_ORDER_ABI,
    functionName: 'fillOrder',
    args    : calldata,
    // value: 0 or makingAmount for native ETH
  });
}

export async function remaining(orderHash: `0x${string}`) {
  return client.readContract({
    address      : CONTRACT_ADDRESSES.LIMIT_ORDER_PROTOCOL,
    abi          : LIMIT_ORDER_ABI,
    functionName : 'remaining',
    args         : [orderHash]
  }) as Promise<bigint>;
} 