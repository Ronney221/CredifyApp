import { allCards, Benefit } from './card-data';

export type PerkStatusFilter = 'all' | 'redeemed' | 'missed';

// --- TYPE DEFINITIONS ---

export interface PerkRedemptionDetail {
  id: string;
  name:string;
  value: number;
  status: 'redeemed' | 'missed';
  period: Benefit['period'];
}

export interface MonthlyRedemptionSummary {
  monthYear: string; // e.g., "July 2024"
  monthKey: string; // Unique key for the month, e.g., "2024-07"
  totalRedeemedValue: number;
  totalPotentialValue: number;
  perksRedeemedCount: number;
  perksMissedCount: number;
  perkDetails: PerkRedemptionDetail[];
  cardFeesProportion: number; // For calculating "on pace for annual fee"
  allMonthlyPerksRedeemedThisMonth: boolean;
  coverageTrend: number[]; // Added for sparkline
}

export interface Achievement {
  id: string;
  emoji: string;
  title: string;
  description: string;
}

export interface YearSection {
  year: string;
  data: MonthlyRedemptionSummary[];
  totalRedeemedForYear: number;
  totalPotentialForYear: number;
}

export interface CardROI {
  id: string;
  name: string;
  totalRedeemed: number;
  annualFee: number;
  roiPercentage: number;
}

export interface InsightsData {
  yearSections: YearSection[];
  achievements: Achievement[];
  availableCardsForFilter: { id: string; name: string; activityCount: number; }[];
  cardRois: CardROI[];
  currentFeeCoverageStreak?: number;
}

