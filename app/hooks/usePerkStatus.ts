import { useState, useEffect, useCallback } from 'react';
import { CardPerk, Card } from '../../src/data/card-data';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../hooks/useAuth';

interface PerkDefinition {
  id: string;
  name: string;
  value: number;
}

interface PerkStatusHookResult {
  isLoading: boolean;
  arePerkDefinitionsLoading: boolean;
  perkDefinitions: PerkDefinition[];
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
  const [perkDefinitions, setPerkDefinitions] = useState<PerkDefinition[]>([]);
  const [arePerkDefinitionsLoading, setArePerkDefinitionsLoading] = useState(true);

  // Effect to fetch perk definitions once
  useEffect(() => {
    const fetchPerkDefinitions = async () => {
      if (!user || perkDefinitions.length > 0) {
        setArePerkDefinitionsLoading(false);
        return;
      }
      console.log('========= usePerkStatus Effect - Fetching Perk Definitions ONCE =========');
      setArePerkDefinitionsLoading(true);
      try {
        const { data, error } = await supabase
          .from('perk_definitions')
          .select('id, name, value');
        
        if (error) {
          console.error('Error fetching perk definitions:', error);
          throw error;
        }
        if (data) {
          setPerkDefinitions(data);
          console.log('Perk definitions loaded and stored in state:', data.length);
        }
      } catch (error) {
        console.error('Failed to fetch perk definitions:', error);
        // Potentially set an error state here for perk definitions
      } finally {
        setArePerkDefinitionsLoading(false);
      }
    };

    fetchPerkDefinitions();
  }, [user, perkDefinitions.length]);

  // Effect to update summary credit data when userCardsWithPerks or perkDefinitions change
  useEffect(() => {
    console.log('========= usePerkStatus Effect - Savings Calculation =========');
    
    const calculateSavings = async () => {
      setIsLoading(true);
      
      if (!userCardsWithPerks.length || !user || arePerkDefinitionsLoading || perkDefinitions.length === 0) {
        console.log('Skipping savings calculation: No cards, user not authenticated, perk definitions loading, or no perk definitions found.', {
          hasCards: userCardsWithPerks.length > 0,
          isAuthenticated: !!user,
          areDefsLoading: arePerkDefinitionsLoading,
          hasDefs: perkDefinitions.length > 0,
        });
        setIsLoading(false);
        // Reset relevant states if prerequisites are not met to avoid stale data display
        setMonthlyCreditsRedeemed(0);
        setMonthlyCreditsPossible(0);
        setYearlyCreditsRedeemed(0);
        setYearlyCreditsPossible(0);
        setCumulativeValueSavedPerCard({});
        setRedeemedInCurrentCycle({});
        return;
      }

      try {
        // Perk definitions are now from state
        const perkDefs = perkDefinitions;
        console.log('Using stored perk definitions for calculation:', perkDefs.length);

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
        if (mPossible > 0 && mRedeemed >= mPossible) {
          setShowCelebration(true);
        } else {
          setShowCelebration(false);
        }
      } catch (error) {
        console.error('Error calculating savings:', error);
      } finally {
        setIsLoading(false);
      }
    };

    calculateSavings();
  }, [userCardsWithPerks, user?.id, perkDefinitions, arePerkDefinitionsLoading]);

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

    console.log('Current perk state (in usePerkStatus) before change:', {
      perkName: perk.name,
      newStatusFromDashboard: newStatus,
      value: perk.value,
      isMonthly: perk.periodMonths === 1,
      isRedeemedInHook: perk.periodMonths === 1 ? (redeemedInCurrentCycle[perk.id] || false) : false
    });

