import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Platform,
  StatusBar,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../../constants/Colors';

const ONBOARDING_PREFS_KEY = '@onboarding_preferences';

export default function OnboardingNotificationPrefsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ selectedCardIds?: string }>();
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);

  // Notification preferences state
  const [perkExpiryRemindersEnabled, setPerkExpiryRemindersEnabled] = useState(true);
  const [renewalRemindersEnabled, setRenewalRemindersEnabled] = useState(true);
  const [perkResetConfirmationEnabled, setPerkResetConfirmationEnabled] = useState(true);
  const [remind1DayBeforeMonthly, setRemind1DayBeforeMonthly] = useState(true);
  const [remind3DaysBeforeMonthly, setRemind3DaysBeforeMonthly] = useState(true);
  const [remind7DaysBeforeMonthly, setRemind7DaysBeforeMonthly] = useState(true);

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
    const monthlyPerkExpiryReminderDays: number[] = [];
    if (remind1DayBeforeMonthly) monthlyPerkExpiryReminderDays.push(1);
    if (remind3DaysBeforeMonthly) monthlyPerkExpiryReminderDays.push(3);
    if (remind7DaysBeforeMonthly) monthlyPerkExpiryReminderDays.push(7);

    const onboardingPrefs = {
      selectedCardIds,
      notificationPreferences: {
        perkExpiryRemindersEnabled,
        renewalRemindersEnabled,
        perkResetConfirmationEnabled,
        remind1DayBeforeMonthly, // UI state for potential re-hydration if needed
        remind3DaysBeforeMonthly,
        remind7DaysBeforeMonthly,
        monthlyPerkExpiryReminderDays, // For the scheduler
      },
    };

    try {
      await AsyncStorage.setItem(ONBOARDING_PREFS_KEY, JSON.stringify(onboardingPrefs));
      // Navigate to the start of the authentication flow
      router.push('/(auth)/login'); // Or your preferred auth entry point
    } catch (e) {
      console.error("Failed to save onboarding prefs:", e);
      Alert.alert("Error", "Could not save preferences. Please try again.");
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.headerContainer}>
        <Text style={styles.title}>Notification Settings</Text>
        <Text style={styles.subtitle}>Customize how you'd like to be reminded. You can change these later.</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionHeader}>REMINDERS</Text>
          <View style={styles.settingsRow}>
            <Text style={styles.rowLabel}>Monthly Perk Expiry</Text>
            <Switch 
              trackColor={{ false: "#767577", true: Colors.light.tint }}
              thumbColor={perkExpiryRemindersEnabled ? Colors.light.tint : "#f4f3f4"}
              ios_backgroundColor="#3e3e3e"
              onValueChange={setPerkExpiryRemindersEnabled}
              value={perkExpiryRemindersEnabled}
            />
          </View>
          {perkExpiryRemindersEnabled && (
            <View style={styles.subSectionContainer}>
              <View style={styles.settingsRow}>
                <Text style={styles.subRowLabel}>1 day before expiry</Text>
                <Switch 
                  trackColor={{ false: "#767577", true: Colors.light.tint }}
                  thumbColor={remind1DayBeforeMonthly ? Colors.light.tint : "#f4f3f4"}
                  ios_backgroundColor="#3e3e3e"
                  onValueChange={setRemind1DayBeforeMonthly}
                  value={remind1DayBeforeMonthly}
                />
              </View>
              <View style={styles.settingsRow}>
                <Text style={styles.subRowLabel}>3 days before expiry</Text>
                <Switch 
                  trackColor={{ false: "#767577", true: Colors.light.tint }}
                  thumbColor={remind3DaysBeforeMonthly ? Colors.light.tint : "#f4f3f4"}
                  ios_backgroundColor="#3e3e3e"
                  onValueChange={setRemind3DaysBeforeMonthly}
                  value={remind3DaysBeforeMonthly}
                />
              </View>
              <View style={styles.settingsRow}>
                <Text style={styles.subRowLabel}>7 days before expiry</Text>
                <Switch 
                  trackColor={{ false: "#767577", true: Colors.light.tint }}
                  thumbColor={remind7DaysBeforeMonthly ? Colors.light.tint : "#f4f3f4"}
                  ios_backgroundColor="#3e3e3e"
                  onValueChange={setRemind7DaysBeforeMonthly}
                  value={remind7DaysBeforeMonthly}
                />
              </View>
            </View>
          )}

          <View style={styles.settingsRow}>
            <Text style={styles.rowLabel}>Card Renewal Dates</Text>
            <Switch 
              trackColor={{ false: "#767577", true: Colors.light.tint }}
              thumbColor={renewalRemindersEnabled ? Colors.light.tint : "#f4f3f4"}
              ios_backgroundColor="#3e3e3e"
              onValueChange={setRenewalRemindersEnabled}
              value={renewalRemindersEnabled}
            />
          </View>
          <Text style={styles.hintText}>
            Renewal reminders are sent 7 days before your card's anniversary date, if you provide one.
          </Text>

          <Text style={styles.sectionHeader}>CONFIRMATIONS</Text>
          <View style={styles.settingsRow}>
            <Text style={styles.rowLabel}>Perk Reset Confirmations</Text>
            <Switch 
              trackColor={{ false: "#767577", true: Colors.light.tint }}
              thumbColor={perkResetConfirmationEnabled ? Colors.light.tint : "#f4f3f4"}
              ios_backgroundColor="#3e3e3e"
              onValueChange={setPerkResetConfirmationEnabled}
              value={perkResetConfirmationEnabled}
            />
          </View>
           <Text style={styles.hintText}>
            Get a notification on the 1st of the month confirming your perks have reset.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
          <Text style={styles.nextButtonText}>Next: Create Account</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f2f2f7',
  },
  headerContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 15,
    backgroundColor: '#ffffff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#c7c7cc',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.light.text,
    textAlign: 'center',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.light.icon,
    textAlign: 'center',
  },
  scrollContent: {
    paddingBottom: 20,
  },
  sectionContainer: {
    marginTop: 20,
    backgroundColor: '#ffffff',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#c7c7cc',
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '400',
    color: '#6d6d72',
    textTransform: 'uppercase',
    paddingHorizontal: 16,
    paddingTop: 20, // More padding for section headers
    paddingBottom: 6,
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12, // Consistent padding
    backgroundColor: '#ffffff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#c7c7cc',
  },
  rowLabel: {
    fontSize: 17,
    color: Colors.light.text,
    flexShrink: 1, // Allow text to shrink if needed
    marginRight: 10,
  },
  subSectionContainer: {
    // Indent slightly or add a subtle border if desired
  },
  subRowLabel: {
    fontSize: 15,
    color: '#333333',
    paddingLeft: 15, // Indent sub-options
    flexShrink: 1,
    marginRight: 10,
  },
  hintText: {
    fontSize: 13,
    color: Colors.light.icon,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#ffffff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#c7c7cc',
  },
  footer: {
    padding: 20,
    backgroundColor: '#f2f2f7',
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