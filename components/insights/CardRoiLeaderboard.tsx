import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { Colors } from '../../constants/Colors';
import { CardROI } from '../../src/data/dummy-insights';
import Animated, { 
  useAnimatedStyle, 
  withSpring,
  useSharedValue,
  interpolate
} from 'react-native-reanimated';

interface CardRoiLeaderboardProps {
  cardRois: CardROI[];
}

// Performance tier system for cards
interface CardTier {
  name: string;
  icon: string;
  borderColor: string;
  backgroundColor: string;
  cardSize: { width: number; height: number };
  shadowElevation: number;
}

const getCardTier = (roi: number): CardTier => {
  if (roi >= 150) {
    return {
      name: 'Champion',
      icon: '👑',
      borderColor: '#FFD60A',
      backgroundColor: '#FFFDF5',
      cardSize: { width: 280, height: 180 },
      shadowElevation: 8
    };
  } else if (roi >= 100) {
    return {
      name: 'Elite',
      icon: '🏆',
      borderColor: '#8E8E93',
      backgroundColor: '#F8F9FA',
      cardSize: { width: 260, height: 160 },
      shadowElevation: 6
    };
  } else if (roi >= 75) {
    return {
      name: 'Strong',
      icon: '🥉',
      borderColor: '#D2691E',
      backgroundColor: '#FFF9F5',
      cardSize: { width: 240, height: 140 },
      shadowElevation: 4
    };
  } else {
    return {
      name: 'Growth',
      icon: '🎯',
      borderColor: '#007AFF',
      backgroundColor: '#F0F8FF',
      cardSize: { width: 220, height: 120 },
      shadowElevation: 2
    };
  }
};

// Individual Card Component
interface CardItemProps {
  roi: CardROI;
  index: number;
  isExpanded: boolean;
  onPress: () => void;
}

const CardItem: React.FC<CardItemProps> = ({ roi, index, isExpanded, onPress }) => {
  const tier = getCardTier(roi.roiPercentage);
  const animatedValue = useSharedValue(0);
  
  React.useEffect(() => {
    animatedValue.value = withSpring(isExpanded ? 1 : 0);
  }, [isExpanded]);

  const cardStyle = useAnimatedStyle(() => {
    const scale = interpolate(animatedValue.value, [0, 1], [1, 1.05]);
    const translateY = interpolate(animatedValue.value, [0, 1], [0, -5]);
    
    return {
      transform: [
        { scale },
        { translateY }
      ],
    };
  });

  const expandedContentStyle = useAnimatedStyle(() => {
    const opacity = interpolate(animatedValue.value, [0, 1], [0, 1]);
    const height = interpolate(animatedValue.value, [0, 1], [0, 80]);
    
    return {
      opacity,
      height,
    };
  });

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      <Animated.View style={[
        styles.cardItem,
        cardStyle,
        {
          backgroundColor: tier.backgroundColor,
          borderColor: tier.borderColor,
          shadowOpacity: tier.shadowElevation / 20,
          elevation: tier.shadowElevation,
        }
      ]}>
        {/* Card Header */}
        <View style={styles.cardHeader}>
          <View style={styles.cardRank}>
            <Text style={styles.rankIcon}>{tier.icon}</Text>
            <Text style={styles.rankText}>#{index + 1}</Text>
          </View>
          <View style={styles.cardTierBadge}>
            <Text style={[styles.tierText, { color: tier.borderColor }]}>{tier.name}</Text>
          </View>
        </View>

        {/* Card Content */}
        <View style={styles.cardContent}>
          <Text style={styles.cardName} numberOfLines={1}>{roi.name}</Text>
          <View style={styles.roiDisplay}>
            <Text style={[
              styles.roiPercentage,
              { color: roi.roiPercentage >= 100 ? '#34C759' : tier.borderColor }
            ]}>
              {Math.round(roi.roiPercentage)}%
            </Text>
            <Text style={styles.roiSubtext}>ROI</Text>
          </View>
        </View>

        {/* Progress Bar */}
        <View style={styles.cardProgressContainer}>
          <View style={[
            styles.cardProgressFill,
            { 
              width: `${Math.min(roi.roiPercentage, 100)}%`,
              backgroundColor: roi.roiPercentage >= 100 ? '#34C759' : tier.borderColor
            }
          ]} />
        </View>

        {/* Expandable Details */}
        <Animated.View style={[styles.expandedContent, expandedContentStyle]}>
          <View style={styles.detailsRow}>
            <Text style={styles.detailLabel}>Redeemed:</Text>
            <Text style={styles.detailValue}>${roi.totalRedeemed.toFixed(0)}</Text>
          </View>
          <View style={styles.detailsRow}>
            <Text style={styles.detailLabel}>Annual Fee:</Text>
            <Text style={styles.detailValue}>${roi.annualFee.toFixed(0)}</Text>
          </View>
          <View style={styles.detailsRow}>
            <Text style={styles.detailLabel}>Net Benefit:</Text>
            <Text style={[
              styles.detailValue,
              { color: (roi.totalRedeemed - roi.annualFee) >= 0 ? '#34C759' : '#FF3B30' }
            ]}>
              ${(roi.totalRedeemed - roi.annualFee).toFixed(0)}
            </Text>
          </View>
        </Animated.View>
      </Animated.View>
    </TouchableOpacity>
  );
};

