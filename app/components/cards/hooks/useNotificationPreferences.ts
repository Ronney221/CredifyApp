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
  const [perkExpiryRemindersEnabled, setPerkExpiryRemindersEnabled] = useState(true);
  const [renewalRemindersEnabled, setRenewalRemindersEnabled] = useState(true);
  const [renewalReminderDays, setRenewalReminderDays] = useState(7);
  const [perkResetConfirmationEnabled, setPerkResetConfirmationEnabled] = useState(true);
  const [weeklyDigestEnabled, setWeeklyDigestEnabled] = useState(false);
  const [remind1DayBeforeMonthly, setRemind1DayBeforeMonthly] = useState(true);
  const [remind3DaysBeforeMonthly, setRemind3DaysBeforeMonthly] = useState(true);
  const [remind7DaysBeforeMonthly, setRemind7DaysBeforeMonthly] = useState(true);

  // State for different perk periods
  const [quarterlyPerkRemindersEnabled, setQuarterlyPerkRemindersEnabled] = useState(true);
  const [remind7DaysBeforeQuarterly, setRemind7DaysBeforeQuarterly] = useState(true);
  const [remind14DaysBeforeQuarterly, setRemind14DaysBeforeQuarterly] = useState(true);
  const [semiAnnualPerkRemindersEnabled, setSemiAnnualPerkRemindersEnabled] = useState(true);
  const [remind14DaysBeforeSemiAnnual, setRemind14DaysBeforeSemiAnnual] = useState(true);
  const [remind30DaysBeforeSemiAnnual, setRemind30DaysBeforeSemiAnnual] = useState(true);
  const [annualPerkRemindersEnabled, setAnnualPerkRemindersEnabled] = useState(true);
  const [remind30DaysBeforeAnnual, setRemind30DaysBeforeAnnual] = useState(true);
  const [remind60DaysBeforeAnnual, setRemind60DaysBeforeAnnual] = useState(true);
  
  const [uniquePerkPeriods, setUniquePerkPeriods] = useState<number[]>([]);

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    'perk_expiry_monthly': true,
    'card_renewal': true,
  });

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
          setPerkExpiryRemindersEnabled(prefs.perkExpiryRemindersEnabled !== undefined ? prefs.perkExpiryRemindersEnabled : true);
          setRenewalRemindersEnabled(prefs.renewalRemindersEnabled !== undefined ? prefs.renewalRemindersEnabled : true);
          setRenewalReminderDays(prefs.renewalReminderDays !== undefined ? prefs.renewalReminderDays : 7);
          setPerkResetConfirmationEnabled(prefs.perkResetConfirmationEnabled !== undefined ? prefs.perkResetConfirmationEnabled : true);
          setWeeklyDigestEnabled(prefs.weeklyDigestEnabled !== undefined ? prefs.weeklyDigestEnabled : false);
          setRemind1DayBeforeMonthly(prefs.remind1DayBeforeMonthly !== undefined ? prefs.remind1DayBeforeMonthly : true);
          setRemind3DaysBeforeMonthly(prefs.remind3DaysBeforeMonthly !== undefined ? prefs.remind3DaysBeforeMonthly : true);
          setRemind7DaysBeforeMonthly(prefs.remind7DaysBeforeMonthly !== undefined ? prefs.remind7DaysBeforeMonthly : true);
          
          setQuarterlyPerkRemindersEnabled(prefs.quarterlyPerkRemindersEnabled !== undefined ? prefs.quarterlyPerkRemindersEnabled : true);
          setRemind7DaysBeforeQuarterly(prefs.remind7DaysBeforeQuarterly !== undefined ? prefs.remind7DaysBeforeQuarterly : true);
          setRemind14DaysBeforeQuarterly(prefs.remind14DaysBeforeQuarterly !== undefined ? prefs.remind14DaysBeforeQuarterly : true);
          setSemiAnnualPerkRemindersEnabled(prefs.semiAnnualPerkRemindersEnabled !== undefined ? prefs.semiAnnualPerkRemindersEnabled : true);
          setRemind14DaysBeforeSemiAnnual(prefs.remind14DaysBeforeSemiAnnual !== undefined ? prefs.remind14DaysBeforeSemiAnnual : true);
          setRemind30DaysBeforeSemiAnnual(prefs.remind30DaysBeforeSemiAnnual !== undefined ? prefs.remind30DaysBeforeSemiAnnual : true);
          setAnnualPerkRemindersEnabled(prefs.annualPerkRemindersEnabled !== undefined ? prefs.annualPerkRemindersEnabled : true);
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

  const handleSectionToggle = (sectionKey: string) => {
    setExpandedSections(prev => ({ ...prev, [sectionKey]: !prev[sectionKey] }));
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const sendTestNotification = async (userId: string) => {
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
      
      const currentPrefs: NotificationPreferences = {
        perkExpiryRemindersEnabled,
        renewalRemindersEnabled,
        perkResetConfirmationEnabled,
        weeklyDigestEnabled,
        monthlyPerkExpiryReminderDays,
        quarterlyPerkExpiryReminderDays,
        semiAnnualPerkExpiryReminderDays,
        annualPerkExpiryReminderDays,
      };

      const notificationIds = await sendTest(userId, currentPrefs);
      if (notificationIds.length > 0) {
        Alert.alert('Test Notifications Sent', `You should receive ${notificationIds.length} perk reminder notifications in a few seconds.`);
      } else {
        Alert.alert('No Reminders to Send', 'Perk expiry reminders are disabled or all your perks have been redeemed. Enable reminders or wait for the next cycle to test.');
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

  const handleQuarterlyPerkMasterToggle = (value: boolean) => {
    setQuarterlyPerkRemindersEnabled(value);
    setRemind7DaysBeforeQuarterly(value);
    setRemind14DaysBeforeQuarterly(value);
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleSemiAnnualPerkMasterToggle = (value: boolean) => {
    setSemiAnnualPerkRemindersEnabled(value);
    setRemind14DaysBeforeSemiAnnual(value);
    setRemind30DaysBeforeSemiAnnual(value);
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleAnnualPerkMasterToggle = (value: boolean) => {
    setAnnualPerkRemindersEnabled(value);
    setRemind30DaysBeforeAnnual(value);
    setRemind60DaysBeforeAnnual(value);
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
    const notificationItems: any[] = [];

    // Monthly Perks (assuming period 1 month is always possible or default)
    const monthlyPerkToggles: ToggleProps[] = perkExpiryRemindersEnabled ? [
      { label: "1 day before", value: remind1DayBeforeMonthly, onValueChange: setRemind1DayBeforeMonthly, disabled: !perkExpiryRemindersEnabled },
      { label: "3 days before", value: remind3DaysBeforeMonthly, onValueChange: setRemind3DaysBeforeMonthly, disabled: !perkExpiryRemindersEnabled },
      { label: "7 days before", value: remind7DaysBeforeMonthly, onValueChange: setRemind7DaysBeforeMonthly, disabled: !perkExpiryRemindersEnabled },
    ] : [];

    const buildMonthlyPerkHelperText = () => {
      if (!perkExpiryRemindersEnabled) return ["Turn on to get reminded"];
      const activeDays = [
        remind1DayBeforeMonthly && "1",
        remind3DaysBeforeMonthly && "3",
        remind7DaysBeforeMonthly && "7",
      ].filter(Boolean);
      if (activeDays.length === 0) return ["Select reminder days below"];
      return [`We'll alert you ${activeDays.join(" / ")} days before.`];
    };
    
    notificationItems.push({ 
      key: 'perk_expiry_monthly',
      isExpanded: expandedSections['perk_expiry_monthly'],
      onToggleExpand: () => handleSectionToggle('perk_expiry_monthly'),
      iconName: "alarm-outline" as const, 
      title: "Monthly Perk Expiry Reminders", 
      details: buildMonthlyPerkHelperText(),
      toggles: [
        { label: "Enable monthly reminders", value: perkExpiryRemindersEnabled, onValueChange: handlePerkExpiryMasterToggle, isMaster: true },
        ...monthlyPerkToggles
      ],
      iconColor: "#FF9500",
    });

    // Quarterly Perks
    if (uniquePerkPeriods.includes(3)) {
      const quarterlyToggles: ToggleProps[] = quarterlyPerkRemindersEnabled ? [
        { label: "7 days before", value: remind7DaysBeforeQuarterly, onValueChange: setRemind7DaysBeforeQuarterly, disabled: !quarterlyPerkRemindersEnabled },
        { label: "14 days before", value: remind14DaysBeforeQuarterly, onValueChange: setRemind14DaysBeforeQuarterly, disabled: !quarterlyPerkRemindersEnabled },
      ] : [];
      const buildQuarterlyHelperText = () => {
        if (!quarterlyPerkRemindersEnabled) return ["Turn on to get reminded"];
        const activeDays = [
          remind7DaysBeforeQuarterly && "7",
          remind14DaysBeforeQuarterly && "14",
        ].filter(Boolean);
        if (activeDays.length === 0) return ["Select reminder days below"];
        return [`We'll alert you ${activeDays.join(" / ")} days before.`];
      };
      notificationItems.push({
        key: 'perk_expiry_quarterly',
        isExpanded: expandedSections['perk_expiry_quarterly'],
        onToggleExpand: () => handleSectionToggle('perk_expiry_quarterly'),
        iconName: "alarm-outline" as const,
        title: "Quarterly Perk Expiry Reminders",
        details: buildQuarterlyHelperText(),
        toggles: [
          { label: "Enable quarterly reminders", value: quarterlyPerkRemindersEnabled, onValueChange: handleQuarterlyPerkMasterToggle, isMaster: true },
          ...quarterlyToggles
        ],
        iconColor: "#FF9500",
      });
    }

    // Semi-Annual Perks
    if (uniquePerkPeriods.includes(6)) {
      const semiAnnualToggles: ToggleProps[] = semiAnnualPerkRemindersEnabled ? [
        { label: "14 days before", value: remind14DaysBeforeSemiAnnual, onValueChange: setRemind14DaysBeforeSemiAnnual, disabled: !semiAnnualPerkRemindersEnabled },
        { label: "30 days before", value: remind30DaysBeforeSemiAnnual, onValueChange: setRemind30DaysBeforeSemiAnnual, disabled: !semiAnnualPerkRemindersEnabled },
      ] : [];
      const buildSemiAnnualHelperText = () => {
        if (!semiAnnualPerkRemindersEnabled) return ["Turn on to get reminded"];
        const activeDays = [
          remind14DaysBeforeSemiAnnual && "14",
          remind30DaysBeforeSemiAnnual && "30",
        ].filter(Boolean);
        if (activeDays.length === 0) return ["Select reminder days below"];
        return [`We'll alert you ${activeDays.join(" / ")} days before.`];
      };
      notificationItems.push({
        key: 'perk_expiry_semi_annual',
        isExpanded: expandedSections['perk_expiry_semi_annual'],
        onToggleExpand: () => handleSectionToggle('perk_expiry_semi_annual'),
        iconName: "alarm-outline" as const,
        title: "Semi-Annual Perk Expiry Reminders",
        details: buildSemiAnnualHelperText(),
        toggles: [
          { label: "Enable semi-annual reminders", value: semiAnnualPerkRemindersEnabled, onValueChange: handleSemiAnnualPerkMasterToggle, isMaster: true },
          ...semiAnnualToggles
        ],
        iconColor: "#FF9500",
      });
    }

    // Annual Perks
    if (uniquePerkPeriods.includes(12)) {
      const annualToggles: ToggleProps[] = annualPerkRemindersEnabled ? [
        { label: "30 days before", value: remind30DaysBeforeAnnual, onValueChange: setRemind30DaysBeforeAnnual, disabled: !annualPerkRemindersEnabled },
        { label: "60 days before", value: remind60DaysBeforeAnnual, onValueChange: setRemind60DaysBeforeAnnual, disabled: !annualPerkRemindersEnabled },
      ] : [];
      const buildAnnualHelperText = () => {
        if (!annualPerkRemindersEnabled) return ["Turn on to get reminded"];
        const activeDays = [
          remind30DaysBeforeAnnual && "30",
          remind60DaysBeforeAnnual && "60",
        ].filter(Boolean);
        if (activeDays.length === 0) return ["Select reminder days below"];
        return [`We'll alert you ${activeDays.join(" / ")} days before.`];
      };
      notificationItems.push({
        key: 'perk_expiry_annual',
        isExpanded: expandedSections['perk_expiry_annual'],
        onToggleExpand: () => handleSectionToggle('perk_expiry_annual'),
        iconName: "alarm-outline" as const,
        title: "Annual Perk Expiry Reminders",
        details: buildAnnualHelperText(),
        toggles: [
          { label: "Enable annual reminders", value: annualPerkRemindersEnabled, onValueChange: handleAnnualPerkMasterToggle, isMaster: true },
          ...annualToggles
        ],
        iconColor: "#FF9500",
      });
    }

    // Other settings
    notificationItems.push(
      { 
        key: 'card_renewal',
        isExpanded: expandedSections['card_renewal'],
        onToggleExpand: () => handleSectionToggle('card_renewal'),
        iconName: "calendar-outline" as const,
        title: "Card Renewal Reminders", 
        details: anyRenewalDateSet 
          ? [`${renewalReminderDays} days before renewal dates`] 
          : ["Add renewal dates first"],
        toggles: [
          { 
            label: "Enable renewal reminders", 
            value: renewalRemindersEnabled, 
            onValueChange: handleRenewalReminderToggle,
            isMaster: true,
          }
        ],
        renewalOptions: anyRenewalDateSet && renewalRemindersEnabled ? {
          current: renewalReminderDays,
          setter: setRenewalReminderDays,
          options: [
            { label: '7 days before', value: 7 },
            { label: '14 days before', value: 14 },
            { label: '30 days before', value: 30 },
          ]
        } : undefined,
        iconColor: anyRenewalDateSet ? "#34C759" : "#8E8E93",
        dimmed: !anyRenewalDateSet,
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
            onValueChange: handleResetConfirmationToggle,
            isMaster: true,
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
            isMaster: true,
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