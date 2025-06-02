import { DefaultSectionT } from 'react-native';
import { Benefit } from '../../src/data/card-data'; // Adjust path as necessary

export type PerkStatusFilter = 'all' | 'redeemed' | 'missed';

export interface PerkRedemptionDetail {
  id: string;
  name: string;
  value: number;
  status: 'redeemed' | 'missed';
  period: Benefit['period'];
}

export interface MonthlyRedemptionSummary {
  monthYear: string; 
  monthKey: string; 
  totalRedeemedValue: number;
  totalPotentialValue: number;
  perksRedeemedCount: number;
  perksMissedCount: number;
  perkDetails: PerkRedemptionDetail[];
  cardFeesProportion: number; 
  allMonthlyPerksRedeemedThisMonth: boolean;
  coverageTrend: number[]; 
}

export interface Achievement {
  id: string;
  emoji: string;
  title: string;
  description: string;
}

export interface YearSection extends DefaultSectionT {
  year: string;
  data: MonthlyRedemptionSummary[];
}

export interface InsightsData {
  yearSections: YearSection[]; 
  achievements: Achievement[];
  availableCardsForFilter: { id: string; name: string }[];
  currentFeeCoverageStreak?: number; 
} 