// --- DUMMY DATA GENERATION ---
export const generateDummyInsightsData = (
  selectedCards: string[]
): Omit<InsightsData, 'availableCardsForFilter' | 'currentFeeCoverageStreak' | 'cardRois'> & {
  currentFeeCoverageStreak?: number;
  availableCardsForFilter: { id: string; name: string; activityCount: number }[];
  cardRois: CardROI[];
} => {
  const insightsCards = allCards.filter(
    card => selectedCards.includes(card.id)
  );

  const monthlyDataByYear: Record<string, { شهرs: MonthlyRedemptionSummary[], yearTotalRedeemed: number, yearTotalPotential: number }> = {};
  const achievements: Achievement[] = [];
  const now = new Date();
  const cardActivity: Record<string, { redemptions: number; totalValue: number }> = {}; // Enhanced to track value

  let consecutiveFeeCoverageMonths = 0;
  let highestSingleMonthRedemption = { month: '', value: 0 };
  const perkRedemptionStreaks: Record<string, number> = {}; // perkId: streakCount
  let consecutiveMonthsAllPerksRedeemed = 0;

  if (insightsCards.length === 0) {
    return { yearSections: [], achievements: [{
      id: 'no_cards_selected',
      emoji: '💳',
      title: 'No Cards Selected',
      description: 'Select cards in the filter to see insights.',
    }], currentFeeCoverageStreak: 0, availableCardsForFilter: [], cardRois: [] };
  }

  for (let i = 5; i >= 0; i--) { 
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const yearStr = date.getFullYear().toString();
    const monthYearDisplay = date.toLocaleString('default', { month: 'long', year: 'numeric' });
    const monthKey = `${yearStr}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    if (!monthlyDataByYear[yearStr]) {
      monthlyDataByYear[yearStr] = { شهرs: [], yearTotalRedeemed: 0, yearTotalPotential: 0 };
    }

    let monthTotalRedeemed = 0;
    let monthTotalPotential = 0;
    let monthPerksRedeemed = 0;
    let monthPerksMissed = 0;
    const currentMonthPerkDetails: PerkRedemptionDetail[] = [];
    let allMonthlyPerksAvailableThisMonth = 0;
    let allMonthlyPerksRedeemedThisMonthCount = 0;

    let totalAnnualFeesForProration = 0;
    insightsCards.forEach(card => {
      totalAnnualFeesForProration += card.annualFee || 0;
    });
    const monthlyFeeProrationTarget = totalAnnualFeesForProration / 12;

    // Generate dummy coverage trend for the last 12 months
    const coverageTrend: number[] = Array.from({ length: 12 }, () => Math.floor(Math.random() * 101));

    insightsCards.forEach(card => {
      card.benefits.forEach(perk => {
        if (perk.period === 'monthly') {
          allMonthlyPerksAvailableThisMonth++;
          const isRedeemed = Math.random() > 0.4; // 60% chance of redeeming a monthly perk
          monthTotalPotential += perk.value;
          currentMonthPerkDetails.push({
            id: perk.definition_id, // Use definition_id for uniqueness
            name: perk.name,
            value: perk.value,
            status: isRedeemed ? 'redeemed' : 'missed',
            period: perk.period,
          });

          if (isRedeemed) {
            monthTotalRedeemed += perk.value;
            monthPerksRedeemed++;
            allMonthlyPerksRedeemedThisMonthCount++;
            perkRedemptionStreaks[perk.definition_id] = (perkRedemptionStreaks[perk.definition_id] || 0) + 1;
            // Track card-specific activity
            if (!cardActivity[card.id]) {
              cardActivity[card.id] = { redemptions: 0, totalValue: 0 };
            }
            cardActivity[card.id].redemptions++;
            cardActivity[card.id].totalValue += perk.value;
          } else {
            monthPerksMissed++;
            perkRedemptionStreaks[perk.definition_id] = 0; // Reset streak
          }
        }
        // TODO: Handle yearly/semi-annual/quarterly perks appropriately if they factor into monthly views
      });
    });
    
    const allCurrentMonthlyPerksRedeemed = allMonthlyPerksAvailableThisMonth > 0 && allMonthlyPerksRedeemedThisMonthCount === allMonthlyPerksAvailableThisMonth;

    const monthSummary: MonthlyRedemptionSummary = {
      monthKey,
      monthYear: monthYearDisplay,
      totalRedeemedValue: monthTotalRedeemed,
      totalPotentialValue: monthTotalPotential,
      perksRedeemedCount: monthPerksRedeemed,
      perksMissedCount: monthPerksMissed,
      perkDetails: currentMonthPerkDetails,
      cardFeesProportion: monthlyFeeProrationTarget > 0 ? monthlyFeeProrationTarget : 0.01, // Avoid division by zero for feeProration
      allMonthlyPerksRedeemedThisMonth: allCurrentMonthlyPerksRedeemed,
      coverageTrend, // Added
    };
    // Add to the beginning of the array for that year to keep months in reverse chronological order within the year section
    monthlyDataByYear[yearStr].شهرs.unshift(monthSummary);
    monthlyDataByYear[yearStr].yearTotalRedeemed += monthTotalRedeemed;
    monthlyDataByYear[yearStr].yearTotalPotential += monthTotalPotential;

    // Achievement Calculations
    if (monthlyFeeProrationTarget > 0 && monthTotalRedeemed >= monthlyFeeProrationTarget) {
      consecutiveFeeCoverageMonths++;
    } else {
      consecutiveFeeCoverageMonths = 0;
    }

    if (monthTotalRedeemed > highestSingleMonthRedemption.value) {
      highestSingleMonthRedemption = { month: monthYearDisplay, value: monthTotalRedeemed };
    }
    
    if(allCurrentMonthlyPerksRedeemed) {
      consecutiveMonthsAllPerksRedeemed++;
    } else {
      consecutiveMonthsAllPerksRedeemed = 0;
    }
  }

  // Populate Achievements based on calculated streaks/data
  if (highestSingleMonthRedemption.value > 0) {
    achievements.push({
      id: 'highest_month',
      emoji: '🏆',
      title: 'Top Month!',
      description: `Highest single-month redemption: $${highestSingleMonthRedemption.value.toFixed(0)} in ${highestSingleMonthRedemption.month}.`,
    });
  }

  if (consecutiveFeeCoverageMonths >= 2) { // Example: 2 months for a streak
    achievements.push({
      id: 'fee_coverage_streak',
      emoji: '🔥',
      title: 'Fee Crusher!',
      description: `${consecutiveFeeCoverageMonths} consecutive months >50% fees covered.`,
    });
  }
  
  if (consecutiveMonthsAllPerksRedeemed >= 2) {
     achievements.push({
      id: 'all_perks_streak',
      emoji: '💯',
      title: 'Perk Perfectionist!',
      description: `${consecutiveMonthsAllPerksRedeemed} consecutive months redeeming all available monthly perks.`,
    });
  }

  for (const perkId in perkRedemptionStreaks) {
    if (perkRedemptionStreaks[perkId] >= 3) { // Example: 3 months for a specific perk streak
      const perkDetail = allCards.flatMap(c => c.benefits).find(p => p.definition_id === perkId);
      if (perkDetail) {
        achievements.push({
          id: `perk_streak_${perkId}`,
          emoji: '🎯',
          title: `${perkDetail.name} Streak!`,
          description: `Redeemed ${perkDetail.name} for ${perkRedemptionStreaks[perkId]} months in a row.`,
        });
      }
    }
  }
   // Add a fallback if no achievements yet
   if (achievements.length === 0 && insightsCards.length > 0) {
    achievements.push({
      id: 'getting_started',
      emoji: '🚀',
      title: 'Getting Started!',
      description: 'Keep redeeming perks to unlock achievements and see your progress.',
    });
  }

  // Convert monthlyDataByYear to yearSections, sorted by year descending (most recent year first)
  const yearSections: YearSection[] = Object.keys(monthlyDataByYear)
    .sort((a, b) => parseInt(b) - parseInt(a)) // Sort years descending
    .map(year => ({
      year: year,
      data: monthlyDataByYear[year].شهرs, // Months are already reverse chrono
      totalRedeemedForYear: monthlyDataByYear[year].yearTotalRedeemed,
      totalPotentialForYear: monthlyDataByYear[year].yearTotalPotential,
    }));

  const availableCardsForFilter = allCards.map(c => ({
    id: c.id,
    name: c.name,
    activityCount: cardActivity[c.id]?.redemptions || 0,
  }));

  const cardRois: CardROI[] = insightsCards.map(card => {
    const totalRedeemed = cardActivity[card.id]?.totalValue || 0;
    const annualFee = card.annualFee || 0;
    const roiPercentage = annualFee > 0 ? (totalRedeemed / annualFee) * 100 : (totalRedeemed > 0 ? 100 : 0); // Handle $0 fee

    return {
      id: card.id,
      name: card.name,
      totalRedeemed,
      annualFee,
      roiPercentage,
    };
  });

  return { yearSections, achievements, currentFeeCoverageStreak: consecutiveFeeCoverageMonths >= 2 ? consecutiveFeeCoverageMonths : undefined, availableCardsForFilter, cardRois };
}; 