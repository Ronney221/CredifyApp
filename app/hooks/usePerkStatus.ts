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
    console.log('Setting perk status:', { cardId, perkId, newStatus });
    
    if (!user) {
      console.error('No user authenticated');
      return;
    }

    // Find the card and perk
    const cardIndex = userCardsWithPerks.findIndex(({ card }) => card.id === cardId);
    if (cardIndex === -1) {
      console.error('Card not found:', cardId);
      return;
    }

    const perkIndex = userCardsWithPerks[cardIndex].perks.findIndex(p => p.id === perkId);
    if (perkIndex === -1) {
      console.error('Perk not found:', perkId);
      return;
    }

    // Get the perk
    const perk = userCardsWithPerks[cardIndex].perks[perkIndex];
    const oldStatus = perk.status;

    console.log('Current perk state:', {
      perk: perk.name,
      oldStatus,
      newStatus,
      value: perk.value
    });

    // Only proceed if there's an actual status change
    if (oldStatus === newStatus) {
      console.log('No status change needed');
      return;
    }

    try {
      // Get current month's start and end dates
      const currentMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      const currentMonthEnd = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);

      // Check if this perk is already redeemed in the database for this month
      const { data: existingRedemptions } = await supabase
        .from('perk_redemptions')
        .select('id, value_redeemed')
        .eq('user_id', user.id)
        .eq('perk_id', perkId)
        .gte('redemption_date', currentMonthStart.toISOString())
        .lte('redemption_date', currentMonthEnd.toISOString());

      const isRedeemedInDb = existingRedemptions && existingRedemptions.length > 0;
      console.log('Database redemption state:', { isRedeemedInDb, existingRedemptions });

      // If marking as redeemed but it's already redeemed in DB, or
      // marking as available but it's not in DB, then skip the value update
      if ((newStatus === 'redeemed' && isRedeemedInDb) || 
          (newStatus === 'available' && !isRedeemedInDb)) {
        console.log('Skipping value update - database state matches desired state');
        return;
      }

      // Update the perk status
      perk.status = newStatus;

      // Update monthly/yearly credits
      if (perk.periodMonths === 1) {
        if (newStatus === 'redeemed') {
          setMonthlyCreditsRedeemed(prev => {
            const newValue = Number((prev + perk.value).toFixed(2));
            console.log('Updating monthly credits redeemed:', { prev, new: newValue });
            return newValue;
          });
        } else {
          setMonthlyCreditsRedeemed(prev => {
            const newValue = Number(Math.max(0, prev - perk.value).toFixed(2));
            console.log('Updating monthly credits redeemed:', { prev, new: newValue });
            return newValue;
          });
        }
      } else if (perk.periodMonths === 12) {
        if (newStatus === 'redeemed') {
          setYearlyCreditsRedeemed(prev => Number((prev + perk.value).toFixed(2)));
        } else {
          setYearlyCreditsRedeemed(prev => Number(Math.max(0, prev - perk.value).toFixed(2)));
        }
      }

      // Handle cumulative value updates
      setCumulativeValueSavedPerCard(prev => {
        const currentValue = prev[cardId] || 0;
        let newValue = currentValue;

        if (newStatus === 'redeemed') {
          newValue = Number((currentValue + perk.value).toFixed(2));
        } else {
          newValue = Number(Math.max(0, currentValue - perk.value).toFixed(2));
        }

        console.log('Updating cumulative value:', {
          cardId,
          currentValue,
          newValue,
          action: newStatus === 'redeemed' ? 'add' : 'subtract',
          perkValue: perk.value,
          status: newStatus,
          dbState: isRedeemedInDb
        });

        const newState = { ...prev };
        if (newValue === 0) {
          delete newState[cardId];
        } else {
          newState[cardId] = newValue;
        }
        return newState;
      });

      if (perk.periodMonths === 1) {
        if (newStatus === 'redeemed') {
          setRedeemedInCurrentCycle(prev => ({ ...prev, [perk.id]: true }));
        } else {
          setRedeemedInCurrentCycle(prev => {
            const newState = { ...prev };
            delete newState[perk.id];
            return newState;
          });
        }
      }

      // Check for full monthly completion
      const projectedMonthlyCredits = Number((monthlyCreditsRedeemed + (newStatus === 'redeemed' ? perk.value : -perk.value)).toFixed(2));
      if (monthlyCreditsPossible > 0 && projectedMonthlyCredits === monthlyCreditsPossible) {
        setShowCelebration(true);
      }

    } catch (error) {
      console.error('Error updating perk status:', error);
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