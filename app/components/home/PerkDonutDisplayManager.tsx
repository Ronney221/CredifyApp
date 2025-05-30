import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ProgressDonut from './ProgressDonut';
import { Card, CardPerk, Benefit } from '../../../src/data/card-data';
import { useAuth } from '../../hooks/useAuth';
import { getCurrentMonthRedemptions, getAnnualRedemptions } from '../../../lib/database';

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

export default function PerkDonutDisplayManager({
  userCardsWithPerks,
}: PerkDonutDisplayManagerProps) {
  const { user } = useAuth();
  const [activeSegmentKey, setActiveSegmentKey] = useState<SegmentKey>('monthly');
  const [monthlyRedemptions, setMonthlyRedemptions] = useState<number>(0);
  const [annualRedemptions, setAnnualRedemptions] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  const monthlyPerkData = useMemo(() => {
    // Only include perks with period = 'monthly'
    const monthlyValues = userCardsWithPerks.reduce((acc, { perks }) => {
      const monthlyPerks = perks.filter(perk => perk.periodMonths === 1);
      const redeemedValue = monthlyPerks.reduce((sum, perk) => 
        sum + (perk.status === 'redeemed' ? perk.value : 0), 0);
      const totalValue = monthlyPerks.reduce((sum, perk) => sum + perk.value, 0);
      return {
        redeemedValue: acc.redeemedValue + redeemedValue,
        totalValue: acc.totalValue + totalValue
      };
    }, { redeemedValue: 0, totalValue: 0 });

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
      value: monthlyRedemptions, // Use the value from database
      total: monthlyValues.totalValue,
      progress: monthlyValues.totalValue > 0 ? monthlyRedemptions / monthlyValues.totalValue : 0,
      primaryMetric: {
        value: monthlyRedemptions.toLocaleString('en-US', { style: 'currency', currency: 'USD' }),
        label: 'Value Redeemed',
      },
      secondaryMetric: {
        value: `${perkCounts.redeemed} of ${totalPerks} perks`,
        label: 'Monthly Perks Used',
      },
      donutLabel: {
        value: `${monthlyRedemptions.toLocaleString('en-US', { style: 'currency', currency: 'USD' })} / ${monthlyValues.totalValue.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}`,
        label: 'Monthly Credits',
      },
      color: '#2196f3',
    };
  }, [userCardsWithPerks, monthlyRedemptions]);

  const annualFeesData = useMemo(() => {
    // Calculate total annual fees
    const cardData = userCardsWithPerks.reduce((acc, { card }) => ({
      totalFees: acc.totalFees + (card.annualFee || 0)
    }), { totalFees: 0 });

    const { totalFees } = cardData;
    const formattedFees = totalFees.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
    const formattedRedeemedValue = annualRedemptions.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
    
    return {
      value: annualRedemptions,
      total: totalFees,
      progress: totalFees > 0 ? annualRedemptions / totalFees : 0,
      primaryMetric: {
        value: formattedRedeemedValue,
        label: 'Value Redeemed',
      },
      secondaryMetric: {
        value: `${((totalFees > 0 ? annualRedemptions / totalFees : 0) * 100).toFixed(0)}% of annual fees`,
        label: 'Break-even Progress',
      },
      donutLabel: {
        value: `${formattedRedeemedValue} / ${formattedFees}`,
        label: 'Annual Break-even',
      },
      color: '#5856d6',
    };
  }, [userCardsWithPerks, annualRedemptions]);

  useEffect(() => {
    if (!user) return;

    const loadRedemptions = async () => {
      setLoading(true);
      try {
        // Get current month's redemptions
        const { data: monthlyData, error: monthlyError } = await getCurrentMonthRedemptions(user.id);
        if (monthlyError) {
          console.error('Error fetching monthly redemptions:', monthlyError);
        } else {
          // Only sum monthly perks (period_months = 1)
          const monthlySum = monthlyData?.reduce((sum, redemption) => {
            // Check if the perk is monthly before adding to sum
            const card = userCardsWithPerks.find(c => 
              c.perks.some(p => p.id === redemption.perk_id));
            const perk = card?.perks.find(p => p.id === redemption.perk_id);
            if (perk?.periodMonths === 1) {
              return sum + redemption.value_redeemed;
            }
            return sum;
          }, 0) ?? 0;
          setMonthlyRedemptions(monthlySum);
        }

        // Get annual redemptions
        const { data: annualData, error: annualError } = await getAnnualRedemptions(user.id);
        if (annualError) {
          console.error('Error fetching annual redemptions:', annualError);
        } else {
          const annualSum = annualData?.reduce((sum, redemption) => 
            sum + redemption.value_redeemed, 0) ?? 0;
          setAnnualRedemptions(annualSum);
        }
      } catch (error) {
        console.error('Error loading redemptions:', error);
      } finally {
        setLoading(false);
      }
    };

    loadRedemptions();
  }, [user, userCardsWithPerks]);

  if (!user || loading) {
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

      <View style={styles.metricsContainer}>
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
}

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