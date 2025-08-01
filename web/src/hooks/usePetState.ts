import { useState, useEffect } from 'react';

export interface OrderMeta {
  orderHash: string;
  srcToken: string;
  dstToken: string;
  chunkSize: number;
  period: number;
  createdAt: number;
  nextFillTime: number;
}

export function usePetState(orderMeta: OrderMeta | null) {
  const [hunger, setHunger] = useState(100); // 100 = full, 0 = starving
  const [timeUntilNextFeed, setTimeUntilNextFeed] = useState<number | null>(null);

  useEffect(() => {
    if (!orderMeta) {
      setHunger(100);
      setTimeUntilNextFeed(null);
      return;
    }

    const updatePetState = () => {
      const now = Date.now();
      const timeSinceLastFeed = now - orderMeta.createdAt;
      const periodsElapsed = Math.floor(timeSinceLastFeed / (orderMeta.period * 1000));
      
      // Calculate hunger based on time since last feed
      const hungerDecrease = periodsElapsed * 10; // 10% per period
      const newHunger = Math.max(0, 100 - hungerDecrease);
      setHunger(newHunger);

      // Calculate time until next feed
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