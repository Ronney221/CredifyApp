//perk-row.tsx
import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import Reanimated, { 
  FadeIn, 
  FadeOut, 
  Layout, 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  withTiming, 
  interpolate, 
  runOnJS,
  withSequence
} from 'react-native-reanimated';
import { Swipeable } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { CardPerk, calculatePerkExpiryDate } from '../../../src/data/card-data';
import PerkUrgencyIndicator from '../PerkUrgencyIndicator';
import PartialRedemptionProgress from '../PartialRedemptionProgress';
import MerchantLogo from '../MerchantLogo';
import { Spacing, ComponentSpacing, BorderRadius } from '../../../constants/Spacing';
import { PerkDesign, ComponentColors } from '../../../constants/DesignSystem';



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
  
  // Advanced micro-interaction state
  const [isPressed, setIsPressed] = useState(false);
  const pressOpacity = useSharedValue(0);
  
  // Premium spring configuration for Apple-quality animations
  const springConfig = {
    damping: 20,
    stiffness: 300,
    mass: 1,
    restDisplacementThreshold: 0.01,
    restSpeedThreshold: 0.01,
  };
  
  // Haptic feedback for different interactions
  const triggerHapticFeedback = (type: 'light' | 'medium' | 'success' | 'warning') => {
    if (Platform.OS === 'ios') {
      switch (type) {
        case 'light':
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          break;
        case 'medium':
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          break;
        case 'success':
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          break;
        case 'warning':
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          break;
      }
    }
  };
  
  // Enhanced press interactions with visible feedback
  const handlePressIn = () => {
    setIsPressed(true);
    pressOpacity.value = withTiming(1, { duration: 100 });
    triggerHapticFeedback('light');
  };
  
  const handlePressOut = () => {
    setIsPressed(false);
    pressOpacity.value = withTiming(0, { duration: 200 });
  };
  
  
  // Enhanced swipe handlers
  const enhancedOnSwipeableWillOpen = (direction: 'left' | 'right') => {
    // Only light haptic when swipe reveals action buttons
    triggerHapticFeedback('light');
    onSwipeableWillOpen(direction);
  };
  
  const enhancedOnSwipeableOpen = (direction: 'left' | 'right') => {
    // No success feedback here - wait for actual action confirmation
    onSwipeableOpen(direction);
  };
  
  // Animated press overlay style
  const pressOverlayStyle = useAnimatedStyle(() => {
    return {
      opacity: pressOpacity.value * 0.08, // Subtle dark overlay
      backgroundColor: '#000000',
    };
  });
  
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
      entering={FadeIn.duration(300).springify()}
      exiting={FadeOut.duration(200)}
    >
      <Swipeable
        ref={setSwipeableRef}
        renderLeftActions={renderLeftActions}
        renderRightActions={renderRightActions}
        leftThreshold={30} // Lower threshold for more responsive interaction
        rightThreshold={30}
        leftOpenValue={120} // Limit left swipe (Log Usage button) to 120px like iMessage
        rightOpenValue={-120} // Limit right swipe (Available button) to 120px
        onSwipeableWillOpen={enhancedOnSwipeableWillOpen}
        onSwipeableOpen={enhancedOnSwipeableOpen}
        friction={1.8} // Optimized friction for premium feel
        overshootFriction={8} // Refined overshoot for better control
        useNativeAnimations={true} // Use native animations for better performance
      >
        <TouchableOpacity
          ref={touchableRef}
          activeOpacity={1} // Prevent opacity change during swipe
          onPress={onTapPerk}
          onLongPress={onLongPressPerk}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
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
              {isRedeemed ? (
                <View style={styles.redeemedIconContainer}>
                  <Ionicons 
                    name={isAutoRedeemed ? 'sync-circle-outline' : 'checkmark-circle-outline'}
                    size={26} 
                    color={isAutoRedeemed ? PerkDesign.autoRedeemed.icon : PerkDesign.redeemed.icon}
                  />
                </View>
              ) : (
                <MerchantLogo 
                  perkName={perk.name}
                  size="medium"
                />
              )}
            </View>
            <View style={styles.perkTextContainerInsideItem}> 
              <Text style={[
                styles.perkName, 
                isRedeemed && !isAutoRedeemed && styles.perkNameRedeemed,
                isRedeemed && isAutoRedeemed && styles.perkNameAutoRedeemed
              ]}
              numberOfLines={1}
              ellipsizeMode="tail"
              >
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
              color={isRedeemed ? (isAutoRedeemed ? PerkDesign.autoRedeemed.border : ComponentColors.text.disabled) : ComponentColors.text.tertiary} 
              style={styles.perkChevron}
            />
            {/* Press feedback overlay */}
            <Reanimated.View 
              style={[styles.pressOverlay, pressOverlayStyle]}
              pointerEvents="none"
            />
        </TouchableOpacity>
      </Swipeable>
    </Reanimated.View>
  );
};

