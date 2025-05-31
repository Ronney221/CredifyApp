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
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect, Link } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import LottieView from 'lottie-react-native';

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
      console.log('User authenticated, redirecting to card selection');
      router.replace('/card-selection');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (lottieRef.current) {
      // Reset and play animation
      lottieRef.current.reset();
      setTimeout(() => {
        lottieRef.current?.play();
      }, 100);
    }
  }, []);

  const handleContinue = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Continue with Email', 'Continue with Google'],
          cancelButtonIndex: 0,
          userInterfaceStyle: 'light',
        },
        async (buttonIndex) => {
          if (buttonIndex === 1) {
            router.push('/(auth)/login');
          } else if (buttonIndex === 2) {
            try {
              const { error } = await signInGoogle();
              if (error) {
                Alert.alert('Google Login Failed', error.message);
              }
            } catch (error: any) {
              Alert.alert('Error', error.message || 'An unexpected error occurred');
            }
          }
        }
      );
    } else {
      Alert.alert(
        'Choose Sign In Method',
        'Select how you would like to continue',
        [
          {
            text: 'Continue with Email',
            onPress: () => router.push('/(auth)/login'),
          },
          {
            text: 'Continue with Google',
            onPress: async () => {
              try {
                const { error } = await signInGoogle();
                if (error) {
                  Alert.alert('Google Login Failed', error.message);
                }
              } catch (error: any) {
                Alert.alert('Error', error.message || 'An unexpected error occurred');
              }
            },
          },
          {
            text: 'Cancel',
            style: 'cancel',
          },
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
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent={true} />
      <View style={styles.content}>
        <View style={styles.topSection}>
          <Text style={[Typography.headline, styles.valueStatement]}>
            Stop letting credits expire.
          </Text>
          <Text style={[Typography.title1, styles.tagline]}>
            Your Credit Card Companion
          </Text>
          <Text style={[Typography.body, styles.description]}>
            Track, redeem, and maximize all your credit-card benefits in one place.
          </Text>
        </View>

        <View style={styles.middleSection}>
          <LottieView
            ref={lottieRef}
            source={require('../assets/animations/credit_card_animation.json')}
            autoPlay={false}
            loop={true}
            style={styles.lottieAnimation}
            speed={0.8}
            resizeMode="contain"
            renderMode="HARDWARE"
            cacheComposition={true}
          />
        </View>

        <View style={styles.bottomSection}>
          <TouchableOpacity 
            style={styles.continueButton} 
            onPress={handleContinue}
            activeOpacity={0.8}
          >
            <Text style={[Typography.headline, styles.continueButtonText]}>
              Get Started
            </Text>
          </TouchableOpacity>

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
    marginTop: 16,
    fontSize: 16,
    color: '#666666',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? height * 0.02 : height * 0.05,
    paddingBottom: height * 0.05,
  },
  topSection: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  middleSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: Math.min(height * 0.4, 300), // Either 40% of height or max 300px
    paddingVertical: 20,
  },
  bottomSection: {
    paddingTop: height * 0.02,
  },
  valueStatement: {
    color: '#007aff',
    marginBottom: 8,
    textAlign: 'center',
  },
  tagline: {
    color: '#1c1c1e',
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    color: '#666666',
    textAlign: 'center',
    maxWidth: 300,
  },
  lottieAnimation: {
    width: '100%',
    height: '100%',
    transform: [{ scale: 1.2 }],
  },
  continueButton: {
    backgroundColor: '#007aff',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#007aff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  continueButtonText: {
    color: '#ffffff',
  },
  termsContainer: {
    paddingHorizontal: 16,
  },
  termsText: {
    color: '#8e8e93',
    textAlign: 'center',
    lineHeight: 18,
    fontSize: Platform.OS === 'ios' ? 11 : 12,
  },
  termsLink: {
    color: '#007aff',
    textDecorationLine: 'underline',
    fontSize: Platform.OS === 'ios' ? 11 : 12,
  },
}); 