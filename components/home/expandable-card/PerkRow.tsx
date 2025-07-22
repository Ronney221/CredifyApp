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
  withSequence,
  useAnimatedGestureHandler
} from 'react-native-reanimated';
import { PanGestureHandler, PanGestureHandlerGestureEvent } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { CardPerk, calculatePerkExpiryDate } from '../../../src/data/card-data';
import PerkUrgencyIndicator from '../PerkUrgencyIndicator';
import PartialRedemptionProgress from '../PartialRedemptionProgress';
import MerchantLogo from '../MerchantLogo';
import { Spacing, ComponentSpacing, BorderRadius } from '../../../constants/Spacing';
import { PerkDesign, ComponentColors } from '../../../constants/DesignSystem';
import { logger } from '../../../utils/logger';



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
  setSwipeableRef: (ref: any) => void;
  renderLeftActions?: (animatedActionStyle?: any, iconAnimatedStyle?: any) => React.ReactNode;
  renderRightActions?: (animatedActionStyle?: any, iconAnimatedStyle?: any) => React.ReactNode;
  onLayout?: (layout: {x: number; y: number; width: number; height: number}) => void;
  onInstantLog?: (perk: CardPerk, amount: number) => void;
  onSaveLog?: (amount: number) => void;
  onOpenLoggingModal?: (perk: CardPerk) => void;
  onInstantMarkAvailable?: (perk: CardPerk) => void;
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
  onInstantLog,
  onSaveLog,
  onOpenLoggingModal,
  onInstantMarkAvailable,
}) => {
  const isRedeemed = perk.status === 'redeemed';
  const isPartiallyRedeemed = perk.status === 'partially_redeemed';
  const touchableRef = useRef<TouchableOpacity | null>(null);
  
  // Advanced micro-interaction state
  const [isPressed, setIsPressed] = useState(false);
  const pressOpacity = useSharedValue(0);
  
  // Gesture constants
  const SHORT_SWIPE_THRESHOLD = 80;
  const LONG_SWIPE_THRESHOLD = 180;
  const ACTION_BUTTON_WIDTH = 120;
  const INSTANT_LOG_ANIMATION_DURATION = 300;
  
  // Enhanced haptic thresholds for escalating intensity
  const HAPTIC_THRESHOLD_1 = 45; // 25% - Ultra-light haptic
  const HAPTIC_THRESHOLD_2 = 80; // 45% - Light haptic  
  const HAPTIC_THRESHOLD_3 = 135; // 75% - Medium haptic
  const HAPTIC_THRESHOLD_4 = 180; // 100% - Success haptic
  
  // Shared values for gesture
  const translateX = useSharedValue(0);
  const isGestureActive = useSharedValue(false);
  
  // Create a ref object for external control
  React.useImperativeHandle(setSwipeableRef, () => ({
    close: () => {
      translateX.value = withSpring(0, springConfig);
    }
  }), []);
  
  // Premium spring configuration for Apple-quality animations
  const springConfig = {
    damping: 20,
    stiffness: 300,
    mass: 1,
    restDisplacementThreshold: 0.01,
    restSpeedThreshold: 0.01,
  };
  
  // Enhanced haptic feedback for escalating intensity
  const triggerHapticFeedback = (type: 'ultralight' | 'light' | 'medium' | 'success' | 'warning' | 'completion') => {
    if (Platform.OS === 'ios') {
      switch (type) {
        case 'ultralight':
          // Subtle selection feedback for initial engagement
          Haptics.selectionAsync();
          break;
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
        case 'completion':
          // Custom pattern: Success + 3 quick light pulses for celebration
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light), 100);
          setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light), 200);
          setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light), 300);
          break;
      }
    }
  };
  
  // Enhanced press interactions with visible feedback
  const handlePressIn = () => {
    setIsPressed(true);
    pressOpacity.value = withTiming(1, { duration: 100 });
    // Removed haptic feedback on press to reduce excessive haptics
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
  
  // Track which haptic thresholds have been triggered
  const hasTriggeredHaptic1 = useSharedValue(false); // Ultra-light
  const hasTriggeredHaptic2 = useSharedValue(false); // Light
  const hasTriggeredHaptic3 = useSharedValue(false); // Medium
  const hasTriggeredHaptic4 = useSharedValue(false); // Success
  
  // Handle instant log for long swipe
  const handleInstantLog = () => {
    logger.log('[PerkRow] handleInstantLog called for perk:', perk.name, 'status:', perk.status);
    
    if (perk.status === 'available' || perk.status === 'partially_redeemed') {
      logger.log('[PerkRow] Perk is available, proceeding with instant log');
      
      // Flash success animation
      flashOpacity.value = withSequence(
        withTiming(0.3, { duration: 100 }),
        withTiming(0, { duration: 200 })
      );
      
      // Calculate the amount to log
      const amountToLog = perk.status === 'partially_redeemed' 
        ? (perk.remaining_value || perk.value)
        : perk.value;
      
      logger.log('[PerkRow] Amount to log:', amountToLog, 'onInstantLog available:', !!onInstantLog, 'onSaveLog available:', !!onSaveLog, 'onOpenLoggingModal available:', !!onOpenLoggingModal);
      
      // Trigger instant logging with full amount - this should directly save the log
      if (onInstantLog) {
        logger.log('[PerkRow] Calling onInstantLog');
        onInstantLog(perk, amountToLog);
      } else if (onSaveLog) {
        logger.log('[PerkRow] Calling onSaveLog as fallback');
        onSaveLog(amountToLog);
      } else {
        logger.log('[PerkRow] No direct logging methods available, falling back to simulating button press');
        // As a fallback, trigger the left action button which opens the modal
        // The user can then use the "Log Full Amount" button in the modal
        onSwipeableOpen('left');
      }
    } else {
      logger.log('[PerkRow] Perk not available for instant log, status:', perk.status);
    }
  };
  
  // Handle instant mark available for long swipe on redeemed perks
  const handleInstantMarkAvailable = () => {
    logger.log('[PerkRow] handleInstantMarkAvailable called for perk:', perk.name, 'status:', perk.status);
    
    if (perk.status === 'redeemed' || perk.status === 'partially_redeemed') {
      logger.log('[PerkRow] Perk is redeemed, proceeding with instant mark available');
      
      // Flash success animation
      flashOpacity.value = withSequence(
        withTiming(0.3, { duration: 100 }),
        withTiming(0, { duration: 200 })
      );
      
      logger.log('[PerkRow] onInstantMarkAvailable available:', !!onInstantMarkAvailable);
      
      // Trigger instant mark available
      if (onInstantMarkAvailable) {
        logger.log('[PerkRow] Calling onInstantMarkAvailable');
        onInstantMarkAvailable(perk);
      } else {
        logger.log('[PerkRow] No instant mark available method available, falling back to simulating button press');
        // As a fallback, trigger the right action button which opens the modal
        onSwipeableOpen('right');
      }
    } else {
      logger.log('[PerkRow] Perk not redeemed for instant mark available, status:', perk.status);
    }
  };
  
  // Pre-calculate status to avoid accessing perk.status in animated context
  const isAvailable = perk.status === 'available' || perk.status === 'partially_redeemed';
  
  // Track the starting position for continuous gestures
  const gestureStartX = useSharedValue(0);
  
  // Gesture handler for pan
  const gestureHandler = useAnimatedGestureHandler<PanGestureHandlerGestureEvent>({
    onStart: () => {
      isGestureActive.value = true;
      // Always reset all haptic flags on gesture start for consistent feedback
      hasTriggeredHaptic1.value = false;
      hasTriggeredHaptic2.value = false;
      hasTriggeredHaptic3.value = false;
      hasTriggeredHaptic4.value = false;
      // Remember the current position when starting a new gesture
      gestureStartX.value = translateX.value;
    },
    onActive: (event) => {
      // Calculate new position based on starting position + translation
      const newTranslateX = gestureStartX.value + event.translationX;
      const previousTranslateX = translateX.value;
      
      if (isAvailable) {
        // For available perks, allow right swipe only (positive translateX)
        // Allow swipe beyond ACTION_BUTTON_WIDTH for long swipe
        translateX.value = Math.max(0, newTranslateX);
        
        // Reset haptic flags if direction changes or value decreases significantly
        if (translateX.value < previousTranslateX - 10) {
          hasTriggeredHaptic1.value = false;
          hasTriggeredHaptic2.value = false;
          hasTriggeredHaptic3.value = false;
          hasTriggeredHaptic4.value = false;
        }
        
        // Escalating haptic feedback system
        // 25% threshold - Ultra-light haptic (initial engagement)
        if (translateX.value >= HAPTIC_THRESHOLD_1 && !hasTriggeredHaptic1.value) {
          hasTriggeredHaptic1.value = true;
          runOnJS(triggerHapticFeedback)('ultralight');
        }
        
        // 45% threshold - Light haptic (committed to action)
        if (translateX.value >= HAPTIC_THRESHOLD_2 && !hasTriggeredHaptic2.value) {
          hasTriggeredHaptic2.value = true;
          runOnJS(triggerHapticFeedback)('light');
        }
        
        // 75% threshold - Medium haptic (approaching completion)
        if (translateX.value >= HAPTIC_THRESHOLD_3 && !hasTriggeredHaptic3.value) {
          hasTriggeredHaptic3.value = true;
          runOnJS(triggerHapticFeedback)('medium');
        }
        
        // 100% threshold - Success haptic (ready for instant action)
        if (translateX.value >= HAPTIC_THRESHOLD_4 && !hasTriggeredHaptic4.value) {
          hasTriggeredHaptic4.value = true;
          runOnJS(triggerHapticFeedback)('success');
        }
      } else {
        // For redeemed perks, allow left swipe only (negative translateX)
        // Allow swipe beyond ACTION_BUTTON_WIDTH for long swipe
        translateX.value = Math.min(0, newTranslateX);
        
        // Reset haptic flags if direction changes or value increases significantly (less negative)
        if (translateX.value > previousTranslateX + 10) {
          hasTriggeredHaptic1.value = false;
          hasTriggeredHaptic2.value = false;
          hasTriggeredHaptic3.value = false;
          hasTriggeredHaptic4.value = false;
        }
        
        // Escalating haptic feedback system for left swipe
        const absTranslateX = Math.abs(translateX.value);
        
        // 25% threshold - Ultra-light haptic
        if (absTranslateX >= HAPTIC_THRESHOLD_1 && !hasTriggeredHaptic1.value) {
          hasTriggeredHaptic1.value = true;
          runOnJS(triggerHapticFeedback)('ultralight');
        }
        
        // 45% threshold - Light haptic
        if (absTranslateX >= HAPTIC_THRESHOLD_2 && !hasTriggeredHaptic2.value) {
          hasTriggeredHaptic2.value = true;
          runOnJS(triggerHapticFeedback)('light');
        }
        
        // 75% threshold - Medium haptic
        if (absTranslateX >= HAPTIC_THRESHOLD_3 && !hasTriggeredHaptic3.value) {
          hasTriggeredHaptic3.value = true;
          runOnJS(triggerHapticFeedback)('medium');
        }
        
        // 100% threshold - Success haptic
        if (absTranslateX >= HAPTIC_THRESHOLD_4 && !hasTriggeredHaptic4.value) {
          hasTriggeredHaptic4.value = true;
          runOnJS(triggerHapticFeedback)('success');
        }
      }
    },
    onEnd: () => {
      const absTranslateX = Math.abs(translateX.value);
      
      if (isAvailable && translateX.value >= LONG_SWIPE_THRESHOLD) {
        // Long swipe right on available perk - trigger instant log with celebration haptic
        runOnJS(triggerHapticFeedback)('completion');
        runOnJS(handleInstantLog)();
        // Animate back to closed position after a brief pause
        translateX.value = withSequence(
          withTiming(LONG_SWIPE_THRESHOLD + 20, { duration: 100 }),
          withSpring(0, springConfig)
        );
      } else if (!isAvailable && translateX.value <= -LONG_SWIPE_THRESHOLD) {
        // Long swipe left on redeemed perk - trigger instant mark available with celebration haptic
        runOnJS(triggerHapticFeedback)('completion');
        runOnJS(handleInstantMarkAvailable)();
        // Animate back to closed position after a brief pause
        translateX.value = withSequence(
          withTiming(-LONG_SWIPE_THRESHOLD - 20, { duration: 100 }),
          withSpring(0, springConfig)
        );
      } else if (absTranslateX >= SHORT_SWIPE_THRESHOLD) {
        // Short swipe - snap to open position
        if (isAvailable) {
          translateX.value = withSpring(ACTION_BUTTON_WIDTH, springConfig);
          runOnJS(enhancedOnSwipeableOpen)('left');
        } else {
          translateX.value = withSpring(-ACTION_BUTTON_WIDTH, springConfig);
          runOnJS(enhancedOnSwipeableOpen)('right');
        }
      } else {
        // Didn't pass threshold - snap back to closed
        translateX.value = withSpring(0, springConfig);
      }
      
      // Reset haptic flags when gesture ends and item returns to closed position
      if (Math.abs(translateX.value) < HAPTIC_THRESHOLD_1) {
        hasTriggeredHaptic1.value = false;
        hasTriggeredHaptic2.value = false;
        hasTriggeredHaptic3.value = false;
        hasTriggeredHaptic4.value = false;
      }
      
      isGestureActive.value = false;
    },
  });
  
  // Success flash animation
  const flashOpacity = useSharedValue(0);
  
  // Animated style for the swipeable content
  const animatedStyle = useAnimatedStyle(() => {
    // Add slight scale effect when approaching long swipe threshold
    const scale = interpolate(
      translateX.value,
      [0, LONG_SWIPE_THRESHOLD - 20, LONG_SWIPE_THRESHOLD],
      [1, 1, 1.02],
      'clamp'
    );
    
    // Dynamic border radius based on swipe position
    let borderTopLeftRadius = 16; // BorderRadius.xl
    let borderBottomLeftRadius = 16;
    let borderTopRightRadius = 16;
    let borderBottomRightRadius = 16;
    
    if (isAvailable) {
      // For available perks, remove right corners when swiping right
      const rightRadiusProgress = interpolate(
        translateX.value,
        [0, 20],
        [1, 0],
        'clamp'
      );
      borderTopRightRadius = 16 * rightRadiusProgress;
      borderBottomRightRadius = 16 * rightRadiusProgress;
    } else {
      // For redeemed perks, remove left corners when swiping left
      const leftRadiusProgress = interpolate(
        Math.abs(translateX.value),
        [0, 20],
        [1, 0],
        'clamp'
      );
      borderTopLeftRadius = 16 * leftRadiusProgress;
      borderBottomLeftRadius = 16 * leftRadiusProgress;
    }
    
    return {
      transform: [
        { translateX: translateX.value },
        { scale }
      ],
      borderTopLeftRadius,
      borderBottomLeftRadius,
      borderTopRightRadius,
      borderBottomRightRadius,
      zIndex: 5, // Above the action buttons but allow action items to show
    };
  });

  // Animated style for action buttons - smaller at half swipe, expands at full swipe
  const animatedActionStyle = useAnimatedStyle(() => {
    const currentSwipeDistance = Math.abs(translateX.value);
    
    // Double the circle size and reduce max width by 20px
    const circleSize = 100; // Double the previous 50px circle button size
    const maxWidth = 180; // Reduced by 20px from previous 200px
    
    // Two-stage animation: small circle until 3/4 swipe, then expand
    const expandThreshold = LONG_SWIPE_THRESHOLD * 0.75;
    
    const expandedWidth = currentSwipeDistance < expandThreshold
      ? circleSize // Stay small until 3/4 of the way
      : interpolate(
          currentSwipeDistance,
          [expandThreshold, LONG_SWIPE_THRESHOLD],
          [circleSize, maxWidth],
          'clamp'
        );
    
    // Maintain circle shape until expansion
    const borderRadius = currentSwipeDistance < expandThreshold
      ? circleSize / 2 // Perfect circle
      : Math.min(expandedWidth / 2, 30); // Transition to pill shape
    
    // Subtle scale effect only - no glow to keep icons crisp
    const scale = interpolate(
      currentSwipeDistance,
      [LONG_SWIPE_THRESHOLD * 0.85, LONG_SWIPE_THRESHOLD],
      [1, 1.02], // Subtle scaling for visual feedback
      'clamp'
    );
    
    return {
      width: expandedWidth,
      borderRadius,
      transform: [{ scale }],
      // No animated shadows - keep static values from styles for crisp rendering
    };
  });

  // Animated style for icon movement - iOS 26 iMessage style
  const iconAnimatedStyle = useAnimatedStyle(() => {
    const currentSwipeDistance = Math.abs(translateX.value);
    
    // Get current button width for calculating edge position
    const currentWidth = interpolate(
      currentSwipeDistance,
      [0, LONG_SWIPE_THRESHOLD],
      [100, 180], // Updated min to max width to match animatedActionStyle
      'clamp'
    );
    
    // Calculate distance to move icon further from edge when fully expanded
    // Button width / 2 gives us center to edge distance, minus padding for icon size + 5px extra
    const edgeDistance = (currentWidth / 2) - 25; // 25px = 20px for icon + 5px further from edge
    
    // Only move icon after crossing the full swipe threshold
    const hasPassedThreshold = currentSwipeDistance >= LONG_SWIPE_THRESHOLD;
    
    // For left action (available perks), move icon to the right edge
    // For right action (redeemed perks), move icon to the left edge
    const translateDirection = isAvailable ? edgeDistance : -edgeDistance;
    
    // Add smooth animation with timing
    const animatedTranslateX = hasPassedThreshold 
      ? withTiming(translateDirection, { duration: 200 })
      : withTiming(0, { duration: 200 });
    
    // Keep icons at fixed scale for crisp rendering - no scaling animation
    // Only animate position for smooth movement
    return {
      transform: [
        { translateX: animatedTranslateX }
      ],
    };
  });
  
  // Flash overlay for success animation
  const flashOverlayStyle = useAnimatedStyle(() => {
    return {
      opacity: flashOpacity.value,
      backgroundColor: '#34C759', // iOS green
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
      {/* Action buttons layer - behind the main content */}
      <View style={styles.actionsContainer}>
        {/* Left action (Log Usage) - for available perks */}
        {(perk.status === 'available' || perk.status === 'partially_redeemed') && renderLeftActions && (
          <View style={styles.leftActionContainer}>
            {renderLeftActions(animatedActionStyle, iconAnimatedStyle)}
          </View>
        )}
        {/* Right action (Available) - for redeemed perks */}
        {perk.status === 'redeemed' && renderRightActions && (
          <View style={styles.rightActionContainer}>
            {renderRightActions(animatedActionStyle, iconAnimatedStyle)}
          </View>
        )}
      </View>
      
      <PanGestureHandler onGestureEvent={gestureHandler}>
        <Reanimated.View style={animatedStyle}>
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
                logger.log('[PerkRow] Measured layout:', { pageX, pageY, width, height, perkName: perk.name });
                onLayout({ x: pageX, y: pageY, width, height });
              });
            }, 500); // Increased delay to account for expansion animation
          } : undefined}
        >
            <View style={styles.perkIconContainer}>
              {isRedeemed ? (
                <View style={styles.redeemedIconWrapper}>
                  <MerchantLogo 
                    perkName={perk.name}
                    size="medium"
                  />
                  <View style={[
                    styles.redeemedBadge,
                    isAutoRedeemed && styles.autoRedeemedBadge
                  ]}>
                    <Ionicons 
                      name={isAutoRedeemed ? 'sync' : 'checkmark'}
                      size={12} 
                      color="#fff"
                    />
                  </View>
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
              {/* Urgency indicator for available perks, reset indicator for redeemed perks */}
              <View style={styles.urgencyIndicatorContainer}>
                <PerkUrgencyIndicator 
                  perk={perk} 
                  size="small"
                  showResetCountdown={isRedeemed}
                />
              </View>
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
            {/* Success flash overlay */}
            <Reanimated.View 
              style={[styles.flashOverlay, flashOverlayStyle]}
              pointerEvents="none"
            />
          </TouchableOpacity>
        </Reanimated.View>
      </PanGestureHandler>
    </Reanimated.View>
  );
};

