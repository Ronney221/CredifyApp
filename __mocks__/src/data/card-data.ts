export interface Benefit {
  id: string;
  definition_id: string;
  name: string;
  value: number;
  period: string;
  periodMonths?: number;
  resetType?: string;
}

export interface CardPerk {
  id: string;
  cardId: string;
  status: string;
  streakCount: number;
  coldStreakCount: number;
  remaining_value?: number;
}

export const allCards = []; 