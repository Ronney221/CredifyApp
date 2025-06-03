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
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../../constants/Colors';
import { Ionicons } from '@expo/vector-icons'; // For icons in mini-cards
import { MotiView } from 'moti'; // Added MotiView

const NOTIFICATION_PREFS_KEY = '@notification_preferences_v2'; // Consider versioning if structure changes
const HEADER_OFFSET = Platform.OS === 'ios' ? 120 : 90; // Updated Offset for transparent header

interface ToggleProps {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}

interface NotificationSettingItemProps { // Renamed from MiniCardProps for clarity
  iconName: keyof typeof Ionicons.glyphMap;
  title: string;
  details?: string[];
  iconColor?: string;
  toggles?: ToggleProps[];
  index?: number;
  isLastItem?: boolean; // Added to conditionally add bottom margin
}

// Renamed from MiniCard to NotificationSettingItem for clarity in new context
const NotificationSettingItem: React.FC<NotificationSettingItemProps> = ({
  iconName,
  title,
  details,
  iconColor = Colors.light.tint,
  toggles,
  index = 0,
  isLastItem = false,
}) => {
  return (
    <MotiView
      from={{ opacity: 0, translateY: 20 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{
        type: 'timing',
        duration: 250,
        delay: 150 + (index * 100),
      }}
      style={[styles.notificationItemContainer, isLastItem && { borderBottomWidth: 0 }]}
    >
      <View style={styles.notificationItemHeader}>
        <Ionicons name={iconName} size={22} color={iconColor} style={styles.notificationItemIcon} />
        <Text style={styles.notificationItemTitle}>{title}</Text>
      </View>
      {details && details.length > 0 && (
        <View style={styles.notificationItemBody}>
          {details.map((detail, idx) => (
            <Text key={idx} style={styles.notificationItemDetailText}>• {detail}</Text>
          ))}
        </View>
      )}
      {toggles && toggles.length > 0 && (
        <View style={styles.togglesContainer}>
          {toggles.map((toggle, idx) => (
            <View key={idx} style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>{toggle.label}</Text>
              <Switch
                trackColor={{ false: "#767577", true: Colors.light.tint }}
                thumbColor={toggle.value ? "#ffffff" : "#f4f3f4"}
                ios_backgroundColor="#3e3e3e"
                onValueChange={toggle.onValueChange}
                value={toggle.value}
              />
            </View>
          ))}
        </View>
      )}
    </MotiView>
  );
};

export default function OnboardingNotificationPrefsScreen() {
  const router = useRouter();
  // Expect selectedCardIds and renewalDates from renewal-dates screen
  const params = useLocalSearchParams<{ selectedCardIds?: string; renewalDates?: string }>();
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);
  // Parsed renewal dates: Record<cardId, isoDateString | null>
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

  const handleNext = async () => {
    const monthlyPerkExpiryReminderDays: number[] = [];
    if (remind1DayBefore) monthlyPerkExpiryReminderDays.push(1);
    if (remind3DaysBefore) monthlyPerkExpiryReminderDays.push(3);
    if (remind7DaysBefore) monthlyPerkExpiryReminderDays.push(7);

    const notificationPreferences = {
      perkExpiryRemindersEnabled: monthlyPerkExpiryReminderDays.length > 0,
      renewalRemindersEnabled: Object.values(parsedRenewalDates).some(date => date !== null), // True if any card has a renewal date
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

  const baseNotificationItems = [
    { iconName: "alarm-outline" as keyof typeof Ionicons.glyphMap, title: "Perk Expiry Reminders", toggles: perkExpiryToggles, iconColor: "#FF9500" },
    { iconName: "sync-circle-outline" as keyof typeof Ionicons.glyphMap, title: "Monthly Reset Alerts", details: ["1st of every month"], iconColor: "#007AFF" },
  ];

  const showCardRenewalReminder = Object.values(parsedRenewalDates).some(date => date !== null);

  const allNotificationItems = showCardRenewalReminder
    ? [
        ...baseNotificationItems.slice(0, 1), // Perk Expiry
        { iconName: "calendar-outline" as keyof typeof Ionicons.glyphMap, title: "Card Renewal Reminder", details: ["For cards with set anniversary dates"], iconColor: "#34C759" },
        ...baseNotificationItems.slice(1), // Monthly Reset
      ]
    : baseNotificationItems;
  
  // Animation timings
  const contentSlideInDelay = 200;
  const itemStagger = 50;
  const ctaBaseDelay = contentSlideInDelay + 150;
  const ctaDelay = ctaBaseDelay + (allNotificationItems.length * itemStagger) + 100;

  return (
    <SafeAreaView style={[styles.container, { paddingTop: HEADER_OFFSET }]} edges={['bottom']}>
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
            We've enabled recommended reminders. You can tweak them below or change them anytime in <Text style={styles.boldText}>Settings &gt; Notifications</Text>.
          </Text>
          
          <View style={styles.notificationItemsSection}>
            {allNotificationItems.map((itemProps, index) => (
              <NotificationSettingItem 
                key={itemProps.title}
                {...itemProps}
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
          <Text style={styles.nextButtonText}>All Set—Let's Go!</Text>
        </TouchableOpacity>
      </MotiView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f2f2f7', // Page background
  },
  scrollContentContainer: { // Styles for the ScrollView's content
    flexGrow: 1,
    justifyContent: 'center', // Center content vertically
    paddingHorizontal: 16, // Adjusted horizontal padding for the scroll view
    paddingVertical: 24,   // Added some vertical padding for the scroll view
  },
  mainCardContainer: { // Styles for the single large white card
    alignItems: 'center', // Center content horizontally
    paddingHorizontal: 20, // Internal padding for the card content
    paddingVertical: 24,
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
  mainCardTitle: { // Renamed from infoTitle
    fontSize: 22,
    fontWeight: '600',
    color: Colors.light.text,
    textAlign: 'center',
    marginBottom: 12, // Reduced margin as items follow directly
  },
  mainCardInfoText: { // Renamed from infoText
    fontSize: 16,
    color: Colors.light.icon, // Using icon color as a secondary text color
    textAlign: 'center',
    marginBottom: 24, // Margin before the list of items
    lineHeight: 22,
    paddingHorizontal: 8, // Slight horizontal padding for better readability
  },
  boldText: {
    fontWeight: '600',
    color: Colors.light.text,
  },
  notificationItemsSection: { // Container for all notification settings items
    width: '100%',
    marginTop: 0, // No extra margin as it's part of the card flow
  },
  notificationItemContainer: {
    backgroundColor: 'transparent', // No separate background for the item itself
    borderRadius: 0, // No border radius for the item itself
    paddingVertical: 12, // Vertical padding for each item
    paddingHorizontal: 0, // Horizontal padding handled by mainCardContainer
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#EDEDED',
  },
  notificationItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  notificationItemIcon: {
    marginRight: 12, // Slightly increased for better spacing
  },
  notificationItemTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.light.text,
  },
  notificationItemBody: {
    paddingLeft: 34, // Align with title text (icon width + margin)
  },
  notificationItemDetailText: {
    fontSize: 15,
    color: Colors.light.icon,
    marginBottom: 4,
    lineHeight: 20,
  },
  togglesContainer: {
    marginTop: 12, // Space above toggles
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F9F9FB', // Slightly different background for visual grouping
    paddingVertical: 12,
    paddingHorizontal: 12, // Padding within the toggle row
    borderRadius: 8, // Rounded corners for each toggle group row
    marginTop: 4, // Small margin between toggle rows if multiple
  },
  toggleLabel: {
    fontSize: 15,
    color: Colors.light.text,
    flexShrink: 1, // Allow label to shrink if needed
    marginRight: 8, // Space between label and switch
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
    shadowColor: '#000', // Added shadow (G)
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: {width:0, height:2},
    elevation: 4, // for Android shadow
  },
  nextButtonText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '600',
  },
}); 