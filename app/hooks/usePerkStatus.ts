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
  setPerkStatus: (cardId: string, perkId: string, newStatus: 'redeemed' | 'available') => Promise<void>;
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
            dbMonthlyRedemptions.forEach(r => {
                const perkDef = perkDefs.find(pd => pd.id === r.perk_id);
                if (perkDef) {
                    const cardPerk = initialUserCardsWithPerks.flatMap(uc => uc.perks).find(p => p.definition_id === perkDef.id);
                    if (cardPerk) {
                        newCumulative[cardPerk.cardId] = (newCumulative[cardPerk.cardId] || 0) + r.value_redeemed;
                        const redemptionDate = new Date(r.redemption_date);
                        if (cardPerk.periodMonths === 1 && redemptionDate >= currentMonthStart && redemptionDate <= currentMonthEnd) {
                            newMonthlyRedeemedValue += r.value_redeemed;
                            newRedeemedInCycle[cardPerk.id] = true;
                        } else if (cardPerk.periodMonths > 1) {
                            newYearlyRedeemedValue += r.value_redeemed;
                            currentYearlyRedemptions.push({ perk_id: cardPerk.definition_id, redemption_date: r.redemption_date });
                        }
                    }
                }
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

  const setPerkStatus = async (cardId: string, perkId: string, newStatus: 'redeemed' | 'available') => {
    console.log('Setting perk status (usePerkStatus):', { cardId, perkId, newStatus });
    
    if (!user) {
      console.error('No user authenticated in usePerkStatus');
      return;
    }

    const cardData = initialUserCardsWithPerks.find(({ card }) => card.id === cardId);
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

    setRedeemedInCurrentCycle(prev => {
      const newState = { ...prev };
      if (newStatus === 'redeemed') {
        newState[perk.id] = true;
        if (perk.periodMonths === 1) setMonthlyCreditsRedeemed(val => val + perk.value);
        else setYearlyCreditsRedeemed(val => val + perk.value);
        setCumulativeValueSavedPerCard(cum => ({...cum, [cardId]: (cum[cardId] || 0) + perk.value }));
      } else {
        delete newState[perk.id];
        if (perk.periodMonths === 1) setMonthlyCreditsRedeemed(val => Math.max(0, val - perk.value));
        else setYearlyCreditsRedeemed(val => Math.max(0, val - perk.value));
        setCumulativeValueSavedPerCard(cum => ({...cum, [cardId]: Math.max(0, (cum[cardId] || 0) - perk.value) }));
      }
      return newState;
    });

    let currentMonthlyRedeemedAfterUpdate = 0;
    if (initialUserCardsWithPerks && perkDefinitions.length > 0) {
        initialUserCardsWithPerks.forEach(c => {
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