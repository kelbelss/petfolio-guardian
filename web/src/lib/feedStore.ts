import { create } from 'zustand';

export interface FeedDraft {
  srcToken: string;
  dstToken: string;
  total: number;
  interval: number;
  minOut?: string;
}

export const useFeedStore = create<FeedDraft>(() => ({
  srcToken: '',
  dstToken: '',
  total: 0,
  interval: 86400,
})); 