import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import Reanimated, { FadeIn, FadeOut, Layout } from 'react-native-reanimated';
import { Swipeable } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { CardPerk } from '../../../../src/data/card-data';

const AUTO_REDEEM_FOREGROUND = '#6C3DAF'; // Calmer, darker purple for text/icon
const AUTO_REDEEM_BACKGROUND = '#F3E8FF'; // Pale lavender background
const AUTO_REDEEM_CHEVRON = '#C4B2DE';   // Lighter purple for chevron

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
}) => {
  const isRedeemed = perk.status === 'redeemed';
  
  const shouldShowRedeemHintOnThisPerk = showSwipeHint && isFirstAvailablePerk;
  const shouldShowUndoHintOnThisPerk = showUndoHint && isFirstRedeemedPerk;

  const formattedValue = perk.value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
  });

  let periodText = '';
  if (isAutoRedeemed) {
    periodText = 'Monthly Auto-Redemption';
  } else {
    switch (perk.periodMonths) {
      case 1: periodText = 'Monthly'; break;
      case 3: periodText = 'Quarterly'; break;
      case 6: periodText = 'Semi-Annual'; break;
      case 12: periodText = 'Annual'; break;
      default: periodText = perk.periodMonths ? `Every ${perk.periodMonths} months` : '';
    }
  }

  let displayDescription = perk.description
    ? (perk.description.length > 100 ? `${perk.description.substring(0, 97)}...` : perk.description)
    : 'No description available.';
  
  const containerStyle = [
    styles.perkContainer,
    isRedeemed 
      ? (isAutoRedeemed ? styles.perkContainerAutoRedeemed : styles.perkContainerRedeemed) 
      : styles.perkContainerAvailable
  ];

  return (
    <Reanimated.View
      style={styles.perkContainerOuter}
      layout={Layout.springify()}
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(100)}
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
          activeOpacity={0.8}
          onPress={onTapPerk}
          onLongPress={onLongPressPerk}
          style={containerStyle}
        >
            <View style={styles.perkIconContainer}>
              <Ionicons 
                name={isRedeemed ? (isAutoRedeemed ? 'sync-circle' : 'checkmark-circle-outline') : 'pricetag-outline'}
                size={26} 
                color={isRedeemed ? (isAutoRedeemed ? AUTO_REDEEM_FOREGROUND : '#8E8E93') : (isAutoRedeemed ? AUTO_REDEEM_FOREGROUND : '#007AFF')}
              />
            </View>
            <View style={styles.perkTextContainerInsideItem}> 
              <View style={styles.perkNameAndPeriodContainer}> 
                <Text style={[
                  styles.perkName, 
                  isRedeemed && !isAutoRedeemed && styles.perkNameRedeemed,
                  isRedeemed && isAutoRedeemed && styles.perkNameAutoRedeemed
                ]}>
                  {perk.name}
                </Text>
                {periodText ? <Text style={styles.perkPeriodTag}>{periodText}</Text> : null}
              </View>
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
                  <Text style={styles.inlineHintText}>Swipe → Redeem</Text>
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
              <Text style={[
                styles.perkValue, 
                isRedeemed && !isAutoRedeemed && styles.perkValueRedeemed,
                isRedeemed && isAutoRedeemed && styles.perkValueAutoRedeemed
              ]}>
                {formattedValue}
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
  perkNameAndPeriodContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    marginBottom: 2,
  },
  perkName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1c1c1e',
    marginRight: 6,
  },
  perkPeriodTag: {
    fontSize: 11,
    fontWeight: '500',
    color: '#8A8A8E',
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
    color: AUTO_REDEEM_FOREGROUND,
  },
  perkDescriptionAutoRedeemed: { 
    color: AUTO_REDEEM_FOREGROUND,
  },
  perkValueAutoRedeemed: { 
    color: AUTO_REDEEM_FOREGROUND,
  },
  inlineHintContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 122, 255, 0.05)',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginTop: 8,
    alignSelf: 'flex-start',
    overflow: 'hidden',
  },
  inlineHintText: {
    color: '#007AFF',
    fontSize: 13,
    fontWeight: '500',
    marginLeft: 6,
  },
});

export default React.memo(PerkRow); 