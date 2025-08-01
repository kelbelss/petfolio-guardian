// src/lib/permit2.ts
import { encodeFunctionData, getAddress } from 'viem';
import type { PublicClient, WalletClient } from 'viem';
import Permit2ABI from '@/abis/Permit2.json';
import { SignatureTransfer } from '@uniswap/permit2-sdk';
import { CONTRACT_ADDRESSES, BASE_NETWORK } from '@/config/base';

/** returns the next free nonce word (we'll just use bitmap word 0) */
export async function getPermit2Nonce(publicClient: PublicClient, owner: `0x${string}`) {
  const permit2 = getAddress(CONTRACT_ADDRESSES.PERMIT2);
  const bitmap = await publicClient.readContract({
    address: permit2,
    abi: Permit2ABI,
    functionName: 'nonceBitmap',
    args: [owner, 0n],
  }) as bigint;
  // find the first zero-bit
  for (let i = 0; i < 256; i++) {
    if (((bitmap >> BigInt(i)) & 1n) === 0n) return i;   // free slot
  }
  throw new Error('no free Permit2 nonce in word 0');
}

/** full Permit2 tx-builder (fetches nonce, signs, returns `{to,data}`) */
export async function buildPermit2Tx(
  publicClient : PublicClient,        // viem public client (read-only)
  wallet       : WalletClient,        // connected signer
  owner        : `0x${string}`,
  token        : `0x${string}`,
  spender      : `0x${string}`,
  amountWei    : string,              // decimal string
  deadlineSec  = 60 * 60              // 1 h from now
) {
  console.log('🔍 buildPermit2Tx params:', { owner, token, spender, amountWei });
  
  // Validate and checksum all addresses
  const validOwner = getAddress(owner);
  const validToken = getAddress(token);
  const validSpender = getAddress(spender);
  
  console.log('🔍 buildPermit2Tx checksummed:', { validOwner, validToken, validSpender });
  
  /* 1 — fetch nonce */
  const nonce = await getPermit2Nonce(publicClient, validOwner);

  /* 2 — describe permit & build EIP-712 struct */
  const deadline = Math.floor(Date.now() / 1000) + deadlineSec;
  const permit = {
    permitted : { token: validToken, amount: amountWei },
    spender: validSpender,
    nonce,
    deadline
  };
  
  // Ensure addresses are properly checksummed
  const permit2 = getAddress(CONTRACT_ADDRESSES.PERMIT2);
  
  const { domain, types, values } = SignatureTransfer.getPermitData(
    permit, permit2, BASE_NETWORK.id
  );

  /* 3 — sign */
  const signature = await wallet.signTypedData({
    account: owner,
    domain: {
      name: domain.name,
      version: domain.version,
      chainId: Number(domain.chainId),
      verifyingContract: domain.verifyingContract as `0x${string}`
    },
    types,
    primaryType: 'PermitTransferFrom',
    message: values as unknown as Record<string, unknown>
  });

  /* 4 — encode on-chain call to `permitTransferFrom` */
  const data = encodeFunctionData({
    abi: Permit2ABI,
    functionName: 'permitTransferFrom',
    args: [ permit, signature ]
  });

  return { to: permit2, data };
} 