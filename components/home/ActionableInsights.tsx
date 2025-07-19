import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CardPerk, calculatePerkExpiryDate } from '../../src/data/card-data';

interface ActionableInsightsProps {
  userCardsWithPerks: Array<{
    card: any;
    perks: CardPerk[];
  }>;
  onActionPress?: (action: 'urgent' | 'monthly' | 'high-value') => void;
}

interface InsightData {
  urgentPerks: Array<{ perk: CardPerk; cardName: string; daysLeft: number }>;
  monthlyPerks: Array<{ perk: CardPerk; cardName: string }>;
  highValuePerks: Array<{ perk: CardPerk; cardName: string; value: number }>;
  potentialSavings: number;
}

const ActionableInsights: React.FC<ActionableInsightsProps> = ({ 
  userCardsWithPerks, 
  onActionPress 
}) => {
  
  const calculateInsights = (): InsightData => {
    const urgentPerks: Array<{ perk: CardPerk; cardName: string; daysLeft: number }> = [];
    const monthlyPerks: Array<{ perk: CardPerk; cardName: string }> = [];
    const highValuePerks: Array<{ perk: CardPerk; cardName: string; value: number }> = [];
    let potentialSavings = 0;

    userCardsWithPerks.forEach(cardData => {
      cardData.perks.forEach(perk => {
        if (perk.status === 'available' || perk.status === 'partially_redeemed') {
          const value = perk.status === 'partially_redeemed' 
            ? (perk.remaining_value || 0) 
            : perk.value;
          
          potentialSavings += value;
          
          if (perk.periodMonths) {
            const expiryDate = calculatePerkExpiryDate(perk.periodMonths);
            const daysLeft = Math.ceil((expiryDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
            
            // Urgent: expires in 7 days or less
            if (daysLeft <= 7 && daysLeft > 0) {
              urgentPerks.push({ perk, cardName: cardData.card.name, daysLeft });
            }
            
            // Monthly perks that haven't been redeemed
            if (perk.periodMonths === 1) {
              monthlyPerks.push({ perk, cardName: cardData.card.name });
            }
            
            // High value perks ($100+)
            if (value >= 100) {
              highValuePerks.push({ perk, cardName: cardData.card.name, value });
            }
          }
        }
      });
    });

    // Sort by priority
    urgentPerks.sort((a, b) => a.daysLeft - b.daysLeft);
    highValuePerks.sort((a, b) => b.value - a.value);

    return { urgentPerks, monthlyPerks, highValuePerks, potentialSavings };
  };

  const insights = calculateInsights();

  // Only show if there are actionable insights
  if (insights.urgentPerks.length === 0 && 
      insights.monthlyPerks.length === 0 && 
      insights.highValuePerks.length === 0) {
    return null;
  }

  const ActionCard = ({ 
    icon, 
    title, 
    subtitle, 
    count, 
    color, 
    onPress 
  }: { 
    icon: string; 
    title: string; 
    subtitle: string; 
    count: number; 
    color: string; 
    onPress?: () => void; 
  }) => {
    if (count === 0) return null;
    
    return (
      <TouchableOpacity 
        style={[styles.actionCard, { borderLeftColor: color }]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <View style={styles.actionHeader}>
          <View style={[styles.iconContainer, { backgroundColor: color + '15' }]}>
            <Ionicons name={icon as any} size={16} color={color} />
          </View>
          <View style={styles.actionTextContainer}>
            <Text style={styles.actionTitle}>{title}</Text>
            <Text style={styles.actionSubtitle}>{subtitle}</Text>
          </View>
          <Text style={[styles.actionCount, { color }]}>{count}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="bulb" size={16} color="#FF9500" />
        <Text style={styles.title}>Quick Actions</Text>
        {insights.potentialSavings > 0 && (
          <Text style={styles.savingsText}>
            ${insights.potentialSavings.toLocaleString()} available
          </Text>
        )}
      </View>
      
      <View style={styles.actionsContainer}>
        <ActionCard
          icon="flame"
          title="Expiring Soon"
          subtitle="Use before they expire"
          count={insights.urgentPerks.length}
          color="#FF3B30"
          onPress={() => onActionPress?.('urgent')}
        />
        
        <ActionCard
          icon="calendar"
          title="Monthly Perks"
          subtitle="Reset monthly"
          count={insights.monthlyPerks.length}
          color="#007AFF"
          onPress={() => onActionPress?.('monthly')}
        />
        
        <ActionCard
          icon="diamond"
          title="High Value"
          subtitle="$100+ perks"
          count={insights.highValuePerks.length}
          color="#AF52DE"
          onPress={() => onActionPress?.('high-value')}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginVertical: 8,
    marginHorizontal: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginLeft: 6,
    flex: 1,
  },
  savingsText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#34C759',
    backgroundColor: '#E5F5E5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  actionsContainer: {
    gap: 8,
  },
  actionCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 12,
    borderLeftWidth: 4,
  },
  actionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  actionTextContainer: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 2,
  },
  actionSubtitle: {
    fontSize: 13,
    color: '#8E8E93',
  },
  actionCount: {
    fontSize: 18,
    fontWeight: '700',
    minWidth: 24,
    textAlign: 'center',
  },
});

export default React.memo(ActionableInsights);