import { useState, useEffect } from 'react';
import { CardPerk } from '../types';

interface PerkStatusHookResult {
  monthlyCreditsRedeemed: number;
  monthlyCreditsPossible: number;
  yearlyCreditsRedeemed: number;
  yearlyCreditsPossible: number;
  cumulativeValueSavedPerCard: Record<string, number>;
  redeemedInCurrentCycle: Record<string, boolean>;
  currentCycleIdentifier: string;
  showCelebration: boolean;
  setShowCelebration: (show: boolean) => void;
  setPerkStatus: (cardId: string, perkId: string, newStatus: 'available' | 'redeemed') => void;
  processNewMonth: (forcedDate?: Date) => void;
}

export function usePerkStatus(
  userCardsWithPerks: { card: { id: string }; perks: CardPerk[] }[]
): PerkStatusHookResult {
  const [monthlyCreditsRedeemed, setMonthlyCreditsRedeemed] = useState(0);
  const [monthlyCreditsPossible, setMonthlyCreditsPossible] = useState(0);
  const [yearlyCreditsRedeemed, setYearlyCreditsRedeemed] = useState(0);
  const [yearlyCreditsPossible, setYearlyCreditsPossible] = useState(0);
  const [cumulativeValueSavedPerCard, setCumulativeValueSavedPerCard] = useState<Record<string, number>>({});
  const [redeemedInCurrentCycle, setRedeemedInCurrentCycle] = useState<Record<string, boolean>>({});
  const [currentCycleIdentifier, setCurrentCycleIdentifier] = useState<string>(
    `${new Date().getFullYear()}-${new Date().getMonth()}`
  );
  const [showCelebration, setShowCelebration] = useState(false);

  // Effect to update summary credit data when userCardsWithPerks changes
  useEffect(() => {
    let mPossible = 0;
    let mRedeemed = 0;
    let yPossible = 0;
    let yRedeemed = 0;

    userCardsWithPerks.forEach(({ perks }) => {
      perks.forEach(perk => {
        if (perk.period === 'monthly') {
          mPossible += perk.value;
          if (perk.status === 'redeemed') {
            mRedeemed += perk.value;
          }
        } else if (perk.period === 'yearly') {
          yPossible += perk.value;
          if (perk.status === 'redeemed') {
            yRedeemed += perk.value;
          }
        }
      });
    });

    setMonthlyCreditsPossible(mPossible);
    setMonthlyCreditsRedeemed(mRedeemed);
    setYearlyCreditsPossible(yPossible);
    setYearlyCreditsRedeemed(yRedeemed);

    // Check for full monthly completion
    if (mPossible > 0 && mRedeemed === mPossible) {
      setShowCelebration(true);
    }
  }, [userCardsWithPerks]);

  const setPerkStatus = (cardId: string, perkId: string, newStatus: 'available' | 'redeemed') => {
    const cardData = userCardsWithPerks.find(({ card }) => card.id === cardId);
    if (!cardData) return;

    const perk = cardData.perks.find(p => p.id === perkId);
    if (!perk) return;

    // Handle cumulative value updates
    if (newStatus === 'redeemed' && perk.status !== 'redeemed') {
      // Add value when marking as redeemed
      setCumulativeValueSavedPerCard(prev => ({
        ...prev,
        [cardId]: (prev[cardId] || 0) + perk.value
      }));
      if (perk.period === 'monthly') {
        setRedeemedInCurrentCycle(prev => ({ ...prev, [perk.id]: true }));
      }
    } else if (newStatus === 'available' && perk.status === 'redeemed') {
      // Subtract value when un-redeeming
      setCumulativeValueSavedPerCard(prev => {
        const newValue = Math.max(0, (prev[cardId] || 0) - perk.value);
        const newState = { ...prev };
        if (newValue === 0) {
          delete newState[cardId]; // Remove the card if value is 0
        } else {
          newState[cardId] = newValue;
        }
        return newState;
      });
      if (perk.period === 'monthly') {
        setRedeemedInCurrentCycle(prev => {
          const newState = { ...prev };
          delete newState[perk.id];
          return newState;
        });
      }
    }
  };

  const processNewMonth = (forcedDate?: Date) => {
    let newCycleIdentifier_Year: number;
    let newCycleIdentifier_Month: number;

    if (forcedDate) {
      newCycleIdentifier_Year = forcedDate.getFullYear();
      newCycleIdentifier_Month = forcedDate.getMonth();
    } else {
      newCycleIdentifier_Year = new Date().getFullYear();
      newCycleIdentifier_Month = new Date().getMonth();
    }

    const newCycleIdentifier = `${newCycleIdentifier_Year}-${newCycleIdentifier_Month}`;

    if (newCycleIdentifier !== currentCycleIdentifier || forcedDate) {
      setCurrentCycleIdentifier(newCycleIdentifier);
      setRedeemedInCurrentCycle({});
    }
  };

  return {
    monthlyCreditsRedeemed,
    monthlyCreditsPossible,
    yearlyCreditsRedeemed,
    yearlyCreditsPossible,
    cumulativeValueSavedPerCard,
    redeemedInCurrentCycle,
    currentCycleIdentifier,
    showCelebration,
    setShowCelebration,
    setPerkStatus,
    processNewMonth,
  };
} 