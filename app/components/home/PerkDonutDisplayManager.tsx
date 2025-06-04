import React, { useState, useMemo, useEffect, useCallback, useImperativeHandle, forwardRef } from 'react';
import { View, StyleSheet, Platform, Text } from 'react-native';
import { PerksToggle, Segment } from './PerksToggle';
import ProgressDonut from './ProgressDonut';
import { Card, CardPerk } from '../../../src/data/card-data';
import { useAuth } from '../../hooks/useAuth';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Colors } from '../../constants/Colors';

type SegmentKey = number;

// Updated interface from usePerkStatus
interface PeriodAggregate {
  redeemedValue: number;
  possibleValue: number;
  redeemedCount: number;
  totalCount: number;
}

interface PerkDonutDisplayManagerProps {
  userCardsWithPerks: { card: Card; perks: CardPerk[] }[];
  periodAggregates: Record<number, PeriodAggregate>;
  redeemedInCurrentCycle: Record<string, boolean>;
  uniquePerkPeriods: number[];
}

// Updated helper to get user-friendly display name for a period
const getPeriodDisplayName = (periodMonths: number): string => {
  switch (periodMonths) {
    case 1:
      return 'Monthly Perks';
    case 3:
      return 'Quarterly Perks';
    case 6:
      return '6-Month Perks';
    case 12:
      return 'Annual Perks';
    default:
      return `${periodMonths}-Month Perks`;
  }
};

const PerkDonutDisplayManager = forwardRef<{ refresh: () => void }, PerkDonutDisplayManagerProps>((
  {
    userCardsWithPerks,
    periodAggregates,
    redeemedInCurrentCycle,
    uniquePerkPeriods,
  },
  ref
) => {
  const { user } = useAuth();
  const [activeSegmentKey, setActiveSegmentKey] = useState<SegmentKey>(uniquePerkPeriods?.[0] || 1);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(Date.now());
  const navigation = useNavigation();

  const [totalAnnualFees, setTotalAnnualFees] = useState(0);

  const refreshData = useCallback(() => {
    setLastRefresh(Date.now());
  }, []);

  useImperativeHandle(ref, () => ({
    refresh: refreshData
  }));

  useEffect(() => {
    if (uniquePerkPeriods && uniquePerkPeriods.length > 0) {
      if (!uniquePerkPeriods.includes(activeSegmentKey)) {
        setActiveSegmentKey(uniquePerkPeriods[0]);
      }
    } else {
      // Default to 1 (monthly) if no unique periods are available or it's empty
      // This ensures activeSegmentKey is always valid.
      const defaultPeriod = 1;
      setActiveSegmentKey(defaultPeriod);
      // If uniquePerkPeriods is empty, the toggleSegments will also need a default.
    }
  }, [uniquePerkPeriods, activeSegmentKey]);

  useEffect(() => {
    if (!user) return;
    let fees = 0;
    userCardsWithPerks.forEach(cardData => {
      fees += (cardData.card.annualFee || 0);
    });
    setTotalAnnualFees(fees);
  }, [user, userCardsWithPerks]);

  const toggleSegments = useMemo((): Segment[] => {
    if (!uniquePerkPeriods || uniquePerkPeriods.length === 0) {
      // Provide a default segment if uniquePerkPeriods is empty
      return [{ key: '1', title: getPeriodDisplayName(1) }];
    }
    return uniquePerkPeriods.map(period => ({
      key: period.toString(),
      title: getPeriodDisplayName(period), // Use the new function directly for the title
    }));
  }, [uniquePerkPeriods]);

  const activeData = useMemo(() => {
    const currentAggregates = periodAggregates[activeSegmentKey] || { 
      redeemedValue: 0, 
      possibleValue: 0, 
      redeemedCount: 0, 
      totalCount: 0 
    };

    const progress = currentAggregates.possibleValue > 0 
      ? currentAggregates.redeemedValue / currentAggregates.possibleValue 
      : 0;
    
    const displayName = getPeriodDisplayName(activeSegmentKey);

    return {
      value: currentAggregates.redeemedValue,
      total: currentAggregates.possibleValue,
      progress: progress,
      amount: currentAggregates.redeemedValue.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }),
      label: displayName.toUpperCase(), // Use the new display name for the donut label
      detailLineOne: `$${currentAggregates.redeemedValue.toFixed(0)} redeemed`,
      detailLineTwo: `$${currentAggregates.possibleValue.toFixed(0)} available`,
      perksCount: `${currentAggregates.redeemedCount} of ${currentAggregates.totalCount}`,
      color: activeSegmentKey === 1 ? Colors.light.tint : (activeSegmentKey === 12 ? '#FFC107' : (activeSegmentKey === 6 ? '#4CAF50' : '#2196F3')), // Example colors
      displayName: displayName // Storing for potential other uses
    };
  }, [activeSegmentKey, periodAggregates, Colors.light.tint]);

  if (!user) {
    return <View style={styles.metricsContainer} />;
  }
  
  return (
    <View style={[styles.metricsContainer, { opacity: isRefreshing ? 0.6 : 1 }]}>
      <PerksToggle
        segments={toggleSegments}
        selectedMode={activeSegmentKey.toString()}
        onModeChange={(key: string) => setActiveSegmentKey(Number(key))}
      />

      <ProgressDonut
        size={120}
        strokeWidth={10}
        progress={activeData.progress}
        amount={activeData.amount}
        label={activeData.label}
        detailLineOne={activeData.detailLineOne}
        detailLineTwo={activeData.detailLineTwo}
        perksCount={activeData.perksCount}
        color={activeData.color}
        backgroundColor={Platform.OS === 'android' ? '#f0f0f0' : '#ECECEC'}
      />
      <Text style={styles.annualFeesText}>Total Annual Card Fees: ${totalAnnualFees.toFixed(0)}</Text>
    </View>
  );
});

PerkDonutDisplayManager.displayName = 'PerkDonutDisplayManager';

const styles = StyleSheet.create({
  metricsContainer: {
    alignItems: 'center',
    width: '100%',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  annualFeesText: {
    marginTop: 10,
    fontSize: 13,
    color: '#4A4A4A',
    fontWeight: '500',
  },
});

export default PerkDonutDisplayManager; 