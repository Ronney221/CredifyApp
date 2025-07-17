import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Platform } from 'react-native';
import { MotiView, MotiText } from 'moti';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Colors } from '../../constants/Colors';

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
const screenHeight = Dimensions.get('window').height;

export const OnboardingOverlay: React.FC<OnboardingOverlayProps> = ({
  visible,
  onDismiss,
  highlightedElementLayout,
}) => {
  const glowScale = useSharedValue(1);
  const glowOpacity = useSharedValue(0.3);

  useEffect(() => {
    if (visible && highlightedElementLayout) {
      // Create a pulsing glow effect
      glowScale.value = withRepeat(
        withSequence(
          withTiming(1.05, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );

      glowOpacity.value = withRepeat(
        withSequence(
          withTiming(0.5, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.3, { duration: 1000, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
    } else {
      glowScale.value = 1;
      glowOpacity.value = 0.3;
    }
  }, [visible, highlightedElementLayout]);

  const glowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: glowScale.value }],
    opacity: glowOpacity.value,
  }));

  if (!visible || !highlightedElementLayout) {
    return null;
  }

  const { x, y, width, height } = highlightedElementLayout;

  // Calculate tooltip position
  const tooltipY = y + height + 20; // Position below the highlighted element
  const tooltipX = Math.max(16, Math.min(screenWidth - 280, x)); // Keep within screen bounds

  return (
    <View style={styles.overlay}>
      {/* Semi-transparent background with cutout */}
      <View style={styles.overlayBackground}>
        {/* Top section */}
        <View style={[styles.overlaySection, { height: y }]} />
        
        {/* Middle section with horizontal parts */}
        <View style={[styles.overlaySection, { height: height }]}>
          {/* Left part */}
          <View style={[styles.overlaySection, { width: x }]} />
          
          {/* Cutout (transparent area) */}
          <View style={{ width: width, height: height }} />
          
          {/* Right part */}
          <View style={[styles.overlaySection, { width: screenWidth - x - width }]} />
        </View>
        
        {/* Bottom section */}
        <View style={[styles.overlaySection, { height: screenHeight - y - height }]} />
      </View>

      {/* Animated glow effect around the highlighted element */}
      <Animated.View
        style={[
          styles.glowEffect,
          {
            left: x - 4,
            top: y - 4,
            width: width + 8,
            height: height + 8,
          },
          glowStyle,
        ]}
      />

      {/* Tooltip */}
      <MotiView
        from={{ opacity: 0, translateY: 20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 300, delay: 200 }}
        style={[
          styles.tooltip,
          {
            left: tooltipX,
            top: tooltipY,
          },
        ]}
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
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
  },
  overlayBackground: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  overlaySection: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    flexDirection: 'row',
  },
  glowEffect: {
    position: 'absolute',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: Colors.light.tint,
    shadowColor: Colors.light.tint,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    ...Platform.select({
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