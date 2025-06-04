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
      setIsLoadingHook(true);
      
      if (!initialUserCardsWithPerks.length || !user || arePerkDefinitionsLoading || perkDefinitions.length === 0) {
        console.log('Skipping savings calculation: No cards, user not authenticated, perk definitions loading, or no perk definitions found.', {
          hasCards: initialUserCardsWithPerks.length > 0,
          isAuthenticated: !!user,
          areDefsLoading: arePerkDefinitionsLoading,
          hasDefs: perkDefinitions.length > 0,
        });
        setIsLoadingHook(false);
        setMonthlyCreditsRedeemed(0);
        setMonthlyCreditsPossible(0);
        setYearlyCreditsRedeemed(0);
        setYearlyCreditsPossible(0);
        setCumulativeValueSavedPerCard({});
        setRedeemedInCurrentCycle({});
        setIsCalculatingSavings(false);
        setIsLoadingHook(false);
        return;
      }

      console.log('========= DEBUG: Starting Savings Calculation =========');
      console.log('User ID:', user.id);
      console.log('Number of cards:', initialUserCardsWithPerks.length);
      console.log('Perk definitions count:', perkDefinitions.length);
      
      // Debug: Log all cards and their perks with definition_ids
      initialUserCardsWithPerks.forEach(({ card, perks }) => {
        console.log(`\n--- Card: ${card.name} (${card.id}) ---`);
        perks.forEach(perk => {
          console.log(`  Perk: ${perk.name} (${perk.id})`);
          console.log(`    definition_id: ${perk.definition_id}`);
          console.log(`    value: $${perk.value}`);
          console.log(`    periodMonths: ${perk.periodMonths}`);
        });
      });
      console.log('================================================');

      try {
        const perkDefs = perkDefinitions;
        console.log('Using stored perk definitions for calculation:', perkDefs.length);

        const perkNameToId = new Map(
          perkDefs.map(p => [p.name, { id: p.id, value: p.value }])
        );

        console.log('Perk name to ID mapping:', 
          Object.fromEntries(perkNameToId.entries())
        );

        const currentMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const currentMonthEnd = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);

        const { data: dbMonthlyRedemptions, error: dbError } = await supabase
          .from('perk_redemptions')
          .select('perk_id, value_redeemed, user_card_id, redemption_date')
          .eq('user_id', user.id)
          .gte('redemption_date', currentMonthStart.toISOString())
          .lte('redemption_date', currentMonthEnd.toISOString());

        if (!dbMonthlyRedemptions) {
          console.error('No redemption data found');
          setIsLoadingHook(false);
          return;
        }

        console.log('Monthly redemptions:', dbMonthlyRedemptions);

        let newMonthlyRedeemedValue = 0;
        let newMonthlyPossibleValue = 0;
        let newYearlyRedeemedValue = 0;
        let newYearlyPossibleValue = 0;
        const newCumulative: Record<string,number> = {};
        const newRedeemedInCycle: Record<string, boolean> = {};
        const currentYearlyRedemptions: YearlyRedemption[] = [];

        initialUserCardsWithPerks.forEach(({ card, perks }) => {
          perks.forEach(p => {
            if (p.periodMonths === 1) newMonthlyPossibleValue += p.value;
            else newYearlyPossibleValue += p.value;
          });
        });
        
        if (dbMonthlyRedemptions) {
            console.log('Processing', dbMonthlyRedemptions.length, 'redemptions from database');
            console.log('Available perk definitions:', perkDefs.map(pd => ({ id: pd.id, name: pd.name })));
            console.log('Available card perks with definition_ids:', 
              initialUserCardsWithPerks.flatMap(uc => uc.perks).map(p => ({ 
                id: p.id, 
                name: p.name, 
                definition_id: p.definition_id,
                cardId: p.cardId 
              }))
            );

            dbMonthlyRedemptions.forEach(r => {
                console.log('Processing redemption:', {
                  perk_id: r.perk_id,
                  value_redeemed: r.value_redeemed,
                  redemption_date: r.redemption_date
                });

                const perkDef = perkDefs.find(pd => pd.id === r.perk_id);
                if (perkDef) {
                    console.log('Found perk definition:', { id: perkDef.id, name: perkDef.name });
                    
                    const cardPerk = initialUserCardsWithPerks.flatMap(uc => uc.perks).find(p => p.definition_id === perkDef.id);
                    if (cardPerk) {
                        console.log('Found matching card perk:', { 
                          id: cardPerk.id, 
                          name: cardPerk.name, 
                          cardId: cardPerk.cardId,
                          definition_id: cardPerk.definition_id,
                          periodMonths: cardPerk.periodMonths
                        });
                        
                        newCumulative[cardPerk.cardId] = (newCumulative[cardPerk.cardId] || 0) + r.value_redeemed;
                        const redemptionDate = new Date(r.redemption_date);
                        if (cardPerk.periodMonths === 1 && redemptionDate >= currentMonthStart && redemptionDate <= currentMonthEnd) {
                            newMonthlyRedeemedValue += r.value_redeemed;
                            newRedeemedInCycle[cardPerk.id] = true;
                            console.log('Marked monthly perk as redeemed:', {
                              perkId: cardPerk.id,
                              perkName: cardPerk.name,
                              value: r.value_redeemed
                            });
                        } else if (cardPerk.periodMonths > 1) {
                            newYearlyRedeemedValue += r.value_redeemed;
                            currentYearlyRedemptions.push({ perk_id: cardPerk.definition_id, redemption_date: r.redemption_date });
                            console.log('Marked yearly perk as redeemed:', {
                              perkId: cardPerk.id,
                              perkName: cardPerk.name,
                              value: r.value_redeemed
                            });
                        }
                    } else {
                        console.error('No matching card perk found for definition_id:', perkDef.id, 'perk name:', perkDef.name);
                        console.error('Available definition_ids in card data:', 
                          initialUserCardsWithPerks.flatMap(uc => uc.perks).map(p => p.definition_id)
                        );
                    }
                } else {
                    console.error('No perk definition found for perk_id:', r.perk_id);
                    console.error('Available perk definition IDs:', perkDefs.map(pd => pd.id));
                }
            });
            
            console.log('Final redemption state:', {
              newRedeemedInCycle,
              newCumulative,
              newMonthlyRedeemedValue,
              newYearlyRedeemedValue
            });
        }
        
        setMonthlyCreditsRedeemed(newMonthlyRedeemedValue);
        setMonthlyCreditsPossible(newMonthlyPossibleValue);
        setYearlyCreditsRedeemed(newYearlyRedeemedValue);
        setYearlyCreditsPossible(newYearlyPossibleValue);
        setCumulativeValueSavedPerCard(newCumulative);
        setRedeemedInCurrentCycle(newRedeemedInCycle);
        yearlyRedemptionsRef.current = currentYearlyRedemptions;

        if (newMonthlyPossibleValue > 0 && newMonthlyRedeemedValue >= newMonthlyPossibleValue) {
          setShowCelebration(true);
        } else {
          setShowCelebration(false);
        }
      } catch (error) {
        console.error('Error calculating savings:', error);
      } finally {
        setIsCalculatingSavings(false);
        setIsLoadingHook(false);
      }
    };

    calculateSavings();
  }, [initialUserCardsWithPerks, user, perkDefinitions, arePerkDefinitionsLoading]);

  useEffect(() => {
    if (!initialUserCardsWithPerks) {
      setProcessedCardsWithPerks([]);
      return;
    }
    const updatedCards = initialUserCardsWithPerks.map(extendedCard => ({
      ...extendedCard,
      perks: extendedCard.perks.map(perk => {
        const perkStatusValue: 'redeemed' | 'available' = 
          (redeemedInCurrentCycle[perk.id] && perk.periodMonths === 1) || 
          (isPerkRedeemedAnnually(perk.id, perk.periodMonths, yearlyRedemptionsRef.current) && perk.periodMonths > 1)
            ? 'redeemed'
            : 'available';
        return {
          ...perk,
          status: perkStatusValue,
        };
      }),
    }));
    setProcessedCardsWithPerks(updatedCards);
  }, [initialUserCardsWithPerks, redeemedInCurrentCycle]);

  const setPerkStatus = (cardId: string, perkId: string, newStatus: 'redeemed' | 'available') => {
    console.log('========= [usePerkStatus] setPerkStatus called =========');
    console.log('Input parameters:', { cardId, perkId, newStatus });
    
    if (!user) {
      console.error('No user authenticated in usePerkStatus');
      return;
    }

    const cardData = initialUserCardsWithPerks.find(({ card }) => card.id === cardId);
    if (!cardData) {
      console.error('Card not found in usePerkStatus:', cardId);
      console.error('Available cards:', initialUserCardsWithPerks.map(c => c.card.id));
      return;
    }

    const perk = cardData.perks.find(p => p.id === perkId);
    if (!perk) {
      console.error('Perk not found in usePerkStatus:', perkId, 'on card', cardId);
      console.error('Available perks on card:', cardData.perks.map(p => ({ id: p.id, name: p.name })));
      return;
    }

    console.log('Found perk for status change:', {
      perkName: perk.name,
      currentStatus: perk.status,
      newStatusRequested: newStatus,
      value: perk.value,
      isMonthly: perk.periodMonths === 1,
      definition_id: perk.definition_id
    });

    // Update the redemption state immediately
    setRedeemedInCurrentCycle(prev => {
      console.log('Current redeemedInCurrentCycle state:', prev);
      const newState = { ...prev };
      const isCurrentlyRedeemed = prev[perk.id] || false;
      
      console.log('Status change analysis:', {
        perkId: perk.id,
        isCurrentlyRedeemed,
        newStatus,
        shouldAddToRedeemed: newStatus === 'redeemed' && !isCurrentlyRedeemed,
        shouldRemoveFromRedeemed: newStatus === 'available' && isCurrentlyRedeemed
      });
      
      if (newStatus === 'redeemed' && !isCurrentlyRedeemed) {
        newState[perk.id] = true;
        // Update credits counters
        if (perk.periodMonths === 1) {
          setMonthlyCreditsRedeemed(val => {
            console.log(`[usePerkStatus] Updating monthly credits: ${val} + ${perk.value} = ${val + perk.value}`);
            return val + perk.value;
          });
        } else {
          setYearlyCreditsRedeemed(val => {
            console.log(`[usePerkStatus] Updating yearly credits: ${val} + ${perk.value} = ${val + perk.value}`);
            return val + perk.value;
          });
        }
        // Update cumulative savings
        setCumulativeValueSavedPerCard(cum => {
          const newCum = {
            ...cum, 
            [cardId]: (cum[cardId] || 0) + perk.value 
          };
          console.log(`[usePerkStatus] Updated cumulative savings for ${cardId}: ${cum[cardId] || 0} + ${perk.value} = ${newCum[cardId]}`);
          return newCum;
        });
        console.log(`[usePerkStatus] Marked ${perk.name} as redeemed, added $${perk.value}`);
      } else if (newStatus === 'available' && isCurrentlyRedeemed) {
        console.log(`[usePerkStatus] Removing ${perk.id} from redeemed state`);
        delete newState[perk.id];
        // Update credits counters
        if (perk.periodMonths === 1) {
          setMonthlyCreditsRedeemed(val => {
            const newVal = Math.max(0, val - perk.value);
            console.log(`[usePerkStatus] Updating monthly credits: ${val} - ${perk.value} = ${newVal}`);
            return newVal;
          });
        } else {
          setYearlyCreditsRedeemed(val => {
            const newVal = Math.max(0, val - perk.value);
            console.log(`[usePerkStatus] Updating yearly credits: ${val} - ${perk.value} = ${newVal}`);
            return newVal;
          });
        }
        // Update cumulative savings
        setCumulativeValueSavedPerCard(cum => {
          const newCum = {
            ...cum, 
            [cardId]: Math.max(0, (cum[cardId] || 0) - perk.value) 
          };
          console.log(`[usePerkStatus] Updated cumulative savings for ${cardId}: ${cum[cardId] || 0} - ${perk.value} = ${newCum[cardId]}`);
          return newCum;
        });
        console.log(`[usePerkStatus] Marked ${perk.name} as available, subtracted $${perk.value}`);
      } else {
        console.log(`[usePerkStatus] No state change needed for ${perk.name} - already in desired state or invalid transition`);
      }
      
      console.log('New redeemedInCurrentCycle state:', newState);
      return newState;
    });

    // Check for celebration after state updates
    setTimeout(() => {
      if (perk.periodMonths === 1) {
        const currentMonthlyCreds = Object.keys(redeemedInCurrentCycle).length;
        if (monthlyCreditsPossible > 0 && currentMonthlyCreds >= monthlyCreditsPossible) {
          console.log("[usePerkStatus] Celebration triggered!");
          setShowCelebration(true);
        } else {
          setShowCelebration(false);
        }
      }
    }, 100);
    
    console.log('========= [usePerkStatus] setPerkStatus complete =========');
  };

  const processNewMonth = (forcedDate?: Date) => {
    const now = forcedDate || new Date();
    const newCycleId = `${now.getFullYear()}-${now.getMonth()}`;
    if (newCycleId !== currentCycleIdentifier) {
      console.log(`Processing new month. Old: ${currentCycleIdentifier}, New: ${newCycleId}`);
      setCurrentCycleIdentifier(newCycleId);
      setRedeemedInCurrentCycle({});
      setMonthlyCreditsRedeemed(0); 
      setShowCelebration(false);
      refreshSavings();
    }
  };

  const refreshSavings = useCallback(() => {
    console.log('refreshSavings called in usePerkStatus');
    setIsLoadingHook(true);
    setIsCalculatingSavings(true);
  }, []);

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