// app/(onboarding)/register.tsx
import React, { useMemo, useEffect, useRef, useCallback } from 'react';
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
  Alert,
  ScrollView,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Link, useLocalSearchParams } from 'expo-router';
import { MotiView, AnimatePresence } from 'moti';
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
  {
    name: "Sharon L.",
    text: "It's like the app found free money for me.",
    avatar: "https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2",
    rating: 5
  },
  {
    name: "Justin L.",
    text: "The unified dashboard is a game-changer. I feel completely in control of my benefits for the first time.",
    avatar: "https://images.pexels.com/photos/842980/pexels-photo-842980.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2",
    rating: 5
  },
  {
    name: "Chanel L.",
    text: "I've already gotten $650 in value back from my $695 annual fee. It validates my decision every time.",
    avatar: "https://images.pexels.com/photos/3763188/pexels-photo-3763188.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2",
    rating: 5
  },
  {
    name: "Grant Y.",
    text: "Credify flagged a $20 monthly credit I didn't know about. Now I'm saving $240 a year.",
    avatar: "https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2",
    rating: 5
  },
  {
    name: "Jessie T.",
    text: "The AI assistant recommended my Platinum for 5x points and reminded me I had a $200 airline credit.",
    avatar: "https://images.pexels.com/photos/3772510/pexels-photo-3772510.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2",
    rating: 5
  },
  {
    name: "Ryan C.",
    text: "I get all the benefit tracking with none of the security worries. It's the perfect setup.",
    avatar: "https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2",
    rating: 5
  },
  {
    name: "Josh H.",
    text: "Credify reminded me to renew my CLEAR Plus with the right card for the full $189 credit.",
    avatar: "https://images.pexels.com/photos/91227/pexels-photo-91227.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2",
    rating: 5
  },
  {
    name: "Rose P.",
    text: "The interface is so clean and intuitive. The app feels incredibly polished and smooth to use.",
    avatar: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRPhJf_FhJXaVreABCP1G6s7aGxWrwAfBh-SA&s",
    rating: 5
  },
  {
    name: "Brian L.",
    text: "We've stopped letting our DoorDash credits go to waste and now plan our take-out nights around them.",
    avatar: "https://images.pexels.com/photos/1681010/pexels-photo-1681010.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2",
    rating: 5
  }
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
  const [shuffledTestimonials, setShuffledTestimonials] = React.useState(testimonials);
  const [allCards, setAllCards] = React.useState<Card[]>([]);
  const translateY = useSharedValue(0);

  useEffect(() => {
    AppleAuthentication.isAvailableAsync().then(setIsAppleAuthAvailable);
    
    // Shuffle testimonials on mount
    const shuffleArray = (array: typeof testimonials) => {
      const shuffled = [...array];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    };
    setShuffledTestimonials(shuffleArray(testimonials));
    
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
    
    // Rotate testimonials every 5 seconds  
    const interval = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % shuffledTestimonials.length);
    }, 5000);
    
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

  // Enhanced haptic patterns
  const playSuccessHapticPattern = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium), 100);
    setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 200);
  };

  const playErrorHapticPattern = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 150);
  };

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
      
      await playSuccessHapticPattern();
      router.replace('/(tabs)/01-dashboard' as any);
    } catch (error) {
      console.error('[Register] Google sign in process failed:', error);
      await playErrorHapticPattern();
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
      
      await playSuccessHapticPattern();
      router.replace('/(tabs)/01-dashboard' as any);
    } catch (error) {
      console.error('[Register] Apple sign in process failed:', error);
      await playErrorHapticPattern();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" />
      
      <View style={styles.content}>
        {/* Premium Card Display with Glassmorphism */}
        <View style={styles.cardsContainer}>
          <View style={styles.cardsBackdrop} />
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
                rotate: `${-8 + (index * 4)}deg`,
              }}
              transition={{
                type: 'spring',
                delay: index * 150,
                damping: 15,
                mass: 1,
                stiffness: 120,
              }}
              style={[
                styles.cardWrapper,
                {
                  transform: [
                    { translateX: (index - (selectedCardObjects.length - 1) / 2) * 35 },
                  ],
                  zIndex: selectedCardObjects.length - index,
                },
              ]}
            >
              <Animated.View
                style={[
                  styles.cardImageContainer,
                  animatedStyle,
                ]}
              >
                <View style={styles.cardGlow} />
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
                <>
                  Secure Your{' '}
                  <Text style={styles.titleHighlight}>${savingsAmount.toLocaleString()}</Text>
                  {' '}in Savings
                </>
              ) : (
                'Maximize Your Card Benefits'
              )}
            </Text>
            <Text style={styles.subtitle}>
              {savingsAmount > 0 ? (
                'Join thousands who never miss a credit card perk again'
              ) : (
                'Track every benefit, maximize every reward'
              )}
            </Text>
          </View>

          <View style={styles.authContainer}>
            <MotiView
              from={{ opacity: 0, translateY: 20 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: 'spring', delay: 1200 }}
            >
              <TouchableOpacity 
                style={styles.socialButton} 
                onPress={handleGoogleSignIn}
                disabled={isLoading}
                activeOpacity={0.9}
              >
                <View style={styles.socialButtonContent}>
                  <View style={styles.iconContainer}>
                    <Ionicons name="logo-google" size={22} color="#4285f4" />
                  </View>
                  <Text style={styles.socialButtonText}>
                    Continue with Google
                  </Text>
                  <Ionicons name="arrow-forward" size={18} color="#666" style={styles.arrowIcon} />
                </View>
              </TouchableOpacity>
            </MotiView>
            
            {Platform.OS === 'ios' && isAppleAuthAvailable && (
              <MotiView
                from={{ opacity: 0, translateY: 20 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: 'spring', delay: 1300 }}
                style={styles.appleButtonWrapper}
              >
                <AppleAuthentication.AppleAuthenticationButton
                  buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
                  buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                  cornerRadius={16}
                  style={styles.appleButton}
                  onPress={handleAppleSignIn}
                />
              </MotiView>
            )}

            {/* Premium Testimonials with Staggered Animations */}
            <AnimatePresence exitBeforeEnter>
              <MotiView
                key={currentTestimonial}
                from={{ 
                  opacity: 0, 
                  translateY: 10,
                  scale: 0.98
                }}
                animate={{ 
                  opacity: 1, 
                  translateY: 0,
                  scale: 1
                }}
                exit={{
                  opacity: 0
                }}
                transition={{ 
                  type: 'spring',
                  delay: 800,
                  damping: 20,
                  stiffness: 200,
                  mass: 0.8
                }}
                style={styles.testimonialContainer}
              >
                <MotiView
                  from={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ 
                    type: 'spring',
                    delay: 950,
                    damping: 15,
                    stiffness: 300
                  }}
                  style={styles.testimonialCard}
                >
                  <View style={styles.testimonialHeader}>
                    <MotiView
                      from={{ opacity: 0, scale: 0.5, rotate: '-180deg' }}
                      animate={{ opacity: 1, scale: 1, rotate: '0deg' }}
                      transition={{
                        type: 'spring',
                        delay: 1100,
                        damping: 12,
                        stiffness: 250
                      }}
                      style={styles.testimonialAvatar}
                    >
                      <Image
                        source={{ uri: shuffledTestimonials[currentTestimonial].avatar }}
                        style={styles.testimonialAvatarImage}
                        resizeMode="cover"
                      />
                    </MotiView>
                    <View style={styles.testimonialInfo}>
                      <MotiView
                        from={{ opacity: 0, translateX: 30 }}
                        animate={{ opacity: 1, translateX: 0 }}
                        transition={{
                          type: 'spring',
                          delay: 1250,
                          damping: 18,
                          stiffness: 200
                        }}
                      >
                        <Text style={styles.testimonialName}>
                          {shuffledTestimonials[currentTestimonial].name}
                        </Text>
                      </MotiView>
                      <MotiView
                        from={{ opacity: 0, translateX: 20 }}
                        animate={{ opacity: 1, translateX: 0 }}
                        transition={{
                          type: 'timing',
                          delay: 1400,
                          duration: 400
                        }}
                        style={styles.testimonialStars}
                      >
                        {[...Array(5)].map((_, i) => (
                          <MotiView
                            key={i}
                            from={{ opacity: 0, scale: 0.3 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{
                              type: 'spring',
                              delay: 1500 + (i * 50),
                              damping: 8,
                              stiffness: 400
                            }}
                          >
                            <Text style={styles.star}>⭐</Text>
                          </MotiView>
                        ))}
                      </MotiView>
                    </View>
                  </View>
                  <MotiView
                    from={{ opacity: 0, translateY: 15 }}
                    animate={{ opacity: 1, translateY: 0 }}
                    transition={{
                      type: 'timing',
                      delay: 1700,
                      duration: 500
                    }}
                  >
                    <Text style={styles.testimonialText}>
                      "{shuffledTestimonials[currentTestimonial].text}"
                    </Text>
                  </MotiView>
                </MotiView>
              </MotiView>
            </AnimatePresence>

          </View>
        </MotiView>

        {/* Security Badge */}
        <View style={styles.securityContainer}>
          <Ionicons name="lock-closed" size={16} color={Colors.light.secondaryLabel} />
          <Text style={styles.securityText}>256-bit AES encryption • TLS 1.3</Text>
        </View>
      </View>

      {/* Terms at bottom */}
      <View style={styles.bottomTermsContainer}>
        <Text style={styles.termsText}>
          By continuing, you agree to our{' '}
          <Link href="/(legal)/terms" asChild>
            <Text style={styles.termsLink}>Terms & Privacy</Text>
          </Link>
        </Text>
      </View>

      {isLoading && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.light.tint} />
            <Text style={styles.loadingText}>Creating your account...</Text>
          </View>
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
  content: {
    flex: 1,
  },
  cardsContainer: {
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    marginTop: 20,
    marginBottom: 24,
    position: 'relative',
  },
  cardsBackdrop: {
    position: 'absolute',
    top: -20,
    left: -20,
    right: -20,
    bottom: -20,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: 30,
    backdropFilter: 'blur(10px)',
  },
  cardWrapper: {
    width: SCREEN_WIDTH * 0.5,
    height: 120,
    marginHorizontal: -30,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  cardImageContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  cardGlow: {
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    borderRadius: 16,
    zIndex: -1,
  },
  cardImage: {
    width: '100%',
    height: '100%',
    borderRadius: 14,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoImage: {
    width: 320,
    height: 64,
    marginBottom: 16,
    alignSelf: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: Colors.light.text,
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: -0.5,
    lineHeight: 32,
  },
  titleHighlight: {
    color: '#007AFF',
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 17,
    color: Colors.light.secondaryLabel,
    textAlign: 'center',
    lineHeight: 22,
    letterSpacing: -0.2,
    paddingHorizontal: 16,
    fontWeight: '500',
  },
  authContainer: {
    paddingTop: 24,
    paddingHorizontal: 16,
  },
  socialButton: {
    backgroundColor: '#ffffff',
    height: 50,
    borderRadius: 14,
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
  },
  socialButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: '100%',
    paddingHorizontal: 24,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(66, 133, 244, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  socialButtonText: {
    color: '#1c1c1e',
    fontSize: 17,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
    marginLeft: -16,
  },
  arrowIcon: {
    opacity: 0.6,
  },
  appleButtonWrapper: {
    marginBottom: 20,
    height: 50,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  appleButton: {
    height: '100%',
    width: '100%',
  },
  testimonialContainer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  testimonialCard: {
    backgroundColor: 'rgba(248, 249, 250, 0.8)',
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
    marginBottom: 10,
    minHeight: 120,
  },
  testimonialHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  testimonialAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  testimonialInitial: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  testimonialAvatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
  },
  testimonialInfo: {
    flex: 1,
  },
  testimonialName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 4,
  },
  testimonialStars: {
    flexDirection: 'row',
  },
  star: {
    fontSize: 12,
    marginRight: 2,
  },
  testimonialText: {
    fontSize: 14,
    color: Colors.light.secondaryLabel,
    lineHeight: 20,
    fontWeight: '500',
    fontStyle: 'italic',
  },
  securityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 12,
    opacity: 0.7,
  },
  securityText: {
    fontSize: 14,
    color: Colors.light.secondaryLabel,
    marginLeft: 6,
  },
  bottomTermsContainer: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 20 : 16,
    backgroundColor: '#ffffff',
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
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    backdropFilter: 'blur(10px)',
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.light.text,
    fontWeight: '500',
  },
}); 