const styles = StyleSheet.create({
  perkContainerOuter: {
    marginVertical: Spacing.xs, // 4pt
    borderRadius: BorderRadius.xl, // 16pt - restore for proper iOS Messages style
    overflow: 'visible', // Allow action items to be visible outside container
  },
  perkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: ComponentSpacing.listItemPadding, // 16pt
    paddingHorizontal: ComponentSpacing.listItemPadding, // 16pt
    position: 'relative',
    minHeight: 72, // Ensure consistent height for swipe action alignment
    backgroundColor: '#FFFFFF', // Ensure opaque background to hide actions behind
  },
  perkContainerAvailable: {
    backgroundColor: PerkDesign.available.background,
    borderTopLeftRadius: BorderRadius.xl,
    borderBottomLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    borderBottomRightRadius: BorderRadius.xl,
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
    borderTopLeftRadius: BorderRadius.xl,
    borderBottomLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    borderBottomRightRadius: BorderRadius.xl,
  },
  perkContainerAutoRedeemed: {
    backgroundColor: PerkDesign.autoRedeemed.background,
    borderTopLeftRadius: BorderRadius.xl,
    borderBottomLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    borderBottomRightRadius: BorderRadius.xl,
  },
  perkContainerPartiallyRedeemed: {
    backgroundColor: PerkDesign.partiallyRedeemed.background,
    borderTopLeftRadius: BorderRadius.xl,
    borderBottomLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    borderBottomRightRadius: BorderRadius.xl,
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
  redeemedIconWrapper: {
    position: 'relative',
    width: 48,
    height: 48,
  },
  redeemedBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: PerkDesign.redeemed.icon,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  autoRedeemedBadge: {
    backgroundColor: PerkDesign.autoRedeemed.icon,
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
    minWidth: 155, // Ensure minimum width for full text including 'd'
    flexShrink: 0, // Prevent shrinking
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
  flashOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: BorderRadius.xl, // Match container radius
  },
  actionsContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 3, // Higher to ensure visibility
  },
  leftActionContainer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 240, // Allow space for max expansion (200px + margins)
    overflow: 'visible', // Allow action items to be fully visible
    zIndex: 4, // Above actions container
  },
  rightActionContainer: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 240, // Allow space for max expansion (200px + margins)
    overflow: 'visible', // Allow action items to be fully visible
    alignItems: 'flex-end', // Align action to the right side of container
    zIndex: 4, // Above actions container
  },
});

export default React.memo(PerkRow); 