// Hippo Game - DCA Gamification System
// This file will handle all the gamification logic for the Petfolio Guardian

// Snack-based system: 0-10 snacks, -1 snack every 6 hours
export interface HippoState {
  snacks: number; // 0-10 snacks
  lastFed: Date | null;
  mood: 'hungry' | 'neutral' | 'happy';
}

// Snack meter mapping
export const SNACK_MAPPING = {
  HUNGRY: { min: 0, max: 3, mood: 'hungry', sprite: '😢' },
  NEUTRAL: { min: 4, max: 6, mood: 'neutral', sprite: '😐' },
  HAPPY: { min: 7, max: 10, mood: 'happy', sprite: '😄' }
};

// Decay settings
export const DECAY_SETTINGS = {
  SNACKS_PER_DECAY: 1,
  HOURS_PER_DECAY: 6,
  MAX_SNACKS: 10
};

// Feeding rewards
export const FEEDING_REWARDS = {
  INSTANT_SWAP: 1, // +1 snack for classic swap
  DCA_SLICE: 0.5   // +0.5 snack for TWAP/DCA slice
};

export class HippoGame {
  private state: HippoState;

  constructor() {
    this.state = {
      snacks: 8, // Start with 8 snacks
      lastFed: null,
      mood: 'happy'
    };
    this.loadState();
  }

  // Get current hippo state with decay applied
  getState(): HippoState {
    this.applyDecay();
    this.updateMood();
    return this.state;
  }

  // Apply natural decay over time
  private applyDecay(): void {
    if (!this.state.lastFed) return;

    const now = new Date();
    const hoursSinceLastFed = (now.getTime() - this.state.lastFed.getTime()) / (1000 * 60 * 60);
    const decayCycles = Math.floor(hoursSinceLastFed / DECAY_SETTINGS.HOURS_PER_DECAY);
    
    if (decayCycles > 0) {
      const snacksLost = decayCycles * DECAY_SETTINGS.SNACKS_PER_DECAY;
      this.state.snacks = Math.max(0, this.state.snacks - snacksLost);
      
      // Update lastFed to account for decay cycles
      const decayTime = decayCycles * DECAY_SETTINGS.HOURS_PER_DECAY * 60 * 60 * 1000;
      this.state.lastFed = new Date(this.state.lastFed.getTime() + decayTime);
    }
  }

  // Update mood based on snack count
  private updateMood(): void {
    if (this.state.snacks <= SNACK_MAPPING.HUNGRY.max) {
      this.state.mood = 'hungry';
    } else if (this.state.snacks <= SNACK_MAPPING.NEUTRAL.max) {
      this.state.mood = 'neutral';
    } else {
      this.state.mood = 'happy';
    }
  }

  // Feed hippo (instant swap)
  feedInstantSwap(): void {
    this.applyDecay();
    this.state.snacks = Math.min(DECAY_SETTINGS.MAX_SNACKS, this.state.snacks + FEEDING_REWARDS.INSTANT_SWAP);
    this.state.lastFed = new Date();
    this.updateMood();
    this.saveState();
  }

  // Feed hippo (DCA slice)
  feedDCASlice(): void {
    this.applyDecay();
    this.state.snacks = Math.min(DECAY_SETTINGS.MAX_SNACKS, this.state.snacks + FEEDING_REWARDS.DCA_SLICE);
    this.state.lastFed = new Date();
    this.updateMood();
    this.saveState();
  }

  // Get snack percentage (0-100)
  getSnackPercentage(): number {
    return (this.state.snacks / DECAY_SETTINGS.MAX_SNACKS) * 100;
  }

  // Get current mood info
  getMoodInfo() {
    const percentage = this.getSnackPercentage();
    
    if (percentage <= 30) return SNACK_MAPPING.HUNGRY;
    if (percentage <= 60) return SNACK_MAPPING.NEUTRAL;
    return SNACK_MAPPING.HAPPY;
  }

  // Get time until next decay
  getTimeUntilNextDecay(): number {
    if (!this.state.lastFed) return 0;
    
    const now = new Date();
    const timeSinceLastFed = now.getTime() - this.state.lastFed.getTime();
    const timeUntilDecay = (DECAY_SETTINGS.HOURS_PER_DECAY * 60 * 60 * 1000) - timeSinceLastFed;
    
    return Math.max(0, timeUntilDecay);
  }

  // Get hippo image based on mood
  getHippoImage(): string {
    switch (this.state.mood) {
      case 'hungry':
        return '/src/assets/HipposSad.gif';
      case 'neutral':
        return '/src/assets/HipposMid.gif';
      case 'happy':
        return '/src/assets/HipposHappy.gif';
      default:
        return '/src/assets/happy.PNG';
    }
  }

  // Save state to localStorage
  private saveState(): void {
    localStorage.setItem('hippoGameState', JSON.stringify(this.state));
  }

  // Load state from localStorage
  private loadState(): void {
    const saved = localStorage.getItem('hippoGameState');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.lastFed) {
        parsed.lastFed = new Date(parsed.lastFed);
      }
      this.state = { ...this.state, ...parsed };
    }
  }

  // Reset game state
  resetGame(): void {
    this.state = {
      snacks: 8,
      lastFed: null,
      mood: 'happy'
    };
    localStorage.removeItem('hippoGameState');
  }
}

// Export singleton instance
export const hippoGame = new HippoGame(); 