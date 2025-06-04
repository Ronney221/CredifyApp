import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardPerk } from '../../src/data/card-data';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../hooks/useAuth';

interface PerkDefinition {
  id: string;
  name: string;
  value: number;
}

interface YearlyRedemption { 
  perk_id: string; 
  redemption_date: string;
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
  const [processedCardsWithPerks, setProcessedCardsWithPerks] = useState<{ card: Card; perks: CardPerk[] }[]>([]);
  const yearlyRedemptionsRef = useRef<YearlyRedemption[]>([]);
  const [isCalculatingSavings, setIsCalculatingSavings] = useState(false);

  const isPerkRedeemedAnnually = (perkId: string, periodMonths: number, yearlyRedemptions: YearlyRedemption[]): boolean => {
    return false;
  };

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
      // Keep setIsLoadingHook(true) at the beginning if you want a loading state for the whole process
      // setIsLoadingHook(true); 
      
      if (!initialUserCardsWithPerks.length || !user || arePerkDefinitionsLoading || perkDefinitions.length === 0) {
        console.log('Skipping savings calculation: No cards, user not authenticated, perk definitions loading, or no perk definitions found.');
        // Reset all relevant states
        setMonthlyCreditsRedeemed(0);
        setMonthlyCreditsPossible(0);
        setYearlyCreditsRedeemed(0);
        setYearlyCreditsPossible(0);
        setCumulativeValueSavedPerCard({});
        setRedeemedInCurrentCycle({});
        setProcessedCardsWithPerks(initialUserCardsWithPerks); // Show cards even if no savings data
        setIsCalculatingSavings(false);
        setIsLoadingHook(false); // Ensure loading is false if skipped
        return;
      }

      console.log('========= DEBUG: Starting Comprehensive Savings Calculation =========');
      console.log('User ID:', user.id);
      console.log('Number of initial cards:', initialUserCardsWithPerks.length);
      console.log('Perk definitions count:', perkDefinitions.length);

