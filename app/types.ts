import { Card as BaseCard, Benefit } from '../src/data/card-data';

// Re-export the base types
export type Card = BaseCard;

// Define PerkStatus type
export type PerkStatus = 'available' | 'pending' | 'redeemed';

// Define CardPerk interface
export interface CardPerk extends Benefit {
  cardId: string;
  status: PerkStatus;
  streakCount: number;
  coldStreakCount: number;
} 