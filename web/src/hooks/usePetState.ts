import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { formatRelativeTimeWithTimezone } from '@/lib/format';

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
  timestamp: number;
  healthChange: number;
  reason: string;
  details?: string;
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
  const [petState, setPetState] = useState<PetState>({
    health: GAME_CONSTANTS.STARTING_HEALTH,
    lastFed: null,
    mood: 'happy',
    healthHistory: []
  });

  // Get storage key for this user
  const getStorageKey = () => `petState_${address}`;

  // Clear pet state (for logout)
  const clearPetState = () => {
    if (address) {
      const key = getStorageKey();
      localStorage.removeItem(key);
    }
  };

  // Reset pet state to initial (for clearing fake data)
  const resetPetState = () => {
    const initialState: PetState = {
      health: GAME_CONSTANTS.STARTING_HEALTH,
      lastFed: null,
      mood: 'happy',
      healthHistory: []
    };
    setPetState(initialState);
    if (address) {
      savePetState(initialState);
    }
  };

  // Load pet state from localStorage
  const loadPetState = (): PetState => {
    if (!address) {
      return {
        health: GAME_CONSTANTS.STARTING_HEALTH,
        lastFed: null,
        mood: 'happy',
        healthHistory: []
      };
    }

    const key = getStorageKey();
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          health: parsed.health ?? GAME_CONSTANTS.STARTING_HEALTH,
          lastFed: parsed.lastFed ?? null,
          mood: parsed.mood ?? 'happy',
          healthHistory: parsed.healthHistory ?? []
        };
      } catch {
        console.error('Failed to parse pet state from localStorage');
      }
    }
    
    // Initialize new user with starting health - NO FAKE DATA
    const initialState: PetState = {
      health: GAME_CONSTANTS.STARTING_HEALTH,
      lastFed: null,
      mood: 'happy',
      healthHistory: []
    };
    
    return initialState;
  };

  // Save pet state to localStorage
  const savePetState = (state: PetState) => {
    if (!address) return; // Don't save if no wallet connected
    
    const key = getStorageKey();
    localStorage.setItem(key, JSON.stringify(state));
  };

  // Add health event to history
  const addHealthEvent = (healthChange: number, reason: string, details?: string) => {
    const event: HealthEvent = {
      timestamp: Date.now(),
      healthChange,
      reason,
      details
    };

    setPetState(prev => {
      const newState = {
        ...prev,
        healthHistory: [event, ...prev.healthHistory]
      };
      savePetState(newState);
      return newState;
    });
  };

  // Calculate mood based on health
  const calculateMood = (health: number): 'hungry' | 'neutral' | 'happy' => {
    if (health <= MOOD_THRESHOLDS.HUNGRY.max) return 'hungry';
    if (health <= MOOD_THRESHOLDS.NEUTRAL.max) return 'neutral';
    return 'happy';
  };

  // Apply natural decay
  const applyDecay = (state: PetState): PetState => {
    if (!state.lastFed) return state;

    const now = Date.now();
    const timeSinceLastFed = now - state.lastFed;
    const decayCycles = Math.floor(timeSinceLastFed / GAME_CONSTANTS.DECAY_INTERVAL);
    
    if (decayCycles > 0) {
      const totalDecay = decayCycles * GAME_CONSTANTS.DECAY_AMOUNT;
      const newHealth = Math.max(0, state.health - totalDecay);
      
      // Add decay events to history
      const newHistory = [...state.healthHistory];
      for (let i = 0; i < decayCycles; i++) {
        newHistory.unshift({
          timestamp: state.lastFed + (i + 1) * GAME_CONSTANTS.DECAY_INTERVAL,
          healthChange: -GAME_CONSTANTS.DECAY_AMOUNT,
          reason: 'Natural decay',
          details: 'No food for 6 hours'
        });
      }

      return {
        ...state,
        health: newHealth,
        mood: calculateMood(newHealth),
        healthHistory: newHistory
      };
    }

    return state;
  };

  // Feed pet (instant swap)
  const feedInstantSwap = (tokenPair?: string) => {
    setPetState(prev => {
      const decayedState = applyDecay(prev);
      const newHealth = Math.min(
        GAME_CONSTANTS.MAX_HEALTH, 
        decayedState.health + GAME_CONSTANTS.FEEDING_REWARDS.INSTANT_SWAP
      );
      
      const newState = {
        ...decayedState,
        health: newHealth,
        lastFed: Date.now(),
        mood: calculateMood(newHealth)
      };

      addHealthEvent(
        GAME_CONSTANTS.FEEDING_REWARDS.INSTANT_SWAP,
        'Instant swap',
        tokenPair ? `Swapped ${tokenPair}` : undefined
      );

      savePetState(newState);
      return newState;
    });
  };

  // Feed pet (DCA creation)
  const feedDCACreation = (orderHash: string, tokenPair?: string) => {
    setPetState(prev => {
      const decayedState = applyDecay(prev);
      const newHealth = Math.min(
        GAME_CONSTANTS.MAX_HEALTH, 
        decayedState.health + GAME_CONSTANTS.FEEDING_REWARDS.DCA_CREATION
      );
      
      const newState = {
        ...decayedState,
        health: newHealth,
        lastFed: Date.now(),
        mood: calculateMood(newHealth)
      };

      addHealthEvent(
        GAME_CONSTANTS.FEEDING_REWARDS.DCA_CREATION,
        'DCA order created',
        tokenPair ? `Created ${tokenPair} DCA` : undefined
      );

      savePetState(newState);
      return newState;
    });
  };

  // Feed pet (DCA fill)
  const feedDCAFill = (orderHash: string, tokenPair?: string) => {
    setPetState(prev => {
      const decayedState = applyDecay(prev);
      const newHealth = Math.min(
        GAME_CONSTANTS.MAX_HEALTH, 
        decayedState.health + GAME_CONSTANTS.FEEDING_REWARDS.DCA_FILL
      );
      
      const newState = {
        ...decayedState,
        health: newHealth,
        lastFed: Date.now(),
        mood: calculateMood(newHealth)
      };

      addHealthEvent(
        GAME_CONSTANTS.FEEDING_REWARDS.DCA_FILL,
        'DCA order filled',
        tokenPair ? `Filled ${tokenPair} DCA` : undefined
      );

      savePetState(newState);
      return newState;
    });
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

  // Debug function to check localStorage data


  // Fix corrupted timestamp data
  const fixCorruptedTimestamps = () => {
    if (address) {
      const key = getStorageKey();
      const saved = localStorage.getItem(key);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          let needsUpdate = false;
          
          // Check if lastFed timestamp is in the future (corrupted)
          if (parsed.lastFed && parsed.lastFed > Date.now()) {

          }
          
          // Check health history for corrupted timestamps
          if (parsed.healthHistory && Array.isArray(parsed.healthHistory)) {
            parsed.healthHistory = parsed.healthHistory.filter((event: any) => {
              if (event.timestamp && event.timestamp > Date.now()) {

                return false;
              }
              return true;
            });
            needsUpdate = true;
          }
          
          if (needsUpdate) {
            localStorage.setItem(key, JSON.stringify(parsed));
            setPetState(parsed);

          }
        } catch (e) {
          console.error('Failed to fix timestamps:', e);
        }
      }
    }
  };

  // Initialize pet state
  useEffect(() => {
    if (address) {
      const loadedState = loadPetState();
      setPetState(loadedState);
    } else {
      // Reset to initial state when wallet disconnects
      setPetState({
        health: GAME_CONSTANTS.STARTING_HEALTH,
        lastFed: null,
        mood: 'happy',
        healthHistory: []
      });
    }
  }, [address]);

  // Update pet state every second for real-time updates
  useEffect(() => {
    if (!address) return;

    const updatePetState = () => {
      setPetState(prev => {
        const decayedState = applyDecay(prev);
        if (decayedState.health !== prev.health || decayedState.mood !== prev.mood) {
          savePetState(decayedState);
          return decayedState;
        }
        return prev;
      });
    };

    const interval = setInterval(updatePetState, 1000);
    return () => clearInterval(interval);
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