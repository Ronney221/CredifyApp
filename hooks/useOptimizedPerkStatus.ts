import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardPerk } from '../src/data/card-data';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import { useOnboardingContext } from '../app/(onboarding)/_context/OnboardingContext';
import { hookLogger } from '../utils/logger';

interface PerkDefinition {
  id: string;
  name: string;
  value: number;
}

interface PeriodAggregate {
  redeemedValue: number;
  possibleValue: number;
  redeemedCount: number;
  totalCount: number;
  partiallyRedeemedCount: number;
}

interface CachedData {
  perkDefinitions: PerkDefinition[];
  userRedemptions: any[];
  timestamp: number;
  userId: string;
}

interface OptimizedPerkStatusHookResult {
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

// Cache with 5-minute TTL
const CACHE_TTL = 5 * 60 * 1000;
const cache = new Map<string, CachedData>();

// Batch multiple queries into a single optimized query
const fetchBatchedPerkData = async (userId: string): Promise<{
  perkDefinitions: PerkDefinition[];
  userRedemptions: any[];
}> => {
  const cacheKey = `perk_data_${userId}`;
  const cached = cache.get(cacheKey);
  
  // Return cached data if still fresh
  if (cached && Date.now() - cached.timestamp < CACHE_TTL && cached.userId === userId) {
    hookLogger.log('OptimizedPerkStatus', 'Using cached perk data');
    return {
      perkDefinitions: cached.perkDefinitions,
      userRedemptions: cached.userRedemptions,
    };
  }

  hookLogger.log('OptimizedPerkStatus', 'Fetching fresh perk data with batched queries');

  try {
    // Batch both queries simultaneously instead of sequential calls
    const [perkDefsResponse, redemptionsResponse] = await Promise.all([
      // Selective field querying - only get fields we actually use
      supabase
        .from('perk_definitions')
        .select('id, name, value')
        .limit(100), // Add reasonable limit for pagination
      
      supabase
        .from('perk_redemptions')
        .select('perk_id, redemption_date, reset_date, value_redeemed, status, remaining_value')
        .eq('user_id', userId)
        .order('redemption_date', { ascending: false })
        .limit(500) // Limit to most recent 500 redemptions
    ]);

    if (perkDefsResponse.error) {
      hookLogger.error('OptimizedPerkStatus', 'Error fetching perk definitions:', perkDefsResponse.error);
      throw perkDefsResponse.error;
    }

    if (redemptionsResponse.error) {
      hookLogger.error('OptimizedPerkStatus', 'Error fetching redemptions:', redemptionsResponse.error);
      throw redemptionsResponse.error;
    }

    const result = {
      perkDefinitions: perkDefsResponse.data || [],
      userRedemptions: redemptionsResponse.data || [],
    };

    // Cache the results
    cache.set(cacheKey, {
      ...result,
      timestamp: Date.now(),
      userId,
    });

    hookLogger.log('OptimizedPerkStatus', 'Cached fresh perk data', {
      definitionsCount: result.perkDefinitions.length,
      redemptionsCount: result.userRedemptions.length,
    });

    return result;
  } catch (error) {
    hookLogger.error('OptimizedPerkStatus', 'Error in batched perk data fetch:', error);
    throw error;
  }
};

// Optimized helper function to determine if a redemption is valid for the current period
const isRedemptionValidForPeriod = (redemptionDate: Date, resetDate: Date | undefined, perkPeriodMonths: number): boolean => {
  const now = new Date();
  
  if (resetDate && resetDate < now) {
    return false;
  }

  if (!resetDate) {
    const startOfCurrentPeriod = new Date();
    startOfCurrentPeriod.setDate(1);
    
    switch (perkPeriodMonths) {
      case 1: // Monthly
        startOfCurrentPeriod.setHours(0, 0, 0, 0);
        break;
      case 3: // Quarterly
        startOfCurrentPeriod.setMonth(Math.floor(startOfCurrentPeriod.getMonth() / 3) * 3);
        break;
      case 6: // Semi-annual
        startOfCurrentPeriod.setMonth(Math.floor(startOfCurrentPeriod.getMonth() / 6) * 6);
        break;
      case 12: // Annual
        startOfCurrentPeriod.setMonth(0);
        break;
      default:
        hookLogger.error('OptimizedPerkStatus', `Unexpected period months: ${perkPeriodMonths}`);
        return false;
    }
    
    return redemptionDate >= startOfCurrentPeriod;
  }

  return true;
};

export function useOptimizedPerkStatus(
  initialUserCardsWithPerks: { card: Card; perks: CardPerk[] }[]
): OptimizedPerkStatusHookResult {
  const { user } = useAuth();
  const { markFirstPerkRedeemed } = useOnboardingContext();
  const [isLoadingHook, setIsLoadingHook] = useState(true);
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

  // Debounced state changes to prevent excessive re-renders
  const debounceTimeoutRef = useRef<NodeJS.Timeout>();

  const calculateSavingsOptimized = useCallback(async () => {
    if (!user || initialUserCardsWithPerks.length === 0) {
      setIsLoadingHook(false);
      setProcessedCardsWithPerks(initialUserCardsWithPerks);
      return;
    }

    try {
      setIsCalculatingSavings(true);
      hookLogger.log('OptimizedPerkStatus', 'Starting optimized savings calculation');

      // Use batched query instead of multiple sequential queries
      const { perkDefinitions: fetchedDefinitions, userRedemptions } = await fetchBatchedPerkData(user.id);
      
      setPerkDefinitions(fetchedDefinitions);
      setArePerkDefinitionsLoading(false);

      // Create a Map for O(1) lookup instead of O(n) array operations
      const latestRedemptionsMap = new Map<string, {
        reset_date: string;
        redemption_date: string;
        value_redeemed: number;
        status: 'redeemed' | 'partially_redeemed';
        remaining_value: number;
      }>();

      // Process redemptions more efficiently
      userRedemptions.forEach(r => {
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

      const newRedeemedInCycle: Record<string, boolean> = {};
      const newCumulative: Record<string, number> = {};
      const newPeriodAggregates: Record<number, PeriodAggregate> = {};

      // Process cards with optimized loops
      const processedCards = initialUserCardsWithPerks.map(cardData => {
        const processedPerks = cardData.perks.map(perk => {
          if (!perk.periodMonths) {
            hookLogger.error('OptimizedPerkStatus', `Perk ${perk.name} (ID: ${perk.id}) has no periodMonths defined. Skipping for period aggregation.`);
            return { ...perk, status: 'available' as const };
          }

          // Initialize period aggregate if not exists
          if (!newPeriodAggregates[perk.periodMonths]) {
            newPeriodAggregates[perk.periodMonths] = { 
              redeemedValue: 0, 
              possibleValue: 0, 
              redeemedCount: 0, 
              totalCount: 0, 
              partiallyRedeemedCount: 0 
            };
          }

          let isRedeemedThisCycle = false;
          let perkStatus: 'available' | 'redeemed' | 'partially_redeemed' = 'available';
          let remainingValue = 0;
          const latestRedemption = latestRedemptionsMap.get(perk.definition_id);

          if (latestRedemption) {
            const redemptionDate = new Date(latestRedemption.redemption_date);
            const resetDate = latestRedemption.reset_date ? new Date(latestRedemption.reset_date) : undefined;
            
            isRedeemedThisCycle = resetDate ? 
              isRedemptionValidForPeriod(redemptionDate, resetDate, perk.periodMonths || 1) : 
              false;
            
            if (isRedeemedThisCycle) {
              perkStatus = latestRedemption.status;
              remainingValue = latestRedemption.remaining_value;
            }
          }

          newRedeemedInCycle[perk.id] = isRedeemedThisCycle;

          if (isRedeemedThisCycle) {
            const redeemedValue = perkStatus === 'partially_redeemed' ? 
              perk.value - remainingValue : 
              perk.value;

            newCumulative[cardData.card.id] = (newCumulative[cardData.card.id] || 0) + redeemedValue;
            newPeriodAggregates[perk.periodMonths].redeemedValue += redeemedValue;
            
            if (perkStatus === 'redeemed') {
              newPeriodAggregates[perk.periodMonths].redeemedCount++;
            } else if (perkStatus === 'partially_redeemed') {
              newPeriodAggregates[perk.periodMonths].partiallyRedeemedCount++;
            }
          }
          
          return { 
            ...perk, 
            status: perkStatus,
            remaining_value: remainingValue
          };
        });
        
        // Update period aggregates for possible values
        cardData.perks.forEach(p => {
          if (p.periodMonths && newPeriodAggregates[p.periodMonths]) {
            newPeriodAggregates[p.periodMonths].possibleValue += p.value;
            newPeriodAggregates[p.periodMonths].totalCount++;
          }
        });
        
        return { ...cardData, perks: processedPerks };
      });
      
      // Update state in batches to prevent excessive re-renders
      setProcessedCardsWithPerks(processedCards);
      setRedeemedInCurrentCycle(newRedeemedInCycle);
      setCumulativeValueSavedPerCard(newCumulative);
      setPeriodAggregates(newPeriodAggregates);

      hookLogger.log('OptimizedPerkStatus', 'Optimized savings calculation complete', {
        cardsCount: processedCards.length,
        totalPerks: processedCards.reduce((sum, card) => sum + card.perks.length, 0),
        cacheHit: cache.has(`perk_data_${user.id}`)
      });

    } catch (error) {
      hookLogger.error('OptimizedPerkStatus', 'Error during optimized savings calculation:', error);
    } finally {
      setIsCalculatingSavings(false);
      setIsLoadingHook(false);
    }
  }, [user, initialUserCardsWithPerks]);

  // Debounced effect to prevent excessive API calls
  useEffect(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(() => {
      calculateSavingsOptimized();
    }, 100); // 100ms debounce

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [calculateSavingsOptimized]);

  const setPerkStatus = useCallback((
    cardId: string, 
    perkId: string, 
    newStatus: 'redeemed' | 'available' | 'partially_redeemed',
    remainingValue?: number
  ) => {
    // Implement optimistic updates similar to the original but with better performance
    // ... (implementation would be similar to original but with optimizations)
    hookLogger.log('OptimizedPerkStatus', 'setPerkStatus called (optimized)', { cardId, perkId, newStatus });
    
    // Clear cache for this user to force fresh data on next load
    const cacheKey = `perk_data_${user?.id}`;
    cache.delete(cacheKey);
  }, [user]);

  const refreshSavings = useCallback(() => {
    // Clear cache and force refresh
    if (user) {
      const cacheKey = `perk_data_${user.id}`;
      cache.delete(cacheKey);
    }
    calculateSavingsOptimized();
  }, [user, calculateSavingsOptimized]);

  const processNewMonth = useCallback((forcedDate?: Date) => {
    const now = forcedDate || new Date();
    const newIdentifier = `${now.getFullYear()}-${now.getMonth()}`;
    if (newIdentifier !== currentCycleIdentifier) {
      hookLogger.log('OptimizedPerkStatus', `New month detected: ${newIdentifier}. Resetting and showing celebration.`);
      setCurrentCycleIdentifier(newIdentifier);
      setShowCelebration(true);
      refreshSavings(); 
    }
  }, [currentCycleIdentifier, refreshSavings]);

  return {
    isLoading: isLoadingHook,
    arePerkDefinitionsLoading,
    perkDefinitions,
    periodAggregates,
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