      try {
        // Fetch all user redemptions once
        const { data: allUserRedemptions, error: allRedemptionsError } = await supabase
          .from('perk_redemptions')
          .select('perk_id, redemption_date, reset_date, value_redeemed')
          .eq('user_id', user.id)
          .order('redemption_date', { ascending: false }); // Ensure latest redemptions are processed correctly

        if (allRedemptionsError) {
          console.error('Error fetching all user redemptions:', allRedemptionsError);
          // Handle error appropriately, maybe set an error state or retry
          setIsCalculatingSavings(false);
          setIsLoadingHook(false);
          return;
        }

        console.log('Fetched all redemptions from DB:', allUserRedemptions?.length || 0);

        let newMonthlyRedeemedValue = 0;
        let newMonthlyPossibleValue = 0;
        let newYearlyRedeemedValue = 0; // For non-monthly perks currently active
        let newYearlyPossibleValue = 0;
        const newCumulative: Record<string, number> = {};
        const newRedeemedInCycle: Record<string, boolean> = {};
        
        // Store latest redemptions per perk_definition_id for quick lookup
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
            let isRedeemedThisCycle = false;
            const latestRedemption = latestRedemptionsMap.get(perk.definition_id);

            if (latestRedemption && new Date(latestRedemption.reset_date) > new Date()) {
              isRedeemedThisCycle = true;
            }
            newRedeemedInCycle[perk.id] = isRedeemedThisCycle;

            if (isRedeemedThisCycle) {
              newCumulative[cardData.card.id] = (newCumulative[cardData.card.id] || 0) + perk.value;
              if (perk.periodMonths === 1) {
                newMonthlyRedeemedValue += perk.value;
              } else {
                newYearlyRedeemedValue += perk.value; // Value of non-monthly perks currently active
              }
            }
            
            // Update perk status directly on the cloned perk object
            return { ...perk, status: (isRedeemedThisCycle ? 'redeemed' : 'available') as 'redeemed' | 'available' };
          });
          
          // Calculate possible values once across all cards
          cardData.perks.forEach(p => {
            if (p.periodMonths === 1) {
              newMonthlyPossibleValue += p.value;
            } else {
              newYearlyPossibleValue += p.value;
            }
          });
          
          return { ...cardData, perks: processedPerks };
        });
        
        setProcessedCardsWithPerks(processedCards);
        setRedeemedInCurrentCycle(newRedeemedInCycle);
        setCumulativeValueSavedPerCard(newCumulative);
        setMonthlyCreditsRedeemed(newMonthlyRedeemedValue);
        setMonthlyCreditsPossible(newMonthlyPossibleValue); // Total possible, not average
        setYearlyCreditsRedeemed(newYearlyRedeemedValue);
        setYearlyCreditsPossible(newYearlyPossibleValue); // Total possible, not average

        console.log('Final Processed Data for UI:', {
          processedCardsPerks: processedCards.map(c => ({ card: c.card.id, perks: c.perks.map(p => ({id: p.id, status: p.status})) })),
          redeemedInCycle: newRedeemedInCycle,
          cumulative: newCumulative,
          monthlyRedeemed: newMonthlyRedeemedValue,
          monthlyPossible: newMonthlyPossibleValue, 
          yearlyRedeemed: newYearlyRedeemedValue,
          yearlyPossible: newYearlyPossibleValue,
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
    } else if (!arePerkDefinitionsLoading) { // Only set loading to false if defs are not loading
      setIsLoadingHook(false);
      setProcessedCardsWithPerks(initialUserCardsWithPerks); // Update to show cards
    }
    // Dependencies: user, initialUserCardsWithPerks, perkDefinitions, arePerkDefinitionsLoading
  }, [user, initialUserCardsWithPerks, perkDefinitions, arePerkDefinitionsLoading]);

  const setPerkStatus = useCallback((cardId: string, perkId: string, newStatus: 'redeemed' | 'available') => {
    console.log('========= [usePerkStatus] setPerkStatus called =========');
    console.log('Input parameters:', { cardId, perkId, newStatus });

    setProcessedCardsWithPerks(prevUserCards =>
      prevUserCards.map(cardData => {
        if (cardData.card.id === cardId) {
          let perkValue = 0;
          let periodMonths = 0;
          const updatedPerks = cardData.perks.map(p => {
            if (p.id === perkId) {
              perkValue = p.value;
              periodMonths = p.periodMonths;
              console.log('Found perk for status change:', { 
                perkName: p.name, 
                currentStatus: p.status, 
                newStatusRequested: newStatus, 
                value: perkValue,
                definition_id: p.definition_id,
                isMonthly: periodMonths === 1
              });
              return { ...p, status: newStatus };
            }
            return p;
          });

          setRedeemedInCurrentCycle(prev => {
            const currentRedeemedState = { ...prev };
            console.log('Current redeemedInCurrentCycle state:', currentRedeemedState);
            const isCurrentlyRedeemed = prev[perkId] === true;
            let shouldAddToRedeemed = false;
            let shouldRemoveFromRedeemed = false;

            if (newStatus === 'redeemed' && !isCurrentlyRedeemed) {
              shouldAddToRedeemed = true;
            } else if (newStatus === 'available' && isCurrentlyRedeemed) {
              shouldRemoveFromRedeemed = true;
            }
            
            console.log('Status change analysis:', {
              perkId,
              isCurrentlyRedeemed,
              newStatus,
              shouldAddToRedeemed,
              shouldRemoveFromRedeemed
            });

            if (shouldAddToRedeemed) {
              currentRedeemedState[perkId] = true;
              setCumulativeValueSavedPerCard(curr => ({
                ...curr,
                [cardId]: (curr[cardId] || 0) + perkValue,
              }));
              if (periodMonths === 1) {
                setMonthlyCreditsRedeemed(prevM => {
                  console.log('[usePerkStatus] Updating monthly credits:', prevM, '+', perkValue, '=', prevM + perkValue);
                  return prevM + perkValue;
                });
              } else {
                setYearlyCreditsRedeemed(prevY => {
                  console.log('[usePerkStatus] Updating yearly credits:', prevY, '+', perkValue, '=', prevY + perkValue);
                  return prevY + perkValue;
                });
              }
              console.log(`[usePerkStatus] Marked ${perkId} as redeemed, added $${perkValue}`);
            } else if (shouldRemoveFromRedeemed) {
              currentRedeemedState[perkId] = false;
              setCumulativeValueSavedPerCard(curr => ({
                ...curr,
                [cardId]: Math.max(0, (curr[cardId] || 0) - perkValue),
              }));
              if (periodMonths === 1) {
                setMonthlyCreditsRedeemed(prevM => {
                  console.log('[usePerkStatus] Updating monthly credits:', prevM, '-', perkValue, '=', Math.max(0, prevM - perkValue));
                  return Math.max(0, prevM - perkValue);
                });
              } else {
                setYearlyCreditsRedeemed(prevY => {
                  console.log('[usePerkStatus] Updating yearly credits:', prevY, '-', perkValue, '=', Math.max(0, prevY - perkValue));
                  return Math.max(0, prevY - perkValue);
                });
              }
              console.log(`[usePerkStatus] Marked ${perkId} as available, subtracted $${perkValue}`);
            }
            console.log('New redeemedInCurrentCycle state:', currentRedeemedState);
            return currentRedeemedState;
          });
          // Ensure cumulative savings are also updated correctly when changing status
          setCumulativeValueSavedPerCard(prevCumulative => {
            const currentCardSavings = prevCumulative[cardId] || 0;
            let newCardSavings = currentCardSavings;
            if (newStatus === 'redeemed' && !prevCumulative[perkId]) { // Check against a hypothetical prevCumulative[perkId] if that's how you track individual perk redemption for cumulative
               // This part of cumulative logic might need adjustment based on how it's meant to work with redeemedInCurrentCycle
            } else if (newStatus === 'available' && prevCumulative[perkId]) {
              // Similar adjustment here
            }
            // Fallback: recalculate from scratch or use the logic within setRedeemedInCurrentCycle for cumulative
            console.log(`[usePerkStatus] Updated cumulative savings for ${cardId}:`, prevCumulative[cardId]);
            return { ...prevCumulative }; // This might need direct update like above
          });


          return { ...cardData, perks: updatedPerks };
        }
        return cardData;
      })
    );
    console.log('========= [usePerkStatus] setPerkStatus complete =========');
    // Call refreshSavings directly IF you want an immediate DB re-fetch after optimistic update.
    // However, the DB call usually happens in the calling component (e.g., ExpandableCard) after its own DB operation.
    // For now, this function primarily handles the optimistic UI update.
    // refreshSavings(); // Consider if this is needed here or should remain in the component triggering the DB write.
  }, [setProcessedCardsWithPerks, setRedeemedInCurrentCycle, setCumulativeValueSavedPerCard, setMonthlyCreditsRedeemed, setYearlyCreditsRedeemed]);
  
  // Refresh function to re-trigger the main effect
  const refreshSavings = useCallback(() => {
    console.log('refreshSavings called in usePerkStatus');
    // This will re-trigger the main useEffect if initialUserCardsWithPerks or perkDefinitions change.
    // If you need to force a re-fetch without those changing, you might need a dedicated refresh trigger state.
    // For now, we assume the main dependencies will cover refreshes from parent components.
    // To force re-calculation, you'd typically ensure `initialUserCardsWithPerks` is a new reference from the parent.
    // Or, add a new state like `refreshKey` and increment it here.
    // Forcing calculateSavings directly:
    // calculateSavings(); // This bypasses dependency checks, use with caution.
    // The most React-idiomatic way is to have the parent component (useUserCards) provide a fresh `initialUserCardsWithPerks` array.
  }, [/* calculateSavings (if stable) or its dependencies if you were to call it directly */]);

  const processNewMonth = useCallback((forcedDate?: Date) => {
    const now = forcedDate || new Date();
    const newCycleId = `${now.getFullYear()}-${now.getMonth()}`;
    if (newCycleId !== currentCycleIdentifier) {
      console.log('[usePerkStatus] New month detected or forced. Processing...', { oldCycle: currentCycleIdentifier, newCycle: newCycleId });
      setCurrentCycleIdentifier(newCycleId);
      // Potentially reset monthly specific states here if needed, 
      // but calculateSavings should correctly rebuild them based on new dates.
      refreshSavings(); // This will trigger re-calculation if its dependencies make it do so.
    }
  }, [currentCycleIdentifier, refreshSavings, setCurrentCycleIdentifier]);

  return {
    isLoading: isLoadingHook || arePerkDefinitionsLoading,
    arePerkDefinitionsLoading,
    perkDefinitions,
    monthlyCreditsRedeemed,
    monthlyCreditsPossible,
    yearlyCreditsRedeemed,
    yearlyCreditsPossible,
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