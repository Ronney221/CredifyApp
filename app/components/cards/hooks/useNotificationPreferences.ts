//app/components/cards/hooks/useNotificationPreferences.ts
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import { sendTestNotification as sendTest, NotificationPreferences } from '../../../utils/notifications';

const NOTIFICATION_PREFS_KEY = '@notification_preferences';
const UNIQUE_PERK_PERIODS_STORAGE_KEY = '@user_unique_perk_periods';

interface ToggleProps {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
}

export const useNotificationPreferences = () => {
  const [perkExpiryRemindersEnabled, setPerkExpiryRemindersEnabled] = useState(false);
  const [quarterlyPerkRemindersEnabled, setQuarterlyPerkRemindersEnabled] = useState(false);
  const [semiAnnualPerkRemindersEnabled, setSemiAnnualPerkRemindersEnabled] = useState(false);
  const [annualPerkRemindersEnabled, setAnnualPerkRemindersEnabled] = useState(false);
  const [renewalRemindersEnabled, setRenewalRemindersEnabled] = useState(false);
  const [renewalReminderDays, setRenewalReminderDays] = useState(7);
  const [perkResetConfirmationEnabled, setPerkResetConfirmationEnabled] = useState(true);
  const [weeklyDigestEnabled, setWeeklyDigestEnabled] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  const handleSectionToggle = (key: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
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

  const getPreferences = (): NotificationPreferences => ({
    perkExpiryRemindersEnabled,
    quarterlyPerkRemindersEnabled,
    semiAnnualPerkRemindersEnabled,
    annualPerkRemindersEnabled,
    renewalRemindersEnabled,
    perkResetConfirmationEnabled,
    weeklyDigestEnabled,
    monthlyPerkExpiryReminderDays: [1, 3, 7],
    quarterlyPerkExpiryReminderDays: [7, 14],
    semiAnnualPerkExpiryReminderDays: [14, 30],
    annualPerkExpiryReminderDays: [30, 60]
  });

  const [remind1DayBeforeMonthly, setRemind1DayBeforeMonthly] = useState(true);
  const [remind3DaysBeforeMonthly, setRemind3DaysBeforeMonthly] = useState(true);
  const [remind7DaysBeforeMonthly, setRemind7DaysBeforeMonthly] = useState(true);
  const [remind7DaysBeforeQuarterly, setRemind7DaysBeforeQuarterly] = useState(true);
  const [remind14DaysBeforeQuarterly, setRemind14DaysBeforeQuarterly] = useState(true);
  const [remind14DaysBeforeSemiAnnual, setRemind14DaysBeforeSemiAnnual] = useState(true);
  const [remind30DaysBeforeSemiAnnual, setRemind30DaysBeforeSemiAnnual] = useState(true);
  const [remind30DaysBeforeAnnual, setRemind30DaysBeforeAnnual] = useState(true);
  const [remind60DaysBeforeAnnual, setRemind60DaysBeforeAnnual] = useState(true);
  
  const [uniquePerkPeriods, setUniquePerkPeriods] = useState<number[]>([]);

  // Load unique perk periods from AsyncStorage
  useEffect(() => {
    const loadUniquePeriods = async () => {
      try {
        const jsonValue = await AsyncStorage.getItem(UNIQUE_PERK_PERIODS_STORAGE_KEY);
        if (jsonValue !== null) {
          const periods = JSON.parse(jsonValue);
          setUniquePerkPeriods(periods);
        }
      } catch (e) {
        console.error("Failed to load unique perk periods.", e);
      }
    };
    loadUniquePeriods();
  }, []);

  // Load notification preferences
  useEffect(() => {
    const loadPrefs = async () => {
      try {
        const jsonValue = await AsyncStorage.getItem(NOTIFICATION_PREFS_KEY);
        if (jsonValue != null) {
          const prefs = JSON.parse(jsonValue);
          setPerkExpiryRemindersEnabled(prefs.perkExpiryRemindersEnabled !== undefined ? prefs.perkExpiryRemindersEnabled : false);
          setRenewalRemindersEnabled(prefs.renewalRemindersEnabled !== undefined ? prefs.renewalRemindersEnabled : false);
          setRenewalReminderDays(prefs.renewalReminderDays !== undefined ? prefs.renewalReminderDays : 7);
          setPerkResetConfirmationEnabled(prefs.perkResetConfirmationEnabled !== undefined ? prefs.perkResetConfirmationEnabled : true);
          setWeeklyDigestEnabled(prefs.weeklyDigestEnabled !== undefined ? prefs.weeklyDigestEnabled : false);
          setRemind1DayBeforeMonthly(prefs.remind1DayBeforeMonthly !== undefined ? prefs.remind1DayBeforeMonthly : true);
          setRemind3DaysBeforeMonthly(prefs.remind3DaysBeforeMonthly !== undefined ? prefs.remind3DaysBeforeMonthly : true);
          setRemind7DaysBeforeMonthly(prefs.remind7DaysBeforeMonthly !== undefined ? prefs.remind7DaysBeforeMonthly : true);
          
          setQuarterlyPerkRemindersEnabled(prefs.quarterlyPerkRemindersEnabled !== undefined ? prefs.quarterlyPerkRemindersEnabled : false);
          setRemind7DaysBeforeQuarterly(prefs.remind7DaysBeforeQuarterly !== undefined ? prefs.remind7DaysBeforeQuarterly : true);
          setRemind14DaysBeforeQuarterly(prefs.remind14DaysBeforeQuarterly !== undefined ? prefs.remind14DaysBeforeQuarterly : true);
          setSemiAnnualPerkRemindersEnabled(prefs.semiAnnualPerkRemindersEnabled !== undefined ? prefs.semiAnnualPerkRemindersEnabled : false);
          setRemind14DaysBeforeSemiAnnual(prefs.remind14DaysBeforeSemiAnnual !== undefined ? prefs.remind14DaysBeforeSemiAnnual : true);
          setRemind30DaysBeforeSemiAnnual(prefs.remind30DaysBeforeSemiAnnual !== undefined ? prefs.remind30DaysBeforeSemiAnnual : true);
          setAnnualPerkRemindersEnabled(prefs.annualPerkRemindersEnabled !== undefined ? prefs.annualPerkRemindersEnabled : false);
          setRemind30DaysBeforeAnnual(prefs.remind30DaysBeforeAnnual !== undefined ? prefs.remind30DaysBeforeAnnual : true);
          setRemind60DaysBeforeAnnual(prefs.remind60DaysBeforeAnnual !== undefined ? prefs.remind60DaysBeforeAnnual : true);
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
      const quarterlyPerkExpiryReminderDays: number[] = [];
      if (quarterlyPerkRemindersEnabled) {
        if (remind7DaysBeforeQuarterly) quarterlyPerkExpiryReminderDays.push(7);
        if (remind14DaysBeforeQuarterly) quarterlyPerkExpiryReminderDays.push(14);
      }
      const semiAnnualPerkExpiryReminderDays: number[] = [];
      if (semiAnnualPerkRemindersEnabled) {
        if (remind14DaysBeforeSemiAnnual) semiAnnualPerkExpiryReminderDays.push(14);
        if (remind30DaysBeforeSemiAnnual) semiAnnualPerkExpiryReminderDays.push(30);
      }
      const annualPerkExpiryReminderDays: number[] = [];
      if (annualPerkRemindersEnabled) {
        if (remind30DaysBeforeAnnual) annualPerkExpiryReminderDays.push(30);
        if (remind60DaysBeforeAnnual) annualPerkExpiryReminderDays.push(60);
      }

      const prefsToSave = {
        perkExpiryRemindersEnabled,
        renewalRemindersEnabled,
        renewalReminderDays,
        perkResetConfirmationEnabled,
        weeklyDigestEnabled,
        remind1DayBeforeMonthly,
        remind3DaysBeforeMonthly,
        remind7DaysBeforeMonthly,
        monthlyPerkExpiryReminderDays,
        quarterlyPerkRemindersEnabled,
        remind7DaysBeforeQuarterly,
        remind14DaysBeforeQuarterly,
        quarterlyPerkExpiryReminderDays,
        semiAnnualPerkRemindersEnabled,
        remind14DaysBeforeSemiAnnual,
        remind30DaysBeforeSemiAnnual,
        semiAnnualPerkExpiryReminderDays,
        annualPerkRemindersEnabled,
        remind30DaysBeforeAnnual,
        remind60DaysBeforeAnnual,
        annualPerkExpiryReminderDays,
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
    renewalReminderDays,
    perkResetConfirmationEnabled,
    weeklyDigestEnabled,
    remind1DayBeforeMonthly,
    remind3DaysBeforeMonthly,
    remind7DaysBeforeMonthly,
    quarterlyPerkRemindersEnabled,
    remind7DaysBeforeQuarterly,
    remind14DaysBeforeQuarterly,
    semiAnnualPerkRemindersEnabled,
    remind14DaysBeforeSemiAnnual,
    remind30DaysBeforeSemiAnnual,
    annualPerkRemindersEnabled,
    remind30DaysBeforeAnnual,
    remind60DaysBeforeAnnual,
  ]);

  const sendTestNotification = async (userId: string) => {
    try {
      const currentPrefs = getPreferences();

      const notificationIds = await sendTest(userId, currentPrefs);
      if (notificationIds.length > 0) {
        Alert.alert('Test Notifications Sent', `You should receive ${notificationIds.length} perk reminder notifications in a few seconds based on your current settings.`);
      } else {
        Alert.alert('No Reminders to Send', 'Based on your current settings, there are no test reminders to send. Try enabling a notification category.');
      }
    } catch (e) {
      console.error('Failed to send test notification', e);
      Alert.alert('Error', 'Could not send test notification.');
    }
  };

  const buildNotificationItems = (anyRenewalDateSet: boolean) => {
    const notificationItems: any[] = [];

    // Perk Expiry Reminders
    const periodToggles: ToggleProps[] = [
      {
        label: "Monthly Perks",
        value: perkExpiryRemindersEnabled,
        onValueChange: setPerkExpiryRemindersEnabled,
      }
    ];

    // Quarterly toggle if user has quarterly perks
    if (uniquePerkPeriods.includes(3)) {
      periodToggles.push({
        label: "Quarterly Perks",
        value: quarterlyPerkRemindersEnabled,
        onValueChange: setQuarterlyPerkRemindersEnabled,
      });
    }

    // Semi-Annual toggle if user has semi-annual perks
    if (uniquePerkPeriods.includes(6)) {
      periodToggles.push({
        label: "Semi-Annual Perks",
        value: semiAnnualPerkRemindersEnabled,
        onValueChange: setSemiAnnualPerkRemindersEnabled,
      });
    }

    // Annual toggle if user has annual perks
    if (uniquePerkPeriods.includes(12)) {
      periodToggles.push({
        label: "Annual Perks",
        value: annualPerkRemindersEnabled,
        onValueChange: setAnnualPerkRemindersEnabled,
      });
    }

    const buildPerkExpiryHelperText = () => {
      const enabledPeriods = [];
      if (perkExpiryRemindersEnabled) enabledPeriods.push("Monthly");
      if (uniquePerkPeriods.includes(3) && quarterlyPerkRemindersEnabled) enabledPeriods.push("Quarterly");
      if (uniquePerkPeriods.includes(6) && semiAnnualPerkRemindersEnabled) enabledPeriods.push("Semi-Annual");
      if (uniquePerkPeriods.includes(12) && annualPerkRemindersEnabled) enabledPeriods.push("Annual");
      if (enabledPeriods.length === 0) return ["No reminders enabled"];
      return [`Active reminders: ${enabledPeriods.join(", ")}`];
    };

    notificationItems.push({
      key: 'perk_expiry',
      isExpanded: expandedSections['perk_expiry'],
      onToggleExpand: () => handleSectionToggle('perk_expiry'),
      iconName: "alarm-outline" as const,
      title: "Perk Expiry Reminders",
      details: buildPerkExpiryHelperText(),
      toggles: periodToggles,
      iconColor: "#FF9500",
    });

    // Card Renewal Reminders (simplified to just a toggle)
    notificationItems.push(
      { 
        key: 'card_renewal',
        iconName: "calendar-outline" as const,
        title: "Card Renewal Reminders", 
        details: anyRenewalDateSet 
          ? ["Notify 7 days before renewal dates"] 
          : ["Add renewal dates first"],
        toggles: [
          { 
            label: "Enable renewal reminders", 
            value: renewalRemindersEnabled, 
            onValueChange: handleRenewalReminderToggle,
          }
        ],
        iconColor: anyRenewalDateSet ? "#34C759" : "#8E8E93",
        dimmed: !anyRenewalDateSet,
      },
      { 
        key: 'perk_reset',
        iconName: "refresh-circle-outline" as const, 
        title: "Monthly Perk Reset Alerts", 
        details: ["Get notified when your perks refresh"],
        toggles: [
          { 
            label: "Enable reset alerts", 
            value: perkResetConfirmationEnabled, 
            onValueChange: handleResetConfirmationToggle,
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
      }
    );
    
    return notificationItems;
  };

  return {
    buildNotificationItems,
    sendTestNotification,
  };
};