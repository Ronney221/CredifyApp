//perk-row.tsx
import React, { useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import Reanimated, { FadeIn, FadeOut, Layout } from 'react-native-reanimated';
import { Swipeable } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { CardPerk, calculatePerkExpiryDate } from '../../../src/data/card-data';

const AUTO_REDEEM_FOREGROUND = '#6C3DAF'; // Calmer, darker purple for text/icon
const AUTO_REDEEM_BACKGROUND = '#F3E8FF'; // Pale lavender background
const AUTO_REDEEM_CHEVRON = '#C4B2DE';   // Lighter purple for chevron
const PARTIAL_REDEEM_FOREGROUND = '#FF9500'; // Orange for partial redemption
const PARTIAL_REDEEM_BACKGROUND = '#FFF7E6';

// Function to format the time until expiry
const getTimeUntilExpiry = (perk: CardPerk): string => {
  if (!perk.periodMonths) return '';
  
  const expiryDate = calculatePerkExpiryDate(perk.periodMonths);
  const now = new Date();
  const daysLeft = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const monthsLeft = Math.floor(daysLeft / 30);
  const remainingDays = daysLeft % 30;

  if (daysLeft <= 0) {
    return 'Expired';
  } else if (daysLeft <= 7) {
    return `${daysLeft}d left`;
  } else if (monthsLeft > 0) {
    return remainingDays > 0 ? `${monthsLeft}mo ${remainingDays}d` : `${monthsLeft}mo`;
  } else {
    return `${daysLeft}d`;
  }
};

interface PerkRowProps {
  perk: CardPerk;
  isAutoRedeemed: boolean;
  isFirstAvailablePerk: boolean;
  showSwipeHint: boolean;
  animatedNudgeStyle: any;
  isFirstRedeemedPerk: boolean;
  showUndoHint: boolean;
  animatedUndoNudgeStyle: any;
  onTapPerk: () => void;
  onLongPressPerk: () => void;
  onSwipeableWillOpen: (direction: 'left' | 'right') => void;
  onSwipeableOpen: (direction: 'left' | 'right') => void;
  setSwipeableRef: (ref: Swipeable | null) => void;
  renderLeftActions?: () => React.ReactNode;
  renderRightActions?: () => React.ReactNode;
  onLayout?: (layout: {x: number; y: number; width: number; height: number}) => void;
}

const PerkRow: React.FC<PerkRowProps> = ({
  perk,
  isAutoRedeemed,
  isFirstAvailablePerk,
  showSwipeHint,
  animatedNudgeStyle,
  isFirstRedeemedPerk,
  showUndoHint,
  animatedUndoNudgeStyle,
  onTapPerk,
  onLongPressPerk,
  onSwipeableWillOpen,
  onSwipeableOpen,
  setSwipeableRef,
  renderLeftActions,
  renderRightActions,
  onLayout,
}) => {
  const isRedeemed = perk.status === 'redeemed';
  const isPartiallyRedeemed = perk.status === 'partially_redeemed';
  const touchableRef = useRef<TouchableOpacity | null>(null);
  
  const shouldShowRedeemHintOnThisPerk = showSwipeHint && isFirstAvailablePerk;
  const shouldShowUndoHintOnThisPerk = showUndoHint && isFirstRedeemedPerk;

  const formattedValue = perk.value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
  });

  const formattedRemainingValue = perk.remaining_value ? perk.remaining_value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
  }) : null;

  // Calculate days left for both period text and styling
  const expiryDate = perk.periodMonths ? calculatePerkExpiryDate(perk.periodMonths) : null;
  const daysLeft = expiryDate 
    ? Math.ceil((expiryDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : null;

  let periodText = '';
  if (isAutoRedeemed) {
    periodText = 'Automatic';
  } else if (!isRedeemed) { // Changed condition to include partially redeemed perks
    periodText = getTimeUntilExpiry(perk);
  }

  let displayDescription = perk.description
    ? (perk.description.length > 100 ? `${perk.description.substring(0, 97)}...` : perk.description)
    : 'No description available.';
  
  const containerStyle = [
    styles.perkContainer,
    isRedeemed 
      ? (isAutoRedeemed ? styles.perkContainerAutoRedeemed : styles.perkContainerRedeemed)
      : isPartiallyRedeemed
      ? styles.perkContainerPartiallyRedeemed
      : styles.perkContainerAvailable
  ];

  return (
    <Reanimated.View
      style={styles.perkContainerOuter}
      layout={Layout.springify()}
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(200)}
    >
      <Swipeable
        ref={setSwipeableRef}
        renderLeftActions={renderLeftActions}
        renderRightActions={renderRightActions}
        leftThreshold={40}
        rightThreshold={40}
        onSwipeableWillOpen={onSwipeableWillOpen}
        onSwipeableOpen={onSwipeableOpen}
        friction={1.5}
        overshootFriction={8}
      >
        <TouchableOpacity
          ref={touchableRef}
          activeOpacity={0.8}
          onPress={onTapPerk}
          onLongPress={onLongPressPerk}
          style={containerStyle}
          onLayout={onLayout ? () => {
            // Use measure to get absolute screen coordinates
            setTimeout(() => {
              touchableRef.current?.measure((x, y, width, height, pageX, pageY) => {
                onLayout({ x: pageX, y: pageY, width, height });
              });
            }, 100);
          } : undefined}
        >
            <View style={styles.perkIconContainer}>
              <Ionicons 
                name={
                  isRedeemed 
                    ? (isAutoRedeemed ? 'sync-circle-outline' : 'checkmark-circle-outline')
                    : isPartiallyRedeemed
                    ? 'hourglass-outline'
                    : 'pricetag-outline'
                }
                size={26} 
                color={
                  isRedeemed 
                    ? (isAutoRedeemed ? AUTO_REDEEM_FOREGROUND : '#8E8E93')
                    : isPartiallyRedeemed
                    ? PARTIAL_REDEEM_FOREGROUND
                    : '#007AFF'
                }
              />
            </View>
            <View style={styles.perkTextContainerInsideItem}> 
              <Text style={[
                styles.perkName, 
                isRedeemed && !isAutoRedeemed && styles.perkNameRedeemed,
                isRedeemed && isAutoRedeemed && styles.perkNameAutoRedeemed
              ]}>
                {perk.name}
              </Text>
              <Text style={[
                styles.perkDescription, 
                isRedeemed && !isAutoRedeemed && styles.perkDescriptionRedeemed,
                isRedeemed && isAutoRedeemed && styles.perkDescriptionAutoRedeemed
              ]}
              numberOfLines={2}
              ellipsizeMode="tail"
              >
                {displayDescription}
              </Text>
              {shouldShowRedeemHintOnThisPerk && (
                <Reanimated.View 
                  style={[styles.inlineHintContainer, animatedNudgeStyle]}
                  accessibilityRole="text"
                >
                  <Ionicons name="hand-left-outline" size={16} color="#007AFF" />
                  <Text style={styles.inlineHintText}>Swipe → Mark Used</Text>
                </Reanimated.View>
              )}
              {shouldShowUndoHintOnThisPerk && (
                <Reanimated.View 
                  style={[styles.inlineHintContainer, animatedUndoNudgeStyle]}
                  accessibilityRole="text"
                >
                  <Text style={styles.inlineHintText}>Swipe ← Undo</Text>
                  <Ionicons name="hand-right-outline" size={16} color="#007AFF" style={{ marginLeft: 6, marginRight: 0 }}/>
                </Reanimated.View>
              )}
            </View>
            <View style={styles.perkValueContainer}>
              {periodText && (
                <Text style={[
                  styles.perkPeriodTag,
                  isRedeemed && !isAutoRedeemed && styles.perkPeriodTagRedeemed,
                  isAutoRedeemed && styles.perkPeriodTagAutoRedeemed,
                  periodText === 'Expired' && styles.perkPeriodTagExpired,
                  daysLeft !== null && daysLeft <= 7 && styles.perkPeriodTagUrgent
                ]}>
                  {periodText}
                </Text>
              )}
              <Text style={[
                styles.perkValue, 
                isRedeemed && !isAutoRedeemed && styles.perkValueRedeemed,
                isRedeemed && isAutoRedeemed && styles.perkValueAutoRedeemed,
                isPartiallyRedeemed && styles.perkValuePartiallyRedeemed
              ]}>
                {isPartiallyRedeemed && typeof perk.remaining_value === 'number'
                  ? perk.remaining_value.toLocaleString('en-US', {
                      style: 'currency',
                      currency: 'USD',
                    })
                  : formattedValue}
              </Text>
            </View>
            <Ionicons 
              name="chevron-forward" 
              size={20} 
              color={isRedeemed ? (isAutoRedeemed ? AUTO_REDEEM_CHEVRON : '#C7C7CC') : '#B0B0B0'} 
              style={styles.perkChevron}
            />
        </TouchableOpacity>
      </Swipeable>
    </Reanimated.View>
  );
};

