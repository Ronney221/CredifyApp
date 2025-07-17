import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Platform, Modal } from 'react-native';
import { MotiView, MotiText } from 'moti';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
  useAnimatedProps,
} from 'react-native-reanimated';
import { Colors } from '../../constants/Colors';
import Svg, { Defs, Rect, Mask } from 'react-native-svg';

const AnimatedRect = Animated.createAnimatedComponent(Rect);

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

  useEffect(() => {
    if (visible && highlightedElementLayout) {
      // Create synchronized pulsing effect for both glow and mask
      const animationConfig = {
        duration: 1000,
        easing: Easing.inOut(Easing.ease)
      };
      
      glowScale.value = withRepeat(
        withSequence(
          withTiming(1.05, animationConfig),
          withTiming(1, animationConfig)
        ),
        -1,
        true
      );

      maskScale.value = withRepeat(
        withSequence(
          withTiming(1.05, animationConfig), // Match the glow scale exactly
          withTiming(1, animationConfig)
        ),
        -1,
        true
      );

      glowOpacity.value = withRepeat(
        withSequence(
          withTiming(0.5, animationConfig),
          withTiming(0.3, animationConfig)
        ),
        -1,
        true
      );
    } else {
      glowScale.value = 1;
      glowOpacity.value = 0.3;
      maskScale.value = 1;
    }
  }, [visible, highlightedElementLayout]);

  const glowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: glowScale.value }],
    opacity: glowOpacity.value,
  }));

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
  
  console.log('[OnboardingOverlay] Received layout:', { x, y, width, height });
  
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

        {/* Animated glow effect around the highlighted element */}
        <Animated.View
          style={[
            styles.glowEffect,
            {
              position: 'absolute',
              left: x - 2,
              top: y - 2, // This y already includes the -2 adjustment
              width: width + 4,
              height: height + 4,
            },
            glowStyle,
          ]}
          pointerEvents="none"
        />

        {/* Tooltip */}
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 300, delay: 200 }}
          style={[
            styles.tooltip,
            {
              position: 'absolute',
              left: tooltipX,
              top: tooltipY,
            },
          ]}
          pointerEvents="box-none"
        >
          <View style={styles.tooltipContent}>
            <MotiText
              from={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ type: 'timing', duration: 300, delay: 400 }}
              style={styles.tooltipTitle}
            >
              Tap any perk to see redemption tips and a shortcut to the app.
            </MotiText>
            
            <TouchableOpacity
              style={styles.gotItButton}
              onPress={onDismiss}
              activeOpacity={0.8}
            >
              <Text style={styles.gotItButtonText}>Got it!</Text>
            </TouchableOpacity>
          </View>
          
          {/* Tooltip arrow */}
          <View style={styles.tooltipArrow} />
        </MotiView>
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
    borderRadius: 16, // Match PerkRow border radius
    borderWidth: 3,
    borderColor: Colors.light.tint,
    backgroundColor: 'transparent',
    shadowColor: Colors.light.tint,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 12,
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  tooltip: {
    position: 'absolute',
    width: 280,
    maxWidth: screenWidth - 32,
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
  },
});

export default OnboardingOverlay;