    if (perk.periodMonths === 1) {
      const isMonthlyPerkCurrentlyRedeemedInHook = redeemedInCurrentCycle[perk.id] || false;

      if (newStatus === 'redeemed') {
        if (isMonthlyPerkCurrentlyRedeemedInHook) {
          console.log(`[usePerkStatus] Perk ${perk.name} is already redeemed in hook state. No change.`);
          return;
        }
        setMonthlyCreditsRedeemed(prev => Number((prev + perk.value).toFixed(2)));
        setRedeemedInCurrentCycle(prev => ({ ...prev, [perk.id]: true }));
        setCumulativeValueSavedPerCard(prevCumulative => ({
          ...prevCumulative,
          [cardId]: Number(((prevCumulative[cardId] || 0) + perk.value).toFixed(2)),
        }));
      } else {
        if (!isMonthlyPerkCurrentlyRedeemedInHook) {
          console.log(`[usePerkStatus] Perk ${perk.name} is already available in hook state. No change.`);
          return;
        }
        setMonthlyCreditsRedeemed(prev => Number(Math.max(0, prev - perk.value).toFixed(2)));
        setRedeemedInCurrentCycle(prev => {
          const newState = { ...prev };
          delete newState[perk.id];
          console.log(`[usePerkStatus] Perk ${perk.name} (id: ${perk.id}) marked as available. Updated redeemedInCurrentCycle:`, newState);
          return newState;
        });
        setCumulativeValueSavedPerCard(prevCumulative => ({
          ...prevCumulative,
          [cardId]: Number(Math.max(0, (prevCumulative[cardId] || 0) - perk.value).toFixed(2)),
        }));
      }
    } else {
      console.warn(`[usePerkStatus] setPerkStatus for non-monthly perk ${perk.name} needs more robust state handling beyond redeemedInCurrentCycle.`);
      if (newStatus === 'redeemed') {
        setYearlyCreditsRedeemed(prev => Number((prev + perk.value).toFixed(2)));
        setCumulativeValueSavedPerCard(prevCumulative => ({
          ...prevCumulative,
          [cardId]: Number(((prevCumulative[cardId] || 0) + perk.value).toFixed(2)),
        }));
      } else {
        setYearlyCreditsRedeemed(prev => Number(Math.max(0, prev - perk.value).toFixed(2)));
        setCumulativeValueSavedPerCard(prevCumulative => ({
          ...prevCumulative,
          [cardId]: Number(Math.max(0, (prevCumulative[cardId] || 0) - perk.value).toFixed(2)),
        }));
      }
    }

    let currentMonthlyRedeemedAfterUpdate = 0;
    if (userCardsWithPerks && perkDefinitions.length > 0) {
        userCardsWithPerks.forEach(c => {
            c.perks.forEach(p => {
                if (p.periodMonths === 1 && redeemedInCurrentCycle[p.id]) {
                    const def = perkDefinitions.find(pd => pd.id === p.definition_id);
                    if (def) {
                        currentMonthlyRedeemedAfterUpdate += def.value;
                    } else {
                        console.warn(`[usePerkStatus] Perk definition not found in stored definitions for perk.definition_id: ${p.definition_id} (Perk local ID: ${p.id}, Name: ${p.name}). Check static card data mapping.`)
                    }
                }
            });
        });
    }
    currentMonthlyRedeemedAfterUpdate = Number(currentMonthlyRedeemedAfterUpdate.toFixed(2));

    console.log('[usePerkStatus] Celebration check values:', {
        currentMonthlyRedeemedAfterUpdate,
        monthlyCreditsPossible,
        condition: monthlyCreditsPossible > 0 && currentMonthlyRedeemedAfterUpdate >= monthlyCreditsPossible
    });

    if (monthlyCreditsPossible > 0 && currentMonthlyRedeemedAfterUpdate >= monthlyCreditsPossible) {
      console.log("[usePerkStatus] Celebration check: All monthly perks deemed redeemed!");
      setShowCelebration(true);
    } else {
      console.log("[usePerkStatus] Celebration check: Not all monthly perks redeemed.");
      setShowCelebration(false);
    }

    setCumulativeValueSavedPerCard(prevCumulative => {
        const cleanedCumulative: Record<string, number> = {};
        for (const cId in prevCumulative) {
            if (prevCumulative[cId] > 0) {
                cleanedCumulative[cId] = prevCumulative[cId];
            }
        }
        return cleanedCumulative;
    });
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
    arePerkDefinitionsLoading,
    perkDefinitions,
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