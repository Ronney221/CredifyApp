//perk-row.tsx
import React, { useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import Reanimated, { FadeIn, FadeOut, Layout } from 'react-native-reanimated';
import { Swipeable } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { CardPerk, calculatePerkExpiryDate } from '../../../src/data/card-data';
import PerkUrgencyIndicator from '../PerkUrgencyIndicator';
import PartialRedemptionProgress from '../PartialRedemptionProgress';
import { Spacing, ComponentSpacing, BorderRadius } from '../../../constants/Spacing';

const AUTO_REDEEM_FOREGROUND = '#6C3DAF'; // Calmer, darker purple for text/icon
const AUTO_REDEEM_BACKGROUND = '#F3E8FF'; // Pale lavender background
const AUTO_REDEEM_CHEVRON = '#C4B2DE';   // Lighter purple for chevron
const PARTIAL_REDEEM_FOREGROUND = '#FF9500'; // Orange for partial redemption
const PARTIAL_REDEEM_BACKGROUND = '#FFF7E6';


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
        leftOpenValue={120} // Limit left swipe (Log Usage button) to 120px like iMessage
        rightOpenValue={-120} // Limit right swipe (Available button) to 120px
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
            // Delay measurement to ensure card expansion animation is complete
            setTimeout(() => {
              touchableRef.current?.measure((x, y, width, height, pageX, pageY) => {
                console.log('[PerkRow] Measured layout:', { pageX, pageY, width, height, perkName: perk.name });
                onLayout({ x: pageX, y: pageY, width, height });
              });
            }, 500); // Increased delay to account for expansion animation
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
              {/* Progress bar for partial redemptions */}
              <PartialRedemptionProgress perk={perk} height={3} />
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
              {/* Urgency indicator replaces periodText */}
              {!isRedeemed && (
                <View style={styles.urgencyIndicatorContainer}>
                  <PerkUrgencyIndicator perk={perk} size="small" />
                </View>
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
    marginVertical: Spacing.xs, // 4pt
    borderRadius: BorderRadius.xl, // 16pt
    overflow: 'hidden',
  },
  perkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: ComponentSpacing.listItemPadding, // 16pt
    paddingHorizontal: ComponentSpacing.listItemPadding, // 16pt
    position: 'relative',
    borderRadius: BorderRadius.xl, // 16pt
    overflow: 'hidden',
  },
  perkContainerAvailable: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F0F0F0',
    marginVertical: Spacing.xs, // 4pt
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 3,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  perkContainerRedeemed: {
    backgroundColor: '#F2F2F2',
    marginVertical: Spacing.xs, // 4pt
  },
  perkContainerAutoRedeemed: {
    backgroundColor: AUTO_REDEEM_BACKGROUND,
  },
  perkContainerPartiallyRedeemed: {
    backgroundColor: PARTIAL_REDEEM_BACKGROUND,
    borderWidth: 1,
    borderColor: '#FFE4B3',
    marginVertical: Spacing.xs, // 4pt
    ...Platform.select({
      ios: {
        shadowColor: '#FF9500',
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
    marginRight: ComponentSpacing.iconMargin, // 12pt
    width: 30,
    alignItems: 'center',
  },
  perkTextContainerInsideItem: {
    flex: 1,
    marginRight: Spacing.sm, // 8pt
    justifyContent: 'center',
  },
  perkName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1c1c1e',
    marginBottom: Spacing.xs, // 4pt
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
    paddingLeft: Spacing.sm, // 8pt
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
    marginLeft: Spacing.sm, // 8pt
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
    borderRadius: BorderRadius.md, // 8pt
    paddingVertical: 6, // Keep as 6pt for visual balance
    paddingHorizontal: ComponentSpacing.cardInnerSpacing, // 12pt
    marginTop: Spacing.sm, // 8pt
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
  urgencyIndicatorContainer: {
    marginBottom: Spacing.xs, // 4pt
    alignSelf: 'flex-end',
  },
});

export default React.memo(PerkRow); 