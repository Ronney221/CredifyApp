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
  periodAggregates: Record<number, PeriodAggregate>; // Replaces old monthly/yearly specific states
  cumulativeValueSavedPerCard: Record<string, number>;
  userCardsWithPerks: { card: Card; perks: CardPerk[] }[];
  setPerkStatus: (cardId: string, perkId: string, newStatus: 'redeemed' | 'available') => void;
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
      setIsCalculatingSavings(true);
      
      if (!initialUserCardsWithPerks.length || !user || arePerkDefinitionsLoading || perkDefinitions.length === 0) {
        console.log('Skipping savings calculation: Conditions not met.');
        setPeriodAggregates({}); // Reset aggregates
        setCumulativeValueSavedPerCard({});
        setRedeemedInCurrentCycle({});
        setProcessedCardsWithPerks(initialUserCardsWithPerks);
        setIsCalculatingSavings(false);
        setIsLoadingHook(false);
        return;
      }

      try {
        const { data: allUserRedemptions, error: allRedemptionsError } = await supabase
          .from('perk_redemptions')
          .select('perk_id, redemption_date, reset_date, value_redeemed')
          .eq('user_id', user.id)
          .order('redemption_date', { ascending: false });

        if (allRedemptionsError) {
          console.error('Error fetching all user redemptions:', allRedemptionsError);
          setIsCalculatingSavings(false);
          setIsLoadingHook(false);
          return;
        }

        const newPeriodAggregates: Record<number, PeriodAggregate> = {};
        const newCumulative: Record<string, number> = {};
        const newRedeemedInCycle: Record<string, boolean> = {};
        
        const latestRedemptionsMap = new Map<string, { reset_date: string; redemption_date: string }>();
        if (allUserRedemptions) {
          allUserRedemptions.forEach(r => {
            const existing = latestRedemptionsMap.get(r.perk_id);
            if (!existing || new Date(r.redemption_date) > new Date(existing.redemption_date)) {
              latestRedemptionsMap.set(r.perk_id, { reset_date: r.reset_date, redemption_date: r.redemption_date });
            }
          });
        }

        const processedCards = initialUserCardsWithPerks.map(cardData => {
          const processedPerks = cardData.perks.map(perk => {
            if (!perk.periodMonths) {
              console.warn(`Perk ${perk.name} (ID: ${perk.id}) has no periodMonths defined. Skipping for period aggregation.`);
              return { ...perk, status: 'available' as 'available' }; // Default to available, or handle as error
            }

            // Initialize aggregate for this perk's period if not already done
            if (!newPeriodAggregates[perk.periodMonths]) {
              newPeriodAggregates[perk.periodMonths] = { redeemedValue: 0, possibleValue: 0, redeemedCount: 0, totalCount: 0 };
            }

            let isRedeemedThisCycle = false;
            const latestRedemption = latestRedemptionsMap.get(perk.definition_id);

            if (latestRedemption && new Date(latestRedemption.reset_date) > new Date()) {
              isRedeemedThisCycle = true;
            }
            newRedeemedInCycle[perk.id] = isRedeemedThisCycle;

            if (isRedeemedThisCycle) {
              newCumulative[cardData.card.id] = (newCumulative[cardData.card.id] || 0) + perk.value;
              newPeriodAggregates[perk.periodMonths].redeemedValue += perk.value;
              newPeriodAggregates[perk.periodMonths].redeemedCount++;
            }
            
            return { ...perk, status: (isRedeemedThisCycle ? 'redeemed' : 'available') as 'redeemed' | 'available' };
          });
          
          cardData.perks.forEach(p => {
            if (p.periodMonths && newPeriodAggregates[p.periodMonths]) { // Check again for safety
              newPeriodAggregates[p.periodMonths].possibleValue += p.value;
              newPeriodAggregates[p.periodMonths].totalCount++;
            }
          });
          
          return { ...cardData, perks: processedPerks };
        });
        
        setProcessedCardsWithPerks(processedCards);
        setRedeemedInCurrentCycle(newRedeemedInCycle);
        setCumulativeValueSavedPerCard(newCumulative);
        setPeriodAggregates(newPeriodAggregates); // Set the new aggregates

        console.log('Final Processed Data for UI:', {
          processedCardsPerks: processedCards.map(c => ({ card: c.card.id, perks: c.perks.map(p => ({id: p.id, status: p.status})) })),
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

  const setPerkStatus = useCallback((cardId: string, perkId: string, newStatus: 'redeemed' | 'available') => {
    console.log('========= [usePerkStatus] setPerkStatus called =========');
    console.log('Input parameters:', { cardId, perkId, newStatus });

    let perkValue = 0;
    let periodMonths = 0;
    let definitionId = '';
    let originalStatusIsRedeemed = false;

    setProcessedCardsWithPerks(prevUserCards =>
      prevUserCards.map(cardData => {
        if (cardData.card.id === cardId) {
          const updatedPerks = cardData.perks.map(p => {
            if (p.id === perkId) {
              perkValue = p.value;
              periodMonths = p.periodMonths || 1; // Default to 1 if undefined, though it should be defined
              definitionId = p.definition_id;
              originalStatusIsRedeemed = p.status === 'redeemed';
              console.log('Found perk for status change:', { 
                perkName: p.name, currentStatus: p.status, newStatusRequested: newStatus, value: perkValue, definition_id: definitionId, periodMonths 
              });
              return { ...p, status: newStatus };
            }
            return p;
          });
          return { ...cardData, perks: updatedPerks };
        }
        return cardData;
      })
    );

    // Optimistic update for redeemedInCurrentCycle
    setRedeemedInCurrentCycle(prev => ({ ...prev, [perkId]: newStatus === 'redeemed' }));

    // Optimistic update for cumulativeValueSavedPerCard
    setCumulativeValueSavedPerCard(prevCumulative => {
      const newCumulative = { ...prevCumulative };
      const currentCardValue = newCumulative[cardId] || 0;
      if (newStatus === 'redeemed' && !originalStatusIsRedeemed) {
        newCumulative[cardId] = currentCardValue + perkValue;
      } else if (newStatus === 'available' && originalStatusIsRedeemed) {
        newCumulative[cardId] = Math.max(0, currentCardValue - perkValue);
      }
      return newCumulative;
    });

    // Optimistic update for periodAggregates
    if (periodMonths > 0) { // Ensure periodMonths is valid
      setPeriodAggregates(prevAggregates => {
        const newAggregates = JSON.parse(JSON.stringify(prevAggregates)); // Deep copy
        if (!newAggregates[periodMonths]) {
          newAggregates[periodMonths] = { redeemedValue: 0, possibleValue: 0, redeemedCount: 0, totalCount: 0 };
        }
        const aggregate = newAggregates[periodMonths];

        if (newStatus === 'redeemed' && !originalStatusIsRedeemed) {
          aggregate.redeemedValue += perkValue;
          aggregate.redeemedCount++;
        } else if (newStatus === 'available' && originalStatusIsRedeemed) {
          aggregate.redeemedValue = Math.max(0, aggregate.redeemedValue - perkValue);
          aggregate.redeemedCount = Math.max(0, aggregate.redeemedCount - 1);
        }
        console.log(`[usePerkStatus] Optimistic update for period ${periodMonths}:`, aggregate);
        return newAggregates;
      });
    }

    // Log analysis of the status change
    const shouldAddToRedeemed = newStatus === 'redeemed' && !originalStatusIsRedeemed;
    const shouldRemoveFromRedeemed = newStatus === 'available' && originalStatusIsRedeemed;
    console.log('Status change analysis:', { 
      perkId, 
      newStatus, 
      isCurrentlyRedeemed: originalStatusIsRedeemed, 
      shouldAddToRedeemed, 
      shouldRemoveFromRedeemed 
    });

    if (shouldAddToRedeemed) {
      console.log(`[usePerkStatus] Marked ${perkId} as redeemed, added $${perkValue}`);
    } else if (shouldRemoveFromRedeemed) {
      console.log(`[usePerkStatus] Marked ${perkId} as available, removed $${perkValue}`);
    }

    console.log('New redeemedInCurrentCycle state:', redeemedInCurrentCycle); // This will log the state before this update cycle finishes
    console.log('========= [usePerkStatus] setPerkStatus complete =========');
  }, []); // Removed dependencies to avoid stale closures; values are derived within the function

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