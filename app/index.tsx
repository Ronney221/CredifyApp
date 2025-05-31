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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import LottieView from 'lottie-react-native';

const { height } = Dimensions.get('window');

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
      // Play animation with a slight delay for better UX
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
        <View style={styles.animationContainer}>
          <LottieView
            ref={lottieRef}
            source={require('../assets/animations/credit_card_animation.json')}
            autoPlay={false}
            loop={true}
            style={styles.lottieAnimation}
            speed={0.8}
            resizeMode="contain"
          />
        </View>

        <View style={styles.textContainer}>
          <Text style={styles.tagline}>Your Credit Card Companion</Text>
          <Text style={styles.description}>
            Manage your credit cards, track rewards, and optimize your spending with intelligent insights.
          </Text>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={styles.continueButton} 
            onPress={handleContinue}
            activeOpacity={0.8}
          >
            <Text style={styles.continueButtonText}>Get Started</Text>
          </TouchableOpacity>

          <View style={styles.termsContainer}>
            <Text style={styles.termsText}>
              By continuing, you agree to our Terms of Service and Privacy Policy
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
    paddingTop: height * 0.05, // Dynamic top padding
    paddingBottom: height * 0.05, // Dynamic bottom padding
  },
  animationContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    maxHeight: height * 0.4, // Limit animation height
  },
  lottieAnimation: {
    width: '100%',
    height: '100%',
  },
  textContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
    marginVertical: height * 0.04, // Dynamic vertical margin
  },
  tagline: {
    fontSize: 28,
    color: '#007aff',
    marginBottom: 16,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  description: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 300,
  },
  buttonContainer: {
    paddingTop: height * 0.02, // Dynamic top padding
  },
  continueButton: {
    backgroundColor: '#007aff',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#007aff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  continueButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  termsContainer: {
    paddingHorizontal: 20,
  },
  termsText: {
    fontSize: 13,
    color: '#8e8e93',
    textAlign: 'center',
    lineHeight: 18,
  },
}); 