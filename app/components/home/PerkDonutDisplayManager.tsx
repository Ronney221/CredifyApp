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
    const totalValue = userCardsWithPerks.reduce((sum, { perks }) => 
      sum + perks.reduce((perkSum, perk) => perkSum + (perk.status === 'redeemed' ? perk.value : 0), 0), 
    0);
    
    return {
      value: monthlyCreditsRedeemed,
      total: monthlyCreditsPossible,
      progress: monthlyCreditsPossible > 0 ? monthlyCreditsRedeemed / monthlyCreditsPossible : 0,
      primaryMetric: {
        value: totalValue.toLocaleString('en-US', { style: 'currency', currency: 'USD' }),
        label: 'Total Value Redeemed',
      },
      secondaryMetric: {
        value: `${monthlyCreditsRedeemed} of ${monthlyCreditsPossible}`,
        label: 'Perks Used',
      },
      color: '#2196f3',
    };
  }, [monthlyCreditsRedeemed, monthlyCreditsPossible, userCardsWithPerks]);

  const annualFeesData = useMemo(() => {
    const totalFees = userCardsWithPerks.reduce((sum, { card }) => sum + (card.annualFee || 0), 0);
    const formattedFees = totalFees.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
    const breakEvenAmount = totalFees * 1.5; // Assuming 1.5x annual fees as break-even target
    
    return {
      value: totalFees,
      total: breakEvenAmount,
      progress: totalFees > 0 ? Math.min(1, totalFees / breakEvenAmount) : 0,
      primaryMetric: {
        value: formattedFees,
        label: 'Annual Fees',
      },
      secondaryMetric: {
        value: breakEvenAmount.toLocaleString('en-US', { style: 'currency', currency: 'USD' }),
        label: 'Break-even Target',
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
          label={activeData.primaryMetric.label}
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