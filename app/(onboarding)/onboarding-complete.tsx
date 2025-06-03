import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import LottieView from 'lottie-react-native';
import { Colors } from '../../constants/Colors';

export default function OnboardingCompleteScreen() {
  const router = useRouter();

  const handleGoToDashboard = () => {
    // Replace the entire stack with the dashboard to prevent going back to onboarding
    router.replace('/(tabs)/01-dashboard');
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <View style={styles.contentContainer}>
        <LottieView
          source={require('../../assets/animations/celebration.json')} // Assuming you have a confetti animation
          autoPlay
          loop={false}
          style={styles.lottieAnimation}
          resizeMode="cover"
        />
        <Text style={styles.title}>All Set!</Text>
        <Text style={styles.subtitle}>
          Great! We'll remind you to help you keep every dollar of value.
        </Text>
        <Text style={styles.infoText}>
          You can manage your cards and notification preferences in the app anytime.
        </Text>
      </View>
      <View style={styles.footer}>
        <TouchableOpacity style={styles.dashboardButton} onPress={handleGoToDashboard}>
          <Text style={styles.dashboardButtonText}>Go to Dashboard</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff', // White background for the page
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  lottieAnimation: {
    width: '100%',
    height: 300, // Adjust height as needed for your animation
    marginBottom: 0, // Animation might have its own padding
  },
  title: {
    fontSize: 28, // Larger title
    fontWeight: 'bold',
    color: Colors.light.text,
    textAlign: 'center',
    marginTop: -20, // Adjust to overlap Lottie slightly if desired, or remove for spacing
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 18, // Slightly larger subtitle
    color: Colors.light.text, // Primary text color for emphasis
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 26,
  },
  infoText: {
    fontSize: 15,
    color: Colors.light.icon, // Using icon color as secondary text color
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  footer: {
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 30 : 20, // Extra padding for home indicator on iOS
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e1e1e1',
    backgroundColor: '#ffffff',
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