const styles = StyleSheet.create({
  perkContainerOuter: {
    marginVertical: 4,
    borderRadius: 16,
    overflow: 'hidden',
  },
  perkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    position: 'relative',
    borderRadius: 16,
    overflow: 'hidden',
  },
  perkContainerAvailable: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  perkContainerRedeemed: {
    backgroundColor: '#F2F2F2',
  },
  perkContainerAutoRedeemed: {
    backgroundColor: AUTO_REDEEM_BACKGROUND,
  },
  perkContainerPartiallyRedeemed: {
    backgroundColor: PARTIAL_REDEEM_BACKGROUND,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  perkIconContainer: {
    marginRight: 12,
    width: 30,
    alignItems: 'center',
  },
  perkTextContainerInsideItem: {
    flex: 1,
    marginRight: 8,
    justifyContent: 'center',
  },
  perkName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1c1c1e',
    marginBottom: 2,
  },
  perkPeriodTag: {
    fontSize: 11,
    fontWeight: '500',
    color: '#8A8A8E',
    marginBottom: 2,
  },
  perkPeriodTagRedeemed: {
    color: '#AEAEB2',
  },
  perkPeriodTagAutoRedeemed: {
    color: AUTO_REDEEM_FOREGROUND,
  },
  perkPeriodTagExpired: {
    color: '#FF3B30', // iOS red color for expired status
  },
  perkPeriodTagUrgent: {
    color: '#FF9500', // iOS orange color for urgent (7 days or less)
  },
  perkNameRedeemed: {
    color: '#8E8E93',
  },
  perkDescription: { 
    fontSize: 13,
    color: '#6C6C70',
    lineHeight: 18,
  },
  perkDescriptionRedeemed: { 
    color: '#AEAEB2',
  },
  perkValueContainer: {
    marginLeft: 'auto',
    paddingLeft: 8,
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
  },
  perkValue: {
    fontSize: 22,
    fontWeight: '400',
    color: '#1c1c1e',
  },
  perkValueRedeemed: { 
    color: '#8E8E93',
  },
  perkChevron: {
    marginLeft: 8,
  },
  perkNameAutoRedeemed: { 
    color: '#8E8E93',
  },
  perkDescriptionAutoRedeemed: { 
    color: '#AEAEB2',
  },
  perkValueAutoRedeemed: { 
    color: '#8E8E93',
  },
  perkValuePartiallyRedeemed: {
    color: PARTIAL_REDEEM_FOREGROUND,
  },
  inlineHintContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 122, 255, 0.05)',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginTop: 8,
    alignSelf: 'flex-start',
    overflow: 'hidden',
  },
  inlineHintText: {
    color: '#007AFF',
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 6,
  },
  remainingValueText: {
    fontSize: 14,
    color: '#8E8E93',
  },
});

export default React.memo(PerkRow); 