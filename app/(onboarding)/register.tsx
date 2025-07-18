// app/(onboarding)/register.tsx
import React, { useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  StatusBar,
  Image,
  Dimensions,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Link, useLocalSearchParams } from 'expo-router';
import { MotiView } from 'moti';
import { Colors } from '../../constants/Colors';
import * as Haptics from 'expo-haptics';
import { useOnboardingContext } from './_context/OnboardingContext';
import { Card } from '../../src/data/card-data';
import { getAllCardsData } from '../../lib/database';
import { useAuth } from '../../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import * as AppleAuthentication from 'expo-apple-authentication';
import { saveUserCards } from '../../lib/database';
import Animated, { 
  useAnimatedStyle, 
  withRepeat, 
  withTiming, 
  withSequence,
  withDelay,
  Easing,
  useSharedValue,
} from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../lib/supabase';
import { onboardingScreenNames } from './_layout';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const testimonials = [
  { name: 'Matt K.', percentage: 93 },
  { name: 'Sarah L.', percentage: 87 },
  { name: 'James R.', percentage: 91 },
  { name: 'Emma T.', percentage: 85 },
  { name: 'Alex M.', percentage: 89 },
  { name: 'Sophie B.', percentage: 92 },
  { name: 'David P.', percentage: 88 },
  { name: 'Rachel W.', percentage: 90 },
];

const verbs = [
  'captured',
  'redeemed',
  'unlocked',
  'maximized',
  'secured',
  'claimed',
  'earned',
  'collected',
  'leveraged',
  'optimized'
];

