import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { AchievementBadge } from './AchievementBadge';
import { 
  calculateAchievements, 
  AchievementProgress, 
  AchievementData,
  getNextMilestone
} from '../../utils/achievements';
import { usePerkStatus } from '../../hooks/usePerkStatus';
import { useUserCards } from '../../hooks/useUserCards';

interface AchievementsSectionProps {
  userId: string;
  onViewAll?: () => void;
}

export const AchievementsSection = ({ userId, onViewAll }: AchievementsSectionProps) => {
  const [achievementProgress, setAchievementProgress] = useState<AchievementProgress | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const { userCardsWithPerks, isLoading: cardsLoading } = useUserCards();
  const { periodAggregates, cumulativeValueSavedPerCard, isLoading: perkLoading } = usePerkStatus(userCardsWithPerks || []);

  useEffect(() => {
    const updateAchievements = async () => {
      if (perkLoading || cardsLoading || !periodAggregates || !userCardsWithPerks) {
        return;
      }

      try {
        // Calculate achievement data from hooks
        const totalValueRedeemed = Object.values(cumulativeValueSavedPerCard || {})
          .reduce((sum, value) => sum + value, 0);

        // Simple streak calculation - in real implementation, track historical data
        const monthlyStats = periodAggregates[1];
        const consecutiveMonthsStreak = monthlyStats?.redeemedCount > 0 ? 1 : 0;

        // Calculate utilization rate
        const utilizationRate = monthlyStats ? 
          (monthlyStats.redeemedCount / Math.max(monthlyStats.totalCount, 1)) * 100 : 0;

        // Calculate fee recovery rate - add safety checks  
        const totalAnnualFees = userCardsWithPerks.reduce((sum, { card }) => {
          return sum + (card?.annual_fee || 0);
        }, 0);

        const feeRecoveryRate = totalAnnualFees > 0 ? 
          (totalValueRedeemed / totalAnnualFees) * 100 : 0;

        const achievementData: AchievementData = {
          totalValueRedeemed,
          consecutiveMonthsStreak,
          utilizationRate,
          feeRecoveryRate,
          totalAnnualFees,
        };

        const progress = await calculateAchievements(achievementData);
        setAchievementProgress(progress);
      } catch (error) {
        console.error('Error updating achievements:', error);
      } finally {
        setIsLoading(false);
      }
    };

    updateAchievements();
  }, [periodAggregates, cumulativeValueSavedPerCard, userCardsWithPerks, perkLoading, cardsLoading]);

  if (isLoading || !achievementProgress) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Achievements</Text>
          <Text style={styles.subtitle}>Loading...</Text>
        </View>
      </View>
    );
  }

  const { achievements, totalUnlocked, recentlyUnlocked } = achievementProgress;
  const nextMilestone = getNextMilestone(achievements);
  const recentAchievements = recentlyUnlocked.slice(0, 2);
  const topAchievements = achievements
    .filter(a => a.isUnlocked)
    .sort((a, b) => (b.unlockedAt || '').localeCompare(a.unlockedAt || ''))
    .slice(0, 3);

  const displayAchievements = recentAchievements.length > 0 
    ? recentAchievements 
    : topAchievements.slice(0, 2);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Achievements</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{totalUnlocked}</Text>
          </View>
        </View>
        
        {onViewAll && (
          <Pressable 
            onPress={onViewAll}
            style={styles.viewAllButton}
            hitSlop={8}
          >
            <Text style={styles.viewAllText}>View All</Text>
            <Ionicons 
              name="chevron-forward" 
              size={16} 
              color={Colors.light.tint} 
            />
          </Pressable>
        )}
      </View>

      {recentAchievements.length > 0 && (
        <Text style={styles.subtitle}>Recently unlocked!</Text>
      )}

      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        style={styles.scrollView}
      >
        {displayAchievements.map((achievement) => (
          <View key={achievement.id} style={styles.achievementContainer}>
            <AchievementBadge 
              achievement={achievement} 
              size="medium"
              showProgress={false} 
            />
          </View>
        ))}
        
        {nextMilestone && displayAchievements.length < 3 && (
          <View style={styles.achievementContainer}>
            <AchievementBadge 
              achievement={nextMilestone} 
              size="medium"
              showProgress={true} 
            />
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.light.text,
    letterSpacing: -0.3,
  },
  badge: {
    backgroundColor: Colors.light.accent,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 24,
    alignItems: 'center',
  },
  badgeText: {
    color: Colors.light.textOnAccent,
    fontSize: 12,
    fontWeight: '700',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewAllText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.tint,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.light.secondaryLabel,
    fontWeight: '500',
    marginBottom: 12,
  },
  scrollView: {
    marginHorizontal: -16,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  achievementContainer: {
    width: 240,
  },
});