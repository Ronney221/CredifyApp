import React, { useState, useMemo, useEffect, useCallback, useImperativeHandle, forwardRef } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { PerksToggle } from './PerksToggle';
import ProgressDonut from './ProgressDonut';
import { Card, CardPerk } from '../../../src/data/card-data';
import { useAuth } from '../../hooks/useAuth';
import { getCurrentMonthRedemptions, getAnnualRedemptions } from '../../../lib/database';
import { useNavigation, useFocusEffect } from '@react-navigation/native';

type SegmentKey = 'monthly' | 'annualFees';

interface PerkDonutDisplayManagerProps {
  userCardsWithPerks: { card: Card; perks: CardPerk[] }[];
  monthlyCreditsRedeemed: number;
  monthlyCreditsPossible: number;
}

const PerkDonutDisplayManager = forwardRef<{ refresh: () => void }, PerkDonutDisplayManagerProps>(({
  userCardsWithPerks,
  monthlyCreditsRedeemed,
  monthlyCreditsPossible,
}, ref) => {
  const { user } = useAuth();
  const [activeSegmentKey, setActiveSegmentKey] = useState<SegmentKey>('monthly');
  const [monthlyRedemptions, setMonthlyRedemptions] = useState<number>(monthlyCreditsRedeemed);
  const [annualRedemptions, setAnnualRedemptions] = useState<number>(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(Date.now());
  const navigation = useNavigation();

  // Function to trigger a refresh
  const refreshData = useCallback(() => {
    setLastRefresh(Date.now());
  }, []);

  // Add to component props
  useImperativeHandle(ref, () => ({
    refresh: refreshData
  }));

  // Refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      refreshData();
    }, [refreshData])
  );

  // Calculate total possible monthly credits (only monthly perks)
  const monthlyPossibleTotal = useMemo(() => {
    return userCardsWithPerks.reduce((acc, { perks }) => {
      const monthlyPerks = perks.filter(perk => perk.periodMonths === 1);
      return acc + monthlyPerks.reduce((sum, perk) => sum + perk.value, 0);
    }, 0);
  }, [userCardsWithPerks]);

  // Calculate total annual fees
  const totalAnnualFees = useMemo(() => {
    return userCardsWithPerks.reduce((acc, { card }) => 
      acc + (card.annualFee || 0), 0);
  }, [userCardsWithPerks]);

  useEffect(() => {
    if (!user) return;

    let isMounted = true;
    let retryCount = 0;
    const maxRetries = 3;
    const retryDelay = 1000; // 1 second

    const loadRedemptions = async () => {
      if (!isMounted) return;
      setIsRefreshing(true);
      
      try {
        // Get current month's redemptions
        const { data: monthlyData, error: monthlyError } = await getCurrentMonthRedemptions(user.id);
        if (!isMounted) return;

        if (monthlyError) {
          // Only log and retry if it's not a network error during app resume
          const errorMessage = monthlyError instanceof Error ? monthlyError.message : 
            typeof monthlyError === 'object' && monthlyError !== null && 'message' in monthlyError ? 
            monthlyError.message : '';
            
          if (errorMessage !== 'Network request failed') {
            console.error('Error fetching monthly redemptions:', monthlyError);
            if (retryCount < maxRetries) {
              retryCount++;
              setTimeout(loadRedemptions, retryDelay);
              return;
            }
          }
          return;
        }

        // Calculate monthly redemptions total (only for monthly perks)
        const monthlySum = monthlyData?.reduce((sum, redemption) => {
          const redemptionDate = new Date(redemption.redemption_date);
          const resetDate = new Date(redemption.reset_date);
          const monthDiff = (resetDate.getTime() - redemptionDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
          
          if (monthDiff <= 1.1) {
            return sum + redemption.value_redeemed;
          }
          return sum;
        }, 0) ?? monthlyRedemptions;

        if (isMounted) {
          setMonthlyRedemptions(monthlySum);
        }

        // Get annual redemptions
        const { data: annualData, error: annualError } = await getAnnualRedemptions(user.id);
        if (!isMounted) return;

        if (annualError) {
          // Only log and retry if it's not a network error during app resume
          const errorMessage = annualError instanceof Error ? annualError.message : 
            typeof annualError === 'object' && annualError !== null && 'message' in annualError ? 
            annualError.message : '';
            
          if (errorMessage !== 'Network request failed') {
            console.error('Error fetching annual redemptions:', annualError);
            if (retryCount < maxRetries) {
              retryCount++;
              setTimeout(loadRedemptions, retryDelay);
              return;
            }
          }
          return;
        }

        const annualSum = annualData?.reduce((sum, redemption) => 
          sum + redemption.value_redeemed, 0) ?? annualRedemptions;
        
        if (isMounted) {
          setAnnualRedemptions(annualSum);
        }
        
        // Reset retry count on success
        retryCount = 0;
      } catch (error: unknown) {
        // Only log and retry if it's not a network error during app resume
        const errorMessage = error instanceof Error ? error.message :
          typeof error === 'object' && error !== null && 'message' in error ?
          error.message : '';
          
        if (errorMessage !== 'Network request failed') {
          console.error('Error loading redemptions:', error);
          if (retryCount < maxRetries) {
            retryCount++;
            setTimeout(loadRedemptions, retryDelay);
          }
        }
      } finally {
        if (isMounted) {
          setIsRefreshing(false);
        }
      }
    };

    // Add a small delay before loading to allow network to stabilize
    const timeoutId = setTimeout(() => {
      loadRedemptions();
    }, 500);

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      setIsRefreshing(false);
    };
  }, [user, lastRefresh, monthlyRedemptions, annualRedemptions]);

  const monthlyPerkData = useMemo(() => {
    console.log('========= Debug Monthly Perk Calculations =========');
    console.log('Props received:', { monthlyRedemptions, monthlyCreditsPossible });
    console.log('Number of cards:', userCardsWithPerks.length);

    // Count total monthly perks
    const totalMonthlyPerks = userCardsWithPerks.reduce((total, { perks, card }) => {
      const monthlyPerksForCard = perks.filter(perk => perk.periodMonths === 1);
      console.log(`Card ${card.name}:`, {
        totalMonthlyPerks: monthlyPerksForCard.length,
        perks: monthlyPerksForCard.map(p => ({ id: p.id, status: p.status }))
      });
      return total + monthlyPerksForCard.length;
    }, 0);
    console.log('Total monthly perks across all cards:', totalMonthlyPerks);

    // Instead of using local state, calculate redeemed count based on monthlyRedemptions
    // Assuming average perk value is monthlyPossibleTotal / totalMonthlyPerks
    const avgPerkValue = totalMonthlyPerks > 0 ? monthlyCreditsPossible / totalMonthlyPerks : 0;
    const estimatedRedeemedCount = avgPerkValue > 0 ? Math.round(monthlyRedemptions / avgPerkValue) : 0;
    
    console.log('Redemption calculation:', {
      avgPerkValue,
      monthlyRedemptions,
      estimatedRedeemedCount
    });

    // Log progress calculation for debugging
    const monthlyProgress = monthlyPossibleTotal > 0 ? monthlyRedemptions / monthlyPossibleTotal : 0;
    console.log('Monthly Progress Calculation:', {
      monthlyRedemptions,
      monthlyPossibleTotal,
      progress: monthlyProgress,
    });

    // Log final metrics
    const metrics = {
      estimatedRedeemedCount,
      totalMonthlyPerks,
      monthlyRedemptions,
      monthlyCreditsPossible,
      progress: monthlyProgress,
    };
    console.log('Final metrics:', metrics);
    console.log('===============================================');

    return {
      value: monthlyRedemptions,
      total: monthlyPossibleTotal,
      progress: monthlyProgress,
      amount: monthlyRedemptions.toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
      }),
      label: 'Monthly Perks Redeemed',
      detail: `${monthlyRedemptions.toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
      })} / ${monthlyPossibleTotal.toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
      })}`,
      perksCount: `${estimatedRedeemedCount} of ${totalMonthlyPerks}`,
      color: Platform.OS === 'ios' ? '#007AFF' : 'dodgerblue',
    };
  }, [userCardsWithPerks, monthlyRedemptions, monthlyPossibleTotal]);

  const annualFeesData = useMemo(() => {
    const formattedFees = totalAnnualFees.toLocaleString('en-US', { 
      style: 'currency', 
      currency: 'USD',
      minimumFractionDigits: 2,
    });
    const formattedRedeemedValue = annualRedemptions.toLocaleString('en-US', { 
      style: 'currency', 
      currency: 'USD',
      minimumFractionDigits: 2,
    });
    
    const breakEvenPercent = totalAnnualFees > 0 
      ? Math.round((annualRedemptions / totalAnnualFees) * 100)
      : 0;
    
    // Log progress calculation for debugging
    const annualProgress = totalAnnualFees > 0 ? annualRedemptions / totalAnnualFees : 0;
    console.log('Annual Progress Calculation:', {
      annualRedemptions,
      totalAnnualFees,
      progress: annualProgress,
    });
    
    return {
      value: annualRedemptions,
      total: totalAnnualFees,
      progress: annualProgress,
      amount: formattedRedeemedValue,
      label: 'Annual Value Redeemed',
      detail: `${formattedRedeemedValue} / ${formattedFees}`,
      perksCount: `${breakEvenPercent}% of fees`,
      color: '#5856d6',
    };
  }, [annualRedemptions, totalAnnualFees]);

  if (!user) {
    return <View style={styles.container} />;
  }

  const activeData = activeSegmentKey === 'monthly' ? monthlyPerkData : annualFeesData;

  return (
    <View style={[styles.metricsContainer, { opacity: isRefreshing ? 0.6 : 1 }]}>
      <PerksToggle
        selectedMode={activeSegmentKey}
        onModeChange={setActiveSegmentKey}
      />

      <ProgressDonut
        size={120}
        strokeWidth={6}
        progress={activeData.progress}
        amount={activeData.amount}
        label={activeData.label}
        detail={activeData.detail}
        perksCount={activeData.perksCount}
        color={activeData.color}
        backgroundColor="#ECECEC"
      />
    </View>
  );
});

PerkDonutDisplayManager.displayName = 'PerkDonutDisplayManager';

const styles = StyleSheet.create({
  metricsContainer: {
    alignItems: 'center',
    width: '100%',
    paddingTop: 8,
  },
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    padding: 16,
  },
  perksUsedContainer: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 16,
  },
  perksUsedText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#3C3C4399',
    textAlign: 'center',
  },
});

export default PerkDonutDisplayManager; 