export default function RegisterScreen() {
  const router = useRouter();
  const { selectedCards } = useOnboardingContext();
  const { signInGoogle, signInApple } = useAuth();
  const { potentialSavings } = useLocalSearchParams();
  const savingsAmount = typeof potentialSavings === 'string' ? parseInt(potentialSavings, 10) : 0;
  const [isLoading, setIsLoading] = React.useState(false);
  const [isAppleAuthAvailable, setIsAppleAuthAvailable] = React.useState(false);
  const [currentTestimonial, setCurrentTestimonial] = React.useState(0);
  const [allCards, setAllCards] = React.useState<Card[]>([]);
  const translateY = useSharedValue(0);

  useEffect(() => {
    AppleAuthentication.isAvailableAsync().then(setIsAppleAuthAvailable);
    
    // Load cards from database
    const loadCards = async () => {
      try {
        const cards = await getAllCardsData();
        setAllCards(cards);
      } catch (error) {
        console.error('Error loading cards:', error);
      }
    };
    
    loadCards();
    
    // Rotate testimonials every 4 seconds
    const interval = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 4000);
    
    // Start the floating animation
    translateY.value = withRepeat(
      withSequence(
        withTiming(-10, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 2000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
    
    return () => {
      clearInterval(interval);
    };
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateY: translateY.value,
        },
      ],
    };
  });

  // Get the selected card objects with proper typing
  const selectedCardObjects = useMemo(() => {
    if (!allCards || allCards.length === 0) {
      return [];
    }
    return selectedCards
      .map((cardId: string) => allCards.find(card => card.id === cardId))
      .filter((card): card is Card => card !== undefined);
  }, [selectedCards, allCards]);

  const saveCardsToDatabase = async (userId: string) => {
    try {
      const { error } = await saveUserCards(userId, selectedCardObjects, {});
      if (error) {
        console.error('[Register] Error saving cards:', error);
        Alert.alert(
          'Error',
          'Failed to save your cards. Please try again.',
          [{ text: 'OK' }]
        );
        return false;
      }
      
      // Add a small delay to ensure database operations complete
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return true;
    } catch (error) {
      console.error('[Register] Unexpected error saving cards:', error);
      Alert.alert(
        'Error',
        'An unexpected error occurred. Please try again.',
        [{ text: 'OK' }]
      );
      return false;
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    try {
      const { data, error } = await signInGoogle();
      if (error) {
        // Only throw if it's not a cancellation
        if (error.message !== 'User cancelled') {
          console.error('[Register] Google Sign In Error:', error);
          throw error;
        }
        // If it's a cancellation, just return without navigation
        return;
      }
      
      // Save cards to database after successful authentication
      if (data?.user?.id) {
        const success = await saveCardsToDatabase(data.user.id);
        if (!success) {
          setIsLoading(false);
          return;
        }
      }
      
      // Set onboarding as complete after successful registration
      await AsyncStorage.setItem('@hasCompletedOnboarding', 'true');
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/(tabs)/01-dashboard' as any);
    } catch (error) {
      console.error('[Register] Google sign in process failed:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    setIsLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    try {
      const { data, error } = await signInApple();
      if (error) {
        // Only throw if it's not a cancellation
        if (error.message !== 'User cancelled') {
          console.error('[Register] Apple Sign In Error:', error);
          throw error;
        }
        // If it's a cancellation, just return without navigation
        return;
      }
      
      // Save cards to database after successful authentication
      if (data?.user?.id) {
        const success = await saveCardsToDatabase(data.user.id);
        if (!success) {
          setIsLoading(false);
          return;
        }
      }
      
      // Set onboarding as complete after successful registration
      await AsyncStorage.setItem('@hasCompletedOnboarding', 'true');
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/(tabs)/01-dashboard' as any);
    } catch (error) {
      console.error('[Register] Apple sign in process failed:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" />
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Personalized Card Display with Continuous Animation */}
        <View style={styles.cardsContainer}>
          {selectedCardObjects.map((card, index) => (
            <MotiView
              key={card.id}
              from={{
                opacity: 0,
                translateY: -100,
                scale: 0.8,
                rotate: '-15deg',
              }}
              animate={{
                opacity: 1,
                translateY: 0,
                scale: 1,
                rotate: `${-5 + (index * 3)}deg`,
              }}
              transition={{
                type: 'spring',
                delay: index * 200,
                damping: 12,
                mass: 1,
                stiffness: 100,
              }}
              style={[
                styles.cardWrapper,
                {
                  transform: [
                    { translateX: (index - (selectedCardObjects.length - 1) / 2) * 40 },
                  ],
                },
              ]}
            >
              <Animated.View
                style={[
                  styles.cardImageContainer,
                  animatedStyle,
                ]}
              >
                <Image
                  source={card.image}
                  style={styles.cardImage}
                  resizeMode="contain"
                />
              </Animated.View>
            </MotiView>
          ))}
        </View>

        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 600, delay: 400 }}
          style={styles.contentContainer}
        >
          <View style={styles.headerContainer}>
            <Image 
              source={require('../../assets/images/logo_text.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
            <Text style={styles.title}>
              {savingsAmount > 0 ? (
                `Secure Your $${savingsAmount}`
              ) : (
                `Maximize Your Card Benefits`
              )}
            </Text>
            <Text style={styles.subtitle}>
              {savingsAmount > 0 ? (
                'Create your Credify account to stay ahead of expiring credits'
              ) : (
                'Create your Credify account to track and maximize your benefits'
              )}
            </Text>
          </View>

          <View style={styles.authContainer}>
            <TouchableOpacity 
              style={styles.socialButton} 
              onPress={handleGoogleSignIn}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              <View style={styles.socialButtonContent}>
                <Ionicons name="logo-google" size={20} color="#4285f4" />
                <Text style={styles.socialButtonText}>
                  Sign up with Google
                </Text>
              </View>
            </TouchableOpacity>
            
            {Platform.OS === 'ios' && isAppleAuthAvailable && (
              <View style={styles.appleButtonWrapper}>
                <AppleAuthentication.AppleAuthenticationButton
                  buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_UP}
                  buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                  cornerRadius={12}
                  style={styles.appleButton}
                  onPress={handleAppleSignIn}
                />
              </View>
            )}

            {/* Testimonials Carousel */}
            <MotiView
              key={currentTestimonial}
              from={{ opacity: 0, translateY: 10 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: 'timing', duration: 400 }}
              style={styles.testimonialContainer}
            >
              <Text style={styles.testimonialText}>
                {testimonials[currentTestimonial].name} {verbs[currentTestimonial % verbs.length]} {testimonials[currentTestimonial].percentage}% of their perks last year
              </Text>
            </MotiView>

            {/* Security Badge */}
            <View style={styles.securityContainer}>
              <Ionicons name="lock-closed" size={16} color={Colors.light.secondaryLabel} />
              <Text style={styles.securityText}>256-bit AES encryption • TLS 1.3</Text>
            </View>

            <View style={styles.termsContainer}>
              <Text style={styles.termsText}>
                By continuing, you agree to our{' '}
                <Link href="/(legal)/terms" asChild>
                  <Text style={styles.termsLink}>Terms of Service</Text>
                </Link>
                {' '}and{' '}
                <Link href="/(legal)/terms" asChild>
                  <Text style={styles.termsLink}>Privacy Policy</Text>
                </Link>
              </Text>
            </View>
          </View>
        </MotiView>
      </ScrollView>

      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={Colors.light.tint} />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
    paddingTop: 0,
  },
  cardsContainer: {
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    marginTop: 24,
  },
  cardWrapper: {
    width: SCREEN_WIDTH * 0.4,
    height: 120,
    marginHorizontal: -20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  cardImageContainer: {
    width: '100%',
    height: '100%',
  },
  cardImage: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logoImage: {
    width: 350,
    height: 70,
    marginBottom: 8,
    alignSelf: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.light.text,
    textAlign: 'center',
    marginBottom: 24,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 17,
    color: Colors.light.secondaryLabel,
    textAlign: 'center',
    lineHeight: 22,
    letterSpacing: -0.2,
    paddingHorizontal: 24,
  },
  authContainer: {
    paddingTop: 16,
  },
  socialButton: {
    backgroundColor: '#ffffff',
    height: 50,
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
    height: '100%',
    paddingHorizontal: 20,
  },
  socialButtonText: {
    color: '#1c1c1e',
    fontSize: 17,
    fontWeight: '600',
    marginLeft: 8,
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
  testimonialContainer: {
    alignItems: 'center',
    marginVertical: 24,
    paddingHorizontal: 16,
  },
  testimonialText: {
    fontSize: 17,
    color: Colors.light.secondaryLabel,
    textAlign: 'center',
    fontWeight: '500',
  },
  securityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    opacity: 0.7,
  },
  securityText: {
    fontSize: 14,
    color: Colors.light.secondaryLabel,
    marginLeft: 6,
  },
  termsContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
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
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
}); 