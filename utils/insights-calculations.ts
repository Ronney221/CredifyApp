import { MonthlyRedemptionSummary } from '../src/data/dummy-insights';

interface PerkDetail {
  id: string;
  name: string;
  value: number;
  status: 'redeemed' | 'missed' | 'available' | 'partial';
  period: 'monthly' | 'quarterly' | 'semi_annual' | 'annual';
  expiresThisMonth?: boolean;
  expiresNextMonth?: boolean;
  partialValue?: number;
}

interface RedemptionCalculations {
  redeemedValue: number;
  partialValue: number;
  totalRedeemedValue: number; // redeemed + partial
  availableValue: number;
  missedValue: number;
  potentialValue: number;
}

export const calculateRedemptionValues = (
  summary: MonthlyRedemptionSummary,
  includeOnlyRelevantPerks = false,
  isCurrentMonth = false
): RedemptionCalculations => {
  let relevantPerks = summary.perkDetails;

  // Filter to only relevant perks if requested
  if (includeOnlyRelevantPerks) {
    relevantPerks = summary.perkDetails.filter(perk => {
      // Always include redeemed and partial perks
      if (perk.status === 'redeemed' || perk.status === 'partial') return true;
      
      // For monthly perks, they're always relevant
      if (perk.period === 'monthly') return true;
      
      // For non-monthly perks, logic depends on current vs historical month
      if (perk.status === 'missed' || perk.status === 'available') {
        if (isCurrentMonth) {
          // Current month: include if expires this month OR next month
          return perk.expiresThisMonth === true || perk.expiresNextMonth === true;
        } else {
          // Historical month: only include if expired in that specific month
          return perk.expiresThisMonth === true;
        }
      }
      
      return false;
    });
  }

  const redeemedValue = relevantPerks
    .filter(perk => perk.status === 'redeemed')
    .reduce((sum, perk) => sum + perk.value, 0);

  const partialValue = relevantPerks
    .filter(perk => perk.status === 'partial')
    .reduce((sum, perk) => sum + (perk.partialValue || 0), 0);

  const availableValue = relevantPerks
    .filter(perk => perk.status === 'available')
    .reduce((sum, perk) => sum + perk.value, 0);

  const missedValue = relevantPerks
    .filter(perk => perk.status === 'missed')
    .reduce((sum, perk) => sum + perk.value, 0);

  const potentialValue = relevantPerks
    .reduce((sum, perk) => sum + perk.value, 0);

  return {
    redeemedValue,
    partialValue,
    totalRedeemedValue: redeemedValue + partialValue,
    availableValue,
    missedValue,
    potentialValue,
  };
};

export const calculateMonthlyPerksOnly = (
  summary: MonthlyRedemptionSummary
): RedemptionCalculations => {
  const monthlyPerks = summary.perkDetails.filter(perk => perk.period === 'monthly');
  
  const redeemedValue = monthlyPerks
    .filter(perk => perk.status === 'redeemed')
    .reduce((sum, perk) => sum + perk.value, 0);

  const partialValue = monthlyPerks
    .filter(perk => perk.status === 'partial')
    .reduce((sum, perk) => sum + (perk.partialValue || 0), 0);

  const availableValue = monthlyPerks
    .filter(perk => perk.status === 'available')
    .reduce((sum, perk) => sum + perk.value, 0);

  const missedValue = monthlyPerks
    .filter(perk => perk.status === 'missed')
    .reduce((sum, perk) => sum + perk.value, 0);

  const potentialValue = monthlyPerks
    .reduce((sum, perk) => sum + perk.value, 0);

  return {
    redeemedValue,
    partialValue,
    totalRedeemedValue: redeemedValue + partialValue,
    availableValue,
    missedValue,
    potentialValue,
  };
};