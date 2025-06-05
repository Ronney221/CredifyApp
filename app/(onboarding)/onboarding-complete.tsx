import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Platform,
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { useRoute } from '@react-navigation/native';
import LottieView from 'lottie-react-native';
import { Colors } from '../../constants/Colors';
import * as Haptics from 'expo-haptics';
import { useOnboardingContext } from './_context/OnboardingContext';
import { onboardingScreenNames } from './_layout';
import { WIZARD_HEADER_HEIGHT } from './WizardHeader';
import { useAuth } from '../../contexts/AuthContext';
import { saveUserCards } from '../../lib/database';
import { allCards } from '../../src/data/card-data';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

const NOTIFICATION_PREFS_KEY = '@notification_preferences';

export default function OnboardingCompleteScreen() {
  const router = useRouter();
  const { 
    setStep, 
    setIsHeaderGloballyHidden,
    selectedCards,
    renewalDates,
    notificationPrefs 
  } = useOnboardingContext();
  const { user } = useAuth();
  const route = useRoute();
  
  const lottieRef = useRef<LottieView>(null);
  const confettiOpacityAnim = useRef(new Animated.Value(1)).current;
  const summaryOpacityAnim = useRef(new Animated.Value(0)).current;

  useFocusEffect(
    React.useCallback(() => {
      const screenName = route.name.split('/').pop() || 'onboarding-complete';
      const stepIndex = onboardingScreenNames.indexOf(screenName);
      if (stepIndex !== -1) {
        setStep(stepIndex);
      }
      const hideHeaderTimer = setTimeout(() => {
        setIsHeaderGloballyHidden(true);
      }, 1000);

      return () => {
        setIsHeaderGloballyHidden(false);
        clearTimeout(hideHeaderTimer);
      };
    }, [route.name, setStep, setIsHeaderGloballyHidden])
  );

  const handleCompleteOnboarding = async () => {
    if (!user) {
      console.error("Onboarding completion attempted without a user.");
      Alert.alert("Error", "You must be logged in to complete onboarding.", [
        { text: "OK", onPress: () => router.replace('/(auth)/login') }
      ]);
      return;
    }

    try {
      const selectedCardObjects = allCards.filter(card => selectedCards.includes(card.id));
      await saveUserCards(user.id, selectedCardObjects, renewalDates);
      
      const monthlyPerkExpiryReminderDays: number[] = [];
      if (notificationPrefs.perkExpiryRemindersEnabled) {
        if (notificationPrefs.remind1DayBeforeMonthly) monthlyPerkExpiryReminderDays.push(1);
        if (notificationPrefs.remind3DaysBeforeMonthly) monthlyPerkExpiryReminderDays.push(3);
        if (notificationPrefs.remind7DaysBeforeMonthly) monthlyPerkExpiryReminderDays.push(7);
      }
      const prefsToSave = { ...notificationPrefs, monthlyPerkExpiryReminderDays };
      await AsyncStorage.setItem(NOTIFICATION_PREFS_KEY, JSON.stringify(prefsToSave));

    } catch (error) {
      console.error("[OnboardingComplete] Failed to save user data:", error);
    }
  };

  useEffect(() => {
    lottieRef.current?.play(0);
    const lottieFadeOutTimer = setTimeout(() => {
      Animated.timing(confettiOpacityAnim, {
        toValue: 0,
        duration: 300,
        easing: Easing.ease,
        useNativeDriver: true,
      }).start();
    }, 2700);

    const summaryFadeInTimer = setTimeout(() => {
      Animated.timing(summaryOpacityAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    }, 900);

    handleCompleteOnboarding();
    const redirectTimer = setTimeout(() => {
      router.replace('/(tabs)/01-dashboard');
    }, 3200);

    return () => {
      clearTimeout(lottieFadeOutTimer);
      clearTimeout(summaryFadeInTimer);
      clearTimeout(redirectTimer);
    };
  }, []);

  return (
    <SafeAreaView style={[styles.container, { paddingTop: WIZARD_HEADER_HEIGHT }]} edges={['bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <Animated.View style={[styles.lottieContainer, { opacity: confettiOpacityAnim, top: WIZARD_HEADER_HEIGHT }]}>
        <LottieView
          ref={lottieRef}
          source={require('../../assets/animations/celebration.json')}
          autoPlay={false}
          loop={false}
          style={styles.lottieAnimation}
          resizeMode="cover"
        />
      </Animated.View>
      <View style={styles.contentContainer}>
        <View style={styles.spacerForLottie} />
        <Text style={styles.title}>All Set!</Text>
        <Text style={styles.subtitle}>
          Great—you&apos;re all set. We&apos;ll remind you so you never miss a perk.
        </Text>
        
        <Animated.View style={{ opacity: summaryOpacityAnim, width: '100%', alignItems: 'center' }}>
          <Text style={styles.whatsNextTitle}>What&apos;s Next:</Text>
          <View style={styles.whatsNextBulletContainer}>
            <Text style={styles.bulletPoint}>•</Text>
            <Text style={styles.whatsNextText}>
              We&apos;ll send your first Perk Expiry reminder 7 days before it&apos;s due.
            </Text>
          </View>
          <View style={styles.whatsNextBulletContainer}>
            <Text style={styles.bulletPoint}>•</Text>
            <Text style={styles.whatsNextText}>
              You can always edit your cards and notification settings in Settings.
            </Text>
          </View>
        </Animated.View>
      </View>
      <View style={styles.footer} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  lottieContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: '40%',
    zIndex: 0,
  },
  lottieAnimation: {
    width: '100%',
    height: '100%',
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    zIndex: 1,
  },
  spacerForLottie: {
    height: '30%',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.light.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 18,
    color: Colors.light.text,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 26,
  },
  whatsNextTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#6E6E73',
    textAlign: 'center',
    marginBottom: 8,
  },
  whatsNextBulletContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    paddingHorizontal: 16,
    width: '100%',
  },
  bulletPoint: {
    fontSize: 16,
    fontWeight: '400',
    color: '#6E6E73',
    marginRight: 8,
    lineHeight: 22,
  },
  whatsNextText: {
    fontSize: 16,
    fontWeight: '400',
    color: '#6E6E73',
    flex: 1,
    lineHeight: 22,
  },
  footer: {
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 30 : 20,
    backgroundColor: '#ffffff',
    zIndex: 1,
    minHeight: 90, 
  },
}); 