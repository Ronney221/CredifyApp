import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  StatusBar,
  ActionSheetIOS,
  Alert,
  Dimensions,
  TextStyle,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect, Link } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import LottieView from 'lottie-react-native';
import { Ionicons } from '@expo/vector-icons';
import * as AppleAuthentication from 'expo-apple-authentication';

const { height } = Dimensions.get('window');

// Typography scale following iOS HIG
const Typography = StyleSheet.create({
  largeTitle: {
    fontSize: 34,
    lineHeight: 41,
    letterSpacing: 0.37,
    fontWeight: '700',
  } as TextStyle,
  title1: {
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: 0.36,
    fontWeight: '700',
  } as TextStyle,
  headline: {
    fontSize: 17,
    lineHeight: 22,
    letterSpacing: -0.24,
    fontWeight: '600',
  } as TextStyle,
  body: {
    fontSize: 17,
    lineHeight: 22,
    letterSpacing: -0.24,
    fontWeight: '400',
  } as TextStyle,
  caption1: {
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0,
    fontWeight: '400',
  } as TextStyle,
});

// Placeholder for app logo - replace with your actual logo
// const AppLogo = require('../assets/images/app-logo.png');

export default function WelcomeScreen() {
  const router = useRouter();
  const { user, loading, signInGoogle, signInApple } = useAuth();
  const lottieRef = useRef<LottieView>(null);
  const insets = useSafeAreaInsets();
  const [isAppleAuthAvailable, setIsAppleAuthAvailable] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  useFocusEffect(
    useCallback(() => {
      StatusBar.setBarStyle('dark-content');
      if (Platform.OS === 'android') {
        StatusBar.setBackgroundColor('transparent');
        StatusBar.setTranslucent(true);
      }
    }, [])
  );

  useEffect(() => {
    AppleAuthentication.isAvailableAsync().then(setIsAppleAuthAvailable);
  }, []);

  useEffect(() => {
    if (!loading) {
      setIsCheckingSession(false);
      if (user) {
        console.log('User session found, redirecting to onboarding');
        router.replace('/(onboarding)/card-select');
      } else {
        console.log('No user session found, showing welcome screen.');
      }
    }
  }, [user, loading, router]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (lottieRef.current) {
        lottieRef.current.reset();
        lottieRef.current.play();
      }
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  const handleGoogleSignIn = async () => {
    try {
      await signInGoogle();
    } catch (error) {
      console.error('Google sign in error:', error);
    }
  };

  const handleAppleSignIn = async () => {
    try {
      await signInApple();
    } catch (error) {
      console.error('Apple sign in error:', error);
    }
  };

  if (isCheckingSession) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent={true} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007aff" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent={true} />
      <View style={[
        styles.content,
        {
          paddingTop: Math.max(168 - insets.top, 24),
        }
      ]}>
        <View style={styles.topSection}>
          <Text style={[Typography.headline, styles.valueStatement]}>
            Stop letting credits expire.
          </Text>
          <Text style={[Typography.title1, styles.tagline]}>
            Your Credit Card Companion
          </Text>
          <Text style={[Typography.body, styles.description]}>
            Track, redeem, and maximize your benefits.
          </Text>
          <Text style={[Typography.body, styles.description, { marginTop: 4 }]}>
            All in one place.
          </Text>
          
          <View style={styles.bulletList}>
            <View style={styles.bulletItem}>
              <Text style={[Typography.body, styles.bulletText]}>✓ Track expiring perks</Text>
            </View>
            <View style={styles.bulletItem}>
              <Text style={[Typography.body, styles.bulletText]}>✓ Get timely reminders</Text>
            </View>
            <View style={styles.bulletItem}>
              <Text style={[Typography.body, styles.bulletText]}>✓ Maximize your savings</Text>
            </View>
          </View>
        </View>

        <View style={styles.middleSection}>
          <LottieView
            ref={lottieRef}
            source={require('../assets/animations/credit_card_animation.json')}
            autoPlay={true}
            loop={true}
            style={styles.lottieAnimation}
            speed={0.8}
            resizeMode="contain"
            renderMode="HARDWARE"
            cacheComposition={true}
            key="credit-card-animation"
          />
        </View>

        <View style={styles.bottomSection}>
          <TouchableOpacity 
            style={styles.socialButton} 
            onPress={handleGoogleSignIn}
            activeOpacity={0.8}
          >
            <View style={styles.socialButtonContent}>
              <Ionicons name="logo-google" size={20} color="#4285f4" />
              <Text style={[Typography.headline, styles.socialButtonText]}>
                Continue with Google
              </Text>
            </View>
          </TouchableOpacity>
          
          {Platform.OS === 'ios' && isAppleAuthAvailable && (
            <View style={styles.appleButtonWrapper}>
              <AppleAuthentication.AppleAuthenticationButton
                buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                cornerRadius={12}
                style={styles.appleButton}
                onPress={handleAppleSignIn}
              />
            </View>
          )}

          <View style={styles.termsContainer}>
            <Text 
              style={[Typography.caption1, styles.termsText]}
              allowFontScaling={true}
              maxFontSizeMultiplier={1.5}
            >
              By continuing, you agree to our{' '}
              <Link href="/legal/terms" asChild>
                <Text style={styles.termsLink}>Terms of Service</Text>
              </Link>
              {' '}and{' '}
              <Link href="/legal/terms" asChild>
                <Text style={styles.termsLink}>Privacy Policy</Text>
              </Link>
            </Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16, // Multiple of 8 (2x8)
    fontSize: 16,
    color: '#666666',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24, // Multiple of 8 (3x8)
    justifyContent: 'space-between',
  },
  topSection: {
    alignItems: 'center',
    paddingHorizontal: 16, // Multiple of 8 (2x8)
  },
  middleSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: Math.min(height * 0.4, 300),
    paddingVertical: 16, // Multiple of 8 (2x8)
    overflow: 'hidden',
  },
  bottomSection: {
    paddingTop: 16, // Multiple of 8 (2x8)
  },
  valueStatement: {
    color: '#007aff',
    marginBottom: 8, // Base unit
    textAlign: 'center',
  },
  tagline: {
    color: '#1c1c1e',
    marginBottom: 8, // Base unit
    textAlign: 'center',
  },
  description: {
    color: '#666666',
    textAlign: 'center',
    maxWidth: 300,
  },
  lottieAnimation: {
    width: '100%',
    aspectRatio: 1,
    transform: [{ scale: 0.8 }],
  },
  socialButton: {
    backgroundColor: '#ffffff',
    height: 50, // Match Apple button height exactly
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginHorizontal: 16,
  },
  socialButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%', // Fill the full height
    paddingHorizontal: 20, // Slightly more padding for better visual balance
  },
  socialButtonText: {
    color: '#1c1c1e',
    marginLeft: 8, // Reduced spacing between icon and text for better visual balance
  },
  termsContainer: {
    paddingHorizontal: 16, // Multiple of 8 (2x8)
    marginBottom: 16, // Added margin to push terms up a bit
  },
  termsText: {
    color: '#8e8e93',
    textAlign: 'center',
    lineHeight: 18,
    fontSize: Platform.OS === 'ios' ? 11 : 12,
    opacity: 0.6,
  },
  termsLink: {
    color: '#007aff',
    textDecorationLine: 'underline',
    fontSize: Platform.OS === 'ios' ? 11 : 12,
  },
  appleButtonWrapper: {
    marginHorizontal: 16,
    marginBottom: 16,
    height: 50,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  appleButton: {
    height: '100%',
    width: '100%',
  },
  bulletList: {
    marginTop: 4,
    alignItems: 'flex-start',
  },
  bulletItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  bulletText: {
    marginLeft: 8,
  },
}); 
