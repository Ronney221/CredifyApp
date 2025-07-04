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
    console.log('[CardHeader] renderRenewalDatePrompt:', {
      cardName: card.name,
      renewalDate: renewalDate,
      hasHandler: !!onRenewalDatePress,
      renewalDateType: renewalDate ? typeof renewalDate : 'null',
      isDateObject: renewalDate instanceof Date
    });

    if (renewalDate || !onRenewalDatePress) return null;

    return (
      <TouchableOpacity 
        onPress={onRenewalDatePress}
        style={styles.renewalPrompt}
        activeOpacity={0.7}
      >
        <Ionicons name="calendar-outline" size={14} color={systemBlue} />
        <Text style={styles.renewalPromptText}>
          Set renewal date for reminders
        </Text>
      </TouchableOpacity>
    );
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
          <Text style={styles.cardName}>{card.name}</Text>
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
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 8,
    backgroundColor: 'rgba(248, 248, 248, 0.7)',
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
    width: 60,
    height: 40,
    borderRadius: 6,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.1)',
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
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  cardSubtitle: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  subtitleText: {
    fontSize: 14,
    color: '#6B7280',
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
    marginTop: 8,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#E5E5EA',
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: 4,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#20B2AA',
    borderRadius: 4,
  },
  progressBarSuccess: {
    backgroundColor: systemGreen,
  },
  progressText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  progressTextSuccess: {
    color: systemGreen,
    fontWeight: '600',
  },
  otherPerksText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
    marginTop: 4,
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
  renewalPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 4,
  },
  renewalPromptText: {
    fontSize: 13,
    color: systemBlue,
    marginLeft: 6,
    fontWeight: '500',
  },
});

export default React.memo(CardHeader); 