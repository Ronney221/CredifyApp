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
import { useOnboardingContext } from './context/OnboardingContext';
import { onboardingScreenNames } from './_layout';
import { WIZARD_HEADER_HEIGHT } from './WizardHeader';

export default function OnboardingCompleteScreen() {
  const router = useRouter();
  const { setStep, setIsHeaderGloballyHidden } = useOnboardingContext();
  const route = useRoute();

  const lottieRef = useRef<LottieView>(null);
  const confettiOpacityAnim = useRef(new Animated.Value(1)).current;
  const summaryOpacityAnim = useRef(new Animated.Value(0)).current;
  const buttonScaleAnim = useRef(new Animated.Value(0.8)).current;

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
      Animated.timing(summaryOpacityAnim, {
        toValue: 1,
        duration: 200,
        easing: Easing.ease,
        useNativeDriver: true,
      }).start();
    }, 900);

    Animated.spring(buttonScaleAnim, {
      toValue: 1,
      friction: 5,
      tension: 140,
      useNativeDriver: true,
    }).start();

    const pulseTimer = setTimeout(() => {
      Animated.sequence([
        Animated.timing(buttonScaleAnim, { toValue: 1.03, duration: 150, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
        Animated.timing(buttonScaleAnim, { toValue: 1, duration: 200, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
      ]).start();
    }, 1500);

    return () => {
      clearTimeout(lottieFadeOutTimer);
      clearTimeout(summaryFadeInTimer);
      clearTimeout(pulseTimer);
    };
  }, [confettiOpacityAnim, summaryOpacityAnim, buttonScaleAnim]);

  const handleGoToDashboard = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.replace('/(tabs)/01-dashboard');
  };

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
          Great—you're all set. We'll remind you so you never miss a perk.
        </Text>
        
        <Animated.View style={{ opacity: summaryOpacityAnim, width: '100%', alignItems: 'center' }}>
          <Text style={styles.whatsNextTitle}>What's Next:</Text>
          <View style={styles.whatsNextBulletContainer}>
            <Text style={styles.bulletPoint}>•</Text>
            <Text style={styles.whatsNextText}>
              We'll send your first Perk Expiry reminder 7 days before it's due.
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
      <View style={styles.footer}>
        <Animated.View style={{ transform: [{ scale: buttonScaleAnim }] }}>
          <TouchableOpacity style={styles.dashboardButton} onPress={handleGoToDashboard}>
            <Text style={styles.dashboardButtonText}>Go to Dashboard</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
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
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e1e1e1',
    backgroundColor: '#ffffff',
    zIndex: 1,
  },
  dashboardButton: {
    backgroundColor: Colors.light.tint,
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: {width:0, height:2},
    elevation: 4,
  },
  dashboardButtonText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '600',
  },
}); 