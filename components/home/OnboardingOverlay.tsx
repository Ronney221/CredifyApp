import React, { useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Platform, Modal } from 'react-native';
import { MotiView, MotiText } from 'moti';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
  withDelay,
  Easing,
  useAnimatedProps,
  interpolate,
  runOnJS,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import Svg, { Defs, Rect, Mask, Circle, G } from 'react-native-svg';
import { logger } from '../../utils/logger';

const AnimatedRect = Animated.createAnimatedComponent(Rect);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedG = Animated.createAnimatedComponent(G);

interface OnboardingOverlayProps {
  visible: boolean;
  onDismiss: () => void;
  highlightedElementLayout?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

const screenWidth = Dimensions.get('window').width;

export const OnboardingOverlay: React.FC<OnboardingOverlayProps> = ({
  visible,
  onDismiss,
  highlightedElementLayout,
}) => {
  const glowScale = useSharedValue(1);
  const glowOpacity = useSharedValue(0.3);
  const maskScale = useSharedValue(1);
  
  // Simplified premium animation values
  const tooltipEntrance = useSharedValue(0);
  
  // Premium spring configurations
  const premiumSpring = {
    damping: 16,
    stiffness: 400,
    mass: 0.8,
  };
  
  const softSpring = {
    damping: 20,
    stiffness: 200,
    mass: 1.2,
  };
  
  // Enhanced haptic feedback
  const triggerHaptic = useCallback((type: 'light' | 'medium' | 'heavy' | 'success') => {
    if (Platform.OS === 'ios') {
      switch (type) {
        case 'light':
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          break;
        case 'medium':
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          break;
        case 'heavy':
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          break;
        case 'success':
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          break;
      }
    }
  }, []);

  useEffect(() => {
    if (visible && highlightedElementLayout) {
      // Trigger entrance haptic
      runOnJS(triggerHaptic)('medium');
      
      // Synchronized pulsing with premium timing
      const pulseConfig = {
        duration: 1500,
        easing: Easing.bezier(0.4, 0.0, 0.2, 1),
      };
      
      // Synchronized glow and mask animations
      const sharedPulse = withRepeat(
        withSequence(
          withTiming(1.06, pulseConfig),
          withTiming(1, pulseConfig)
        ),
        -1,
        true
      );
      
      glowScale.value = sharedPulse;
      maskScale.value = sharedPulse;

      glowOpacity.value = withRepeat(
        withSequence(
          withTiming(0.7, pulseConfig),
          withTiming(0.4, pulseConfig)
        ),
        -1,
        true
      );
      
      // Smooth tooltip entrance
      tooltipEntrance.value = withDelay(400,
        withSpring(1, {
          damping: 20,
          stiffness: 300,
          mass: 1,
        })
      );
      
    } else {
      // Reset animations
      glowScale.value = 1;
      glowOpacity.value = 0.3;
      maskScale.value = 1;
      tooltipEntrance.value = 0;
    }
  }, [visible, highlightedElementLayout, triggerHaptic]);

  const glowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: glowScale.value }],
    opacity: glowOpacity.value,
  }));
  
  // Premium tooltip animation
  const tooltipStyle = useAnimatedStyle(() => {
    const progress = tooltipEntrance.value;
    return {
      opacity: interpolate(progress, [0, 1], [0, 1]),
      transform: [
        { translateY: interpolate(progress, [0, 1], [20, 0]) },
        { scale: interpolate(progress, [0, 0.9, 1], [0.9, 1.02, 1]) }
      ],
    };
  });

  // Animated props for the SVG mask cutout - must be called on every render
  const animatedMaskProps = useAnimatedProps(() => {
    if (!highlightedElementLayout) {
      return {
        x: 0,
        y: 0,
        width: 0,
        height: 0,
      };
    }
    
    const scale = maskScale.value;
    // Calculate the expansion from center
    const widthExpansion = (highlightedElementLayout.width * (scale - 1)) / 2;
    const heightExpansion = (highlightedElementLayout.height * (scale - 1)) / 2;
    
    // Add a small offset to compensate for any measurement discrepancies
    const y = highlightedElementLayout.y - 2;
    
    return {
      x: highlightedElementLayout.x - widthExpansion,
      y: y - heightExpansion,
      width: highlightedElementLayout.width * scale,
      height: highlightedElementLayout.height * scale,
    };
  });

  if (!visible || !highlightedElementLayout) {
    return null;
  }

  // Now we have absolute screen coordinates from measure()
  // Add a small offset to compensate for any measurement discrepancies
  const { x, y: rawY, width, height } = highlightedElementLayout;
  const y = rawY - 2; // Slight upward adjustment to compensate for positioning
  
  logger.log('[OnboardingOverlay] Received layout:', { x, y, width, height });
  
  // Calculate tooltip position
  const tooltipY = y + height + 20;
  const tooltipX = Math.max(16, Math.min(screenWidth - 296, x));

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      statusBarTranslucent={true}
      onRequestClose={onDismiss}
    >
      <View style={styles.modalContainer} pointerEvents="box-only">
        {/* Full screen overlay that blocks all interactions */}
        {/* SVG Mask for rounded corner cutout */}
        <Svg
          width={screenWidth}
          height={Dimensions.get('window').height}
          style={StyleSheet.absoluteFillObject}
          pointerEvents="none"
        >
          <Defs>
            <Mask id="mask">
              {/* Fill entire screen with white (visible) */}
              <Rect x="0" y="0" width="100%" height="100%" fill="white" />
              {/* Cut out the highlighted area with rounded corners - animated */}
              <AnimatedRect
                animatedProps={animatedMaskProps}
                rx={16}
                ry={16}
                fill="black"
              />
            </Mask>
          </Defs>
          {/* Apply mask to dark overlay */}
          <Rect
            x="0"
            y="0"
            width="100%"
            height="100%"
            fill="rgba(0, 0, 0, 0.75)"
            mask="url(#mask)"
          />
        </Svg>
        
        {/* Invisible touch handler for dismissing */}
        <TouchableOpacity
          style={styles.fullScreenOverlay}
          activeOpacity={1}
          onPress={onDismiss}
        />

        {/* Clean premium glow effect */}
        <Animated.View
          style={[
            styles.glowEffect,
            {
              position: 'absolute',
              left: x - 3,
              top: y - 3,
              width: width + 6,
              height: height + 6,
            },
            glowStyle,
          ]}
          pointerEvents="none"
        />

        {/* Premium tooltip with enhanced animations */}
        <Animated.View
          style={[
            styles.tooltip,
            {
              position: 'absolute',
              left: tooltipX,
              top: tooltipY,
            },
            tooltipStyle,
          ]}
          pointerEvents="box-none"
        >
          <View style={styles.premiumTooltipContent}>
            <View style={styles.tooltipHeader}>
              <View style={styles.tooltipIcon}>
                <Ionicons name="bulb" size={24} color={Colors.light.tint} />
              </View>
              <MotiText
                from={{ opacity: 0, translateX: -10 }}
                animate={{ opacity: 1, translateX: 0 }}
                transition={{ 
                  type: 'spring',
                  damping: 18,
                  stiffness: 300,
                  delay: 600
                }}
                style={styles.tooltipTitle}
              >
                Quick Tip
              </MotiText>
            </View>
            
            <MotiText
              from={{ opacity: 0, translateY: 10 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ 
                type: 'spring',
                damping: 18,
                stiffness: 300,
                delay: 700
              }}
              style={styles.tooltipDescription}
            >
              Tap any perk to see redemption tips and shortcuts to open the app directly.
            </MotiText>
            
            <MotiView
              from={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ 
                type: 'spring',
                damping: 16,
                stiffness: 400,
                delay: 800
              }}
              style={styles.buttonContainer}
            >
              <TouchableOpacity
                style={styles.premiumGotItButton}
                onPress={() => {
                  triggerHaptic('success');
                  onDismiss();
                }}
                activeOpacity={0.9}
              >
                <Text style={styles.premiumGotItButtonText}>Got it!</Text>
                <Ionicons name="checkmark" size={16} color="#FFFFFF" style={{ marginLeft: 4 }} />
              </TouchableOpacity>
            </MotiView>
          </View>
          
          {/* Enhanced tooltip arrow with shadow */}
          <View style={styles.tooltipArrow} />
          <View style={styles.tooltipArrowShadow} />
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
  },
  fullScreenOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  glowEffect: {
    position: 'absolute',
    borderRadius: 16,
    borderWidth: 2.5,
    borderColor: Colors.light.tint,
    backgroundColor: 'transparent',
    shadowColor: Colors.light.tint,
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.9,
        shadowRadius: 15,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  tooltip: {
    position: 'absolute',
    width: 280,
    maxWidth: screenWidth - 32,
  },
  premiumTooltipContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    paddingTop: 20,
    alignItems: 'stretch',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  tooltipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  tooltipIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  tooltipTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1c1c1e',
    letterSpacing: -0.2,
  },
  tooltipDescription: {
    fontSize: 15,
    fontWeight: '400',
    color: '#3c3c43',
    lineHeight: 21,
    marginBottom: 20,
  },
  buttonContainer: {
    alignItems: 'center',
  },
  premiumGotItButton: {
    backgroundColor: Colors.light.tint,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 28,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    minWidth: 140,
    shadowColor: Colors.light.tint,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  premiumGotItButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  tooltipContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    paddingTop: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  tooltipTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1c1c1e',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  gotItButton: {
    backgroundColor: Colors.light.tint,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
    minWidth: 120,
  },
  gotItButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  tooltipArrow: {
    position: 'absolute',
    top: -8,
    left: '50%',
    marginLeft: -8,
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderBottomWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#FFFFFF',
    zIndex: 2,
  },
  tooltipArrowShadow: {
    position: 'absolute',
    top: -9,
    left: '50%',
    marginLeft: -8,
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderBottomWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
    zIndex: 1,
  },
});

export default OnboardingOverlay;