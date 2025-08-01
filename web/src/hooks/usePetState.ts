import { useState, useEffect } from 'react';
import { useRemaining } from '@/lib/hooks/useLimitOrder';

export interface OrderMeta {
  orderHash: string;
  srcToken: string;
  dstToken: string;
  chunkSize: number;
  period: number;
  createdAt: number;
  nextFillTime: number;
  totalCycles: number;
}

export function usePetState(orderMeta: OrderMeta | null) {
  const [hunger, setHunger] = useState(100); // 100 = full, 0 = starving
  const [timeUntilNextFeed, setTimeUntilNextFeed] = useState<number | null>(null);
  const { data: remainingAmt } = useRemaining(orderMeta?.orderHash as `0x${string}`);

  useEffect(() => {
    if (!orderMeta) {
      setHunger(100);
      setTimeUntilNextFeed(null);
      return;
    }

    const updatePetState = () => {
      const now = Date.now();
      
      // Calculate hunger based on real on-chain progress
      if (remainingAmt !== undefined && orderMeta) {
        const filled = orderMeta.chunkSize * orderMeta.totalCycles - Number(remainingAmt) / 1e18;
        const totalNeeded = orderMeta.chunkSize * orderMeta.totalCycles;
        const progressPercent = (filled / totalNeeded) * 100;
        const newHunger = Math.max(0, 100 - progressPercent);
        setHunger(newHunger);
      } else {
        // Fallback to time-based calculation if no on-chain data
        const timeSinceLastFeed = now - orderMeta.createdAt;
        const periodsElapsed = Math.floor(timeSinceLastFeed / (orderMeta.period * 1000));
        const hungerDecrease = periodsElapsed * 10; // 10% per period
        const newHunger = Math.max(0, 100 - hungerDecrease);
        setHunger(newHunger);
      }

      // Calculate time until next feed
      const timeSinceLastFeed = now - orderMeta.createdAt;
      const periodsElapsed = Math.floor(timeSinceLastFeed / (orderMeta.period * 1000));
      const nextFeedTime = orderMeta.createdAt + (periodsElapsed + 1) * orderMeta.period * 1000;
      const timeUntilNext = Math.max(0, nextFeedTime - now);
      setTimeUntilNextFeed(timeUntilNext);
    };

    // Update immediately
    updatePetState();

    // Update every second
    const interval = setInterval(updatePetState, 1000);

    return () => clearInterval(interval);
  }, [orderMeta]);

  const formatTimeUntilNextFeed = () => {
    if (timeUntilNextFeed === null) return 'No active feed';
    
    const hours = Math.floor(timeUntilNextFeed / (1000 * 60 * 60));
    const minutes = Math.floor((timeUntilNextFeed % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((timeUntilNextFeed % (1000 * 60)) / 1000);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  };

  return {
    hunger,
    timeUntilNextFeed,
    formatTimeUntilNextFeed,
    isStarving: hunger <= 0,
    isHungry: hunger <= 30,
    isFull: hunger >= 80,
  };
} 