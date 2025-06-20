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
  const { signInGoogle, signInApple, signInEmail } = useAuth();
  const [isLoading, setIsLoading] = React.useState(false);
  const [isAppleAuthAvailable, setIsAppleAuthAvailable] = React.useState(false);
  const [currentTestimonial, setCurrentTestimonial] = React.useState(0);
  const [selectedCards, setSelectedCards] = React.useState<typeof allCards>([]);
  const translateY = useSharedValue(0);
  const [isEmailModalVisible, setIsEmailModalVisible] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isEmailFocused, setIsEmailFocused] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const passwordInputRef = useRef<TextInput | null>(null);

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
      if (error) {
        // Only throw if it's not a cancellation
        if (error.message !== 'User cancelled') {
          throw error;
        }
        // If it's a cancellation, just return without navigation
        return;
      }
      
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
      if (error) {
        // Only throw if it's not a cancellation
        if (error.message !== 'User cancelled') {
          throw error;
        }
        // If it's a cancellation, just return without navigation
        return;
      }
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/(tabs)/01-dashboard' as any);
    } catch (error) {
      console.error('Apple sign in error:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
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
    try {
      console.log('🧹 Clearing AsyncStorage...');
      await AsyncStorage.clear();
      console.log('✅ AsyncStorage cleared successfully');
      
      Alert.alert('Success', 'Local storage has been reset', [
        {
          text: 'OK',
          onPress: () => {
            console.log('🔄 Navigating to root...');
            router.replace('/');
          }
        }
      ]);
    } catch (e) {
      console.error('❌ Failed to reset storage:', e);
      Alert.alert('Error', 'Failed to reset storage');
    }
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

            <TouchableOpacity 
              style={styles.socialButton} 
              onPress={() => setIsEmailModalVisible(true)}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              <View style={styles.socialButtonContent}>
                <Ionicons name="mail" size={20} color={Colors.light.tint} />
                <Text style={styles.socialButtonText}>
                  Continue with Email
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
    marginTop: 0,
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
    paddingTop: 12,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logoImage: {
    width: 350,
    height: 70,
    marginBottom: 24,
    alignSelf: 'center',
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