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
  disabled?: boolean;
}

export default function OnboardingNotificationPrefsScreen() {
  const router = useRouter();
  const { 
    setStep, 
    setIsHeaderGloballyHidden,
    notificationPrefs,
    setNotificationPrefs,
    renewalDates
  } = useOnboardingContext();
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

  // Derived state to check if any card actually has a renewal date set
  const anyRenewalDateActuallySet = useMemo(() => {
    return Object.values(renewalDates).some(date => date !== undefined && date !== null);
  }, [renewalDates]);

  const handleNext = async () => {
    // The state is already updated in context via onValueChange handlers.
    // We can perform final validation here if needed.
    router.push('/(onboarding)/onboarding-complete'); 
  };

  const allNotificationItems = useMemo(() => {
    const baseItems = [
      { 
        iconName: "alarm-outline" as keyof typeof Ionicons.glyphMap, 
        title: "Perk Expiry Reminders", 
        toggles: [
          {
            label: "Enable Perk Expiry Reminders",
            value: notificationPrefs.perkExpiryRemindersEnabled,
            onValueChange: (value: boolean) => setNotificationPrefs(p => ({
              ...p,
              perkExpiryRemindersEnabled: value,
              // Set sub-preferences automatically during onboarding for simplicity
              remind1DayBeforeMonthly: value,
              remind3DaysBeforeMonthly: value,
              remind7DaysBeforeMonthly: value,
            })),
          },
        ],
        details: ["You can customize reminders for specific perks later in Settings."],
        iconColor: "#FF9500" 
      },
      { 
        iconName: "sync-circle-outline" as keyof typeof Ionicons.glyphMap, 
        title: "Monthly Reset Alerts", 
        iconColor: "#007AFF" 
      },
    ];

    const renewalItem = {
      iconName: "calendar-outline" as keyof typeof Ionicons.glyphMap,
      title: "Card Renewal Reminder",
      details: anyRenewalDateActuallySet 
        ? ["Helps you evaluate a card's value before the next annual fee."] 
        : ["Set a card's renewal date to enable this reminder."],
      toggles: anyRenewalDateActuallySet ? [
        {
          label: "Enable Renewal Reminders",
          value: notificationPrefs.renewalRemindersEnabled,
          onValueChange: (value: boolean) => setNotificationPrefs(p => ({ ...p, renewalRemindersEnabled: value })),
        }
      ] : undefined,
      iconColor: anyRenewalDateActuallySet ? "#34C759" : Colors.light.icon,
      dimmed: !anyRenewalDateActuallySet,
    };
    
    return [baseItems[0], renewalItem, baseItems[1]];
  }, [anyRenewalDateActuallySet, notificationPrefs, setNotificationPrefs]);
  
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
            We&apos;ve enabled the reminders pros use. You can tweak them below or later in <Text style={styles.boldText}>Settings › Notifications</Text>.
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