const ProgressBar: React.FC<{ progress: number }> = ({ progress }) => {
  const clampedProgress = Math.min(Math.max(progress, 0), 100);
  const isZeroProgress = clampedProgress === 0;
  
  return (
    <View style={styles.progressBarContainer}>
      {isZeroProgress ? (
        <View style={styles.progressBarZero} />
      ) : (
        <View 
          style={[
            styles.progressBarFill,
            { width: `${clampedProgress}%` },
            clampedProgress >= 100 && styles.progressBarSuccess
          ]} 
        />
      )}
    </View>
  );
};

// Enhanced Empty State Component
const EmptyState: React.FC<{ cardCount: number }> = ({ cardCount }) => {
  if (cardCount === 1) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyStateIcon}>🃏</Text>
        <Text style={styles.emptyStateTitle}>Lonely card needs friends!</Text>
        <Text style={styles.emptyStateSubtitle}>
          Add a second card to start competing and see your leaderboard come to life
        </Text>
        <TouchableOpacity style={styles.emptyStateCTA}>
          <Text style={styles.emptyStateCTAText}>Add Another Card</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateIcon}>🏆</Text>
      <Text style={styles.emptyStateTitle}>Build your financial dream team</Text>
      <Text style={styles.emptyStateSubtitle}>
        Add credit cards to track their performance and see which ones are your MVPs
      </Text>
      <TouchableOpacity style={styles.emptyStateCTA}>
        <Text style={styles.emptyStateCTAText}>Start Your Optimization Journey</Text>
      </TouchableOpacity>
    </View>
  );
};

const CardRoiLeaderboard: React.FC<CardRoiLeaderboardProps> = ({ cardRois }) => {
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);

  // Enhanced empty state handling
  if (!cardRois || cardRois.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Card Performance Leaderboard</Text>
        </View>
        <EmptyState cardCount={0} />
      </View>
    );
  }

  if (cardRois.length === 1) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Card Performance</Text>
        </View>
        <EmptyState cardCount={1} />
      </View>
    );
  }

  const sortedRois = [...cardRois].sort((a, b) => b.roiPercentage - a.roiPercentage);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Card Performance Leaderboard</Text>
        <Text style={styles.subtitle}>{sortedRois.length} cards competing</Text>
      </View>
      
      <View style={styles.cardDeck}>
        {sortedRois.map((roi, index) => (
          <CardItem
            key={roi.id}
            roi={roi}
            index={index}
            isExpanded={expandedCardId === roi.id}
            onPress={() => setExpandedCardId(expandedCardId === roi.id ? null : roi.id)}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
    marginHorizontal: 15,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.light.icon,
  },
  
  // Card Deck Styles
  cardDeck: {
    gap: 12,
  },
  cardItem: {
    borderWidth: 2,
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardRank: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rankIcon: {
    fontSize: 18,
  },
  rankText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
  },
  cardTierBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  tierText: {
    fontSize: 12,
    fontWeight: '600',
  },
  
  // Card Content Styles
  cardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    flex: 1,
  },
  roiDisplay: {
    alignItems: 'flex-end',
  },
  roiPercentage: {
    fontSize: 24,
    fontWeight: '700',
  },
  roiSubtext: {
    fontSize: 12,
    color: Colors.light.icon,
    marginTop: 2,
  },
  
  // Progress Bar Styles
  cardProgressContainer: {
    height: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  cardProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  
  // Expanded Content Styles
  expandedContent: {
    overflow: 'hidden',
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  detailLabel: {
    fontSize: 14,
    color: Colors.light.icon,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
  },
  
  // Empty State Styles
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: Colors.light.icon,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  emptyStateCTA: {
    backgroundColor: Colors.light.tint,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyStateCTAText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  
  // Legacy styles for backward compatibility
  progressBarContainer: {
    height: 4,
    backgroundColor: '#E5E5EA',
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 4,
    width: '100%',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.light.tint,
    borderRadius: 2,
  },
  progressBarSuccess: {
    backgroundColor: '#34C759',
  },
  progressBarZero: {
    height: '100%',
    backgroundColor: '#E5E5EA',
    opacity: 0.5,
    width: '100%',
  },
});

export default CardRoiLeaderboard; 