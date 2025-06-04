import React, { useState, useMemo, useEffect, useCallback, useImperativeHandle, forwardRef } from 'react';
import { View, StyleSheet, Platform, Text } from 'react-native';
import { PerksToggle } from './PerksToggle';
import ProgressDonut from './ProgressDonut';
import { Card, CardPerk } from '../../../src/data/card-data';
import { useAuth } from '../../hooks/useAuth';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Colors } from '../../constants/Colors';

type SegmentKey = 'monthly' | 'annual';

interface PerkDonutDisplayManagerProps {
  userCardsWithPerks: { card: Card; perks: CardPerk[] }[];
  monthlyCreditsRedeemed: number;
  monthlyCreditsPossible: number;
  yearlyCreditsRedeemed: number;
  yearlyCreditsPossible: number;
  redeemedInCurrentCycle: Record<string, boolean>;
}

const PerkDonutDisplayManager = forwardRef<{ refresh: () => void }, PerkDonutDisplayManagerProps>((
  {
    userCardsWithPerks,
    monthlyCreditsRedeemed,
    monthlyCreditsPossible,
    yearlyCreditsRedeemed,
    yearlyCreditsPossible,
    redeemedInCurrentCycle,
  },
  ref
) => {
  const { user } = useAuth();
  const [activeSegmentKey, setActiveSegmentKey] = useState<SegmentKey>('monthly');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(Date.now());
  const navigation = useNavigation();

  const [calculatedTotalMonthlyPerks, setCalculatedTotalMonthlyPerks] = useState(0);
  const [calculatedRedeemedMonthlyPerks, setCalculatedRedeemedMonthlyPerks] = useState(0);
  const [calculatedTotalNonMonthlyPerks, setCalculatedTotalNonMonthlyPerks] = useState(0);
  const [calculatedRedeemedNonMonthlyPerks, setCalculatedRedeemedNonMonthlyPerks] = useState(0);
  const [calculatedTotalAnnualFees, setCalculatedTotalAnnualFees] = useState(0);

  const refreshData = useCallback(() => {
    setLastRefresh(Date.now());
  }, []);

  useImperativeHandle(ref, () => ({
    refresh: refreshData
  }));

  useFocusEffect(
    useCallback(() => {
      refreshData();
    }, [refreshData])
  );

  useEffect(() => {
    if (!user) return;
    setIsRefreshing(true);
    
    let fees = 0;
    let currentTotalMonthly = 0;
    let currentRedeemedMonthly = 0;
    let currentTotalNonMonthly = 0;
    let currentRedeemedNonMonthly = 0;

    userCardsWithPerks.forEach(cardData => {
      fees += (cardData.card.annualFee || 0);
      cardData.perks.forEach(perk => {
        if (perk.periodMonths === 1) {
          currentTotalMonthly++;
          if (redeemedInCurrentCycle[perk.id]) {
            currentRedeemedMonthly++;
          }
        } else if (perk.periodMonths > 1) {
          currentTotalNonMonthly++;
          if (redeemedInCurrentCycle[perk.id]) {
            currentRedeemedNonMonthly++;
          }
        }
      });
    });

    setCalculatedTotalAnnualFees(fees);
    setCalculatedTotalMonthlyPerks(currentTotalMonthly);
    setCalculatedRedeemedMonthlyPerks(currentRedeemedMonthly);
    setCalculatedTotalNonMonthlyPerks(currentTotalNonMonthly);
    setCalculatedRedeemedNonMonthlyPerks(currentRedeemedNonMonthly);
    
    setIsRefreshing(false);
  }, [user, lastRefresh, userCardsWithPerks, redeemedInCurrentCycle]);

  const activeData = useMemo(() => {
    if (activeSegmentKey === 'monthly') {
      const progress = monthlyCreditsPossible > 0 ? monthlyCreditsRedeemed / monthlyCreditsPossible : 0;
      return {
        value: monthlyCreditsRedeemed,
        total: monthlyCreditsPossible,
        progress: progress,
        amount: monthlyCreditsRedeemed.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }),
        label: 'MONTHLY VALUE',
        detailLineOne: `$${monthlyCreditsRedeemed.toFixed(0)} redeemed`,
        detailLineTwo: `$${monthlyCreditsPossible.toFixed(0)} available`,
        perksCount: `${calculatedRedeemedMonthlyPerks} of ${calculatedTotalMonthlyPerks}`,
        color: Colors.light.tint,
      };
    } else {
      const progress = yearlyCreditsPossible > 0 ? yearlyCreditsRedeemed / yearlyCreditsPossible : 0;
      return {
        value: yearlyCreditsRedeemed,
        total: yearlyCreditsPossible,
        progress: progress,
        amount: yearlyCreditsRedeemed.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }),
        label: 'ANNUAL VALUE',
        detailLineOne: `$${yearlyCreditsRedeemed.toFixed(0)} redeemed (non-monthly)`,
        detailLineTwo: `$${yearlyCreditsPossible.toFixed(0)} available (non-monthly)`,
        perksCount: `${calculatedRedeemedNonMonthlyPerks} of ${calculatedTotalNonMonthlyPerks}`,
        color: '#FFC107',
      };
    }
  }, [
    activeSegmentKey, 
    monthlyCreditsRedeemed, monthlyCreditsPossible, calculatedRedeemedMonthlyPerks, calculatedTotalMonthlyPerks,
    yearlyCreditsRedeemed, yearlyCreditsPossible, calculatedRedeemedNonMonthlyPerks, calculatedTotalNonMonthlyPerks,
    Colors.light.tint
  ]);

  if (!user) {
    return <View style={styles.metricsContainer} />;
  }
  
  const toggleSegments = [
    { key: 'monthly', title: 'Monthly Value' },
    { key: 'annual', title: 'Annual Value' }
  ];

  return (
    <View style={[styles.metricsContainer, { opacity: isRefreshing ? 0.6 : 1 }]}>
      <PerksToggle
        segments={toggleSegments}
        selectedMode={activeSegmentKey}
        onModeChange={(key: string) => setActiveSegmentKey(key as SegmentKey)}
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
      <Text style={styles.annualFeesText}>Total Annual Card Fees: ${calculatedTotalAnnualFees.toFixed(0)}</Text>
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