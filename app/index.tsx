import React, { useCallback, useEffect, useRef } from 'react';
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
  const { user, loading, signInGoogle } = useAuth();
  const lottieRef = useRef<LottieView>(null);
  const insets = useSafeAreaInsets();

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
    if (!loading && user) {
      console.log('User session found, redirecting to onboarding for testing.');
      router.replace('/(onboarding)/card-select');
    }
    // If !loading && !user, the WelcomeScreen UI (auth options) is shown.
  }, [user, loading, router]);

  useEffect(() => {
    // Ensure animation plays properly on mount
    const timer = setTimeout(() => {
      if (lottieRef.current) {
        lottieRef.current.reset();
        lottieRef.current.play();
      }
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  const handleContinue = () => {
    const options = [
      'Sign in with Apple (Coming Soon)',
      'Sign in with Google',
      'Sign in with Email',
      'Cancel',
    ];
    const destructiveButtonIndex = undefined;
    const cancelButtonIndex = 3; // Adjusted due to removal of 'Skip for now'

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: options,
          cancelButtonIndex: cancelButtonIndex,
        },
        (buttonIndex) => {
          if (buttonIndex === 0) {
            Alert.alert('Coming Soon', 'Sign in with Apple will be available soon.');
          } else if (buttonIndex === 1) {
            signInGoogle(); // This will lead to onboarding via login.tsx/signup.tsx logic
          } else if (buttonIndex === 2) {
            router.push('/(auth)/login'); // This will lead to onboarding via login.tsx/signup.tsx logic
          }
        }
      );
    } else {
      Alert.alert(
        "Continue",
        "Choose an option to continue:",
        [
          { text: "Sign in with Apple (Coming Soon)", onPress: () => Alert.alert('Coming Soon', 'Sign in with Apple will be available soon.') },
          { text: "Sign in with Google", onPress: () => signInGoogle() }, // Leads to onboarding
          { text: "Sign in with Email", onPress: () => router.push('/(auth)/login') }, // Leads to onboarding
          { text: "Cancel", style: "cancel" },
        ],
        { cancelable: true }
      );
    }
  };

  if (loading) {
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
          // Adjust top padding to follow 8-point grid
          paddingTop: Math.max(168 - insets.top, 24), // Increased padding: 21x8 or 3x8
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
            onPress={() => signInGoogle()}
            activeOpacity={0.8}
          >
            <Ionicons name="logo-google" size={20} color="#4285f4" />
            <Text style={[Typography.headline, styles.socialButtonText]}>
              Continue with Google
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.socialButton, styles.disabledButton]} 
            onPress={() => Alert.alert('Coming Soon', 'Sign in with Apple will be available soon.')}
            activeOpacity={0.8}
            disabled={true}
          >
            <Ionicons name="logo-apple" size={20} color="#999" />
            <Text style={[Typography.headline, styles.socialButtonText, styles.disabledText]}>
              Continue with Apple
            </Text>
          </TouchableOpacity>
          {/* <TouchableOpacity
            style={styles.emailButton}
            onPress={() => router.push('/(auth)/login')}
            activeOpacity={0.8}
          >
            <Text style={styles.emailButtonText}>Continue with email</Text>
          </TouchableOpacity> */}

          <View style={styles.termsContainer}>
            <Text 
              style={[Typography.caption1, styles.termsText]}
              allowFontScaling={true}
              maxFontSizeMultiplier={1.5}
            >
              By continuing, you agree to our{' '}
              <Link href="/(auth)/terms" asChild>
                <Text style={styles.termsLink}>Terms of Service</Text>
              </Link>
              {' '}and{' '}
              <Link href="/(auth)/terms" asChild>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    alignSelf: 'stretch',
    marginHorizontal: 16,
  },
  socialButtonText: {
    color: '#1c1c1e',
    marginLeft: 12,
  },
  disabledButton: {
    backgroundColor: '#f2f2f2',
    shadowOpacity: 0,
    elevation: 0,
  },
  disabledText: {
    color: '#999',
  },
  emailButton: {
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 24, // Increased bottom margin for more space
  },
  emailButtonText: {
    color: '#007aff',
    fontSize: 16,
    fontWeight: '500',
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
}); 
