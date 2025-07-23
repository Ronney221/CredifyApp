import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Image } from 'react-native';
import { Colors } from '../../constants/Colors';
import { CardROI } from '../../src/data/dummy-insights';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import Animated, { 
  useAnimatedStyle, 
  withSpring,
  withTiming,
  useSharedValue,
  interpolate,
  Easing
} from 'react-native-reanimated';

// Credit card image mapping
const getCardImage = (cardName: string) => {
  const name = cardName.toLowerCase();
  
  if (name.includes('chase sapphire preferred')) {
    return require('../../assets/images/chase_sapphire_preferred.png');
  } else if (name.includes('chase sapphire reserve')) {
    return require('../../assets/images/chase_sapphire_reserve.png');
  } else if (name.includes('amex gold') || name.includes('american express gold')) {
    return require('../../assets/images/amex_gold.avif');
  } else if (name.includes('amex green') || name.includes('american express green')) {
    return require('../../assets/images/amex_green.avif');
  } else if (name.includes('amex platinum') || name.includes('american express platinum')) {
    return require('../../assets/images/amex_plat.avif');
  } else if (name.includes('blue cash preferred')) {
    return require('../../assets/images/blue_cash_preferred.avif');
  } else if (name.includes('venture x')) {
    return require('../../assets/images/venture_x.avif');
  } else if (name.includes('citi prestige')) {
    return require('../../assets/images/citi_prestige.jpeg');
  } else if (name.includes('altitude reserve')) {
    return require('../../assets/images/usb_altitude_reserve.png');
  } else if (name.includes('hilton aspire')) {
    return require('../../assets/images/hilton_aspire.avif');
  } else if (name.includes('marriott bonvoy brilliant')) {
    return require('../../assets/images/marriott_bonvoy_brilliant.avif');
  } else if (name.includes('delta reserve')) {
    return require('../../assets/images/delta_reserve.avif');
  } else if (name.includes('premium rewards')) {
    return require('../../assets/images/boa_premium_rewards.png');
  }
  
  return null; // No image found
};

interface CardRoiLeaderboardProps {
  cardRois: CardROI[];
}

// Performance tier system for cards
interface CardTier {
  name: string;
  icon: string;
  iconFamily: 'MaterialCommunityIcons' | 'Ionicons';
  borderColor: string;
  backgroundColor: string;
  cardSize: { width: number; height: number };
  shadowElevation: number;
}

