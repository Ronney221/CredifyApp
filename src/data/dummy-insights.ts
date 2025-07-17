import { allCards, Benefit } from './card-data';
import { getRedemptionsForPeriod } from '../../lib/database';

export type PerkPeriod = 'monthly' | 'quarterly' | 'semi_annual' | 'annual';
export type PerkStatus = 'redeemed' | 'missed' | 'available' | 'partial';
export type PerkStatusFilter = 'all' | PerkStatus;

// --- TYPE DEFINITIONS ---

export interface PerkRedemptionDetail {
  id: string;
  name: string;
  value: number;
  status: PerkStatus;
  period: PerkPeriod;
  expiresThisMonth: boolean;
}

export interface PerkDetail {
  id: string;
  name: string;
  value: number;
  status: 'redeemed' | 'available' | 'missed' | 'partial';
  period: 'monthly' | 'quarterly' | 'semi_annual' | 'annual';
  expiresThisMonth?: boolean;
  expiresNextMonth?: boolean;
  partialValue?: number; // For partial redemptions
  reset_date?: string;
}

export interface MonthlyRedemptionSummary {
  monthYear: string; // e.g., "July 2024"
  monthKey: string; // Unique key for the month, e.g., "2024-07"
  totalRedeemedValue: number;
  totalPotentialValue: number;
  perksRedeemedCount: number;
  perksMissedCount: number;
  perkDetails: PerkDetail[];
  cardFeesProportion: number; // For calculating "on pace for annual fee"
  allMonthlyPerksRedeemedThisMonth: boolean;
  coverageTrend: number[]; // Added for sparkline
  isEven?: boolean; // For alternating row colors
  currentFeeCoverageStreak?: number;
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
export const generateDummyInsightsData = async (
  selectedCards: string[],
  processedCardsWithPerks?: { 
    card: { 
      id: string; 
      name: string; 
      benefits: Benefit[]; 
      annualFee: number 
    }; 
    perks: { 
      id: string; 
      definition_id: string; 
      name: string; 
      value: number; 
      status: 'redeemed' | 'available' | 'partial'; 
      period: Benefit['period'];
      remaining_value?: number;
      reset_date?: string;
    }[] 
  }[],
  userId?: string
): Promise<Omit<InsightsData, 'availableCardsForFilter' | 'currentFeeCoverageStreak' | 'cardRois'> & {
  currentFeeCoverageStreak?: number;
  availableCardsForFilter: { id: string; name: string; activityCount: number }[];
  cardRois: CardROI[];
}> => {
  const insightsCards = allCards.filter(
    card => selectedCards.includes(card.id)
  );

  const monthlyDataByYear: Record<string, { شهرs: MonthlyRedemptionSummary[], yearTotalRedeemed: number, yearTotalPotential: number }> = {};
  const achievements: Achievement[] = [];
  const now = new Date();
  const cardActivity: Record<string, { redemptions: number; totalValue: number }> = {};

  let consecutiveFeeCoverageMonths = 0;
  let highestSingleMonthRedemption = { month: '', value: 0 };
  const perkRedemptionStreaks: Record<string, number> = {};
  let consecutiveMonthsAllPerksRedeemed = 0;

  if (insightsCards.length === 0) {
    return { 
      yearSections: [], 
      achievements: [{
        id: `no_cards_selected_${Date.now()}`,
        emoji: '💳',
        title: 'No Cards Selected',
        description: 'Select cards in the filter to see insights.',
      }], 
      currentFeeCoverageStreak: 0, 
      availableCardsForFilter: [], 
      cardRois: [] 
    };
  }

  // Get historical redemption data for the past 6 months
  let historicalRedemptions: { 
    perk_id: string; 
    redemption_date: string; 
    status: 'available' | 'redeemed' | 'partially_redeemed';
    value_redeemed: number;
    total_value: number;
    remaining_value: number;
  }[] = [];
  if (userId) {
    const startDate = new Date(now.getFullYear(), now.getMonth() - 5, 1); // 6 months ago
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0); // End of current month
    const result = await getRedemptionsForPeriod(userId, startDate, endDate);
    if (result.data && !result.error) {
      historicalRedemptions = result.data.map(r => ({
        perk_id: r.perk_id,
        redemption_date: r.redemption_date || new Date().toISOString(), // Fallback to current date if missing
        status: r.status,
        value_redeemed: r.value_redeemed || 0,
        total_value: r.total_value || 0,
        remaining_value: r.remaining_value || 0
      }));
    }
  }

