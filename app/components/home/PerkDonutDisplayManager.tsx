import React, { useState, useMemo, useEffect, useCallback, useImperativeHandle, forwardRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ProgressDonut from './ProgressDonut';
import { Card, CardPerk, Benefit } from '../../../src/data/card-data';
import { useAuth } from '../../hooks/useAuth';
import { getCurrentMonthRedemptions, getAnnualRedemptions } from '../../../lib/database';
import { useNavigation, useFocusEffect } from '@react-navigation/native';

type SegmentKey = 'monthly' | 'annualFees';

interface Segment {
  key: SegmentKey;
  label: string;
  icon: string;
}

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
    // Count only monthly perks for secondary metric
    const perkCounts = userCardsWithPerks.reduce((counts, { perks }) => {
      const monthlyPerks = perks.filter(perk => perk.periodMonths === 1);
      const availablePerks = monthlyPerks.filter(perk => perk.status === 'available').length;
      const redeemedPerks = monthlyPerks.filter(perk => perk.status === 'redeemed').length;
      return {
        available: counts.available + availablePerks,
        redeemed: counts.redeemed + redeemedPerks
      };
    }, { available: 0, redeemed: 0 });

    const totalPerks = perkCounts.available + perkCounts.redeemed;
    
    return {
      value: monthlyRedemptions,
      total: monthlyPossibleTotal,
      progress: monthlyPossibleTotal > 0 ? monthlyRedemptions / monthlyPossibleTotal : 0,
      primaryMetric: {
        value: monthlyRedemptions.toLocaleString('en-US', { style: 'currency', currency: 'USD' }),
        label: 'Monthly Value Redeemed',
      },
      secondaryMetric: {
        value: `${perkCounts.redeemed} of ${totalPerks} monthly perks`,
        label: 'Monthly Perks Used',
      },
      donutLabel: {
        value: `${monthlyRedemptions.toLocaleString('en-US', { style: 'currency', currency: 'USD' })} / ${monthlyPossibleTotal.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}`,
        label: 'Monthly Credits',
      },
      color: '#2196f3',
    };
  }, [userCardsWithPerks, monthlyRedemptions, monthlyPossibleTotal]);

  const annualFeesData = useMemo(() => {
    const formattedFees = totalAnnualFees.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
    const formattedRedeemedValue = annualRedemptions.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
    
    return {
      value: annualRedemptions,
      total: totalAnnualFees,
      progress: totalAnnualFees > 0 ? annualRedemptions / totalAnnualFees : 0,
      primaryMetric: {
        value: formattedRedeemedValue,
        label: 'Total Value Redeemed',
      },
      secondaryMetric: {
        value: `${((totalAnnualFees > 0 ? annualRedemptions / totalAnnualFees : 0) * 100).toFixed(0)}% of annual fees`,
        label: 'Break-even Progress',
      },
      donutLabel: {
        value: `${formattedRedeemedValue} / ${formattedFees}`,
        label: 'Annual Break-even',
      },
      color: '#5856d6',
    };
  }, [annualRedemptions, totalAnnualFees]);

  if (!user) {
    return <View style={styles.container} />;
  }

  const segments: Segment[] = [
    { key: 'monthly', label: 'Monthly', icon: '📅' },
    { key: 'annualFees', label: 'Annual', icon: '💳' },
  ];

  const activeData = activeSegmentKey === 'monthly' ? monthlyPerkData : annualFeesData;

  return (
    <View style={styles.managerContainer}>
      <View style={styles.segmentedControlWrapper}>
        <View style={styles.segmentedControlContainer}>
          {segments.map((segment, index) => (
            <TouchableOpacity
              key={segment.key}
              style={[
                styles.segmentButton,
                activeSegmentKey === segment.key && styles.activeSegment,
                index === 0 && styles.firstSegmentButton,
                index === segments.length - 1 && styles.lastSegmentButton,
              ]}
              onPress={() => setActiveSegmentKey(segment.key)}
            >
              <Ionicons 
                name={segment.key === 'monthly' ? 'calendar-outline' : 'card-outline'} 
                size={18} 
                color={activeSegmentKey === segment.key ? '#007aff' : '#666'}
              />
              <Text
                style={[
                  styles.segmentText,
                  activeSegmentKey === segment.key && styles.activeSegmentText,
                ]}
              >
                {segment.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={[styles.metricsContainer, { opacity: isRefreshing ? 0.6 : 1 }]}>
        <View style={styles.primaryMetric}>
          <Text style={styles.primaryValue}>{activeData.primaryMetric.value}</Text>
          <Text style={styles.primaryLabel}>{activeData.primaryMetric.label}</Text>
        </View>

        <ProgressDonut
          size={120}
          strokeWidth={12}
          progress={activeData.progress}
          value={activeData.value}
          total={activeData.total}
          color={activeData.color}
          label={activeData.donutLabel.label}
          valueLabel={activeData.donutLabel.value}
        />

        <View style={styles.secondaryMetric}>
          <Text style={styles.secondaryValue}>{activeData.secondaryMetric.value}</Text>
          <Text style={styles.secondaryLabel}>{activeData.secondaryMetric.label}</Text>
        </View>
      </View>
    </View>
  );
});

PerkDonutDisplayManager.displayName = 'PerkDonutDisplayManager';

const styles = StyleSheet.create({
  managerContainer: {
    alignItems: 'center',
    width: '100%',
    paddingTop: 8,
  },
  segmentedControlWrapper: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  segmentedControlContainer: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    padding: 4,
    width: '100%',
    maxWidth: 280,
  },
  segmentButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 6,
  },
  firstSegmentButton: {
    borderTopLeftRadius: 10,
    borderBottomLeftRadius: 10,
  },
  lastSegmentButton: {
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
  },
  activeSegment: {
    backgroundColor: '#ffffff',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  segmentText: {
    fontSize: 15,
    color: '#666',
    fontWeight: '500',
  },
  activeSegmentText: {
    color: '#007aff',
    fontWeight: '600',
  },
  metricsContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  primaryMetric: {
    alignItems: 'center',
    marginBottom: 16,
  },
  primaryValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1c1c1e',
    letterSpacing: -0.5,
  },
  primaryLabel: {
    fontSize: 15,
    color: '#666',
    fontWeight: '500',
    marginTop: 4,
  },
  secondaryMetric: {
    alignItems: 'center',
    marginTop: 16,
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  secondaryValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1c1c1e',
  },
  secondaryLabel: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
    marginTop: 2,
  },
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    padding: 16,
  },
});

export default PerkDonutDisplayManager; 