const getCardTier = (roi: number): CardTier => {
  if (roi >= 150) {
    return {
      name: 'Champion',
      icon: 'crown',
      iconFamily: 'MaterialCommunityIcons',
      borderColor: '#FFD700',
      backgroundColor: '#FFFDF0',
      cardSize: { width: 280, height: 180 },
      shadowElevation: 8
    };
  } else if (roi >= 100) {
    return {
      name: 'Elite',
      icon: 'trophy',
      iconFamily: 'MaterialCommunityIcons',
      borderColor: '#FF6B35',
      backgroundColor: '#FFF8F5',
      cardSize: { width: 260, height: 160 },
      shadowElevation: 6
    };
  } else if (roi >= 75) {
    return {
      name: 'Strong',
      icon: 'medal',
      iconFamily: 'MaterialCommunityIcons',
      borderColor: '#8B5A2B',
      backgroundColor: '#FFF9F5',
      cardSize: { width: 240, height: 140 },
      shadowElevation: 4
    };
  } else if (roi >= 50) {
    return {
      name: 'Building',
      icon: 'trending-up',
      iconFamily: 'MaterialCommunityIcons',
      borderColor: '#FF8C42',
      backgroundColor: '#FFF9F5',
      cardSize: { width: 225, height: 125 },
      shadowElevation: 3
    };
  } else if (roi >= 25) {
    return {
      name: 'Developing',
      icon: 'chart-line',
      iconFamily: 'MaterialCommunityIcons',
      borderColor: '#4169E1',
      backgroundColor: '#F0F8FF',
      cardSize: { width: 220, height: 120 },
      shadowElevation: 2
    };
  } else if (roi >= 10) {
    return {
      name: 'Starting',
      icon: 'sprout',
      iconFamily: 'MaterialCommunityIcons',
      borderColor: '#9370DB',
      backgroundColor: '#F8F7FF',
      cardSize: { width: 215, height: 115 },
      shadowElevation: 2
    };
  } else {
    return {
      name: 'Potential',
      icon: 'seed',
      iconFamily: 'MaterialCommunityIcons',
      borderColor: '#20B2AA',
      backgroundColor: '#F0FFFF',
      cardSize: { width: 210, height: 110 },
      shadowElevation: 1
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
  const cardImage = getCardImage(roi.name);
  
  const getRankDisplay = (index: number) => {
    switch (index) {
      case 0: return { icon: 'medal-outline', iconFamily: 'Ionicons', color: '#FFD60A', text: '#1', badge: 'BEST' };
      case 1: return { icon: 'medal-outline', iconFamily: 'Ionicons', color: '#C0C0C0', text: '#2', badge: '2ND' };
      case 2: return { icon: 'medal-outline', iconFamily: 'Ionicons', color: '#CD7F32', text: '#3', badge: '3RD' };
      case 3: return { icon: 'chevron-up', iconFamily: 'Ionicons', color: '#34C759', text: '#4', badge: 'TOP 5' };
      case 4: return { icon: 'chevron-up', iconFamily: 'Ionicons', color: '#34C759', text: '#5', badge: 'TOP 5' };
      default: return { icon: 'bar-chart', iconFamily: 'Ionicons', color: '#8E8E93', text: `#${index + 1}`, badge: null };
    }
  };
  
  const rankDisplay = getRankDisplay(index);
  
  React.useEffect(() => {
    animatedValue.value = withTiming(isExpanded ? 1 : 0, {
      duration: 300,
      easing: Easing.bezier(0.4, 0.0, 0.2, 1),
    });
  }, [isExpanded]);

  const cardStyle = useAnimatedStyle(() => {
    // Remove scale animation entirely to eliminate jumping
    const translateY = interpolate(animatedValue.value, [0, 1], [0, -1]);
    
    return {
      transform: [
        { translateY }
      ],
    };
  });

  const expandedContentStyle = useAnimatedStyle(() => {
    // Calculate dynamic height based on content - tier insight + 3 detail rows + padding
    const baseHeight = 40; // tierInsightContainer height
    const detailRowHeight = 20; // each detail row
    const totalRows = 3; // redeemed, annual fee, net benefit
    const padding = 12; // additional spacing
    const dynamicHeight = baseHeight + (detailRowHeight * totalRows) + padding;
    
    const height = interpolate(animatedValue.value, [0, 1], [0, dynamicHeight]);
    // Smooth opacity transition that matches the height animation
    const opacity = interpolate(animatedValue.value, [0, 0.3, 1], [0, 0, 1]);
    
    return {
      height,
      opacity,
      overflow: 'hidden',
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
            {rankDisplay.icon ? (
              <Ionicons 
                name={rankDisplay.icon as any} 
                size={18} 
                color={rankDisplay.color} 
                style={styles.medalIcon}
              />
            ) : null}
            <View style={styles.rankTextContainer}>
              <Text style={styles.rankText}>{rankDisplay.text}</Text>
              {rankDisplay.badge && (
                <Text style={[styles.rankBadge, { color: rankDisplay.color }]}>
                  {rankDisplay.badge}
                </Text>
              )}
            </View>
          </View>
          <View style={styles.cardTierBadge}>
            {tier.iconFamily === 'MaterialCommunityIcons' ? (
              <MaterialCommunityIcons 
                name={tier.icon as any} 
                size={14} 
                color={tier.borderColor} 
                style={styles.tierIcon}
              />
            ) : (
              <Ionicons 
                name={tier.icon as any} 
                size={14} 
                color={tier.borderColor} 
                style={styles.tierIcon}
              />
            )}
            <Text style={[styles.tierText, { color: tier.borderColor }]}>{tier.name}</Text>
          </View>
        </View>

        {/* Card Content with Image */}
        <View style={styles.cardContent}>
          <View style={styles.cardMainInfo}>
            {cardImage && (
              <View style={styles.cardImageContainer}>
                <Image 
                  source={cardImage} 
                  style={styles.cardImage}
                  resizeMode="cover"
                />
              </View>
            )}
            <View style={[styles.cardTextInfo, !cardImage && styles.cardTextInfoFullWidth]}>
              <Text style={styles.cardName} numberOfLines={1}>{roi.name}</Text>
              <View style={styles.cardMetrics}>
                <Text style={styles.cardNetBenefit}>
                  Net: ${(roi.totalRedeemed - roi.annualFee).toFixed(0)}
                </Text>
              </View>
            </View>
          </View>
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


        {/* Enhanced Progress Bar with Tier Styling */}
        <View style={[
          styles.cardProgressContainer,
          { backgroundColor: `${tier.borderColor}20` } // 20% opacity background
        ]}>
          <View style={[
            styles.cardProgressFill,
            { 
              width: `${Math.min(roi.roiPercentage, 100)}%`,
              backgroundColor: roi.roiPercentage >= 100 ? '#34C759' : tier.borderColor
            }
          ]} />
          {/* Only show 100% break-even line */}
          {roi.roiPercentage < 100 && (
            <View style={[styles.breakEvenLine, { left: '100%' }]} />
          )}
        </View>

        {/* Expandable Details */}
        <Animated.View style={[styles.expandedContent, expandedContentStyle]}>
          {/* Tier-specific motivational message */}
          <View style={styles.tierInsightContainer}>
            <Text style={[styles.tierInsightText, { color: tier.borderColor }]}>
              {roi.roiPercentage >= 150 ? "Exceptional performance! You're maximizing every dollar." :
               roi.roiPercentage >= 100 ? "Outstanding results! This card is a profit machine." :
               roi.roiPercentage >= 75 ? "Solid performer! Almost at maximum efficiency." :
               roi.roiPercentage >= 50 ? "Great momentum! You're building real value." :
               roi.roiPercentage >= 25 ? "Good foundation! Keep adding high-value perks." :
               roi.roiPercentage >= 10 ? "Early stages! Focus on your best earning categories." :
               "Hidden gem! This card has untapped opportunities."}
            </Text>
            {roi.roiPercentage < 100 && (
              <Text style={styles.breakEvenText}>
                ${Math.round((roi.annualFee - roi.totalRedeemed))} to break even
              </Text>
            )}
          </View>
          
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
        <MaterialCommunityIcons 
          name="credit-card-plus" 
          size={48} 
          color={Colors.light.icon} 
          style={styles.emptyStateIcon}
        />
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
      <MaterialCommunityIcons 
        name="trophy-outline" 
        size={48} 
        color={Colors.light.icon} 
        style={styles.emptyStateIcon}
      />
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
  
  const handleCardPress = (cardId: string) => {
    setExpandedCardId(current => current === cardId ? null : cardId);
  };

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
            onPress={() => handleCardPress(roi.id)}
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
    borderRadius: 16,
    padding: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    marginHorizontal: 2, // Add horizontal margin for better shadow visibility
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
  medalIcon: {
    marginRight: 4,
  },
  rankTextContainer: {
    alignItems: 'center',
  },
  rankText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
  },
  rankBadge: {
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginTop: 1,
  },
  cardTierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  tierIcon: {
    marginRight: 4,
  },
  tierText: {
    fontSize: 12,
    fontWeight: '600',
  },
  
  // Enhanced Card Content Styles
  cardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardMainInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cardImageContainer: {
    width: 50,
    height: 32,
    borderRadius: 6,
    overflow: 'hidden',
    marginRight: 12,
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
  cardTextInfo: {
    flex: 1,
  },
  cardTextInfoFullWidth: {
    marginLeft: 0,
  },
  cardName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 2,
  },
  cardMetrics: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardNetBenefit: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.light.icon,
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
  
  // Enhanced Progress Bar Styles
  cardProgressContainer: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
    position: 'relative',
  },
  cardProgressFill: {
    height: '100%',
    borderRadius: 4,
  },
  breakEvenLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: '#34C759',
    transform: [{ translateX: -0.5 }],
    opacity: 0.6,
  },
  
  // Expanded Content Styles
  expandedContent: {
    overflow: 'hidden',
  },
  tierInsightContainer: {
    marginBottom: 12,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  tierInsightText: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 4,
  },
  breakEvenText: {
    fontSize: 11,
    color: Colors.light.icon,
    textAlign: 'center',
    fontStyle: 'italic',
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