  for (let i = 5; i >= 0; i--) { 
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const yearStr = date.getFullYear().toString();
    const monthYearDisplay = date.toLocaleString('default', { month: 'long', year: 'numeric' });
    const monthKey = `${yearStr}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);

    if (!monthlyDataByYear[yearStr]) {
      monthlyDataByYear[yearStr] = { شهرs: [], yearTotalRedeemed: 0, yearTotalPotential: 0 };
    }

    let monthTotalRedeemed = 0;
    let monthTotalPotential = 0;
    let monthPerksRedeemed = 0;
    let monthPerksMissed = 0;
    const currentMonthPerkDetails: PerkDetail[] = [];
    let allMonthlyPerksAvailableThisMonth = 0;
    let allMonthlyPerksRedeemedThisMonthCount = 0;

    let totalAnnualFeesForProration = 0;
    insightsCards.forEach(card => {
      totalAnnualFeesForProration += card.annualFee || 0;
    });
    const monthlyFeeProrationTarget = totalAnnualFeesForProration / 12;

    // Generate dummy coverage trend for the last 12 months
    const coverageTrend: number[] = Array.from({ length: 12 }, () => Math.floor(Math.random() * 101));

    // For current month, use real data if available
    const isCurrentMonth = i === 0; // Current month should be determined by date only
    
    if (isCurrentMonth && processedCardsWithPerks) {
      const selectedProcessedCards = processedCardsWithPerks.filter(
        cardData => selectedCards.includes(cardData.card.id)
      );

      // Get current month's redemptions
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0); // Last day of current month
      const nextMonthStart = new Date(date.getFullYear(), date.getMonth() + 1, 1);
      const getRedemptionStatus = (perkId: string) => {
        const redemption = historicalRedemptions.find(r => 
          r.perk_id === perkId &&
          new Date(r.redemption_date) >= monthStart &&
          new Date(r.redemption_date) <= monthEnd
        );
        return redemption ? {
          status: redemption.status,
          value_redeemed: redemption.value_redeemed,
          total_value: redemption.total_value,
          remaining_value: redemption.remaining_value
        } : null;
      };

      selectedProcessedCards.forEach(cardData => {
        cardData.perks.forEach(perk => {
          // For monthly perks, add to potential value
          if (perk.period === 'monthly') {
            allMonthlyPerksAvailableThisMonth++;
            monthTotalPotential += perk.value;
          }
            
          const perkDetailId = `${cardData.card.id}_${perk.definition_id}_${monthKey}`;
          
          // Check if this perk was redeemed in the current month
          const redemptionStatus = getRedemptionStatus(perk.definition_id);
          const isRedeemed = redemptionStatus?.status === 'redeemed';
          const isPartiallyRedeemed = redemptionStatus?.status === 'partially_redeemed';
          
          let displayStatus: 'redeemed' | 'partial' | 'available' = 'available';
          if (isRedeemed) {
            displayStatus = 'redeemed';
          } else if (isPartiallyRedeemed) {
            displayStatus = 'partial';
          }

          // Determine if non-monthly perk expires this month or next month
          let expiresThisMonth = false;
          let expiresNextMonth = false;
          if (perk.period !== 'monthly' && !isRedeemed) {
            if (perk.period === 'semi_annual') {
              // For semi-annual perks, they expire at the end of June and December
              const isJune = monthEnd.getMonth() === 5; // June is 5 (0-based)
              const isDecember = monthEnd.getMonth() === 11;
              expiresThisMonth = isJune || isDecember;
              
              // For May, check if next month is June (or for November, check if next month is December)
              const isNextMonthJune = nextMonthStart.getMonth() === 6;
              const isNextMonthDecember = nextMonthStart.getMonth() === 12;
              expiresNextMonth = isNextMonthJune || isNextMonthDecember;
            } else {
              // For other periods, use the reset date logic
              const resetDate = new Date(perk.reset_date || '');
              expiresThisMonth = resetDate.getMonth() === monthEnd.getMonth() && 
                                resetDate.getFullYear() === monthEnd.getFullYear();
              expiresNextMonth = resetDate.getMonth() === nextMonthStart.getMonth() && 
                                resetDate.getFullYear() === nextMonthStart.getFullYear();
            }
          }
          
          currentMonthPerkDetails.push({
            id: perkDetailId,
            name: perk.name,
            value: perk.value,
            status: displayStatus,
            period: perk.period,
            expiresThisMonth,
            expiresNextMonth,
            partialValue: displayStatus === 'partial' ? (redemptionStatus?.value_redeemed || 0) : undefined,
            reset_date: perk.reset_date || undefined
          } as PerkDetail);

          if (displayStatus === 'redeemed') {
            const redeemedValue = redemptionStatus?.value_redeemed || perk.value;
            monthTotalRedeemed += redeemedValue;
            monthPerksRedeemed++;
            if (perk.period === 'monthly') {
              allMonthlyPerksRedeemedThisMonthCount++;
            }
            
            // Track card-specific activity
            if (!cardActivity[cardData.card.id]) {
              cardActivity[cardData.card.id] = { redemptions: 0, totalValue: 0 };
            }
            cardActivity[cardData.card.id].redemptions++;
            cardActivity[cardData.card.id].totalValue += redeemedValue;
          } else if (displayStatus === 'partial') {
            const partialValue = redemptionStatus?.value_redeemed || 0;
            monthTotalRedeemed += partialValue;
            monthPerksRedeemed++;
            if (perk.period === 'monthly') {
              allMonthlyPerksRedeemedThisMonthCount += 0.5; // Partial weight
            }
            
            // Track card-specific activity
            if (!cardActivity[cardData.card.id]) {
              cardActivity[cardData.card.id] = { redemptions: 0, totalValue: 0 };
            }
            cardActivity[cardData.card.id].redemptions++;
            cardActivity[cardData.card.id].totalValue += partialValue;
          } else {
            monthPerksMissed++;
          }
        });
      });
    } else {
      // Use historical data for past months
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0); // Last day of current month
      const nextMonthStart = new Date(date.getFullYear(), date.getMonth() + 1, 1);
      
      insightsCards.forEach(card => {
        card.benefits.forEach(perk => {
          // For monthly perks, add to potential value
          if (perk.period === 'monthly') {
            allMonthlyPerksAvailableThisMonth++;
            monthTotalPotential += perk.value;
          }
          
          const perkDetailId = `${card.id}_${perk.definition_id}_${monthKey}`;
          
          // Check if this perk was redeemed in this month
          const redemptionStatus = historicalRedemptions.find(r => 
            r.perk_id === perk.definition_id &&
            new Date(r.redemption_date) >= monthStart &&
            new Date(r.redemption_date) <= monthEnd
          );

          // For current month, show as 'available' instead of 'missed' if not redeemed
          let displayStatus: 'redeemed' | 'partial' | 'available' | 'missed' = isCurrentMonth ? 'available' : 'missed';
          if (redemptionStatus) {
            if (redemptionStatus.status === 'redeemed') {
              displayStatus = 'redeemed';
            } else if (redemptionStatus.status === 'partially_redeemed') {
              displayStatus = 'partial';
            }
          }
          

          // Determine if non-monthly perk expires this month or next month
          let expiresThisMonth = false;
          let expiresNextMonth = false;
          if (perk.period !== 'monthly' && !redemptionStatus) {
            if (perk.period === 'semi_annual') {
              // For semi-annual perks, they expire at the end of June and December
              const isJune = monthEnd.getMonth() === 5; // June is 5 (0-based)
              const isDecember = monthEnd.getMonth() === 11;
              expiresThisMonth = isJune || isDecember;
              
              // For May, check if next month is June (or for November, check if next month is December)
              const isNextMonthJune = nextMonthStart.getMonth() === 5;
              const isNextMonthDecember = nextMonthStart.getMonth() === 11;
              expiresNextMonth = isNextMonthJune || isNextMonthDecember;
            } else {
              // For other periods, calculate based on period months
              const periodMonths = perk.period === 'quarterly' ? 3 : 
                                 perk.period === 'annual' ? 12 : 1;
              
              const periodStart = new Date(monthStart);
              periodStart.setMonth(periodStart.getMonth() - (periodStart.getMonth() % periodMonths));
              const periodEnd = new Date(periodStart);
              periodEnd.setMonth(periodStart.getMonth() + periodMonths - 1);
              periodEnd.setDate(periodEnd.getDate() + 1);

              expiresThisMonth = monthEnd.getMonth() === periodEnd.getMonth() && 
                                monthEnd.getFullYear() === periodEnd.getFullYear();
              expiresNextMonth = nextMonthStart.getMonth() === periodEnd.getMonth() && 
                                nextMonthStart.getFullYear() === periodEnd.getFullYear();
            }
          }
          
          currentMonthPerkDetails.push({
            id: perkDetailId,
            name: perk.name,
            value: perk.value,
            status: displayStatus,
            period: perk.period,
            expiresThisMonth,
            expiresNextMonth,
            partialValue: displayStatus === 'partial' ? (redemptionStatus?.value_redeemed || 0) : undefined,
            reset_date: undefined
          } as PerkDetail);

          if (displayStatus === 'redeemed') {
            const redeemedValue = redemptionStatus?.value_redeemed || perk.value;
            monthTotalRedeemed += redeemedValue;
            monthPerksRedeemed++;
            if (perk.period === 'monthly') {
              allMonthlyPerksRedeemedThisMonthCount++;
            }
            perkRedemptionStreaks[perk.definition_id] = (perkRedemptionStreaks[perk.definition_id] || 0) + 1;
            
            if (!cardActivity[card.id]) {
              cardActivity[card.id] = { redemptions: 0, totalValue: 0 };
            }
            cardActivity[card.id].redemptions++;
            cardActivity[card.id].totalValue += redeemedValue;
          } else if (displayStatus === 'partial') {
            const partialValue = redemptionStatus?.value_redeemed || 0;
            monthTotalRedeemed += partialValue;
            monthPerksRedeemed++;
            if (perk.period === 'monthly') {
              allMonthlyPerksRedeemedThisMonthCount += 0.5; // Partial weight
            }
            perkRedemptionStreaks[perk.definition_id] = (perkRedemptionStreaks[perk.definition_id] || 0) + 0.5;
            
            if (!cardActivity[card.id]) {
              cardActivity[card.id] = { redemptions: 0, totalValue: 0 };
            }
            cardActivity[card.id].redemptions++;
            cardActivity[card.id].totalValue += partialValue;
          } else {
            monthPerksMissed++;
            perkRedemptionStreaks[perk.definition_id] = 0;
          }
        });
      });
    }
    
    const allCurrentMonthlyPerksRedeemed = allMonthlyPerksAvailableThisMonth > 0 && 
      allMonthlyPerksRedeemedThisMonthCount === allMonthlyPerksAvailableThisMonth;

    const monthSummary: MonthlyRedemptionSummary = {
      monthKey,
      monthYear: monthYearDisplay,
      totalRedeemedValue: monthTotalRedeemed,
      totalPotentialValue: monthTotalPotential,
      perksRedeemedCount: monthPerksRedeemed,
      perksMissedCount: monthPerksMissed,
      perkDetails: currentMonthPerkDetails,
      cardFeesProportion: monthlyFeeProrationTarget > 0 ? monthlyFeeProrationTarget : 0.01,
      allMonthlyPerksRedeemedThisMonth: allCurrentMonthlyPerksRedeemed,
      coverageTrend,
    };

    monthlyDataByYear[yearStr].شهرs.unshift(monthSummary);
    monthlyDataByYear[yearStr].yearTotalRedeemed += monthTotalRedeemed;
    monthlyDataByYear[yearStr].yearTotalPotential += monthTotalPotential;

    // Only consider monthly perks for fee coverage streak
    const monthlyRedeemedValue = currentMonthPerkDetails
      .filter(p => p.period === 'monthly' && p.status === 'redeemed')
      .reduce((sum, p) => sum + p.value, 0);

    if (monthlyFeeProrationTarget > 0 && monthlyRedeemedValue >= monthlyFeeProrationTarget) {
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
      id: `highest_month_${Date.now()}_${highestSingleMonthRedemption.month}`,
      emoji: '🏆',
      title: 'Top Month!',
      description: `Highest single-month redemption: $${highestSingleMonthRedemption.value.toFixed(0)} in ${highestSingleMonthRedemption.month}.`,
    });
  }

  if (consecutiveFeeCoverageMonths >= 2) {
    achievements.push({
      id: `fee_coverage_streak_${Date.now()}_${consecutiveFeeCoverageMonths}`,
      emoji: '🔥',
      title: 'Fee Crusher!',
      description: `${consecutiveFeeCoverageMonths} consecutive months >50% fees covered.`,
    });
  }
  
  if (consecutiveMonthsAllPerksRedeemed >= 2) {
    achievements.push({
      id: `all_perks_streak_${Date.now()}_${consecutiveMonthsAllPerksRedeemed}`,
      emoji: '💯',
      title: 'Perk Perfectionist!',
      description: `${consecutiveMonthsAllPerksRedeemed} consecutive months redeeming all available monthly perks.`,
    });
  }

  for (const perkId in perkRedemptionStreaks) {
    if (perkRedemptionStreaks[perkId] >= 3) {
      const perkDetail = allCards.flatMap(c => c.benefits).find(p => p.definition_id === perkId);
      if (perkDetail) {
        achievements.push({
          id: `perk_streak_${Date.now()}_${perkId}_${perkRedemptionStreaks[perkId]}`,
          emoji: '🎯',
          title: `${perkDetail.name} Streak!`,
          description: `Redeemed ${perkDetail.name} for ${perkRedemptionStreaks[perkId]} months in a row.`,
        });
      }
    }
  }

  if (achievements.length === 0 && insightsCards.length > 0) {
    achievements.push({
      id: `getting_started_${Date.now()}`,
      emoji: '🚀',
      title: 'Getting Started!',
      description: 'Keep redeeming perks to unlock achievements and see your progress.',
    });
  }

  const yearSections: YearSection[] = Object.keys(monthlyDataByYear)
    .sort((a, b) => parseInt(b) - parseInt(a))
    .map(year => ({
      year: year,
      data: monthlyDataByYear[year].شهرs,
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
    const roiPercentage = annualFee > 0 ? (totalRedeemed / annualFee) * 100 : (totalRedeemed > 0 ? 100 : 0);

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