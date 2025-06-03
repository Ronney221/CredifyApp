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
import { useRouter } from 'expo-router';
import LottieView from 'lottie-react-native';
import { Colors } from '../../constants/Colors';

const HEADER_OFFSET = Platform.OS === 'ios' ? 120 : 90; // Updated Offset for transparent header

export default function OnboardingCompleteScreen() {
  const router = useRouter();
  const lottieRef = useRef<LottieView>(null);
  const confettiOpacityAnim = useRef(new Animated.Value(1)).current;
  const summaryOpacityAnim = useRef(new Animated.Value(0)).current;
  const buttonScaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    // Initial Lottie play
    lottieRef.current?.play(0);

    // Lottie fade out after initial burst + delay
    const lottieFadeOutTimer = setTimeout(() => {
      Animated.timing(confettiOpacityAnim, {
        toValue: 0,
        duration: 300,
        easing: Easing.ease,
        useNativeDriver: true,
      }).start();
    }, 2700); // 700ms burst + 2000ms subtle loop (simulated by delay)

    // "What's Next?" fade in
    const summaryFadeInTimer = setTimeout(() => {
      Animated.timing(summaryOpacityAnim, {
        toValue: 1,
        duration: 200,
        easing: Easing.ease,
        useNativeDriver: true,
      }).start();
    }, 900); // After confetti burst (700ms) + slight delay

    // Button bounce in
    Animated.spring(buttonScaleAnim, {
      toValue: 1,
      friction: 5,
      tension: 140,
      useNativeDriver: true,
    }).start();

    // Optional button pulsation
    const pulsationTimer = setTimeout(() => {
      Animated.sequence([
        Animated.timing(buttonScaleAnim, { toValue: 1.02, duration: 50, useNativeDriver: true, easing: Easing.ease }),
        Animated.timing(buttonScaleAnim, { toValue: 1, duration: 50, useNativeDriver: true, easing: Easing.ease }),
      ]).start();
    }, 1000 + 250); // 1 second after landing + initial bounce duration

    return () => {
      clearTimeout(lottieFadeOutTimer);
      clearTimeout(summaryFadeInTimer);
      clearTimeout(pulsationTimer);
    };
  }, [confettiOpacityAnim, summaryOpacityAnim, buttonScaleAnim]);

  const handleGoToDashboard = () => {
    // Replace the entire stack with the dashboard to prevent going back to onboarding
    router.replace('/(tabs)/01-dashboard');
  };

  return (
    <SafeAreaView style={[styles.container, { paddingTop: HEADER_OFFSET }]} edges={['bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <Animated.View style={[styles.lottieContainer, { opacity: confettiOpacityAnim, top: HEADER_OFFSET }]}>
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
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  dashboardButtonText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '600',
  },
}); 