import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardPerk } from '../../src/data/card-data';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../hooks/useAuth';

interface PerkDefinition {
  id: string;
  name: string;
  value: number;
}

// New interface for period-based aggregates
interface PeriodAggregate {
  redeemedValue: number;
  possibleValue: number;
  redeemedCount: number;
  totalCount: number;
}

interface PerkStatusHookResult {
  isLoading: boolean;
  arePerkDefinitionsLoading: boolean;
  perkDefinitions: PerkDefinition[];
  periodAggregates: Record<number, PeriodAggregate>;
  cumulativeValueSavedPerCard: Record<string, number>;
  userCardsWithPerks: { card: Card; perks: CardPerk[] }[];
  setPerkStatus: (cardId: string, perkId: string, newStatus: 'redeemed' | 'available' | 'partially_redeemed', remainingValue?: number) => void;
  refreshSavings: () => void;
  isCalculatingSavings: boolean;
  redeemedInCurrentCycle: Record<string, boolean>;
  currentCycleIdentifier: string;
  showCelebration: boolean;
  setShowCelebration: (show: boolean) => void;
  processNewMonth: (forcedDate?: Date) => void;
}

export function usePerkStatus(
  initialUserCardsWithPerks: { card: Card; perks: CardPerk[] }[]
): PerkStatusHookResult {
  const { user } = useAuth();
  const [isLoadingHook, setIsLoadingHook] = useState(true);
  // Removed old monthly/yearly specific states
  const [periodAggregates, setPeriodAggregates] = useState<Record<number, PeriodAggregate>>({});
  const [cumulativeValueSavedPerCard, setCumulativeValueSavedPerCard] = useState<Record<string, number>>({});
  const [redeemedInCurrentCycle, setRedeemedInCurrentCycle] = useState<Record<string, boolean>>({});
  const [currentCycleIdentifier, setCurrentCycleIdentifier] = useState<string>(
    `${new Date().getFullYear()}-${new Date().getMonth()}`
  );
  const [showCelebration, setShowCelebration] = useState(false);
  const [perkDefinitions, setPerkDefinitions] = useState<PerkDefinition[]>([]);
  const [arePerkDefinitionsLoading, setArePerkDefinitionsLoading] = useState(true);
  const [processedCardsWithPerks, setProcessedCardsWithPerks] = useState<{ card: Card; perks: CardPerk[] }[]>([]);
  const [isCalculatingSavings, setIsCalculatingSavings] = useState(false);

  // Removed isPerkRedeemedAnnually and yearlyRedemptionsRef as logic is now more generic

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
        
        // Add debug logging
        console.log('[usePerkStatus] Perk definitions query result:', {
          definitionsCount: data?.length || 0,
          error: error,
          firstFewDefinitions: data?.slice(0, 3)
        });

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
      } finally {
        setArePerkDefinitionsLoading(false);
      }
    };

    fetchPerkDefinitions();
  }, [user, perkDefinitions.length]);

  useEffect(() => {
    console.log('========= usePerkStatus Effect - Savings Calculation =========');
    
    const calculateSavings = async () => {
      try {
        setIsCalculatingSavings(true);
        console.log('========= [usePerkStatus] calculateSavings called =========');

        if (!user) {
          console.log('No user found, skipping savings calculation');
          setIsCalculatingSavings(false);
          setIsLoadingHook(false);
          return;
        }

        const { data: allUserRedemptions, error: allRedemptionsError } = await supabase
          .from('perk_redemptions')
          .select('perk_id, redemption_date, reset_date, value_redeemed, status, remaining_value')
          .eq('user_id', user.id)
          .order('redemption_date', { ascending: false });

        // Add debug logging
        console.log('[usePerkStatus] Redemptions query result:', {
          userId: user.id,
          redemptionsCount: allUserRedemptions?.length || 0,
          error: allRedemptionsError,
          firstFewRedemptions: allUserRedemptions?.slice(0, 3)
        });

        if (allRedemptionsError) {
          console.error('Error fetching redemptions:', allRedemptionsError);
          throw allRedemptionsError;
        }

        const latestRedemptionsMap = new Map<string, {
          reset_date: string;
          redemption_date: string;
          value_redeemed: number;
          status: 'redeemed' | 'partially_redeemed';
          remaining_value: number;
        }>();

        const newRedeemedInCycle: Record<string, boolean> = {};
        const newCumulative: Record<string, number> = {};
        const newPeriodAggregates: Record<number, PeriodAggregate> = {};

        if (allUserRedemptions) {
          allUserRedemptions.forEach(r => {
            const existing = latestRedemptionsMap.get(r.perk_id);
            if (!existing || new Date(r.redemption_date) > new Date(existing.redemption_date)) {
              latestRedemptionsMap.set(r.perk_id, {
                reset_date: r.reset_date,
                redemption_date: r.redemption_date,
                value_redeemed: r.value_redeemed,
                status: r.status as 'redeemed' | 'partially_redeemed',
                remaining_value: r.remaining_value
              });
            }
          });
        }

        const processedCards = initialUserCardsWithPerks.map(cardData => {
          const processedPerks = cardData.perks.map(perk => {
            if (!perk.periodMonths) {
              console.warn(`Perk ${perk.name} (ID: ${perk.id}) has no periodMonths defined. Skipping for period aggregation.`);
              return { ...perk, status: 'available' as const };
            }

            if (!newPeriodAggregates[perk.periodMonths]) {
              newPeriodAggregates[perk.periodMonths] = { redeemedValue: 0, possibleValue: 0, redeemedCount: 0, totalCount: 0 };
            }

            let isRedeemedThisCycle = false;
            let perkStatus: 'available' | 'redeemed' | 'partially_redeemed' = 'available';
            let remainingValue = 0;
            const latestRedemption = latestRedemptionsMap.get(perk.definition_id);

            if (latestRedemption) {
              const redemptionDate = new Date(latestRedemption.redemption_date);
              const resetDate = latestRedemption.reset_date ? new Date(latestRedemption.reset_date) : undefined;
              const now = new Date();

              const isCurrentMonth = redemptionDate.getMonth() === now.getMonth() && 
                                   redemptionDate.getFullYear() === now.getFullYear();
              
              isRedeemedThisCycle = isCurrentMonth || (resetDate !== undefined && resetDate > now);
              
              if (isRedeemedThisCycle) {
                perkStatus = latestRedemption.status;
                remainingValue = latestRedemption.remaining_value;
              }

              console.log(`[usePerkStatus] Checking redemption for ${perk.name}:`, {
                redemptionDate: redemptionDate.toISOString(),
                resetDate: resetDate?.toISOString(),
                isCurrentMonth,
                hasValidResetDate: resetDate !== undefined && resetDate > now,
                isRedeemedThisCycle,
                status: perkStatus,
                remainingValue
              });
            }

            newRedeemedInCycle[perk.id] = isRedeemedThisCycle;

            if (isRedeemedThisCycle) {
              const redeemedValue = perkStatus === 'partially_redeemed' ? 
                perk.value - remainingValue : 
                perk.value;

              newCumulative[cardData.card.id] = (newCumulative[cardData.card.id] || 0) + redeemedValue;
              newPeriodAggregates[perk.periodMonths].redeemedValue += redeemedValue;
              newPeriodAggregates[perk.periodMonths].redeemedCount++;
            }
            
            return { 
              ...perk, 
              status: perkStatus,
              remaining_value: remainingValue
            };
          });
          
          cardData.perks.forEach(p => {
            if (p.periodMonths && newPeriodAggregates[p.periodMonths]) {
              newPeriodAggregates[p.periodMonths].possibleValue += p.value;
              newPeriodAggregates[p.periodMonths].totalCount++;
            }
          });
          
          return { ...cardData, perks: processedPerks };
        });
        
        setProcessedCardsWithPerks(processedCards);
        setRedeemedInCurrentCycle(newRedeemedInCycle);
        setCumulativeValueSavedPerCard(newCumulative);
        setPeriodAggregates(newPeriodAggregates);

        console.log('Final Processed Data for UI:', {
          processedCardsPerks: processedCards.map(c => ({ 
            card: c.card.id, 
            perks: c.perks.map(p => ({
              id: p.id, 
              status: p.status,
              value: p.value,
              remaining_value: p.remaining_value
            })) 
          })),
          redeemedInCycle: newRedeemedInCycle,
          cumulative: newCumulative,
          periodAggregates: newPeriodAggregates,
        });

      } catch (error) {
        console.error('Error during savings calculation:', error);
      } finally {
        setIsCalculatingSavings(false);
        setIsLoadingHook(false);
      }
    };

    if (user && initialUserCardsWithPerks.length > 0 && perkDefinitions.length > 0) {
    calculateSavings();
    } else if (!arePerkDefinitionsLoading) {
      setIsLoadingHook(false);
      setProcessedCardsWithPerks(initialUserCardsWithPerks);
    }
  }, [user, initialUserCardsWithPerks, perkDefinitions, arePerkDefinitionsLoading]);

  const setPerkStatus = useCallback((
    cardId: string, 
    perkId: string, 
    newStatus: 'redeemed' | 'available' | 'partially_redeemed',
    remainingValue?: number
  ) => {
    console.log('========= [usePerkStatus] setPerkStatus called =========');
    console.log('Input parameters:', { cardId, perkId, newStatus, remainingValue });
    
    let perkValue = 0;
    let periodMonths = 0;
    let definitionId = '';
    let originalStatusIsRedeemed = false;
    let originalStatusIsPartiallyRedeemed = false;

    setProcessedCardsWithPerks(prevUserCards =>
      prevUserCards.map(cardData => {
        if (cardData.card.id === cardId) {
          const updatedPerks = cardData.perks.map(p => {
            if (p.id === perkId) {
              perkValue = p.value;
              periodMonths = p.periodMonths || 1;
              definitionId = p.definition_id;
              originalStatusIsRedeemed = p.status === 'redeemed';
              originalStatusIsPartiallyRedeemed = p.status === 'partially_redeemed';
              console.log('Found perk for status change:', { 
                perkName: p.name, 
                currentStatus: p.status, 
                newStatusRequested: newStatus, 
                value: perkValue, 
                definition_id: definitionId, 
                periodMonths,
                remainingValue
              });
              return { 
                ...p, 
                status: newStatus,
                remaining_value: remainingValue
              };
            }
            return p;
          });
          return { ...cardData, perks: updatedPerks };
        }
        return cardData;
      })
    );

    // Optimistic update for redeemedInCurrentCycle
    setRedeemedInCurrentCycle(prev => ({ 
      ...prev, 
      [perkId]: newStatus === 'redeemed' || newStatus === 'partially_redeemed' 
    }));

    // Optimistic update for cumulativeValueSavedPerCard
    setCumulativeValueSavedPerCard(prevCumulative => {
      const newCumulative = { ...prevCumulative };
      const currentCardValue = newCumulative[cardId] || 0;
      
      if (newStatus === 'redeemed' && !originalStatusIsRedeemed) {
        newCumulative[cardId] = currentCardValue + perkValue;
      } else if (newStatus === 'partially_redeemed' && !originalStatusIsRedeemed && !originalStatusIsPartiallyRedeemed) {
        const redeemedValue = perkValue - (remainingValue || 0);
        newCumulative[cardId] = currentCardValue + redeemedValue;
      } else if (newStatus === 'available' && (originalStatusIsRedeemed || originalStatusIsPartiallyRedeemed)) {
        const valueToSubtract = originalStatusIsPartiallyRedeemed ? (perkValue - (remainingValue || 0)) : perkValue;
        newCumulative[cardId] = Math.max(0, currentCardValue - valueToSubtract);
      }
      return newCumulative;
    });

    // Optimistic update for periodAggregates
    if (periodMonths > 0) {
      setPeriodAggregates(prevAggregates => {
        const newAggregates = JSON.parse(JSON.stringify(prevAggregates));
        if (!newAggregates[periodMonths]) {
          newAggregates[periodMonths] = { redeemedValue: 0, possibleValue: 0, redeemedCount: 0, totalCount: 0 };
        }
        const aggregate = newAggregates[periodMonths];

        if (newStatus === 'redeemed' && !originalStatusIsRedeemed) {
          aggregate.redeemedValue += perkValue;
          aggregate.redeemedCount++;
        } else if (newStatus === 'partially_redeemed' && !originalStatusIsRedeemed && !originalStatusIsPartiallyRedeemed) {
          const redeemedValue = perkValue - (remainingValue || 0);
          aggregate.redeemedValue += redeemedValue;
          aggregate.redeemedCount++;
        } else if (newStatus === 'available' && (originalStatusIsRedeemed || originalStatusIsPartiallyRedeemed)) {
          const valueToSubtract = originalStatusIsPartiallyRedeemed ? (perkValue - (remainingValue || 0)) : perkValue;
          aggregate.redeemedValue = Math.max(0, aggregate.redeemedValue - valueToSubtract);
          aggregate.redeemedCount = Math.max(0, aggregate.redeemedCount - 1);
        }
        console.log(`[usePerkStatus] Optimistic update for period ${periodMonths}:`, aggregate);
        return newAggregates;
      });
    }

    // Log analysis of the status change
    const shouldAddToRedeemed = (newStatus === 'redeemed' || newStatus === 'partially_redeemed') && 
      !originalStatusIsRedeemed && !originalStatusIsPartiallyRedeemed;
    const shouldRemoveFromRedeemed = newStatus === 'available' && (originalStatusIsRedeemed || originalStatusIsPartiallyRedeemed);
    console.log('Status change analysis:', { 
      perkId, 
      newStatus, 
      isCurrentlyRedeemed: originalStatusIsRedeemed,
      isCurrentlyPartiallyRedeemed: originalStatusIsPartiallyRedeemed,
      shouldAddToRedeemed, 
      shouldRemoveFromRedeemed,
      remainingValue
    });

    if (shouldAddToRedeemed) {
      const redeemedValue = newStatus === 'partially_redeemed' ? (perkValue - (remainingValue || 0)) : perkValue;
      console.log(`[usePerkStatus] Marked ${perkId} as ${newStatus}, added $${redeemedValue}`);
    } else if (shouldRemoveFromRedeemed) {
      const removedValue = originalStatusIsPartiallyRedeemed ? (perkValue - (remainingValue || 0)) : perkValue;
      console.log(`[usePerkStatus] Marked ${perkId} as available, removed $${removedValue}`);
    }

    console.log('New redeemedInCurrentCycle state:', redeemedInCurrentCycle);
    console.log('========= [usePerkStatus] setPerkStatus complete =========');
  }, []);

  const refreshSavings = useCallback(() => {
    console.log('========= [usePerkStatus] refreshSavings called =========');
    // This will re-trigger the useEffect that calls calculateSavings
    // by changing the reference of initialUserCardsWithPerks, or by adding a new trigger state.
    // For simplicity, we can rely on the parent component re-providing initialUserCardsWithPerks if it changes,
    // or we can add a manual trigger.
    // For now, let's assume calculateSavings will be re-run by its existing dependencies.
    // Or, more directly, force a re-calculation by briefly setting loading states.
    setIsLoadingHook(true); // This will trigger the useEffect to recalculate if other conditions are met
    // The useEffect will then call calculateSavings which sets isLoadingHook back to false.
  }, []);

  const processNewMonth = useCallback((forcedDate?: Date) => {
    const now = forcedDate || new Date();
    const newIdentifier = `${now.getFullYear()}-${now.getMonth()}`;
    if (newIdentifier !== currentCycleIdentifier) {
      console.log(`New month detected: ${newIdentifier}. Resetting monthly perks and showing celebration.`);
      setCurrentCycleIdentifier(newIdentifier);
      setShowCelebration(true);
      // Re-calculate savings which will naturally reset statuses for the new month based on DB
      refreshSavings(); 
    }
  }, [currentCycleIdentifier, refreshSavings]);

  return {
    isLoading: isLoadingHook,
    arePerkDefinitionsLoading,
    perkDefinitions,
    periodAggregates, // Return the new aggregates
    cumulativeValueSavedPerCard,
    userCardsWithPerks: processedCardsWithPerks,
    setPerkStatus,
    refreshSavings,
    isCalculatingSavings,
    redeemedInCurrentCycle,
    currentCycleIdentifier,
    showCelebration,
    setShowCelebration,
    processNewMonth,
  };
} 