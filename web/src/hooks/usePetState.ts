import { useEffect } from 'react';
import { useAccount } from 'wagmi';
import { formatRelativeTimeWithTimezone } from '@/lib/format';
import { useHealthRecord, useCalculateAndUpdateHealth } from '@/hooks/useSupabase';

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

export interface HealthEvent {
  timestamp: string;
  health_change: number;
  reason: string;
  details?: unknown;
}

export interface PetState {
  health: number; // 0-10 snacks
  lastFed: number | null;
  mood: 'hungry' | 'neutral' | 'happy';
  healthHistory: HealthEvent[];
}

// Game constants
const GAME_CONSTANTS = {
  MAX_HEALTH: 10,
  STARTING_HEALTH: 8,
  DECAY_AMOUNT: 1,
  DECAY_INTERVAL: 6 * 60 * 60 * 1000, // 6 hours in ms
  FEEDING_REWARDS: {
    INSTANT_SWAP: 1,
    DCA_CREATION: 0.5,
    DCA_FILL: 0.5
  }
};

// Mood thresholds
const MOOD_THRESHOLDS = {
  HUNGRY: { min: 0, max: 3 },
  NEUTRAL: { min: 4, max: 6 },
  HAPPY: { min: 7, max: 10 }
};

export function usePetState() {
  const { address } = useAccount();
  const { data: healthRecordData } = useHealthRecord(address || '');
  const { mutateAsync: calculateAndUpdateHealth } = useCalculateAndUpdateHealth();

  // Get health data from Supabase
  const healthData = healthRecordData?.data;

  // Calculate mood based on Supabase health data
  const calculateMood = (health: number): 'hungry' | 'neutral' | 'happy' => {
    if (health <= MOOD_THRESHOLDS.HUNGRY.max) return 'hungry';
    if (health <= MOOD_THRESHOLDS.NEUTRAL.max) return 'neutral';
    return 'happy';
  };

  // Get current pet state from Supabase
  const petState: PetState = {
    health: healthData?.current_health ?? GAME_CONSTANTS.STARTING_HEALTH,
    lastFed: healthData?.last_fed_time ? new Date(healthData.last_fed_time).getTime() : null,
    mood: calculateMood(healthData?.current_health ?? GAME_CONSTANTS.STARTING_HEALTH),
    healthHistory: healthData?.health_history ?? []
  };

  // Clear pet state (for logout) - now just triggers health recalculation
  const clearPetState = () => {
    if (address) {
      calculateAndUpdateHealth(address);
    }
  };

  // Reset pet state to initial (for clearing fake data)
  const resetPetState = () => {
    if (address) {
      calculateAndUpdateHealth(address);
    }
  };



  // Feed pet (instant swap) - now triggers Supabase update
  const feedInstantSwap = (_tokenPair?: string) => {
    if (address) {
      calculateAndUpdateHealth(address);
    }
  };

  // Feed pet (DCA creation) - now triggers Supabase update
  const feedDCACreation = (_orderHash: string, _tokenPair?: string) => {
    if (address) {
      calculateAndUpdateHealth(address);
    }
  };

  // Feed pet (DCA fill) - now triggers Supabase update
  const feedDCAFill = (_orderHash: string, _tokenPair?: string) => {
    if (address) {
      calculateAndUpdateHealth(address);
    }
  };

  // Get time until next decay
  const getTimeUntilNextDecay = (): number => {
    if (!petState.lastFed) return 0;
    
    const now = Date.now();
    const timeSinceLastFed = now - petState.lastFed;
    const timeUntilDecay = GAME_CONSTANTS.DECAY_INTERVAL - timeSinceLastFed;
    
    return Math.max(0, timeUntilDecay);
  };

  // Format time until next decay
  const formatTimeUntilNextDecay = (): string => {
    const timeUntil = getTimeUntilNextDecay();
    if (timeUntil === 0) return 'no recurring feed is set';
    
    const hours = Math.floor(timeUntil / (1000 * 60 * 60));
    const minutes = Math.floor((timeUntil % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((timeUntil % (1000 * 60)) / 1000);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  };

  // Get hippo image based on mood
  const getHippoImage = (): string => {
    switch (petState.mood) {
      case 'hungry':
        return '/src/assets/HipposSad.gif';
      case 'neutral':
        return '/src/assets/HipposMid.gif';
      case 'happy':
        return '/src/assets/HipposHappy.gif';
      default:
        return '/src/assets/HipposHappy.gif';
    }
  };

  // Fix corrupted timestamp data - now triggers Supabase recalculation
  const fixCorruptedTimestamps = () => {
    if (address) {
      calculateAndUpdateHealth(address);
    }
  };

  // Initialize pet state - now uses Supabase data automatically
  useEffect(() => {
    // Health data is automatically loaded from Supabase via useHealthRecord
  }, [address]);

  // Update pet state - now handled by Supabase real-time updates
  useEffect(() => {
    // Health updates are now handled by Supabase real-time subscriptions
  }, [address]);

  return {
    // State
    health: petState.health,
    mood: petState.mood,
    healthHistory: petState.healthHistory,
    
    // Actions
    feedInstantSwap,
    feedDCACreation,
    feedDCAFill,
    clearPetState,
    resetPetState,

    fixCorruptedTimestamps,
    
    // Computed values
    timeUntilNextDecay: getTimeUntilNextDecay(),
    formatTimeUntilNextDecay,
    getHippoImage,
    
    // Status helpers
    isStarving: petState.health <= 0,
    isHungry: petState.health <= 3,
    isFull: petState.health >= 7,
    
    // Health percentage for UI
    healthPercentage: (petState.health / GAME_CONSTANTS.MAX_HEALTH) * 100,
    
    // Last feed time
    lastFeedTime: petState.lastFed ? formatRelativeTimeWithTimezone(petState.lastFed, 'Asia/Dubai') : null
  };
} 