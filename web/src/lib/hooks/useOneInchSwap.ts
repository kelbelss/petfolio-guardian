import { getQuote, getSwapTx } from '@/lib/oneInchService';
import { useAccount } from 'wagmi';
import { useState } from 'react';
import { toast } from '@/components/ui/use-toast';
import { toWei, getTokenDecimals } from '@/lib/utils';

export function useOneInchSwap() {
  const { address } = useAccount();
  const [loading, setLoading] = useState(false);

  /** do a full quote→swap flow */
  const feedNow = async (src: string, dst: string, amountHuman: number, slippage = 1) => {
    if (!address) throw new Error('Wallet not connected');
    setLoading(true);

    const amountWei = toWei(amountHuman, src, getTokenDecimals(src));

    /* ---------- 1) QUOTE ---------- */
    const quote = await getQuote(src, dst, amountWei);

    /* ---------- 2) SWAP TX ---------- */
    const params = {
      src,
      dst,
      amount: amountWei,
      from: address,
      slippage: slippage.toString(),
      receiver: address,
    };
    const { tx } = await getSwapTx(params);

    // If src is native ETH sentinel address, set value
    if (src.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee')
      tx.value = amountWei;

    /* ---------- 3) POP WALLET ---------- */
    const hash = await window.ethereum.request({
      method: 'eth_sendTransaction',
      params: [tx],
    });

    toast({
      title: 'Swap submitted',
      description: `Tx hash: ${hash.slice(0, 10)}…`,
    });

    return { hash, quote };
  };

  return { feedNow, loading };
} 