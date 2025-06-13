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
import { useRouter, Link } from 'expo-router';
import { MotiView } from 'moti';
import { Colors } from '../../constants/Colors';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import * as AppleAuthentication from 'expo-apple-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, { 
  useAnimatedStyle, 
  withRepeat, 
  withTiming, 
  withSequence,
  withDelay,
  Easing,
  useSharedValue,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// All available credit card images
const allCards = [
  require('../../assets/images/amex_plat.avif'),
  require('../../assets/images/chase_sapphire_reserve.png'),
  require('../../assets/images/amex_gold.avif'),
  require('../../assets/images/venture_x.avif'),
  require('../../assets/images/hilton_aspire.avif'),
  require('../../assets/images/marriott_bonvoy_brilliant.avif'),
  require('../../assets/images/boa_premium_rewards_elite.png'),
  require('../../assets/images/blue_cash_preferred.avif'),
  require('../../assets/images/boa_premium_rewards.png'),
  require('../../assets/images/amex_green.avif'),
  require('../../assets/images/citi_prestige.jpeg'),
  require('../../assets/images/delta_reserve.avif'),
  require('../../assets/images/usb_altitude_reserve.png'),
];

const testimonials = [
  { name: 'Matt K.', percentage: 93 },
  { name: 'Sarah L.', percentage: 87 },
  { name: 'James R.', percentage: 91 },
  { name: 'Emma T.', percentage: 85 },
  { name: 'Alex M.', percentage: 89 },
  { name: 'Sophie B.', percentage: 92 },
  { name: 'David P.', percentage: 88 },
  { name: 'Rachel W.', percentage: 90 },
  { name: 'Michael C.', percentage: 94 },
  { name: 'Lisa H.', percentage: 86 },
  { name: 'John D.', percentage: 91 },
  { name: 'Anna S.', percentage: 88 },
  { name: 'Tom B.', percentage: 93 },
  { name: 'Olivia M.', percentage: 87 },
  { name: 'Daniel R.', percentage: 90 },
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

export default function LoginScreen() {
  const router = useRouter();
  const { signInGoogle, signInApple } = useAuth();
  const [isLoading, setIsLoading] = React.useState(false);
  const [isAppleAuthAvailable, setIsAppleAuthAvailable] = React.useState(false);
  const [currentTestimonial, setCurrentTestimonial] = React.useState(0);
  const [selectedCards, setSelectedCards] = React.useState<typeof allCards>([]);
  const translateY = useSharedValue(0);

  // Function to get random cards
  const getRandomCards = () => {
    const shuffled = [...allCards].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 5);
  };

  useEffect(() => {
    // Set initial random cards
    setSelectedCards(getRandomCards());
    
    // Rotate cards every 30 seconds
    const cardInterval = setInterval(() => {
      setSelectedCards(getRandomCards());
    }, 30000);

    AppleAuthentication.isAvailableAsync().then(setIsAppleAuthAvailable);
    
    // Rotate testimonials every 4 seconds
    const testimonialInterval = setInterval(() => {
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
      clearInterval(cardInterval);
      clearInterval(testimonialInterval);
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

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    try {
      const { data, error } = await signInGoogle();
      if (error) throw error;
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/(tabs)/01-dashboard' as any);
    } catch (error) {
      console.error('Google sign in error:', error);
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
      if (error) throw error;
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/(tabs)/01-dashboard' as any);
    } catch (error) {
      console.error('Apple sign in error:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetStorage = async () => {
    try {
      await AsyncStorage.clear();
      Alert.alert('Success', 'Local storage has been reset');
    } catch (e) {
      console.error('Failed to reset storage:', e);
      Alert.alert('Error', 'Failed to reset storage');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" />
      
      <TouchableOpacity 
        style={styles.resetButton}
        onPress={handleResetStorage}
      >
        <Ionicons name="refresh" size={20} color={Colors.light.secondaryLabel} />
      </TouchableOpacity>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Credit Card Display with Continuous Animation */}
        <View style={styles.cardsContainer}>
          {selectedCards.map((cardImage, index) => (
            <MotiView
              key={index}
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
                    { translateX: (index - (selectedCards.length - 1) / 2) * 40 },
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
                  source={cardImage}
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
            <Text style={styles.brandText}>Credify</Text>
            <Text style={styles.title}>
              Welcome Back!
            </Text>
            <Text style={styles.subtitle}>
              Sign in to manage your credit card benefits and rewards
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
                <Link href="/legal/terms" asChild>
                  <Text style={styles.termsLink}>Terms & Privacy</Text>
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
  },
  cardsContainer: {
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    marginTop: 12,
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
    marginBottom: 40,
  },
  brandText: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.light.tint,
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.light.text,
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 17,
    color: Colors.light.secondaryLabel,
    textAlign: 'center',
    lineHeight: 22,
    letterSpacing: -0.2,
    paddingHorizontal: 24,
    paddingBottom: 8,
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
    fontSize: 12,
    opacity: 0.6,
  },
  termsLink: {
    color: '#007aff',
    textDecorationLine: 'underline',
    fontSize: 12,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resetButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    right: 20,
    zIndex: 1000,
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
}); 