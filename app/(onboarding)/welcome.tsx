import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MotiView } from 'moti';
import { Colors } from '../../constants/Colors';
import * as Haptics from 'expo-haptics';
import LottieView from 'lottie-react-native';

export default function WelcomeScreen() {
  const router = useRouter();

  const handleGetStarted = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.push('/(onboarding)/card-select');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" />
      
      <MotiView
        from={{ opacity: 0, translateY: 20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 600 }}
        style={styles.contentContainer}
      >
        <View style={styles.headerContainer}>
          <Text style={styles.title}>Welcome to Credify</Text>
          <Text style={styles.subtitle}>
            Your personal credit card benefits manager
          </Text>
        </View>

        <MotiView
          from={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'timing', duration: 600, delay: 200 }}
          style={styles.animationContainer}
        >
          <LottieView
            source={require('../../assets/animations/credit_card_animation.json')}
            autoPlay
            loop
            style={styles.animation}
          />
        </MotiView>

        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 600, delay: 400 }}
          style={styles.featuresContainer}
        >
          <View style={styles.featureItem}>
            <Text style={styles.featureText}>• Track your credit card benefits</Text>
          </View>
          <View style={styles.featureItem}>
            <Text style={styles.featureText}>• Get notified about renewals</Text>
          </View>
          <View style={styles.featureItem}>
            <Text style={styles.featureText}>• Maximize your rewards</Text>
          </View>
        </MotiView>
      </MotiView>

      <MotiView
        from={{ opacity: 0, translateY: 20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 600, delay: 600 }}
        style={styles.footer}
      >
        <TouchableOpacity
          style={styles.getStartedButton}
          onPress={handleGetStarted}
          activeOpacity={0.8}
        >
          <Text style={styles.getStartedText}>Get Started</Text>
        </TouchableOpacity>
      </MotiView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
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
    fontSize: 18,
    color: Colors.light.secondaryLabel,
    textAlign: 'center',
    lineHeight: 24,
    letterSpacing: -0.2,
  },
  animationContainer: {
    alignItems: 'center',
    marginBottom: 40,
    height: 240,
  },
  animation: {
    width: '100%',
    height: '100%',
  },
  featuresContainer: {
    marginBottom: 40,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  featureText: {
    fontSize: 17,
    color: Colors.light.text,
    lineHeight: 22,
    letterSpacing: -0.2,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 20 : 24,
  },
  getStartedButton: {
    backgroundColor: Colors.light.tint,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: Colors.light.tint,
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 5,
  },
  getStartedText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
}); 