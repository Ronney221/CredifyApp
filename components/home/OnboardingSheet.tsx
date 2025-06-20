import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { PanGestureHandler } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedGestureHandler,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  runOnJS,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';

// Define colors
const COLORS = {
  primary: '#4A90E2', // Lighter blue
  secondary: '#8A7AD6', // Lighter purple
  tertiary: '#5CB85C', // Lighter green
  background: '#F8F8F8',
  text: {
    primary: '#1C1C1E',
    secondary: '#666666',
  },
  border: 'rgba(60, 60, 67, 0.1)',
};

// Define layout constants
const LAYOUT = {
  iconSize: 44,
  gutter: 16,
  itemSpacing: 24,
  modalPadding: 24,
};

interface OnboardingSheetProps {
  visible: boolean;
  onDismiss: () => void;
}

// Animated components for each tip
const TapAnimation = () => {
  const scale = useSharedValue(1);
  const rippleScale = useSharedValue(0);
  const rippleOpacity = useSharedValue(0);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(0.9, { duration: 400, easing: Easing.bezier(0.25, 0.1, 0.25, 1) }),
        withTiming(1, { duration: 400, easing: Easing.bezier(0.25, 0.1, 0.25, 1) })
      ),
      -1,
      true
    );

    rippleScale.value = withRepeat(
      withSequence(
        withTiming(0, { duration: 0 }),
        withTiming(1.5, { duration: 800, easing: Easing.bezier(0.25, 0.1, 0.25, 1) })
      ),
      -1,
      false
    );

    rippleOpacity.value = withRepeat(
      withSequence(
        withTiming(0.6, { duration: 0 }),
        withTiming(0, { duration: 800, easing: Easing.bezier(0.25, 0.1, 0.25, 1) })
      ),
      -1,
      false
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const rippleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: rippleScale.value }],
    opacity: rippleOpacity.value,
  }));

  return (
    <View style={styles.iconWrapper}>
      <Animated.View style={[styles.rippleContainer, rippleStyle]}>
        <View style={[styles.ripple, { backgroundColor: COLORS.tertiary }]} />
      </Animated.View>
      <Animated.View style={[styles.iconContainer, animatedStyle]}>
        <Ionicons name="hand-left" size={28} color={COLORS.tertiary} />
      </Animated.View>
    </View>
  );
};

const OpenAppAnimation = () => {
  const arrowTranslate = useSharedValue(0);
  const arrowOpacity = useSharedValue(1);

  useEffect(() => {
    const sequence = withSequence(
      withTiming(0, { duration: 0 }),
      withDelay(500,
        withSequence(
          withTiming(10, { duration: 300 }),
          withTiming(0, { duration: 300 })
        )
      )
    );

    arrowTranslate.value = withRepeat(sequence, -1, false);
    arrowOpacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 0 }),
        withDelay(500, withTiming(0.5, { duration: 300 })),
        withTiming(1, { duration: 300 })
      ),
      -1,
      false
    );
  }, []);

  const arrowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: arrowTranslate.value }],
    opacity: arrowOpacity.value,
  }));

  return (
    <View style={styles.iconWrapper}>
      <View style={styles.iconContainer}>
        <Ionicons name="open-outline" size={28} color={COLORS.primary} />
        <Animated.View style={[styles.arrowOverlay, arrowStyle]}>
          <Ionicons name="arrow-forward" size={16} color={COLORS.primary} />
        </Animated.View>
      </View>
    </View>
  );
};

const LongPressAnimation = () => {
  const scale = useSharedValue(1);
  const progress = useSharedValue(0);
  const pulseScale = useSharedValue(1);
  const fingerScale = useSharedValue(1);

  useEffect(() => {
    // Finger press animation
    fingerScale.value = withRepeat(
      withSequence(
        withTiming(0.9, { duration: 1000 }),
        withTiming(1, { duration: 1000 })
      ),
      -1,
      true
    );

    // Clock pulse animation
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1000 }),
        withTiming(1.1, { duration: 1000 })
      ),
      -1,
      true
    );

    // Progress bar animation
    progress.value = withRepeat(
      withSequence(
        withTiming(0, { duration: 0 }),
        withTiming(1, { duration: 2000 }),
        withTiming(0, { duration: 0 })
      ),
      -1,
      false
    );
  }, []);

  const fingerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: fingerScale.value }],
  }));

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  return (
    <View style={styles.iconWrapper}>
      <Animated.View style={[styles.iconContainer, fingerStyle]}>
        <Ionicons name="finger-print" size={28} color={COLORS.secondary} />
      </Animated.View>
      <Animated.View style={[styles.clockOverlay, pulseStyle]}>
        <Ionicons name="time" size={20} color={COLORS.secondary} />
        <View style={styles.progressContainer}>
          <Animated.View style={[styles.progressBar, progressStyle, { backgroundColor: COLORS.secondary }]} />
        </View>
      </Animated.View>
    </View>
  );
};

