import React, { useState, useEffect, useMemo } from 'react';
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
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../../constants/Colors';
import { Ionicons } from '@expo/vector-icons'; // For icons in mini-cards
import { MotiView } from 'moti'; // Added MotiView
import { useOnboardingContext } from './_context/OnboardingContext';
import { onboardingScreenNames } from './_layout';
import { WIZARD_HEADER_HEIGHT } from './WizardHeader';
import { ReminderToggleGroup } from '../components/manage/ReminderToggleGroup';

const NOTIFICATION_PREFS_KEY = '@notification_preferences_v2';

interface ToggleProps {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}

export default function OnboardingNotificationPrefsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ selectedCardIds?: string; renewalDates?: string }>();
  const { setStep, setIsHeaderGloballyHidden } = useOnboardingContext();
  const route = useRoute();

  useFocusEffect(
    React.useCallback(() => {
      const screenName = route.name.split('/').pop() || 'notification-prefs';
      const stepIndex = onboardingScreenNames.indexOf(screenName);
      // console.log(`notification-prefs focused, screenName: ${screenName}, stepIndex: ${stepIndex}`);
      if (stepIndex !== -1) {
        setStep(stepIndex);
      }
      setIsHeaderGloballyHidden(false); // Ensure header is visible for this step
      return () => {};
    }, [route.name, setStep, setIsHeaderGloballyHidden])
  );

  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);
  const [parsedRenewalDates, setParsedRenewalDates] = useState<Record<string, string | null>>({});

  // State for individual perk expiry toggles
  const [remind1DayBefore, setRemind1DayBefore] = useState(true);
  const [remind3DaysBefore, setRemind3DaysBefore] = useState(true);
  const [remind7DaysBefore, setRemind7DaysBefore] = useState(true);

  useEffect(() => {
    let hasError = false;
    if (params.selectedCardIds) {
      try {
        const ids = JSON.parse(params.selectedCardIds);
        setSelectedCardIds(ids);
      } catch (e) {
        console.error("Failed to parse selectedCardIds from params:", e);
        Alert.alert("Error", "Could not load selected card data.");
        hasError = true;
      }
    }
    if (params.renewalDates) {
      try {
        const dates = JSON.parse(params.renewalDates);
        setParsedRenewalDates(dates);
      } catch (e) {
        console.error("Failed to parse renewalDates from params:", e);
        Alert.alert("Error", "Could not load renewal date data.");
        hasError = true;
      }
    }
    if (hasError) {
      // router.back(); // Consider navigating back if essential data is missing
    }
  }, [params.selectedCardIds, params.renewalDates]);

  // Derived state to check if any card actually has a renewal date set
  const anyRenewalDateActuallySet = useMemo(() => {
    return Object.values(parsedRenewalDates).some(date => date !== null);
  }, [parsedRenewalDates]);

  const handleNext = async () => {
    const monthlyPerkExpiryReminderDays: number[] = [];
    if (remind1DayBefore) monthlyPerkExpiryReminderDays.push(1);
    if (remind3DaysBefore) monthlyPerkExpiryReminderDays.push(3);
    if (remind7DaysBefore) monthlyPerkExpiryReminderDays.push(7);

    const notificationPreferences = {
      perkExpiryRemindersEnabled: monthlyPerkExpiryReminderDays.length > 0,
      renewalRemindersEnabled: anyRenewalDateActuallySet, 
      perkResetConfirmationEnabled: true, 
      monthlyPerkExpiryReminderDays,
      remind1DayBeforeMonthly: remind1DayBefore,
      remind3DaysBeforeMonthly: remind3DaysBefore,
      remind7DaysBeforeMonthly: remind7DaysBefore,
    };

    const onboardingPrefs = {
      selectedCardIds,
      renewalDates: parsedRenewalDates, // Store the renewal dates as well
      notificationPreferences,
    };

    try {
      await AsyncStorage.setItem(NOTIFICATION_PREFS_KEY, JSON.stringify(onboardingPrefs));
      router.push('/(onboarding)/onboarding-complete'); 
    } catch (e) {
      console.error("Failed to save onboarding prefs:", e);
      Alert.alert("Error", "Could not save preferences. Please try again.");
    }
  };

  const perkExpiryToggles: ToggleProps[] = [
    { label: "1 day before", value: remind1DayBefore, onValueChange: setRemind1DayBefore },
    { label: "3 days before", value: remind3DaysBefore, onValueChange: setRemind3DaysBefore },
    { label: "7 days before", value: remind7DaysBefore, onValueChange: setRemind7DaysBefore },
  ];

  const showCardRenewalSection = selectedCardIds.length > 0; // Show if any cards were selected at all

  const allNotificationItems = useMemo(() => {
    const baseItems = [
      { iconName: "alarm-outline" as keyof typeof Ionicons.glyphMap, title: "Perk Expiry Reminders", toggles: perkExpiryToggles, iconColor: "#FF9500" },
      { iconName: "sync-circle-outline" as keyof typeof Ionicons.glyphMap, title: "Monthly Reset Alerts", details: ["1st of every month"], iconColor: "#007AFF" },
    ];

    if (showCardRenewalSection) {
      const renewalItem = {
        iconName: "calendar-outline" as keyof typeof Ionicons.glyphMap,
        title: "Card Renewal Reminder",
        details: anyRenewalDateActuallySet 
          ? ["For cards with set anniversary dates"] 
          : ["Set a card's renewal date to enable this reminder."],
        iconColor: anyRenewalDateActuallySet ? "#34C759" : Colors.light.icon, // Dim icon if not enabled
        dimmed: !anyRenewalDateActuallySet, // Pass dimmed prop
      };
      // Insert renewal item before Monthly Reset Alerts
      return [
        baseItems[0], // Perk Expiry
        renewalItem,  // Card Renewal
        baseItems[1], // Monthly Reset
      ];
    }
    return baseItems;
  }, [anyRenewalDateActuallySet, perkExpiryToggles, showCardRenewalSection]);
  
  // Animation timings
  const contentSlideInDelay = 200;
  const itemStagger = 50;
  const ctaBaseDelay = contentSlideInDelay + 150;
  const ctaDelay = ctaBaseDelay + (allNotificationItems.length * itemStagger) + 100;

  return (
    <SafeAreaView style={[styles.container, { paddingTop: WIZARD_HEADER_HEIGHT }]} edges={['bottom']}>
      <StatusBar barStyle="dark-content" />
      {/* Header area is now minimal as title/dots are in _layout.tsx */}
      
      <ScrollView contentContainerStyle={styles.scrollContentContainer}>
        <MotiView
          from={{ opacity: 0, translateY: 50 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: contentSlideInDelay }}
          style={styles.mainCardContainer}
        >
          <Text style={styles.mainCardTitle}>Configure Your Reminders</Text>
          <Text style={styles.mainCardInfoText}>
            We&apos;ve enabled recommended reminders. You can tweak them below or change them anytime in <Text style={styles.boldText}>Settings &gt; Notifications</Text>.
          </Text>
          
          <View style={styles.notificationItemsSection}>
            {allNotificationItems.map((itemProps, index) => (
              <ReminderToggleGroup
                key={itemProps.title}
                {...itemProps}
                mode="onboard"
                index={index}
                isLastItem={index === allNotificationItems.length - 1}
              />
            ))}
          </View>
        </MotiView>
      </ScrollView>

      <MotiView 
        style={styles.footer}
        from={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ type: 'timing', duration: 200, delay: ctaDelay }}
      >
        <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
          <Text style={styles.nextButtonText}>All Set—Let&apos;s Go!</Text>
        </TouchableOpacity>
      </MotiView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f2f2f7',
  },
  scrollContentContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  mainCardContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 24,
    backgroundColor: '#ffffff',
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
  mainCardTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: Colors.light.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  mainCardInfoText: {
    fontSize: 16,
    color: Colors.light.icon,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
    paddingHorizontal: 8,
  },
  boldText: {
    fontWeight: '600',
    color: Colors.light.text,
  },
  notificationItemsSection: {
    width: '100%',
    marginTop: 0,
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
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: {width:0, height:2},
    elevation: 4,
  },
  nextButtonText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '600',
  },
}); 