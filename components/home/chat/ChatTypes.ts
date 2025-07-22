// ChatTypes.ts
import { CardPerk } from '../../../src/data/card-data';

export type BenefitRecommendationTuple = [string, string, string, number];

export interface UIBenefitRecommendation {
  benefitName: string;
  cardName: string;
  displayText: string;
  remainingValue: number;
  perk?: CardPerk;
}

export interface GroupedRecommendation {
  cardName: string;
  cardId: string;
  perks: UIBenefitRecommendation[];
}

export interface AIResponse {
  responseType: 'BenefitRecommendation' | 'NoBenefitFound' | 'Conversational';
  recommendations: BenefitRecommendationTuple[];
}

export interface Message {
  _id: string | number;
  text: string;
  createdAt: Date;
  user: {
    _id: string | number;
    name: string;
  };
  pending?: boolean;
  usage?: TokenUsage;
  structuredResponse?: AIResponse;
  groupedRecommendations?: GroupedRecommendation[];
  remainingUses?: number;
  isUpsell?: boolean;
  isLimitReached?: boolean;
  suggestedPrompts?: string[];
  responseType?: 'BenefitRecommendation' | 'NoBenefitFound' | 'Conversational';
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCost: number;
}

export interface ChatUsage {
  remainingUses: number;
  lastResetDate: string;
}

export interface CardData {
  card: {
    id: string;
    name: string;
  };
  perks: CardPerk[];
}

export interface ProcessedCard {
  id: string;
  name: string;
  perks: CardPerk[];
  card: {
    id: string;
    name: string;
  };
}