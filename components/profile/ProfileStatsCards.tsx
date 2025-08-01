import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../constants/Colors';
import { usePerkStatus } from '../../hooks/usePerkStatus';
import { useUserCards } from '../../hooks/useUserCards';
import { calculateCurrentStreak } from '../../utils/streak-calculator';
import { useResponsiveStyles, getResponsiveFontSize, getResponsiveSpacing } from '../../hooks/useResponsiveStyles';

interface StatsCardProps {
  title: string;
  value: string;
  subtitle?: string;
  isLoading?: boolean;
}

const StatsCard = ({ title, value, subtitle, isLoading }: StatsCardProps) => {
  const { isLargeText } = useResponsiveStyles();
  
  return (
    <View style={[styles.card, isLargeText && styles.cardLarge]}>
      <Text style={[styles.cardTitle, isLargeText && styles.cardTitleLarge]}>{title}</Text>
      <Text style={[styles.cardValue, isLoading && styles.loadingText, isLargeText && styles.cardValueLarge]}>
        {isLoading ? '...' : value}
      </Text>
      {subtitle && !isLoading && (
        <Text style={[styles.cardSubtitle, isLargeText && styles.cardSubtitleLarge]}>{subtitle}</Text>
      )}
    </View>
  );
};

interface ProfileStatsCardsProps {
  userId: string;
}

export const ProfileStatsCards = ({ userId }: ProfileStatsCardsProps) => {
  const { userCardsWithPerks, isLoading: cardsLoading } = useUserCards();
  const { periodAggregates, cumulativeValueSavedPerCard, isLoading: perkLoading } = usePerkStatus(userCardsWithPerks || []);
  const [currentStreak, setCurrentStreak] = useState(0);
  const { isLargeText } = useResponsiveStyles();

  const isLoading = perkLoading || cardsLoading;

  // Calculate streak from AsyncStorage
  useEffect(() => {
    const loadStreak = async () => {
      const streak = await calculateCurrentStreak();
      setCurrentStreak(streak);
    };
    loadStreak();
  }, []);

  // Initialize streak history if needed
  useEffect(() => {
    if (!perkLoading && periodAggregates?.[1]?.redeemedCount > 0) {
      // If user has redemptions this month, ensure their streak is tracked
      const updateStreak = async () => {
        const { updateMonthlyStreak } = await import('../../utils/streak-calculator');
        await updateMonthlyStreak(true, periodAggregates[1].redeemedValue);
        const newStreak = await calculateCurrentStreak();
        setCurrentStreak(newStreak);
      };
      updateStreak();
    }
  }, [periodAggregates, perkLoading]);

  // Calculate stats - add safety checks
  const activeCardsCount = userCardsWithPerks?.filter(({ card }) => card?.status === 'active').length || 0;
  
  const yearlyStats = periodAggregates?.[12];
  const yearlyValue = yearlyStats?.redeemedValue || 0;
  
  const totalPortfolioValue = Object.values(cumulativeValueSavedPerCard || {})
    .reduce((sum, value) => sum + value, 0);

  // Calculate annual fees for ROI - add safety checks
  const totalAnnualFees = userCardsWithPerks?.reduce((sum, { card }) => {
    return sum + (card?.annual_fee || 0);
  }, 0) || 0;

  const personalROI = totalAnnualFees > 0 ? (totalPortfolioValue / totalAnnualFees) * 100 : 0;

  // Use the enhanced streak calculation
  const redemptionStreak = currentStreak;

  return (
    <View style={[styles.container, isLargeText && styles.containerLarge]}>
      <View style={[styles.row, isLargeText && styles.rowLarge]}>
        <StatsCard
          title="Value Redeemed"
          value={`$${Math.round(yearlyValue).toLocaleString()}`}
          subtitle="This year"
          isLoading={isLoading}
        />
        <StatsCard
          title="Active Cards"
          value={activeCardsCount.toString()}
          subtitle={`${activeCardsCount === 1 ? 'card' : 'cards'} tracked`}
          isLoading={isLoading}
        />
      </View>
      <View style={[styles.row, isLargeText && styles.rowLarge]}>
        <StatsCard
          title="Streak"
          value={redemptionStreak.toString()}
          subtitle={`month${redemptionStreak !== 1 ? 's' : ''}`}
          isLoading={isLoading}
        />
        <StatsCard
          title="Personal ROI"
          value={`${Math.round(personalROI)}%`}
          subtitle="Savings vs fees"
          isLoading={isLoading}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  containerLarge: {
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 8,
    gap: 8,
  },
  rowLarge: {
    marginBottom: 12,
    gap: 10,
  },
  card: {
    flex: 1,
    backgroundColor: Colors.light.background,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  cardLarge: {
    padding: 18,
    minHeight: 80,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.light.secondaryLabel,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  cardTitleLarge: {
    fontSize: 12,
    marginBottom: 10,
    lineHeight: 16,
  },
  cardValue: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.light.text,
    letterSpacing: -0.3,
    marginBottom: 2,
  },
  cardValueLarge: {
    fontSize: 18,
    lineHeight: 22,
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 12,
    color: Colors.light.tertiaryLabel,
    fontWeight: '500',
  },
  cardSubtitleLarge: {
    fontSize: 11,
    lineHeight: 14,
  },
  loadingText: {
    color: Colors.light.tertiaryLabel,
  },
});