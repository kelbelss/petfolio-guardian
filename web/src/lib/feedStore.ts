import { create } from 'zustand';

export interface FeedDraft {
  srcToken: string;
  dstToken: string;
  chunkIn: number;
  slippageTolerance: number;
  interval: number;
  stopCondition: 'end-date' | 'total-amount';
  endDate?: string;
  totalAmount?: number;
  minOut?: string;
}

export const useFeedStore = create<FeedDraft>(() => ({
  srcToken: '',
  dstToken: '',
  chunkIn: 0.01,
  slippageTolerance: 0.5,
  interval: 21600, // 6 hours default
  stopCondition: 'end-date',
})); 