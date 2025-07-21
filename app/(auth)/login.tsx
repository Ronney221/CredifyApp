import React, { useMemo, useEffect, useRef, useState } from 'react';
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
  Modal,
  TextInput,
  TouchableWithoutFeedback,
  Keyboard,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Link } from 'expo-router';
import { MotiView } from 'moti';
import { Colors } from '../../constants/Colors';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../../contexts/AuthContext';
import { Ionicons , FontAwesome } from '@expo/vector-icons';
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
  withSpring,
  interpolate,
  useAnimatedProps,
} from 'react-native-reanimated';

import { supabase } from '../../lib/supabase';
import { logger } from '../../utils/logger';

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


const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

export default function LoginScreen() {
  const router = useRouter();
  const { signInGoogle, signInApple, signInEmail } = useAuth();
  const [isLoading, setIsLoading] = React.useState(false);
  const [isAppleAuthAvailable, setIsAppleAuthAvailable] = React.useState(false);
  const [selectedCards, setSelectedCards] = React.useState<typeof allCards>([]);
  const [cardKey, setCardKey] = React.useState(0);
  const translateY = useSharedValue(0);
  const cardOpacity = useSharedValue(1);
  const [isEmailModalVisible, setIsEmailModalVisible] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isEmailFocused, setIsEmailFocused] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const passwordInputRef = useRef<TextInput | null>(null);
  
  // Micro-interaction values
  const googleButtonScale = useSharedValue(1);
  const emailButtonScale = useSharedValue(1);
  const googleButtonDepth = useSharedValue(0);
  const emailButtonDepth = useSharedValue(0);
  const parallaxOffset = useSharedValue(0);
  const loadingProgress = useSharedValue(0);

  // Function to get random cards
  const getRandomCards = () => {
    const shuffled = [...allCards].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 3);
  };

  useEffect(() => {
    // Set initial random cards
    setSelectedCards(getRandomCards());
    
    // Rotate cards every 5 seconds with simple fade
    const cardInterval = setInterval(() => {
      // Fade out
      cardOpacity.value = withTiming(0, { duration: 300 });
      
      // Change cards after fade out completes
      setTimeout(() => {
        setSelectedCards(getRandomCards());
        setCardKey(prev => prev + 1); // Force MotiView re-animation
        cardOpacity.value = withTiming(1, { duration: 300 });
      }, 300);
    }, 5000);

    AppleAuthentication.isAvailableAsync().then(setIsAppleAuthAvailable);
    
    
    // Start the floating animation
    translateY.value = withRepeat(
      withSequence(
        withTiming(-10, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 2000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    // Start subtle parallax drift
    parallaxOffset.value = withRepeat(
      withSequence(
        withTiming(5, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
        withTiming(-5, { duration: 3000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
    
    return () => {
      clearInterval(cardInterval);
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

  // Button animation styles with depth
  const googleButtonAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: googleButtonScale.value },
        { translateY: googleButtonDepth.value }
      ],
      shadowOpacity: interpolate(googleButtonDepth.value, [0, 4], [0.1, 0.25]),
      shadowOffset: {
        width: 0,
        height: interpolate(googleButtonDepth.value, [0, 4], [2, 8]),
      },
      shadowRadius: interpolate(googleButtonDepth.value, [0, 4], [4, 12]),
    };
  });

  const emailButtonAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: emailButtonScale.value },
        { translateY: emailButtonDepth.value }
      ],
      shadowOpacity: interpolate(emailButtonDepth.value, [0, 4], [0.1, 0.25]),
      shadowOffset: {
        width: 0,
        height: interpolate(emailButtonDepth.value, [0, 4], [2, 8]),
      },
      shadowRadius: interpolate(emailButtonDepth.value, [0, 4], [4, 12]),
    };
  });

  // Parallax effect for cards
  const cardsParallaxStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateY: parallaxOffset.value * 0.3 },
        { scale: 1 - parallaxOffset.value * 0.0001 }
      ],
      opacity: cardOpacity.value,
    };
  });


  // Loading state morphing
  const loadingAnimatedStyle = useAnimatedStyle(() => {
    const scale = interpolate(loadingProgress.value, [0, 0.5, 1], [1, 1.1, 1]);
    const opacity = interpolate(loadingProgress.value, [0, 0.3, 0.7, 1], [1, 0.8, 0.8, 1]);
    
    return {
      transform: [{ scale }],
      opacity,
    };
  });


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

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    loadingProgress.value = withRepeat(withTiming(1, { duration: 1000 }), -1, true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    try {
      const { data, error } = await signInGoogle();
      if (error) {
        // Only throw if it's not a cancellation
        if (error.message !== 'User cancelled') {
          throw error;
        }
        // If it's a cancellation, just return without navigation
        return;
      }
      
      loadingProgress.value = 0;
      await playSuccessHapticPattern();
      router.replace('/(tabs)/01-dashboard' as any);
    } catch (error) {
      console.error('Google sign in error:', error);
      loadingProgress.value = 0;
      await playErrorHapticPattern();
    } finally {
      setIsLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    setIsLoading(true);
    loadingProgress.value = withRepeat(withTiming(1, { duration: 1000 }), -1, true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    try {
      const { data, error } = await signInApple();
      if (error) {
        // Only throw if it's not a cancellation
        if (error.message !== 'User cancelled') {
          throw error;
        }
        // If it's a cancellation, just return without navigation
        return;
      }
      
      loadingProgress.value = 0;
      await playSuccessHapticPattern();
      router.replace('/(tabs)/01-dashboard' as any);
    } catch (error) {
      console.error('Apple sign in error:', error);
      loadingProgress.value = 0;
      await playErrorHapticPattern();
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailLogin = async () => {
    setIsLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    try {
      const { data, error } = await signInEmail(email, password);
      if (error) throw error;
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/(tabs)/01-dashboard' as any);
    } catch (error) {
      console.error('Email sign in error:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'Invalid email or password');
    } finally {
      setIsLoading(false);
      setIsEmailModalVisible(false);
    }
  };

  const handleResetStorage = async () => {
    Alert.alert(
      'Show Tutorial Again?',
      'This will clear your local settings and show the onboarding tutorial.',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Show Tutorial',
          style: 'destructive',
          onPress: async () => {
            try {
              logger.log('🧹 Clearing AsyncStorage...');
              await AsyncStorage.clear();
              logger.log('✅ AsyncStorage cleared successfully');
              logger.log('🔄 Navigating to root...');
              router.replace('/');
            } catch (e) {
              console.error('❌ Failed to reset storage:', e);
              Alert.alert('Error', 'Failed to reset tutorial settings');
            }
          }
        }
      ]
    );
  };

  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" />
      
      <TouchableOpacity 
        style={styles.resetButton}
        onPress={handleResetStorage}
      >
        <Ionicons name="help-circle-outline" size={20} color={Colors.light.secondaryLabel} />
      </TouchableOpacity>

      <View style={styles.contentWrapper}>
        {/* Premium Card Display with Glassmorphism */}
        <Animated.View style={[styles.cardsContainer, cardsParallaxStyle]}>
          <View style={styles.cardsBackdrop} />
          {selectedCards.map((cardImage, index) => (
            <MotiView
              key={`${cardKey}-${index}`}
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
                <View style={styles.cardGlow} />
                <Image
                  source={cardImage}
                  style={styles.cardImage}
                  resizeMode="contain"
                />
              </Animated.View>
            </MotiView>
          ))}
        </Animated.View>

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
              Welcome Back!
            </Text>
            <Text style={styles.subtitle}>
              Sign in to manage your credit card benefits and rewards
            </Text>
          </View>

          <View style={styles.authContainer}>
            <AnimatedTouchableOpacity 
              style={[styles.socialButton, googleButtonAnimatedStyle]} 
              onPress={handleGoogleSignIn}
              disabled={isLoading}
              activeOpacity={1}
              onPressIn={() => {
                googleButtonScale.value = withSpring(0.95, { damping: 10, stiffness: 400 });
                googleButtonDepth.value = withSpring(4, { damping: 12, stiffness: 300 });
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              onPressOut={() => {
                googleButtonScale.value = withSpring(1, { damping: 10, stiffness: 400 });
                googleButtonDepth.value = withSpring(0, { damping: 12, stiffness: 300 });
              }}
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
            </AnimatedTouchableOpacity>

            <AnimatedTouchableOpacity 
              style={[styles.socialButton, emailButtonAnimatedStyle]} 
              onPress={() => setIsEmailModalVisible(true)}
              disabled={isLoading}
              activeOpacity={1}
              onPressIn={() => {
                emailButtonScale.value = withSpring(0.95, { damping: 10, stiffness: 400 });
                emailButtonDepth.value = withSpring(4, { damping: 12, stiffness: 300 });
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              onPressOut={() => {
                emailButtonScale.value = withSpring(1, { damping: 10, stiffness: 400 });
                emailButtonDepth.value = withSpring(0, { damping: 12, stiffness: 300 });
              }}
            >
              <View style={styles.socialButtonContent}>
                <View style={[styles.iconContainer, styles.emailIconContainer]}>
                  <Ionicons name="mail" size={22} color={Colors.light.tint} />
                </View>
                <Text style={styles.socialButtonText}>
                  Continue with Email
                </Text>
                <Ionicons name="arrow-forward" size={18} color="#666" style={styles.arrowIcon} />
              </View>
            </AnimatedTouchableOpacity>
            
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

            {/* Security Badge */}
            <View style={styles.securityContainer}>
              <Ionicons name="lock-closed" size={16} color={Colors.light.secondaryLabel} />
              <Text style={styles.securityText}>256-bit AES encryption • TLS 1.3</Text>
            </View>


            <View style={styles.termsContainer}>
              <Text style={styles.termsText}>
                By continuing, you agree to our{' '}
                <Link href="/(legal)/terms" asChild>
                  <Text style={styles.termsLink}>Terms & Privacy</Text>
                </Link>
              </Text>
            </View>
          </View>
        </MotiView>
      </View>

      <Modal
        animationType="slide"
        transparent={true}
        visible={isEmailModalVisible}
        onRequestClose={() => setIsEmailModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={dismissKeyboard}>
          <View style={styles.modalOverlay}>
            <KeyboardAvoidingView 
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={styles.modalContent}
            >
              <TouchableWithoutFeedback onPress={dismissKeyboard}>
                <View>
                  <Text style={styles.modalTitle}>Sign in with Email</Text>
                  
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Email</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Enter your email"
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoComplete="email"
                      onFocus={() => setIsEmailFocused(true)}
                      onBlur={() => setIsEmailFocused(false)}
                      returnKeyType="next"
                      onSubmitEditing={() => {
                        // Focus the password input when email is submitted
                        passwordInputRef.current?.focus();
                      }}
                    />
                    {isEmailFocused && (
                      <Text style={styles.helperText}>Use: test@example.com</Text>
                    )}
                  </View>
                  
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Password</Text>
                    <TextInput
                      ref={passwordInputRef}
                      style={styles.input}
                      placeholder="Enter your password"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry
                      autoCapitalize="none"
                      autoComplete="password"
                      onFocus={() => setIsPasswordFocused(true)}
                      onBlur={() => setIsPasswordFocused(false)}
                      returnKeyType="done"
                      onSubmitEditing={handleEmailLogin}
                    />
                    {isPasswordFocused && (
                      <Text style={styles.helperText}>Use: password</Text>
                    )}
                  </View>
                  
                  <View style={styles.modalButtons}>
                    <TouchableOpacity 
                      style={[styles.modalButton, styles.cancelButton]}
                      onPress={() => setIsEmailModalVisible(false)}
                    >
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={[styles.modalButton, styles.loginButton]}
                      onPress={handleEmailLogin}
                      disabled={isLoading}
                    >
                      <Text style={styles.loginButtonText}>Sign In</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {isLoading && (
        <Animated.View style={[styles.loadingOverlay, loadingAnimatedStyle]}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.light.tint} />
            <Text style={styles.loadingText}>Securing your connection...</Text>
          </View>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  contentWrapper: {
    flex: 1,
  },
  cardsContainer: {
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    marginTop: 16,
    marginBottom: 12,
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
  cardsLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoImage: {
    width: 320,
    height: 64,
    marginBottom: 20,
    alignSelf: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: Colors.light.text,
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.5,
    lineHeight: 32,
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
    paddingHorizontal: 0,
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
    marginHorizontal: 16,
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
  emailIconContainer: {
    backgroundColor: `rgba(0, 122, 255, 0.08)`,
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
  securityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    marginBottom: 20,
    opacity: 0.7,
  },
  securityText: {
    fontSize: 14,
    color: Colors.light.secondaryLabel,
    marginLeft: 6,
  },
  termsContainer: {
    paddingHorizontal: 24,
    marginBottom: 24,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 20,
    textAlign: 'center',
    color: Colors.light.text,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    fontSize: 16,
    backgroundColor: '#f8f8f8',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingBottom: 16,
  },
  modalButton: {
    flex: 1,
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  cancelButton: {
    backgroundColor: '#f2f2f2',
  },
  loginButton: {
    backgroundColor: Colors.light.tint,
  },
  cancelButtonText: {
    color: Colors.light.text,
    fontSize: 16,
    fontWeight: '600',
  },
  loginButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 8,
  },
  helperText: {
    fontSize: 12,
    color: Colors.light.secondaryLabel,
    marginTop: 4,
    marginLeft: 4,
    fontStyle: 'italic',
  },
}); 