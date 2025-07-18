import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  StatusBar,
  useWindowDimensions,
  AccessibilityInfo,
  ViewStyle,
  TextStyle,
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MotiView } from 'moti';
import { Colors } from '../../constants/Colors';
import * as Haptics from 'expo-haptics';
import LottieView from 'lottie-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useOnboardingContext } from './_context/OnboardingContext';
import { onboardingScreenNames } from './_layout';

// Design tokens
const TOKENS = {
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  typography: {
    largeTitle: {
      fontSize: 32,
      lineHeight: 40,
      letterSpacing: -0.5,
      fontWeight: '800' as const,
    },
    title1: {
      fontSize: 28,
      lineHeight: 34,
      letterSpacing: -0.3,
      fontWeight: '700' as const,
    },
    headline: {
      fontSize: 17,
      lineHeight: 22,
      letterSpacing: -0.2,
      fontWeight: '600' as const,
    },
    body: {
      fontSize: 17,
      lineHeight: 24,
      letterSpacing: -0.2,
      fontWeight: '400' as const,
    },
    feature: {
      fontSize: 16,
      lineHeight: 22,
      letterSpacing: -0.2,
      fontWeight: '500' as const,
    },
  },
  colors: {
    text: {
      primary: '#0B1B3F',
      secondary: Colors.light.secondaryLabel,
    },
    background: {
      feature: '#F7F8FA',
    },
  },
  animation: {
    spring: {
      type: 'spring' as const,
      damping: 12,
      mass: 1,
      stiffness: 100,
    },
    timing: {
      type: 'timing' as const,
      duration: 400,
    },
  },
};

export default function WelcomeScreen() {
  const router = useRouter();
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const lottieRef = useRef<LottieView>(null);
  const [isReducedMotion, setIsReducedMotion] = React.useState(false);
  const [showCTA, setShowCTA] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Check for reduced motion preference
    AccessibilityInfo.isReduceMotionEnabled().then(setIsReducedMotion);
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setIsReducedMotion
    );

    // Show CTA after animation starts
    const ctaTimer = setTimeout(() => {
      setShowCTA(true);
    }, 1500);

    return () => {
      subscription.remove();
      clearTimeout(ctaTimer);
    };
  }, []);

  const handleGetStarted = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    // Start the zoom animation
    if (lottieRef.current) {
      lottieRef.current.play();
      
      // Create a zoom and fade animation sequence
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 2.5,
          duration: 800,
          useNativeDriver: true,
          easing: Easing.bezier(0.4, 0, 0.2, 1),
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
          easing: Easing.bezier(0.4, 0, 0.2, 1),
        })
      ]).start();

      // Start navigation slightly before animation completes
      setTimeout(() => {
        router.push('/(onboarding)/card-select');
      }, 400);
    } else {
      router.push('/(onboarding)/card-select');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" />
      
      <LinearGradient
        colors={['#ffffff', '#f8f9fa']}
        style={styles.gradient}
      >
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={TOKENS.animation.timing}
          style={styles.contentContainer}
        >
          <View style={styles.headerContainer}>
            <Text 
              style={[TOKENS.typography.largeTitle, styles.title]}
              accessibilityRole="header"
            >
              Stop Donating Money{'\n'}to the Banks
            </Text>
            <Text 
              style={[TOKENS.typography.body, styles.subtitle]}
              accessibilityRole="text"
            >
              Run a 60-second audit and uncover every dollar your cards already owe you
            </Text>
          </View>

          <Animated.View
            style={[
              styles.animationContainer,
              {
                transform: [{ scale: scaleAnim }],
                opacity: opacityAnim,
              }
            ]}
          >
            <LottieView
              ref={lottieRef}
              source={require('../../assets/animations/credit_card_animation.json')}
              autoPlay={true}
              loop={true}
              style={styles.animation}
              speed={isReducedMotion ? 0.5 : 1}
              renderMode="HARDWARE"
              cacheComposition={true}
            />
          </Animated.View>

          <MotiView
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ ...TOKENS.animation.timing, delay: 200 }}
            style={styles.featuresContainer}
          >
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={20} color={Colors.light.tint} style={styles.checkmark} />
              <Text style={[TOKENS.typography.feature, styles.featureText]}>
                Track your credit card benefits
              </Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={20} color={Colors.light.tint} style={styles.checkmark} />
              <Text style={[TOKENS.typography.feature, styles.featureText]}>
                Get notified about renewals
              </Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={20} color={Colors.light.tint} style={styles.checkmark} />
              <Text style={[TOKENS.typography.feature, styles.featureText]}>
                Maximize your rewards
              </Text>
            </View>
          </MotiView>
        </MotiView>

        {showCTA && (
          <MotiView
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={TOKENS.animation.spring}
            style={styles.footer}
          >
            <TouchableOpacity
              style={styles.getStartedButton}
              onPress={handleGetStarted}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Let's Do the Math"
              accessibilityHint="Opens card selection screen"
            >
              <Text style={styles.getStartedText}>Let&apos;s Do the Math</Text>
            </TouchableOpacity>
          </MotiView>
        )}
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop:32,
    flex: 1,
    backgroundColor: '#ffffff',
  },
  gradient: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: TOKENS.spacing.lg,
    paddingTop: TOKENS.spacing.sm,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: TOKENS.spacing.md,
    paddingTop: 0,
  },
  title: {
    color: TOKENS.colors.text.primary,
    textAlign: 'center',
    marginBottom: TOKENS.spacing.sm,
  },
  subtitle: {
    color: TOKENS.colors.text.secondary,
    textAlign: 'center',
    paddingHorizontal: TOKENS.spacing.lg,
    opacity: 0.9,
    marginBottom: TOKENS.spacing.sm,
  },
  animationContainer: {
    alignItems: 'center',
    marginBottom: TOKENS.spacing.md,
    height: 280,
    marginTop: -TOKENS.spacing.sm,
    transform: [{ perspective: 1000 }],
  },
  animation: {
    width: '140%',
    height: '100%',
    marginTop: -TOKENS.spacing.md,
    transform: [{ perspective: 1000 }],
  },
  featuresContainer: {
    marginBottom: TOKENS.spacing.lg,
    paddingHorizontal: TOKENS.spacing.md,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: TOKENS.spacing.sm,
    backgroundColor: TOKENS.colors.background.feature,
    padding: TOKENS.spacing.md,
    borderRadius: 12,
  },
  checkmark: {
    marginRight: TOKENS.spacing.sm,
  },
  featureText: {
    color: TOKENS.colors.text.primary,
    opacity: 0.9,
    flex: 1,
  },
  footer: {
    paddingHorizontal: TOKENS.spacing.xl,
    paddingBottom: Platform.OS === 'ios' ? TOKENS.spacing.xl : TOKENS.spacing.lg,
  },
  getStartedButton: {
    backgroundColor: Colors.light.tint,
    paddingVertical: TOKENS.spacing.lg,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: Colors.light.tint,
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  getStartedText: {
    color: '#ffffff',
    ...TOKENS.typography.headline,
    letterSpacing: -0.2,
  },
}); 