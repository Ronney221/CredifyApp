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

export interface MultiChoicePerkConfig {
  label: string;
  targetPerkName: string;
}

export const multiChoicePerksConfig: Record<string, MultiChoicePerkConfig[]> = {
  "Uber / Grubhub Credit": [
    { label: "Open Uber (Rides)", targetPerkName: "Uber Ride Credit" },
    { label: "Open Uber Eats", targetPerkName: "Uber Eats Credit" },
    { label: "Open GrubHub", targetPerkName: "Grubhub Credit" },
  ],
  "Uber Cash": [
    { label: "Open Uber (Rides)", targetPerkName: "Uber Ride Credit" },
    { label: "Open Uber Eats", targetPerkName: "Uber Eats Credit" },
  ],
  "Digital Entertainment Credit": [
    { label: "Open Disney+", targetPerkName: "Disney+ Credit" },
    { label: "Open Hulu", targetPerkName: "Hulu Credit" },
    { label: "Open ESPN+", targetPerkName: "ESPN+ Credit" },
    { label: "Open Peacock", targetPerkName: "Peacock Credit" },
    { label: "Open NYTimes", targetPerkName: "NYTimes Credit" },
  ],
  "Disney Bundle Credit": [
    { label: "Open Disney+", targetPerkName: "Disney+ Credit" },
    { label: "Open Hulu", targetPerkName: "Hulu Credit" },
    { label: "Open ESPN+", targetPerkName: "ESPN+ Credit" },
  ],
}; 