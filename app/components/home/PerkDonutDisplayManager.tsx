import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ProgressDonut from './ProgressDonut';
import { Card, CardPerk } from '../../types';

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
  monthlyCreditsRedeemed,
  monthlyCreditsPossible,
}: PerkDonutDisplayManagerProps) {
  const [activeSegmentKey, setActiveSegmentKey] = useState<SegmentKey>('monthly');

  const monthlyPerkData = useMemo(() => {
    // Calculate monetary values for monthly perks
    const monthlyValues = userCardsWithPerks.reduce((acc, { perks }) => {
      const redeemedValue = perks.reduce((sum, perk) => 
        sum + (perk.status === 'redeemed' ? perk.value : 0), 0);
      const totalValue = perks.reduce((sum, perk) => sum + perk.value, 0);
      return {
        redeemedValue: acc.redeemedValue + redeemedValue,
        totalValue: acc.totalValue + totalValue
      };
    }, { redeemedValue: 0, totalValue: 0 });

    // Count perks for secondary metric
    const perkCounts = userCardsWithPerks.reduce((counts, { perks }) => {
      const availablePerks = perks.filter(perk => perk.status === 'available').length;
      const redeemedPerks = perks.filter(perk => perk.status === 'redeemed').length;
      return {
        available: counts.available + availablePerks,
        redeemed: counts.redeemed + redeemedPerks
      };
    }, { available: 0, redeemed: 0 });

    const totalPerks = perkCounts.available + perkCounts.redeemed;
    
    return {
      value: monthlyValues.redeemedValue,
      total: monthlyValues.totalValue,
      progress: monthlyValues.totalValue > 0 ? monthlyValues.redeemedValue / monthlyValues.totalValue : 0,
      primaryMetric: {
        value: monthlyValues.redeemedValue.toLocaleString('en-US', { style: 'currency', currency: 'USD' }),
        label: 'Value Redeemed',
      },
      secondaryMetric: {
        value: `${perkCounts.redeemed} of ${totalPerks} perks`,
        label: 'Perks Used',
      },
      donutLabel: {
        value: `${monthlyValues.redeemedValue.toLocaleString('en-US', { style: 'currency', currency: 'USD' })} / ${monthlyValues.totalValue.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}`,
        label: 'Monthly Credits',
      },
      color: '#2196f3',
    };
  }, [userCardsWithPerks]);

  const annualFeesData = useMemo(() => {
    // Calculate total annual fees and total redeemed value
    const cardData = userCardsWithPerks.reduce((acc, { card, perks }) => {
      const cardRedeemedValue = perks.reduce((sum, perk) => 
        sum + (perk.status === 'redeemed' ? perk.value : 0), 0);
      return {
        totalFees: acc.totalFees + (card.annualFee || 0),
        totalRedeemedValue: acc.totalRedeemedValue + cardRedeemedValue
      };
    }, { totalFees: 0, totalRedeemedValue: 0 });

    const { totalFees, totalRedeemedValue } = cardData;
    const formattedFees = totalFees.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
    const formattedRedeemedValue = totalRedeemedValue.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
    
    return {
      value: totalRedeemedValue,
      total: totalFees,
      progress: totalFees > 0 ? totalRedeemedValue / totalFees : 0,
      primaryMetric: {
        value: formattedRedeemedValue,
        label: 'Value Redeemed',
      },
      secondaryMetric: {
        value: `${((totalFees > 0 ? totalRedeemedValue / totalFees : 0) * 100).toFixed(0)}% of annual fees`,
        label: 'Break-even Progress',
      },
      donutLabel: {
        value: `${formattedRedeemedValue} / ${formattedFees}`,
        label: 'Annual Break-even',
      },
      color: '#5856d6',
    };
  }, [userCardsWithPerks]);

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
}); 