const styles = StyleSheet.create({
  perkContainerOuter: {
    marginVertical: Spacing.xs, // 4pt
    borderRadius: BorderRadius.xl, // 16pt - restore for proper iOS Messages style
    overflow: 'hidden',
  },
  perkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: ComponentSpacing.listItemPadding, // 16pt
    paddingHorizontal: ComponentSpacing.listItemPadding, // 16pt
    position: 'relative',
    overflow: 'hidden',
    minHeight: 72, // Ensure consistent height for swipe action alignment
    // Ensure this stays on top of swipe actions and maintains opacity
    zIndex: 10, // Higher z-index to stay above actions
    opacity: 1, // Force full opacity during swipe
  },
  perkContainerAvailable: {
    backgroundColor: PerkDesign.available.background,
    // Remove border to prevent border radius conflicts
    // iOS Messages style: remove LEFT corners where green action connects
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
    borderTopRightRadius: BorderRadius.xl, // 16pt
    borderBottomRightRadius: BorderRadius.xl, // 16pt
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
    backgroundColor: PerkDesign.redeemed.background,
    // iOS Messages style: remove RIGHT corners where blue action connects
    borderTopLeftRadius: BorderRadius.xl, // 16pt
    borderBottomLeftRadius: BorderRadius.xl, // 16pt
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
  },
  perkContainerAutoRedeemed: {
    backgroundColor: PerkDesign.autoRedeemed.background,
    // iOS Messages style: remove RIGHT corners where blue action connects
    borderTopLeftRadius: BorderRadius.xl, // 16pt
    borderBottomLeftRadius: BorderRadius.xl, // 16pt
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
  },
  perkContainerPartiallyRedeemed: {
    backgroundColor: PerkDesign.partiallyRedeemed.background,
    // Remove border to prevent border radius conflicts
    // iOS Messages style: remove LEFT corners where green action connects
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
    borderTopRightRadius: BorderRadius.xl, // 16pt
    borderBottomRightRadius: BorderRadius.xl, // 16pt
    ...Platform.select({
      ios: {
        shadowColor: PerkDesign.partiallyRedeemed.progress,
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
    width: 48, // Increased to accommodate logos
    alignItems: 'center',
    justifyContent: 'center',
  },
  redeemedIconContainer: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ComponentColors.background.tertiary,
    borderRadius: 12,
  },
  perkTextContainerInsideItem: {
    flex: 1,
    marginRight: Spacing.sm, // 8pt
    justifyContent: 'center',
  },
  perkName: {
    ...PerkDesign.available.typography,
    marginBottom: Spacing.xs, // 4pt
  },
  perkNameRedeemed: {
    color: PerkDesign.redeemed.text,
  },
  perkDescription: { 
    ...PerkDesign.available.descriptionTypography,
    color: ComponentColors.text.secondary,
  },
  perkDescriptionRedeemed: { 
    color: PerkDesign.redeemed.descriptionTypography.color,
  },
  perkValueContainer: {
    marginLeft: 'auto',
    paddingLeft: Spacing.sm, // 8pt
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
  },
  perkValue: {
    ...PerkDesign.available.valueTypography,
  },
  perkValueRedeemed: { 
    color: PerkDesign.redeemed.valueTypography.color,
  },
  perkChevron: {
    marginLeft: Spacing.sm, // 8pt
  },
  perkNameAutoRedeemed: { 
    color: PerkDesign.autoRedeemed.text,
  },
  perkDescriptionAutoRedeemed: { 
    color: PerkDesign.autoRedeemed.descriptionTypography.color,
  },
  perkValueAutoRedeemed: { 
    color: PerkDesign.autoRedeemed.valueTypography.color,
  },
  perkValuePartiallyRedeemed: {
    color: PerkDesign.partiallyRedeemed.valueTypography.color,
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
  pressOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: BorderRadius.xl, // Match container radius
  },
});

export default React.memo(PerkRow); 