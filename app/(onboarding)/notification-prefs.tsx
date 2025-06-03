import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Platform,
  StatusBar,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../../constants/Colors';

const NOTIFICATION_PREFS_KEY = '@notification_preferences';

export default function OnboardingNotificationPrefsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ selectedCardIds?: string }>();
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);

  useEffect(() => {
    if (params.selectedCardIds) {
      try {
        const ids = JSON.parse(params.selectedCardIds);
        setSelectedCardIds(ids);
      } catch (e) {
        console.error("Failed to parse selectedCardIds from params:", e);
        Alert.alert("Error", "Could not load selected card data. Please go back and try again.");
      }
    }
  }, [params.selectedCardIds]);

  const handleNext = async () => {
    // Define default notification preferences
    const defaultNotificationPreferences = {
      perkExpiryRemindersEnabled: true,
      renewalRemindersEnabled: true,
      perkResetConfirmationEnabled: true,
      monthlyPerkExpiryReminderDays: [1, 3, 7],
      // Keep UI state flags for potential future re-hydration if needed, though UI is removed
      remind1DayBeforeMonthly: true,
      remind3DaysBeforeMonthly: true,
      remind7DaysBeforeMonthly: true,
    };

    const onboardingPrefs = {
      selectedCardIds,
      notificationPreferences: defaultNotificationPreferences,
    };

    try {
      await AsyncStorage.setItem(NOTIFICATION_PREFS_KEY, JSON.stringify(onboardingPrefs));
      // Navigate to the new success screen
      router.push('/(onboarding)/onboarding-complete'); 
    } catch (e) {
      console.error("Failed to save onboarding prefs:", e);
      Alert.alert("Error", "Could not save preferences. Please try again.");
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.headerContainer}>
        {/* Title is now handled by Stack Navigator, this can be simplified or removed if not needed */}
        {/* <Text style={styles.title}>Notification Settings</Text> */}
        {/* <Text style={styles.subtitle}>Customize how you'd like to be reminded.</Text> */}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.contentContainer}>
          <Text style={styles.infoTitle}>Sensible Reminders Enabled</Text>
          <Text style={styles.infoText}>
            We've enabled recommended reminders to help you get the most out of your cards.
          </Text>
          <Text style={styles.infoText}>
            You can customize these anytime in <Text style={styles.boldText}>Settings &gt; Notifications</Text>.
          </Text>
          <View style={styles.defaultSettingsBox}>
            <Text style={styles.defaultSettingsHeader}>Defaults We've Set For You:</Text>
            <Text style={styles.defaultSettingsItem}>• Perk Expiry Reminders (1, 3, 7 days before)</Text>
            <Text style={styles.defaultSettingsItem}>• Card Renewal Reminders (7 days before)</Text>
            <Text style={styles.defaultSettingsItem}>• Monthly Perk Reset Confirmations</Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
          <Text style={styles.nextButtonText}>Finish Setup</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f2f2f7', // Page background
  },
  headerContainer: { // This container can be slimmed down or removed if header is fully managed by navigator
    paddingHorizontal: 20,
    paddingTop: 16, // Adjusted as per previous step
    paddingBottom: 15,
    backgroundColor: '#ffffff', // Header area background
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#c7c7cc',
  },
  // title: {
  //   fontSize: 28,
  //   fontWeight: 'bold',
  //   color: Colors.light.text,
  //   textAlign: 'center',
  //   marginBottom: 5,
  // },
  // subtitle: {
  //   fontSize: 16,
  //   color: Colors.light.icon,
  //   textAlign: 'center',
  // },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center', // Center content vertically
    paddingHorizontal: 24,
  },
  contentContainer: {
    alignItems: 'center', // Center content horizontally
    paddingVertical: 32, // Add some vertical padding
    backgroundColor: '#ffffff', // White card for content
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.00,
    elevation: 2,
  },
  infoTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: Colors.light.text,
    textAlign: 'center',
    marginBottom: 16,
  },
  infoText: {
    fontSize: 16,
    color: Colors.light.icon,
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 22,
  },
  boldText: {
    fontWeight: '600',
    color: Colors.light.text,
  },
  defaultSettingsBox: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#f9f9f9', // A slightly different background for the box
    borderRadius: 8,
    width: '100%',
  },
  defaultSettingsHeader: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 8,
  },
  defaultSettingsItem: {
    fontSize: 14,
    color: Colors.light.icon,
    marginBottom: 4,
    lineHeight: 20,
  },
  footer: {
    padding: 20,
    backgroundColor: '#f2f2f7', // Match page background
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#c7c7cc',
  },
  nextButton: {
    backgroundColor: Colors.light.tint,
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  nextButtonText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '600',
  },
}); 