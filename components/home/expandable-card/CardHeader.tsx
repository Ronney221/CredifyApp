//card-header.tsx
import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Platform, PlatformColor } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../../../src/data/card-data';

interface CardHeaderProps {
  card: Card;
  isExpanded: boolean;
  isActive: boolean;
  isFullyRedeemed: boolean;
  cumulativeSavedValue: number;
  monthlyPerkStats: { total: number; redeemed: number };
  otherPerksAvailableCount: number;
  onPress: () => void;
  renewalDate?: Date | null;
  onRenewalDatePress?: () => void;
}

const systemGreen = Platform.OS === 'ios' ? PlatformColor('systemGreen') : '#34C759';
const systemBlue = Platform.OS === 'ios' ? PlatformColor('systemBlue') : '#007AFF';

const CardHeader: React.FC<CardHeaderProps> = ({
  card,
  isExpanded,
  isActive,
  isFullyRedeemed,
  cumulativeSavedValue,
  monthlyPerkStats,
  otherPerksAvailableCount,
  onPress,
  renewalDate,
  onRenewalDatePress,
}) => {
  const cardNetworkColor = React.useMemo(() => {
    switch (card.network?.toLowerCase()) {
      case 'amex':
      case 'american express':
        if (card.name?.toLowerCase().includes('platinum')) return '#E5E4E2';
        if (card.name?.toLowerCase().includes('gold')) return '#B08D57';
        return '#007bc1';
      case 'chase':
        return '#124A8D';
      default:
        return '#F0F0F0';
    }
  }, [card.network, card.name]);

  // Calculate progress percentage
  const progressPercentage = monthlyPerkStats.total > 0 
    ? (monthlyPerkStats.redeemed / monthlyPerkStats.total) * 100 
    : 0;
  
  const allMonthlyPerksRedeemed = monthlyPerkStats.total > 0 && monthlyPerkStats.redeemed === monthlyPerkStats.total;

  const renderSubtitle = () => {
    if (isFullyRedeemed) {
      let text = 'All redeemed';
      if (cumulativeSavedValue > 0) {
        text += ` • ${cumulativeSavedValue.toLocaleString('en-US', {
          style: 'currency',
          currency: 'USD',
        })} saved`;
      }
      return (
        <Text style={[styles.subtitleText, styles.savedValueText]} numberOfLines={1}>
          {text}
        </Text>
      );
    }

    // Default state when not fully redeemed, but still want to show savings
    if (cumulativeSavedValue > 0) {
      return (
        <Text style={[styles.subtitleText, styles.savedValueText]}>
          {`${cumulativeSavedValue.toLocaleString('en-US', {
            style: 'currency',
            currency: 'USD',
          })} saved`}
        </Text>
      );
    }

    return null;
  };

  const renderProgressSection = () => {
    // Universal "All Redeemed" state
    if (isFullyRedeemed) {
      return (
        <View style={styles.progressContainer}>
          <View style={styles.progressBarContainer}>
            <View
              style={[
                styles.progressBarFill,
                { width: '100%' },
                styles.progressBarSuccess,
              ]}
            />
          </View>
        </View>
      );
    }

    // State 1: Has monthly perks (and not fully redeemed)
    if (monthlyPerkStats.total > 0) {
      return (
        <View style={styles.progressContainer}>
          <View style={styles.progressInfo}>
            <Text style={styles.progressText}>
              Monthly Perks: {monthlyPerkStats.redeemed} of {monthlyPerkStats.total}
            </Text>
            <View style={styles.progressDots}>
              {Array.from({ length: monthlyPerkStats.total }, (_, i) => (
                <View
                  key={i}
                  style={[
                    styles.progressDot,
                    i < monthlyPerkStats.redeemed ? styles.progressDotFilled : styles.progressDotEmpty
                  ]}
                />
              ))}
            </View>
          </View>
          <View style={styles.progressBarContainer}>
            <View 
              style={[
                styles.progressBarFill,
                { width: `${progressPercentage}%` },
                allMonthlyPerksRedeemed && styles.progressBarSuccess
              ]} 
            />
          </View>
          {otherPerksAvailableCount > 0 && (
            <Text style={styles.otherPerksText}>
              + {otherPerksAvailableCount} other {otherPerksAvailableCount === 1 ? 'perk' : 'perks'} available
            </Text>
          )}
        </View>
      );
    }

    // State 2: No monthly perks, but other perks available
    if (otherPerksAvailableCount > 0) {
      return (
        <View style={styles.progressContainer}>
          <View style={styles.placeholderLine} />
          <Text style={styles.progressText}>
            {otherPerksAvailableCount} {otherPerksAvailableCount === 1 ? 'annual perk' : 'annual perks'} available
          </Text>
        </View>
      );
    }

    // Fallback for cards with no monthly perks and no other perks to maintain layout
    return (
      <View style={styles.progressContainer}>
        <View style={styles.placeholderLine} />
        <Text style={styles.progressText}>No monthly perks</Text>
      </View>
    );
  };

  const renderRenewalDatePrompt = () => {
    // Removed persistent "never miss annual fee" button for better UX
    // Will be replaced with contextual notifications when annual fee approaches
    return null;
  };

  return (
    <TouchableOpacity
      style={[styles.cardHeader, isActive && styles.activeCardHeader]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.cardInfo}>
        <View style={[styles.cardImageWrapper, { backgroundColor: cardNetworkColor }]}>
          <Image source={card.image} style={styles.cardImage} />
        </View>
        <View style={styles.cardTextContainer}>
          <Text style={styles.cardName} numberOfLines={1}>{card.name}</Text>
          <View style={styles.cardSubtitle}>
             {renderSubtitle()}
          </View>
          {renderRenewalDatePrompt()}
          {renderProgressSection()}
        </View>
      </View>
      <View style={styles.headerRight}>
        <Ionicons
          name={isExpanded ? 'chevron-down' : 'chevron-forward'}
          size={24}
          color="#20B2AA"
        />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
  },
  activeCardHeader: {
    backgroundColor: '#f8f9fa',
  },
  cardInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cardImageWrapper: {
    width: 64,
    height: 42,
    borderRadius: 8,
    marginRight: 16,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.08)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
    }),
  },
  cardImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  cardTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  cardName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  cardSubtitle: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  subtitleText: {
    fontSize: 15,
    color: '#8E8E93',
    fontWeight: '500',
    flexShrink: 1,
    marginRight: 4,
  },
  subtitleDivider: {
    color: '#6B7280',
    fontWeight: '400',
  },
  savedValueText: {
    color: systemGreen,
    fontSize: 14,
    fontWeight: '600',
    flexShrink: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
    paddingLeft: 8,
    flexShrink: 0,
  },
  progressContainer: {
    marginTop: 12,
  },
  progressBarContainer: {
    height: 4,
    backgroundColor: '#F2F2F7',
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 8,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 2,
    ...Platform.select({
      ios: {
        shadowColor: '#007AFF',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 2,
      },
    }),
  },
  progressBarSuccess: {
    backgroundColor: systemGreen,
    ...Platform.select({
      ios: {
        shadowColor: systemGreen,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 2,
      },
    }),
  },
  progressText: {
    fontSize: 13,
    color: '#8E8E93',
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  progressTextSuccess: {
    color: systemGreen,
    fontWeight: '600',
  },
  otherPerksText: {
    fontSize: 13,
    color: '#8E8E93',
    fontWeight: '500',
    marginTop: 6,
    letterSpacing: -0.1,
  },
  placeholderLine: {
    height: 8,
    backgroundColor: '#E5E5EA',
    borderRadius: 4,
    marginBottom: 4,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressDots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  progressDotFilled: {
    backgroundColor: '#007AFF',
    ...Platform.select({
      ios: {
        shadowColor: '#007AFF',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.25,
        shadowRadius: 1,
      },
    }),
  },
  progressDotEmpty: {
    backgroundColor: '#F2F2F7',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  renewalPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 6,
    backgroundColor: 'rgba(0, 122, 255, 0.06)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  renewalPromptText: {
    fontSize: 13,
    color: systemBlue,
    marginLeft: 6,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
});

export default React.memo(CardHeader); 