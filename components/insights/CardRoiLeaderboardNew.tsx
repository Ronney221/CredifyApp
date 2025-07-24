import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  FadeIn,
  Layout,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { CardROI } from '../../src/data/dummy-insights';
import { allCards } from '../../src/data/card-data-original';

interface CardRoiLeaderboardProps {
  cardRois: CardROI[];
}

// Get card data from the original card definitions
const getCardData = (cardId: string, cardName: string) => {
  let cardData = allCards.find(card => card.id === cardId);
  
  if (!cardData) {
    cardData = allCards.find(card => 
      card.name.toLowerCase() === cardName.toLowerCase() ||
      card.name.toLowerCase().includes(cardName.toLowerCase()) ||
      cardName.toLowerCase().includes(card.name.toLowerCase())
    );
  }
  
  return cardData;
};

// Format currency with proper styling
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// Get performance tier styling
const getPerformanceTier = (roi: number, index: number) => {
  if (index === 0 && roi >= 100) {
    return {
      badgeText: 'CHAMPION',
      badgeColors: ['#FFD700', '#FFA500'],
      iconName: 'trophy' as const,
      iconColor: '#FFD700',
      progressColor: '#34C759',
    };
  } else if (index <= 2 && roi >= 100) {
    return {
      badgeText: 'ELITE',
      badgeColors: ['#C0C0C0', '#A0A0A0'],
      iconName: 'medal' as const,
      iconColor: '#C0C0C0',
      progressColor: '#34C759',
    };
  } else if (roi >= 100) {
    return {
      badgeText: 'PROFITABLE',
      badgeColors: ['#34C759', '#32D74B'],
      iconName: 'checkmark-circle' as const,
      iconColor: '#34C759',
      progressColor: '#34C759',
    };
  } else if (roi >= 75) {
    return {
      badgeText: 'STRONG',
      badgeColors: ['#007AFF', '#0056CC'],
      iconName: 'trending-up' as const,
      iconColor: '#007AFF',
      progressColor: '#007AFF',
    };
  } else {
    return {
      badgeText: 'BUILDING',
      badgeColors: ['#FF9500', '#FF8A00'],
      iconName: 'hourglass' as const,
      iconColor: '#FF9500',
      progressColor: '#FF9500',
    };
  }
};

interface CardItemProps {
  roi: CardROI;
  index: number;
}