export default function OnboardingSheet({
  visible,
  onDismiss,
}: OnboardingSheetProps) {
  const translateY = useSharedValue(0);
  
  const handlePanGesture = useAnimatedGestureHandler({
    onStart: (_, context: { startY: number }) => {
      context.startY = translateY.value;
    },
    onActive: (event, context: { startY: number }) => {
      translateY.value = Math.max(0, context.startY + event.translationY);
    },
    onEnd: (event) => {
      const shouldDismiss = event.translationY > 150 || event.velocityY > 1000;
      
      if (shouldDismiss) {
        translateY.value = withSpring(500, {}, () => {
          runOnJS(onDismiss)();
          translateY.value = 0;
        });
      } else {
        translateY.value = withSpring(0);
      }
    },
  });

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
    };
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onDismiss}
      presentationStyle="overFullScreen"
    >
      <Pressable style={styles.overlay} onPress={onDismiss}>
        <BlurView intensity={20} style={styles.blurOverlay} />
      </Pressable>
      
      <PanGestureHandler onGestureEvent={handlePanGesture}>
        <Animated.View style={[styles.modalContainer, animatedStyle]}>
          <View style={styles.modalContent}>
            <View style={styles.handleBar} />
            
            <Text style={styles.title}>Smart Shortcuts ⚡️</Text>
            
            <View style={styles.tipContainer}>
              <View style={styles.tipItem}>
                <TapAnimation />
                <View style={styles.tipTextContainer}>
                  <Text style={styles.tipTitle}>Tap for Details</Text>
                  <Text style={styles.tipDescription}>Peek at all the perks and quick actions available</Text>
                </View>
              </View>

              <View style={styles.tipItem}>
                <OpenAppAnimation />
                <View style={styles.tipTextContainer}>
                  <Text style={styles.tipTitle}>Open Apps Directly</Text>
                  <Text style={styles.tipDescription}>Jump straight to your apps and we&apos;ll handle the rest</Text>
                </View>
              </View>

              <View style={styles.tipItem}>
                <LongPressAnimation />
                <View style={styles.tipTextContainer}>
                  <Text style={styles.tipTitle}>Auto-Redeem Monthly</Text>
                  <Text style={styles.tipDescription}>Set it and forget it for your favorite subscriptions</Text>
                </View>
              </View>
            </View>

            <TouchableOpacity
              style={styles.gotItButton}
              onPress={onDismiss}
              activeOpacity={0.8}
            >
              <Text style={styles.gotItButtonText}>Got it!</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </PanGestureHandler>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  blurOverlay: {
    flex: 1,
  },
  modalContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  modalContent: {
    padding: LAYOUT.modalPadding,
    paddingTop: 12,
  },
  handleBar: {
    width: 36,
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: 20,
    textAlign: 'center',
  },
  tipContainer: {
    gap: LAYOUT.itemSpacing,
    marginBottom: 24,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingLeft: 8,
  },
  iconWrapper: {
    width: LAYOUT.iconSize,
    height: LAYOUT.iconSize,
    marginRight: LAYOUT.gutter,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    width: LAYOUT.iconSize,
    height: LAYOUT.iconSize,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: `${COLORS.primary}10`,
    borderRadius: LAYOUT.iconSize / 2,
  },
  rippleContainer: {
    position: 'absolute',
    width: LAYOUT.iconSize,
    height: LAYOUT.iconSize,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ripple: {
    width: LAYOUT.iconSize,
    height: LAYOUT.iconSize,
    borderRadius: LAYOUT.iconSize / 2,
    opacity: 0.2,
  },
  arrowOverlay: {
    position: 'absolute',
    right: -4,
    top: -4,
  },
  clockOverlay: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: `${COLORS.secondary}10`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressContainer: {
    position: 'absolute',
    bottom: 2,
    left: 4,
    right: 4,
    height: 2,
    backgroundColor: `${COLORS.secondary}20`,
    borderRadius: 1,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 1,
  },
  tipTextContainer: {
    flex: 1,
    paddingTop: 2,
    paddingLeft: 4,
  },
  tipTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 2,
  },
  tipDescription: {
    fontSize: 15,
    color: COLORS.text.secondary,
    lineHeight: 20,
  },
  gotItButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  gotItButtonText: {
    color: 'white',
    fontSize: 17,
    fontWeight: '600',
  },
}); 