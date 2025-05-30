import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import ProgressDonut from './ProgressDonut'; // Assumes ProgressDonut is in the same directory
import { Card, CardPerk } from '../../types'; // Adjust path as needed

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
    return {
      value: monthlyCreditsRedeemed,
      total: monthlyCreditsPossible,
      progress: monthlyCreditsPossible > 0 ? monthlyCreditsRedeemed / monthlyCreditsPossible : 0,
      label: 'Monthly Perks Used',
      color: '#007aff', // Blue for monthly
      description: `${monthlyCreditsRedeemed} of ${monthlyCreditsPossible} perks redeemed`,
    };
  }, [monthlyCreditsRedeemed, monthlyCreditsPossible]);

  const annualFeesData = useMemo(() => {
    const totalFees = userCardsWithPerks.reduce((sum, { card }) => sum + (card.annualFee || 0), 0);
    const formattedFees = totalFees.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
    });
    return {
      value: totalFees, // Show the total fee amount
      total: totalFees, // Max value for the donut is the total fee
      progress: totalFees > 0 ? 1 : 0, // Donut is full if there are fees, empty otherwise
      label: 'Annual Fees',
      color: '#5856d6', // Purple for annual fees
      description: `Total annual fees: ${formattedFees}`,
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
              <Text style={styles.segmentIcon}>{segment.icon}</Text>
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

      <View style={styles.donutContainer}>
        <ProgressDonut
          size={160}
          strokeWidth={15}
          progress={activeData.progress}
          value={activeData.value}
          total={activeData.total}
          label={activeData.label}
          color={activeData.color}
        />
        <Text style={styles.description}>{activeData.description}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  managerContainer: {
    alignItems: 'center',
    width: '100%',
  },
  segmentedControlWrapper: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 20,
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
    paddingHorizontal: 12,
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
  segmentIcon: {
    fontSize: 16,
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
  donutContainer: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  description: {
    marginTop: 12,
    fontSize: 15,
    color: '#666',
    fontWeight: '500',
  },
}); 