import { useState, useEffect } from 'react';
import { CardPerk } from '../../src/data/card-data';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../hooks/useAuth';

interface PerkStatusHookResult {
  isLoading: boolean;
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
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
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
    console.log('========= usePerkStatus Effect - Savings Calculation =========');
    
    const calculateSavings = async () => {
      setIsLoading(true);
      
      if (!userCardsWithPerks.length || !user) {
        console.log('No cards or user not authenticated');
        setIsLoading(false);
        return;
      }

      try {
        // Get all perk definitions
        const { data: perkDefs } = await supabase
          .from('perk_definitions')
          .select('id, name, value');
          
        if (!perkDefs) {
          console.error('No perk definitions found');
          setIsLoading(false);
          return;
        }

        // Create lookup map for perk names to database IDs
        const perkNameToId = new Map(
          perkDefs.map(p => [p.name, { id: p.id, value: p.value }])
        );

        console.log('Perk name to ID mapping:', 
          Object.fromEntries(perkNameToId.entries())
        );

        // Get current month's start and end dates
        const currentMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const currentMonthEnd = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);

        // Get all redemptions for this user in the current month
        const { data: monthlyRedemptions } = await supabase
          .from('perk_redemptions')
          .select('perk_id, value_redeemed, user_card_id, redemption_date')
          .eq('user_id', user.id)
          .gte('redemption_date', currentMonthStart.toISOString())
          .lte('redemption_date', currentMonthEnd.toISOString());

        if (!monthlyRedemptions) {
          console.error('No redemption data found');
          setIsLoading(false);
          return;
        }

        console.log('Monthly redemptions:', monthlyRedemptions);

        // Calculate savings per card and totals
        const newSavings: Record<string, number> = {};
        let mRedeemed = 0;
        let mPossible = 0;
        let yRedeemed = 0;
        let yPossible = 0;

        // Calculate possible totals
        userCardsWithPerks.forEach(({ perks }) => {
          perks.forEach(perk => {
            if (perk.periodMonths === 1) {
              mPossible += perk.value;
            } else if (perk.periodMonths === 12) {
              yPossible += perk.value;
            }
          });
        });

        // Process redemptions
        monthlyRedemptions.forEach(redemption => {
          const perkInfo = perkDefs.find(p => p.id === redemption.perk_id);
          if (perkInfo) {
            const value = redemption.value_redeemed;
            
            // Find the card that has this perk
            for (const { card, perks } of userCardsWithPerks) {
              const matchingPerk = perks.find(p => p.name === perkInfo.name);
              if (matchingPerk) {
                // Add to card total
                newSavings[card.id] = (newSavings[card.id] || 0) + value;
                
                // Add to monthly/yearly totals
                if (matchingPerk.periodMonths === 1) {
                  mRedeemed += value;
                } else if (matchingPerk.periodMonths === 12) {
                  yRedeemed += value;
                }

                // Mark as redeemed in current cycle
                if (matchingPerk.periodMonths === 1) {
                  setRedeemedInCurrentCycle(prev => ({ ...prev, [matchingPerk.id]: true }));
                }
                break;
              }
            }
          }
        });

        console.log('Calculated savings:', {
          perCard: newSavings,
          monthly: { redeemed: mRedeemed, possible: mPossible },
          yearly: { redeemed: yRedeemed, possible: yPossible },
          redemptions: monthlyRedemptions
        });

        setMonthlyCreditsPossible(mPossible);
        setMonthlyCreditsRedeemed(mRedeemed);
        setYearlyCreditsPossible(yPossible);
        setYearlyCreditsRedeemed(yRedeemed);
        setCumulativeValueSavedPerCard(newSavings);

        // Check for full monthly completion
        if (mPossible > 0 && mRedeemed === mPossible) {
          setShowCelebration(true);
        }
      } catch (error) {
        console.error('Error calculating savings:', error);
      } finally {
        setIsLoading(false);
      }
    };

    calculateSavings();
  }, [userCardsWithPerks, user?.id]);

  const setPerkStatus = async (cardId: string, perkId: string, newStatus: 'available' | 'redeemed') => {
    console.log('Setting perk status (usePerkStatus):', { cardId, perkId, newStatus });
    
    if (!user) {
      console.error('No user authenticated in usePerkStatus');
      return;
    }

    // Find the card and perk in the local userCardsWithPerks data
    const cardData = userCardsWithPerks.find(({ card }) => card.id === cardId);
    if (!cardData) {
      console.error('Card not found in usePerkStatus:', cardId);
      return;
    }

    const perk = cardData.perks.find(p => p.id === perkId);
    if (!perk) {
      console.error('Perk not found in usePerkStatus:', perkId, 'on card', cardId);
      return;
    }

    const oldStatus = perk.status; // This might be stale from props, but we use newStatus as the source of truth

    console.log('Current perk state (in usePerkStatus):', {
      perkName: perk.name,
      oldStatusFromProps: oldStatus, // Log what the prop status was
      newStatusFromDashboard: newStatus, // This is the reliable one
      value: perk.value
    });

    // Only proceed if there's an actual status change based on the intended newStatus
    // and the current state tracked within this hook (redeemedInCurrentCycle for monthly perks)
    // For non-monthly perks, or if not yet tracked, we rely on newStatus vs oldStatus.
    const isCurrentlyRedeemedInHook = perk.periodMonths === 1 ? redeemedInCurrentCycle[perk.id] : oldStatus === 'redeemed';

    if ((newStatus === 'redeemed' && isCurrentlyRedeemedInHook) || 
        (newStatus === 'available' && !isCurrentlyRedeemedInHook)) {
      console.log('No logical status change needed based on hook state and newStatus, or perk already in target state.');
      // Optionally, ensure the perk.status in the local copy is aligned, though this hook primarily drives aggregate values.
      // perk.status = newStatus; // This would mutate the prop, which is generally discouraged.
      // Instead, recalculations should rely on redeemedInCurrentCycle and the totals.
      return;
    }

    try {
      // Update the local perk status in the copied array if necessary (for internal logic)
      // This mutation is on a local copy if userCardsWithPerks is correctly managed (e.g. spread into new array if modified)
      // However, the core logic below for totals should be the primary driver.
      // perk.status = newStatus; // Commented out as direct prop mutation can be risky

      // Update monthly/yearly credits based on newStatus
      if (perk.periodMonths === 1) {
        if (newStatus === 'redeemed') {
          setMonthlyCreditsRedeemed(prev => {
            const newValue = Number((prev + perk.value).toFixed(2));
            console.log('Updating monthly credits redeemed (usePerkStatus):', { prev, new: newValue });
            return newValue;
          });
          setRedeemedInCurrentCycle(prev => ({ ...prev, [perk.id]: true }));
        } else { // newStatus === 'available'
          setMonthlyCreditsRedeemed(prev => {
            const newValue = Number(Math.max(0, prev - perk.value).toFixed(2));
            console.log('Updating monthly credits redeemed (usePerkStatus):', { prev, new: newValue });
            return newValue;
          });
          setRedeemedInCurrentCycle(prev => {
            const newState = { ...prev };
            delete newState[perk.id];
            return newState;
          });
        }
      } else if (perk.periodMonths === 12) {
        if (newStatus === 'redeemed') {
          setYearlyCreditsRedeemed(prev => Number((prev + perk.value).toFixed(2)));
        } else { // newStatus === 'available'
          setYearlyCreditsRedeemed(prev => Number(Math.max(0, prev - perk.value).toFixed(2)));
        }
      }

      // Handle cumulative value updates based on newStatus
      setCumulativeValueSavedPerCard(prevCumulative => {
        const currentCardValue = prevCumulative[cardId] || 0;
        let newCardValue = currentCardValue;

        if (newStatus === 'redeemed') {
          newCardValue = Number((currentCardValue + perk.value).toFixed(2));
        } else { // newStatus === 'available'
          newCardValue = Number(Math.max(0, currentCardValue - perk.value).toFixed(2));
        }

        console.log('Updating cumulative value (usePerkStatus):', {
          cardId,
          currentCardValue,
          newCardValue,
          action: newStatus === 'redeemed' ? 'add' : 'subtract',
          perkValue: perk.value,
          perkName: perk.name
        });

        const newCumulativeState = { ...prevCumulative };
        if (newCardValue === 0 && Object.prototype.hasOwnProperty.call(newCumulativeState, cardId)) {
          // Only delete if it exists, to avoid issues if it was never there
          delete newCumulativeState[cardId];
        } else if (newCardValue > 0) {
          newCumulativeState[cardId] = newCardValue;
        } else if (newCardValue === 0 && !Object.prototype.hasOwnProperty.call(newCumulativeState, cardId)){
          // if new card value is 0 and it does not exist, do nothing (already not there)
        } else {
           // If new card value is 0 but was previously >0, it should be deleted (covered by first if)
           // if it wasn't there and it's 0, we also don't add it.
           // This means we only set it if newCardValue > 0.
        }
        
        // Simplified logic: only include cardId if its new value is > 0
        const finalCumulativeState: Record<string, number> = {};
        for (const cId in newCumulativeState) {
            if (newCumulativeState[cId] > 0) {
                finalCumulativeState[cId] = newCumulativeState[cId];
            }
        }
        if (newCardValue > 0) {
            finalCumulativeState[cardId] = newCardValue;
        } else {
            delete finalCumulativeState[cardId]; // Ensure it's removed if it becomes 0
        }

        return finalCumulativeState;
      });

      // Check for full monthly completion (based on the hook's own state)
      let projectedMonthlyRedeemed = monthlyCreditsRedeemed;
      if (perk.periodMonths === 1) {
        projectedMonthlyRedeemed = newStatus === 'redeemed' ? monthlyCreditsRedeemed + perk.value : monthlyCreditsRedeemed - perk.value;
        projectedMonthlyRedeemed = Number(Math.max(0, projectedMonthlyRedeemed).toFixed(2));
      }

      if (monthlyCreditsPossible > 0 && projectedMonthlyRedeemed >= monthlyCreditsPossible) {
         // Use >= in case of floating point issues or if multiple perks are redeemed at once
        console.log("Celebration check (usePerkStatus): All monthly perks redeemed!");
        setShowCelebration(true);
      } else {
        console.log("Celebration check (usePerkStatus): Not all monthly perks redeemed.", {projectedMonthlyRedeemed, monthlyCreditsPossible});
      }

    } catch (error) {
      console.error('Error updating perk status in usePerkStatus:', error);
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
    isLoading,
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