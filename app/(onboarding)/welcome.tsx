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
import { useRouter } from 'expo-router';
import { MotiView } from 'moti';
import { Colors } from '../../constants/Colors';
import * as Haptics from 'expo-haptics';
import LottieView from 'lottie-react-native';
import { LinearGradient } from 'expo-linear-gradient';
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
      fontSize: 40,
      lineHeight: 46,
      letterSpacing: -1.5,
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
      fontSize: 15,
      lineHeight: 20,
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
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = useWindowDimensions();
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
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      <LinearGradient
        colors={['#ffffff', '#f9fafb']}
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
              Stop Donating{' '}
              <Text style={styles.titleHighlight}>Money</Text>
              {'\n'}to the Banks
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
              loop={false}
              style={styles.animation}
              speed={isReducedMotion ? 0.5 : 1}
              renderMode="HARDWARE"
              cacheComposition={true}
              onAnimationFinish={() => {
                // Restart animation from beginning when it finishes
                if (lottieRef.current) {
                  lottieRef.current.play(0, 280);
                }
              }}
            />
          </Animated.View>
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
            
            <MotiView
              from={{ opacity: 0, translateY: 10 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ ...TOKENS.animation.timing, delay: 200 }}
              style={styles.signInContainer}
            >
              <TouchableOpacity
                style={styles.signInButton}
                onPress={() => {
                  Haptics.selectionAsync();
                  router.replace('/(auth)/login');
                }}
                activeOpacity={0.6}
                accessibilityRole="button"
                accessibilityLabel="Already have an account? Sign In"
                accessibilityHint="Opens sign in screen for existing users"
              >
                <Text style={styles.signInText}>
                  Already have an account? <Text style={styles.signInLink}>Sign In</Text>
                </Text>
              </TouchableOpacity>
            </MotiView>
          </MotiView>
        )}
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  gradient: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: TOKENS.spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: TOKENS.spacing.xxl,
  },
  title: {
    color: TOKENS.colors.text.primary,
    textAlign: 'center',
    marginBottom: TOKENS.spacing.sm,
  },
  titleHighlight: {
    color: Colors.light.tint,
  },
  subtitle: {
    color: TOKENS.colors.text.secondary,
    textAlign: 'center',
    paddingHorizontal: TOKENS.spacing.md,
    opacity: 0.8,
    marginBottom: 0,
  },
  animationContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 300,
    width: '100%',
    transform: [{ perspective: 1000 }],
  },
  animation: {
    width: '130%',
    height: '130%',
    transform: [{ perspective: 1000 }],
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: TOKENS.spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? 44 : 24,
    paddingTop: TOKENS.spacing.lg,
    backgroundColor: 'transparent',
  },
  getStartedButton: {
    backgroundColor: Colors.light.tint,
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: Colors.light.tint,
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  getStartedText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  signInContainer: {
    alignItems: 'center',
    marginTop: TOKENS.spacing.sm,
  },
  signInButton: {
    paddingVertical: TOKENS.spacing.sm,
    paddingHorizontal: TOKENS.spacing.md,
  },
  signInText: {
    fontSize: 15,
    color: TOKENS.colors.text.secondary,
    textAlign: 'center',
    letterSpacing: -0.1,
  },
  signInLink: {
    color: Colors.light.tint,
    fontWeight: '600',
  },
});