const CardItem: React.FC<CardItemProps> = ({ roi, index }) => {
  const [isPressed, setIsPressed] = useState(false);
  const scale = useSharedValue(1);
  
  const cardData = getCardData(roi.id, roi.name);
  const cardImage = cardData?.image;
  const tier = getPerformanceTier(roi.roiPercentage, index);
  const netBenefit = roi.totalRedeemed - roi.annualFee;
  const isPositive = netBenefit >= 0;

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  const handlePressIn = async () => {
    setIsPressed(true);
    scale.value = withSpring(0.98, { damping: 20, stiffness: 400 });
    
    if (Platform.OS === 'ios') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handlePressOut = () => {
    setIsPressed(false);
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={styles.cardContainer}
    >
      <Animated.View 
        style={[styles.card, animatedStyle]}
        layout={Layout.springify().damping(15).stiffness(300)}
      >
        <LinearGradient
          colors={['#FFFFFF', '#FAFAFE']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.cardGradient}
        >
          {/* Header with rank and tier */}
          <View style={styles.cardHeader}>
            <View style={styles.rankContainer}>
              <View style={[styles.rankBadge, index <= 2 && styles.topRankBadge]}>
                <Text style={[
                  styles.rankText,
                  index <= 2 && styles.topRankText
                ]}>
                  #{index + 1}
                </Text>
              </View>
              
              {index <= 2 && (
                <View style={styles.tierBadgeContainer}>
                  <LinearGradient
                    colors={tier.badgeColors}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.tierBadge}
                  >
                    <Ionicons 
                      name={tier.iconName} 
                      size={12} 
                      color="#FFFFFF" 
                    />
                    <Text style={styles.tierText}>{tier.badgeText}</Text>
                  </LinearGradient>
                </View>
              )}
            </View>

            <View style={styles.roiContainer}>
              <Text style={[
                styles.roiValue,
                { color: isPositive ? '#34C759' : '#1C1C1E' }
              ]}>
                {Math.round(roi.roiPercentage)}%
              </Text>
              <Text style={styles.roiLabel}>ROI</Text>
            </View>
          </View>

          {/* Card info */}
          <View style={styles.cardInfo}>
            <View style={styles.cardImageContainer}>
              {cardImage ? (
                <Image 
                  source={cardImage} 
                  style={styles.cardImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.cardImageFallback}>
                  <Ionicons 
                    name="card" 
                    size={20} 
                    color="#8E8E93" 
                  />
                </View>
              )}
            </View>
            
            <View style={styles.cardDetails}>
              <Text style={styles.cardName} numberOfLines={2}>
                {roi.name}
              </Text>
              
              <View style={styles.metricsRow}>
                <View style={styles.metric}>
                  <Text style={styles.metricLabel}>Earned</Text>
                  <Text style={styles.metricValue}>
                    {formatCurrency(roi.totalRedeemed)}
                  </Text>
                </View>
                
                <View style={styles.metric}>
                  <Text style={styles.metricLabel}>Fee</Text>
                  <Text style={styles.metricValue}>
                    {formatCurrency(roi.annualFee)}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Progress bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressTrack}>
              <Animated.View
                entering={FadeIn.delay((index + 1) * 100).duration(800)}
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.min(roi.roiPercentage, 100)}%`,
                    backgroundColor: tier.progressColor,
                  }
                ]}
              />
              
              {/* Break-even indicator */}
              {roi.roiPercentage < 100 && (
                <View style={styles.breakEvenIndicator}>
                  <View style={styles.breakEvenLine} />
                  <Text style={styles.breakEvenText}>100%</Text>
                </View>
              )}
            </View>
          </View>

          {/* Net benefit */}
          <View style={[
            styles.netBenefitContainer,
            isPositive ? styles.netBenefitPositive : styles.netBenefitNegative
          ]}>
            <Ionicons 
              name={isPositive ? 'trending-up' : 'trending-down'} 
              size={14} 
              color={isPositive ? '#34C759' : '#FF3B30'} 
            />
            <Text style={[
              styles.netBenefitText,
              { color: isPositive ? '#34C759' : '#FF3B30' }
            ]}>
              {isPositive ? '+' : ''}{formatCurrency(Math.abs(netBenefit))}
              {isPositive ? ' profit' : ' to break even'}
            </Text>
          </View>

          {/* Decorative elements for top performers */}
          {index <= 2 && (
            <View style={styles.decoration}>
              <View style={[
                styles.decorationCircle,
                { backgroundColor: tier.iconColor + '08' }
              ]} />
              <View style={[
                styles.decorationCircleSmall,
                { backgroundColor: tier.iconColor + '05' }
              ]} />
            </View>
          )}
        </LinearGradient>
      </Animated.View>
    </TouchableOpacity>
  );
};

export default function CardRoiLeaderboard({ cardRois }: CardRoiLeaderboardProps) {
  const [showAll, setShowAll] = useState(false);
  
  const sortedCards = useMemo(() => {
    return [...cardRois].sort((a, b) => b.roiPercentage - a.roiPercentage);
  }, [cardRois]);

  const displayedCards = showAll ? sortedCards : sortedCards.slice(0, 3);
  const hasMoreCards = sortedCards.length > 3;

  if (!cardRois || cardRois.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="analytics-outline" size={48} color="#8E8E93" />
        <Text style={styles.emptyTitle}>No performance data yet</Text>
        <Text style={styles.emptySubtitle}>
          Start logging perk redemptions to see your card rankings
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Card Performance</Text>
        <Text style={styles.subtitle}>
          {sortedCards.length} card{sortedCards.length !== 1 ? 's' : ''} ranked by ROI
        </Text>
      </View>

      {/* Cards */}
      <View style={styles.cardsList}>
        {displayedCards.map((roi, index) => (
          <CardItem
            key={roi.id}
            roi={roi}
            index={index}
          />
        ))}

        {/* Show more button */}
        {hasMoreCards && (
          <TouchableOpacity
            style={styles.showMoreButton}
            onPress={() => setShowAll(!showAll)}
            activeOpacity={0.7}
          >
            <Ionicons 
              name={showAll ? 'chevron-up' : 'chevron-down'} 
              size={20} 
              color="#007AFF" 
            />
            <Text style={styles.showMoreText}>
              {showAll ? 'Show less' : `Show ${sortedCards.length - 3} more`}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 4,
    letterSpacing: -0.41,
  },
  subtitle: {
    fontSize: 14,
    color: '#8E8E93',
    letterSpacing: -0.08,
  },
  cardsList: {
    gap: 12,
  },
  cardContainer: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  cardGradient: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  rankContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rankBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(142, 142, 147, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  topRankBadge: {
    backgroundColor: '#007AFF',
  },
  rankText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8E8E93',
  },
  topRankText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  tierBadgeContainer: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  tierText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  roiContainer: {
    alignItems: 'flex-end',
  },
  roiValue: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.8,
  },
  roiLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#8E8E93',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  cardInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  cardImageContainer: {
    width: 48,
    height: 30,
    borderRadius: 6,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardImageFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  cardDetails: {
    flex: 1,
  },
  cardName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 6,
    letterSpacing: -0.32,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  metric: {
    alignItems: 'flex-start',
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#8E8E93',
    marginBottom: 2,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  metricValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1C1C1E',
    letterSpacing: -0.24,
  },
  progressContainer: {
    marginBottom: 12,
  },
  progressTrack: {
    height: 6,
    backgroundColor: '#F2F2F7',
    borderRadius: 3,
    overflow: 'hidden',
    position: 'relative',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  breakEvenIndicator: {
    position: 'absolute',
    right: 0,
    top: -8,
    alignItems: 'center',
  },
  breakEvenLine: {
    width: 1,
    height: 22,
    backgroundColor: '#34C759',
    opacity: 0.6,
  },
  breakEvenText: {
    fontSize: 10,
    fontWeight: '500',
    color: '#34C759',
    marginTop: 2,
  },
  netBenefitContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  netBenefitPositive: {
    backgroundColor: 'rgba(52, 199, 89, 0.1)',
  },
  netBenefitNegative: {
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
  },
  netBenefitText: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: -0.08,
  },
  decoration: {
    position: 'absolute',
    top: -20,
    right: -20,
    zIndex: 1,
  },
  decorationCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    position: 'absolute',
  },
  decorationCircleSmall: {
    width: 40,
    height: 40,
    borderRadius: 20,
    top: 30,
    right: 30,
  },
  showMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    gap: 6,
    marginTop: 4,
  },
  showMoreText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#007AFF',
    letterSpacing: -0.08,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
    backgroundColor: '#F2F2F7',
    borderRadius: 16,
    marginTop: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 20,
  },
});