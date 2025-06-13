import React, { useMemo, useEffect } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Link } from 'expo-router';
import { MotiView } from 'moti';
import { Colors } from '../../constants/Colors';
import * as Haptics from 'expo-haptics';
import { useOnboardingContext } from './_context/OnboardingContext';
import { allCards } from '../../src/data/card-data';
import { useAuth } from '../../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import * as AppleAuthentication from 'expo-apple-authentication';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function RegisterScreen() {
  const router = useRouter();
  const { selectedCards } = useOnboardingContext();
  const { signInGoogle, signInApple } = useAuth();
  const [isLoading, setIsLoading] = React.useState(false);
  const [isAppleAuthAvailable, setIsAppleAuthAvailable] = React.useState(false);

  useEffect(() => {
    AppleAuthentication.isAvailableAsync().then(setIsAppleAuthAvailable);
  }, []);

  // Get the selected card objects with proper typing
  const selectedCardObjects = useMemo(() => {
    return selectedCards
      .map((cardId: string) => allCards.find(card => card.id === cardId))
      .filter((card): card is typeof allCards[0] => card !== undefined);
  }, [selectedCards]);

  // Calculate total value with proper typing
  const totalValue = useMemo(() => {
    return selectedCardObjects.reduce((total: number, card: typeof allCards[0]) => {
      const cardValue = card.benefits.reduce((sum: number, benefit: any) => {
        const annualValue = benefit.value * (12 / benefit.periodMonths);
        return sum + annualValue;
      }, 0);
      return total + cardValue;
    }, 0);
  }, [selectedCardObjects]);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    try {
      const { data, error } = await signInGoogle();
      if (error) throw error;
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/home' as any);
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
      router.replace('/home' as any);
    } catch (error) {
      console.error('Apple sign in error:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" />
      
      {/* Personalized Card Display */}
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
              rotate: '0deg',
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
            <Image
              source={card.image}
              style={styles.cardImage}
              resizeMode="contain"
            />
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
          <Text style={styles.title}>
            Save Your ${totalValue} Perk Dashboard
          </Text>
          <Text style={styles.subtitle}>
            Create a free account to get personalized reminders and ensure you never miss a benefit
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

          <View style={styles.termsContainer}>
            <Text style={styles.termsText}>
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
      </MotiView>

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
  cardsContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    marginTop: 20,
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