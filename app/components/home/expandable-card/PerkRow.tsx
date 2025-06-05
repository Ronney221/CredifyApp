import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Reanimated, { FadeIn, FadeOut, Layout } from 'react-native-reanimated';
import { Swipeable } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { CardPerk } from '../../../../src/data/card-data';
import { useAutoRedemptions } from '../../../hooks/useAutoRedemptions';

interface PerkRowProps {
  perk: CardPerk;
  isFirstAvailablePerk: boolean;
  showSwipeHint: boolean;
  animatedNudgeStyle: any;
  onTapPerk: () => void;
  onLongPressPerk: () => void;
  onSwipeableWillOpen: (direction: 'left' | 'right') => void;
  onSwipeableOpen: (direction: 'left' | 'right') => void;
  setSwipeableRef: (ref: Swipeable | null) => void;
  renderLeftActions: () => React.ReactNode;
  renderRightActions: () => React.ReactNode;
}

const PerkRow: React.FC<PerkRowProps> = ({
  perk,
  isFirstAvailablePerk,
  showSwipeHint,
  animatedNudgeStyle,
  onTapPerk,
  onLongPressPerk,
  onSwipeableWillOpen,
  onSwipeableOpen,
  setSwipeableRef,
  renderLeftActions,
  renderRightActions,
}) => {
  const { getAutoRedemptionByPerkName } = useAutoRedemptions();
  const isRedeemed = perk.status === 'redeemed';
  const isAutoRedeemed = perk.periodMonths === 1 && getAutoRedemptionByPerkName(perk.name);
  
  const shouldShowHintOnThisPerk = showSwipeHint && isFirstAvailablePerk;

  const formattedValue = perk.value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
  });

  let periodText = '';
  switch (perk.periodMonths) {
    case 1: periodText = 'Monthly'; break;
    case 3: periodText = 'Quarterly'; break;
    case 6: periodText = 'Semi-Annual'; break;
    case 12: periodText = 'Annual'; break;
    default: periodText = perk.periodMonths ? `Every ${perk.periodMonths} months` : '';
  }

  let displayDescription = perk.description
    ? (perk.description.length > 100 ? `${perk.description.substring(0, 97)}...` : perk.description)
    : 'No description available.';
  
  let containerStyle: any = styles.perkContainer;
  if (isRedeemed && isAutoRedeemed) {
    containerStyle = [styles.perkContainer, styles.perkContainerAutoRedeemed];
  } else if (isRedeemed) {
    containerStyle = [styles.perkContainer, styles.perkContainerRedeemed];
  }

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
        >
          <View style={containerStyle}>
            <View style={styles.perkIconContainer}>
              <Ionicons 
                name={isRedeemed ? (isAutoRedeemed ? 'sync-circle' : 'checkmark-circle-outline') : 'pricetag-outline'}
                size={26} 
                color={isRedeemed ? (isAutoRedeemed ? '#FF9500' : '#8E8E93') : '#007AFF'}
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
              {shouldShowHintOnThisPerk && (
                <Reanimated.View 
                  style={[styles.inlineHintContainer, animatedNudgeStyle]}
                  accessibilityRole="text"
                >
                  <Ionicons name="hand-left-outline" size={16} color="#007AFF" />
                  <Text style={styles.inlineHintText}>Swipe → Redeem</Text>
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
              color={isRedeemed ? (isAutoRedeemed ? '#CC7A00' : '#C7C7CC') : '#B0B0B0'} 
              style={styles.perkChevron}
            />
          </View>
        </TouchableOpacity>
      </Swipeable>
    </Reanimated.View>
  );
};

const styles = StyleSheet.create({
  perkContainerOuter: {},
  perkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
    position: 'relative',
    borderRadius: 16,
  },
  perkContainerRedeemed: {
    backgroundColor: '#F7F7F7',
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
    textDecorationLine: 'line-through',
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
    textDecorationLine: 'line-through',
  },
  perkChevron: {
    marginLeft: 8,
  },
  perkContainerAutoRedeemed: {
    backgroundColor: '#FFF8E1',
  },
  perkNameAutoRedeemed: { 
    color: '#FF9500',
  },
  perkDescriptionAutoRedeemed: { 
    color: '#FF9500',
  },
  perkValueAutoRedeemed: { 
    color: '#FF9500',
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
  },
  inlineHintText: {
    color: '#007AFF',
    fontSize: 13,
    fontWeight: '500',
    marginLeft: 6,
  },
});

export default React.memo(PerkRow); 