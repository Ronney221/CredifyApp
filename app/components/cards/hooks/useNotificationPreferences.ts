import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import { sendTestNotification as sendTest } from '../../../utils/notifications';

const NOTIFICATION_PREFS_KEY = '@notification_preferences';

interface ToggleProps {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
}

export const useNotificationPreferences = () => {
  const [perkExpiryRemindersEnabled, setPerkExpiryRemindersEnabled] = useState(true);
  const [renewalRemindersEnabled, setRenewalRemindersEnabled] = useState(true);
  const [perkResetConfirmationEnabled, setPerkResetConfirmationEnabled] = useState(true);
  const [weeklyDigestEnabled, setWeeklyDigestEnabled] = useState(false);
  const [remind1DayBeforeMonthly, setRemind1DayBeforeMonthly] = useState(true);
  const [remind3DaysBeforeMonthly, setRemind3DaysBeforeMonthly] = useState(true);
  const [remind7DaysBeforeMonthly, setRemind7DaysBeforeMonthly] = useState(true);

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    'perk_expiry': true,
  });

  // Load notification preferences
  useEffect(() => {
    const loadPrefs = async () => {
      try {
        const jsonValue = await AsyncStorage.getItem(NOTIFICATION_PREFS_KEY);
        if (jsonValue != null) {
          const prefs = JSON.parse(jsonValue);
          setPerkExpiryRemindersEnabled(prefs.perkExpiryRemindersEnabled !== undefined ? prefs.perkExpiryRemindersEnabled : true);
          setRenewalRemindersEnabled(prefs.renewalRemindersEnabled !== undefined ? prefs.renewalRemindersEnabled : true);
          setPerkResetConfirmationEnabled(prefs.perkResetConfirmationEnabled !== undefined ? prefs.perkResetConfirmationEnabled : true);
          setWeeklyDigestEnabled(prefs.weeklyDigestEnabled !== undefined ? prefs.weeklyDigestEnabled : false);
          setRemind1DayBeforeMonthly(prefs.remind1DayBeforeMonthly !== undefined ? prefs.remind1DayBeforeMonthly : true);
          setRemind3DaysBeforeMonthly(prefs.remind3DaysBeforeMonthly !== undefined ? prefs.remind3DaysBeforeMonthly : true);
          setRemind7DaysBeforeMonthly(prefs.remind7DaysBeforeMonthly !== undefined ? prefs.remind7DaysBeforeMonthly : true);
        }
      } catch (e) {
        console.error("Failed to load notification prefs.", e);
      }
    };
    loadPrefs();
  }, []);

  // Save notification preferences
  const saveNotificationPreferences = async () => {
    try {
      const monthlyPerkExpiryReminderDays: number[] = [];
      if (perkExpiryRemindersEnabled) {
        if (remind1DayBeforeMonthly) monthlyPerkExpiryReminderDays.push(1);
        if (remind3DaysBeforeMonthly) monthlyPerkExpiryReminderDays.push(3);
        if (remind7DaysBeforeMonthly) monthlyPerkExpiryReminderDays.push(7);
      }

      const prefsToSave = {
        perkExpiryRemindersEnabled,
        renewalRemindersEnabled,
        perkResetConfirmationEnabled,
        weeklyDigestEnabled,
        remind1DayBeforeMonthly,
        remind3DaysBeforeMonthly,
        remind7DaysBeforeMonthly,
        monthlyPerkExpiryReminderDays,
      };
      await AsyncStorage.setItem(NOTIFICATION_PREFS_KEY, JSON.stringify(prefsToSave));
    } catch (e) {
      console.error("Failed to save notification prefs.", e);
    }
  };

  // Auto-save preferences when they change
  useEffect(() => { 
    const timeoutId = setTimeout(() => {
      saveNotificationPreferences(); 
    }, 200);
    return () => {
      clearTimeout(timeoutId);
    };
  }, [
    perkExpiryRemindersEnabled,
    renewalRemindersEnabled, 
    perkResetConfirmationEnabled,
    weeklyDigestEnabled,
    remind1DayBeforeMonthly,
    remind3DaysBeforeMonthly,
    remind7DaysBeforeMonthly
  ]);

  const handleSectionToggle = (sectionKey: string) => {
    setExpandedSections(prev => ({ ...prev, [sectionKey]: !prev[sectionKey] }));
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const sendTestNotification = async () => {
    try {
      const notificationId = await sendTest();
      if (notificationId) {
        Alert.alert('Test Notification Sent', 'You should receive a notification in a few seconds.');
      } else {
        Alert.alert('Permissions Required', 'Please enable notification permissions in your device settings.');
      }
    } catch (e) {
      console.error('Failed to send test notification', e);
      Alert.alert('Error', 'Could not send test notification.');
    }
  };

  const handlePerkExpiryMasterToggle = (value: boolean) => {
    setPerkExpiryRemindersEnabled(value);
    setRemind1DayBeforeMonthly(value);
    setRemind3DaysBeforeMonthly(value);
    setRemind7DaysBeforeMonthly(value);
    
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleRenewalReminderToggle = (value: boolean) => {
    setRenewalRemindersEnabled(value);
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleResetConfirmationToggle = (value: boolean) => {
    setPerkResetConfirmationEnabled(value);
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleWeeklyDigestToggle = (value: boolean) => {
    setWeeklyDigestEnabled(value);
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const buildNotificationItems = (anyRenewalDateSet: boolean) => {
    const perkExpiryToggles: ToggleProps[] = perkExpiryRemindersEnabled ? [
      { label: "1 day before", value: remind1DayBeforeMonthly, onValueChange: setRemind1DayBeforeMonthly, disabled: false },
      { label: "3 days before", value: remind3DaysBeforeMonthly, onValueChange: setRemind3DaysBeforeMonthly, disabled: false },
      { label: "7 days before", value: remind7DaysBeforeMonthly, onValueChange: setRemind7DaysBeforeMonthly, disabled: false },
    ] : [];

    const buildPerkExpiryHelperText = () => {
      if (!perkExpiryRemindersEnabled) {
        return ["Turn on to get reminded"];
      }
      const activeDays = [];
      if (remind1DayBeforeMonthly) activeDays.push("1");
      if (remind3DaysBeforeMonthly) activeDays.push("3");
      if (remind7DaysBeforeMonthly) activeDays.push("7");
      if (activeDays.length === 0) {
        return ["Select reminder days below"];
      }
      const daysText = activeDays.length === 1 
        ? `${activeDays[0]} day before` 
        : activeDays.join(" / ") + " days before";
      return [`We'll alert you ${daysText}.`];
    };

    return [
      { 
        key: 'perk_expiry',
        isExpanded: expandedSections['perk_expiry'],
        onToggleExpand: () => handleSectionToggle('perk_expiry'),
        iconName: "alarm-outline" as const, 
        title: "Monthly Perk Expiry Reminders", 
        details: buildPerkExpiryHelperText(),
        toggles: [
          { 
            label: "Enable perk expiry reminders", 
            value: perkExpiryRemindersEnabled, 
            onValueChange: handlePerkExpiryMasterToggle,
            isMaster: true,
          },
          ...perkExpiryToggles
        ],
        iconColor: "#FF9500",
      },
      { 
        key: 'card_renewal',
        iconName: "calendar-outline" as const,
        title: "Card Renewal Reminders", 
        details: anyRenewalDateSet 
          ? ["7 days before renewal dates"] 
          : ["Add renewal dates first"],
        toggles: anyRenewalDateSet ? [
          { 
            label: "Enable renewal reminders", 
            value: renewalRemindersEnabled, 
            onValueChange: handleRenewalReminderToggle 
          }
        ] : undefined,
        iconColor: anyRenewalDateSet ? "#34C759" : "#8E8E93",
        dimmed: !anyRenewalDateSet,
        disabledReason: !anyRenewalDateSet ? "Set renewal dates to enable this reminder." : undefined,
      },
      { 
        key: 'perk_reset',
        iconName: "sync-circle-outline" as const, 
        title: "Perk Reset Confirmations", 
        details: ["Monthly reset notifications"],
        toggles: [
          { 
            label: "Enable reset confirmations", 
            value: perkResetConfirmationEnabled, 
            onValueChange: handleResetConfirmationToggle 
          }
        ],
        iconColor: "#007AFF" 
      },
      {
        key: 'weekly_digest',
        iconName: "stats-chart-outline" as const,
        title: "Weekly Digest",
        details: ["A summary of your perks and benefits"],
        toggles: [
          {
            label: "Enable weekly digest",
            value: weeklyDigestEnabled,
            onValueChange: handleWeeklyDigestToggle,
          },
        ],
        iconColor: "#5856D6",
      },
    ];
  };

  return {
    perkExpiryRemindersEnabled,
    renewalRemindersEnabled,
    perkResetConfirmationEnabled,
    weeklyDigestEnabled,
    remind1DayBeforeMonthly,
    remind3DaysBeforeMonthly,
    remind7DaysBeforeMonthly,
    buildNotificationItems,
    sendTestNotification,
  };
};