import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { usePerkStatus } from '../../hooks/usePerkStatus';
import { useUserCards } from '../../hooks/useUserCards';

interface InsightCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  value?: string;
  color: string;
}

const InsightCard = ({ icon, title, description, value, color }: InsightCardProps) => (
  <View style={[styles.card, { borderLeftColor: color }]}>
    <View style={[styles.iconContainer, { backgroundColor: color + '15' }]}>
      <Ionicons name={icon} size={20} color={color} />
    </View>
    <View style={styles.cardContent}>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardDescription}>{description}</Text>
      {value && <Text style={[styles.cardValue, { color }]}>{value}</Text>}
    </View>
  </View>
);

interface QuickInsightsProps {
  userId: string;
}

export const QuickInsights = ({ userId }: QuickInsightsProps) => {
  const { userCardsWithPerks, isLoading: cardsLoading } = useUserCards();
  const { periodAggregates, cumulativeValueSavedPerCard, isLoading: perkLoading } = usePerkStatus(userCardsWithPerks || []);

  const isLoading = perkLoading || cardsLoading;

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Quick Insights</Text>
        <Text style={styles.loadingText}>Loading insights...</Text>
      </View>
    );
  }

  const insights: InsightCardProps[] = [];

  // Monthly performance insight
  const monthlyStats = periodAggregates?.[1];
  if (monthlyStats) {
    const utilizationRate = monthlyStats.totalCount > 0 
      ? Math.round((monthlyStats.redeemedCount / monthlyStats.totalCount) * 100)
      : 0;

    if (utilizationRate >= 80) {
      insights.push({
        icon: 'trending-up',
        title: 'Great Month!',
        description: 'You\'re maximizing your card perks this month',
        value: `${utilizationRate}% utilized`,
        color: '#4CAF50'
      });
    } else if (utilizationRate >= 50) {
      insights.push({
        icon: 'speedometer',
        title: 'Good Progress',
        description: 'You\'re on track with your perk redemptions',
        value: `${utilizationRate}% utilized`,
        color: '#FF9800'
      });
    } else {
      insights.push({
        icon: 'rocket',
        title: 'Opportunity Ahead',
        description: 'Several perks are still available this month',
        value: `${monthlyStats.totalCount - monthlyStats.redeemedCount} remaining`,
        color: '#2196F3'
      });
    }
  }

  // Annual fee recovery insight
  const totalValueRedeemed = Object.values(cumulativeValueSavedPerCard || {})
    .reduce((sum, value) => sum + value, 0);
  
  const totalAnnualFees = userCardsWithPerks?.reduce((sum, { card }) => {
    return sum + (card?.annual_fee || 0);
  }, 0) || 0;

  if (totalAnnualFees > 0) {
    const recoveryRate = (totalValueRedeemed / totalAnnualFees) * 100;
    
    if (recoveryRate >= 100) {
      insights.push({
        icon: 'shield-checkmark',
        title: 'Fees Covered!',
        description: 'You\'ve saved more than your annual fees',
        value: `${Math.round(recoveryRate)}% recovered`,
        color: '#4CAF50'
      });
    } else if (recoveryRate >= 50) {
      insights.push({
        icon: 'wallet',
        title: 'Getting Close',
        description: 'You\'re making good progress on fee recovery',
        value: `${Math.round(recoveryRate)}% recovered`,
        color: '#FF9800'
      });
    } else {
      insights.push({
        icon: 'card',
        title: 'Early Days',
        description: 'Keep redeeming to maximize your card value',
        value: `$${Math.round(totalAnnualFees - totalValueRedeemed)} to go`,
        color: '#9C27B0'
      });
    }
  }

  // Top performing card insight
  if (cumulativeValueSavedPerCard && Object.keys(cumulativeValueSavedPerCard).length > 0) {
    const topCardEntry = Object.entries(cumulativeValueSavedPerCard)
      .sort(([,a], [,b]) => b - a)[0];
    
    if (topCardEntry && topCardEntry[1] > 0) {
      const topCard = userCardsWithPerks?.find(({ card }) => card.id === topCardEntry[0]);
      if (topCard) {
        insights.push({
          icon: 'star',
          title: 'Top Performer',
          description: `${topCard.card.name} is your best value card`,
          value: `$${Math.round(topCardEntry[1])} saved`,
          color: '#FF6B35'
        });
      }
    }
  }

  // If no insights, show encouragement
  if (insights.length === 0) {
    insights.push({
      icon: 'rocket',
      title: 'Ready to Start?',
      description: 'Begin redeeming your card perks to unlock insights',
      color: '#2196F3'
    });
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Quick Insights</Text>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        style={styles.scrollView}
      >
        {insights.map((insight, index) => (
          <View key={index} style={styles.cardContainer}>
            <InsightCard {...insight} />
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.light.text,
    letterSpacing: -0.3,
    marginBottom: 12,
  },
  loadingText: {
    fontSize: 14,
    color: Colors.light.secondaryLabel,
    fontStyle: 'italic',
  },
  scrollView: {
    marginHorizontal: -16,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  cardContainer: {
    width: 260,
  },
  card: {
    backgroundColor: Colors.light.background,
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 13,
    color: Colors.light.secondaryLabel,
    lineHeight: 18,
    marginBottom: 8,
  },
  cardValue: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
});