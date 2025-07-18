// Mock types to avoid importing from card-data
export interface Benefit {
  id: string;
  definition_id: string;
  name: string;
  value: number;
  period: string;
  periodMonths?: number;
  resetType?: string;
  categories: string[];
}

export interface CardPerk {
  id: string;
  cardId: string;
  status: string;
  streakCount: number;
  coldStreakCount: number;
  remaining_value?: number;
}

export const trackPerkRedemption = jest.fn().mockResolvedValue({ error: null });
export const deletePerkRedemption = jest.fn().mockResolvedValue({ error: null });
export const getPerkRedemptions = jest.fn();
export const setAutoRedemption = jest.fn(); 