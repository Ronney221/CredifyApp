import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Pressable,
  Platform,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { Colors } from '../../constants/Colors';
import { ProfileHeader } from '../../components/profile/ProfileHeader';
import { ProfileStatsCards } from '../../components/profile/ProfileStatsCards';
import { AchievementsSection } from '../../components/profile/AchievementsSection';
import { QuickInsights } from '../../components/profile/QuickInsights';
import { PersonalJourney } from '../../components/profile/PersonalJourney';
import { SettingsSection } from '../../components/profile/SettingsSection';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { schedulePerkExpiryNotifications } from '../../services/notification-perk-expiry';
import { scheduleCardRenewalNotifications, scheduleFirstOfMonthReminder, schedulePerkResetNotification } from '../../utils/notifications';
import { NotificationPreferences } from '../../types/notification-types';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../lib/supabase';
import * as Sentry from '@sentry/react-native';
import { useOnboardingContext, HAS_REDEEMED_FIRST_PERK_KEY, HAS_SEEN_TAP_ONBOARDING_KEY, HAS_SEEN_SWIPE_ONBOARDING_KEY, useOnboarding } from '../(onboarding)/_context/OnboardingContext';
import { DatabaseTester } from '../../components/debug/DatabaseTester';
import { logger } from '../../utils/logger';

// Constants
const TAB_BAR_OFFSET = Platform.OS === 'ios' ? 120 : 80; // Increased to account for home indicator
const CURRENT_CHAT_ID_KEY = '@ai_chat_current_id';
const CHAT_NOTIFICATION_KEY = '@ai_chat_notification_active';
const CHAT_USAGE_KEY = '@ai_chat_usage';


const ProfileScreen = () => {
  const router = useRouter();
  const { signOut, user } = useAuth();
  const { setHasRedeemedFirstPerk } = useOnboardingContext();
  const { reloadOnboardingFlags } = useOnboarding();
  const [showTester, setShowTester] = useState(false);

  const handleTestPerkExpiryNotifications = async () => {
    if (!user?.id) {
      Alert.alert('Error', 'You must be signed in to test notifications.');
      return;
    }

    // Use a test-specific preference object to ensure all are enabled
    const testPreferences: NotificationPreferences = {
      perkExpiryRemindersEnabled: true,
      quarterlyPerkRemindersEnabled: true,
      semiAnnualPerkRemindersEnabled: true,
      annualPerkRemindersEnabled: true,
      renewalRemindersEnabled: true,
      perkResetConfirmationEnabled: true,
      weeklyDigestEnabled: false,
      renewalReminderDays: [90, 30, 7, 1],
      firstOfMonthRemindersEnabled: true
    };

    try {
      logger.log('[ProfileScreen] Testing all notification types');

      // Test perk expiry notifications
      const perkExpiryPromises = [
        schedulePerkExpiryNotifications(user.id, testPreferences, 1, true),
        schedulePerkExpiryNotifications(user.id, testPreferences, 3, true),
        schedulePerkExpiryNotifications(user.id, testPreferences, 6, true),
        schedulePerkExpiryNotifications(user.id, testPreferences, 12, true),
      ];

      // Test other notifications
      const otherPromises = [
        scheduleCardRenewalNotifications(user.id, testPreferences, true),
        scheduleFirstOfMonthReminder(user.id, testPreferences, true),
        schedulePerkResetNotification(user.id, testPreferences),
      ];

      const [perkExpiryResults, otherResults] = await Promise.all([
        Promise.all(perkExpiryPromises),
        Promise.all(otherPromises),
      ]);

      const totalScheduled = [
        ...perkExpiryResults.flat(),
        ...otherResults,
      ].filter(id => id !== null).length;

      Alert.alert(
        "Success",
        `Scheduled ${totalScheduled} test notifications including:\n` +
        "- Perk expiry reminders\n" +
        "- Card renewal notifications\n" +
        "- First of month reminders\n" +
        "- Perk reset notifications\n\n" +
        "You should receive them shortly."
      );
    } catch (error) {
      console.error('Error testing notifications:', error);
      Alert.alert('Error', 'Failed to schedule test notifications.');
    }
  };

  const handleResetFirstRedemption = async () => {
    try {
      logger.log('[Profile] Resetting first redemption state');
      const beforeValue = await AsyncStorage.getItem(HAS_REDEEMED_FIRST_PERK_KEY);
      logger.log('[Profile] Current value before reset:', beforeValue);

      await AsyncStorage.removeItem(HAS_REDEEMED_FIRST_PERK_KEY);
      setHasRedeemedFirstPerk(false);

      const afterValue = await AsyncStorage.getItem(HAS_REDEEMED_FIRST_PERK_KEY);
      logger.log('[Profile] Value after reset:', afterValue);

      Alert.alert(
        "Success",
        "First redemption state has been reset. The onboarding sheet will show after your next perk redemption.",
        [{ text: "OK" }]
      );
    } catch (error) {
      console.error('[Profile] Error resetting first redemption state:', error);
      Alert.alert('Error', 'Failed to reset first redemption state.');
    }
  };

  const handleResetTapOnboarding = async () => {
    try {
      logger.log('[Profile] Resetting tap onboarding state');
      
      // Remove both tap and swipe onboarding keys to reset the full flow
      await AsyncStorage.multiRemove([HAS_SEEN_TAP_ONBOARDING_KEY, HAS_SEEN_SWIPE_ONBOARDING_KEY]);
      
      // Reload the onboarding flags to immediately reflect the changes
      await reloadOnboardingFlags();
      
      Alert.alert(
        "Tutorial Reset",
        "Tutorial has been reset successfully! Go to your dashboard and expand any card with perks to see the interactive tutorial again.",
        [{ text: "Got it!" }]
      );
    } catch (error) {
      console.error('[Profile] Error resetting tap onboarding state:', error);
      Alert.alert('Error', 'Failed to reset tap onboarding state.');
    }
  };

  const handleShowChatNotification = async () => {
    try {
      await AsyncStorage.setItem(CHAT_NOTIFICATION_KEY, 'true');
      Alert.alert(
        "Success",
        "AI Chat notification dot enabled. Return to the Dashboard to see it.",
        [{ text: "OK" }]
      );
    } catch (error) {
      console.error('Error setting AI chat notification:', error);
      Alert.alert('Error', 'Failed to set AI chat notification.');
    }
  };

  const handleTestInactivityMessage = async () => {
    try {
      const chatId = await AsyncStorage.getItem(CURRENT_CHAT_ID_KEY);
      if (!chatId) {
        Alert.alert('No Active Chat', 'Please start a chat first to test this feature.');
        return;
      }

      const historyKey = `@ai_chat_history_${chatId}`;
      const savedHistory = await AsyncStorage.getItem(historyKey);

      if (!savedHistory) {
        Alert.alert('No Chat History', 'Please send at least one message in the chat to test this feature.');
        return;
      }

      const history = JSON.parse(savedHistory);
      if (history.length === 0) {
        Alert.alert('Empty Chat History', 'Please send at least one message in the chat to test this feature.');
        return;
      }

      // Modify the timestamp to be 3 days ago
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      history[0].createdAt = threeDaysAgo.toISOString();

      await AsyncStorage.setItem(historyKey, JSON.stringify(history));

      // Also set the notification key to true so the dot appears on the dashboard
      await AsyncStorage.setItem(CHAT_NOTIFICATION_KEY, 'true');

      Alert.alert(
        "Success",
        "The last message's timestamp has been set to 3 days ago. Re-open the AI Chat to see the inactivity message.",
        [{ text: "OK" }]
      );
    } catch (error) {
      console.error('Error testing inactivity message:', error);
      Alert.alert('Error', 'Failed to modify chat history for testing.');
    }
  };

  const handleResetChatCredits = async () => {
    try {
      await AsyncStorage.removeItem(CHAT_USAGE_KEY);
      Alert.alert(
        "Success",
        "Chat credits have been reset. You now have 30 free queries.",
        [{ text: "OK" }]
      );
    } catch (error) {
      console.error('Error resetting chat credits:', error);
      Alert.alert('Error', 'Failed to reset chat credits.');
    }
  };

  const handleResetNotificationPreferences = async () => {
    try {
      const NOTIFICATION_PREFS_KEY = '@notification_preferences';
      await AsyncStorage.removeItem(NOTIFICATION_PREFS_KEY);
      logger.log('[Profile] Successfully cleared notification preferences');

      Alert.alert(
        "Success",
        "Notification preferences have been reset to defaults. All notifications are now enabled.",
        [{
          text: "OK",
          onPress: () => {
            // Optionally navigate to the notifications screen to see the changes
            router.push({
              pathname: '/(tabs)/profile/notifications',
              params: { backRoute: '/(tabs)/04-profile' }
            });
          }
        }]
      );
    } catch (error) {
      console.error('[Profile] Error resetting notification preferences:', error);
      Alert.alert('Error', 'Failed to reset notification preferences.');
    }
  };

  const handleClearChat = async () => {
    Alert.alert(
      "Clear Chat History",
      "This will remove all archived conversations and start a fresh session. Are you sure?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: async () => {
            try {
              const allKeys = await AsyncStorage.getAllKeys();
              const chatKeys = allKeys.filter(key =>
                key.startsWith('@ai_chat_history_') || key === CURRENT_CHAT_ID_KEY
              );
              await AsyncStorage.multiRemove(chatKeys);
              Alert.alert(
                "Success",
                "All chat history has been cleared.",
                [{ text: "OK" }]
              );
            } catch (error) {
              console.error('Error clearing chat history:', error);
              Alert.alert('Error', 'Failed to clear chat history.');
            }
          }
        }
      ]
    );
  };

  const handleSignOut = async () => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: async () => {
            try {
              // Sign out from auth
              const { error } = await signOut();
              if (error) {
                Alert.alert('Error', 'Failed to sign out. Please try again.');
                return;
              }

              // Navigate to login screen
              router.replace('/(auth)/login');
            } catch (e) {
              console.error('Error during sign out:', e);
              Alert.alert('Error', 'Failed to sign out. Please try again.');
            }
          }
        }
      ]
    );
  };

  // Convert to new settings format
  const accountSettings = [
    {
      id: 'manage-cards',
      title: 'Manage Cards',
      subtitle: 'Add, remove, and organize your credit cards',
      icon: 'card-outline' as keyof typeof Ionicons.glyphMap,
      onPress: () => router.push('/(tabs)/profile/manage_cards'),
    },
    {
      id: 'preferences',
      title: 'Notification Preferences',
      subtitle: 'Customize your notification settings',
      icon: 'notifications-outline' as keyof typeof Ionicons.glyphMap,
      onPress: () => router.push('/(tabs)/profile/notifications')
    },
  ];

  const supportSettings = [
    {
      id: 'replay-tutorial',
      title: 'Replay Tutorial',
      subtitle: 'Learn about tap and swipe gestures again',
      icon: 'school-outline' as keyof typeof Ionicons.glyphMap,
      onPress: handleResetTapOnboarding
    },
    {
      id: 'help-faq',
      title: 'Help & FAQ',
      subtitle: 'Get answers to common questions',
      icon: 'help-circle-outline' as keyof typeof Ionicons.glyphMap,
      onPress: () => router.push('/(tabs)/profile/help-faq')
    },
    {
      id: 'legal',
      title: 'Legal',
      subtitle: 'Privacy Policy and Terms of Service',
      icon: 'document-text-outline' as keyof typeof Ionicons.glyphMap,
      onPress: () => router.push('/(legal)/terms')
    },
    {
      id: 'sign-out',
      title: 'Sign Out',
      icon: 'log-out-outline' as keyof typeof Ionicons.glyphMap,
      isDestructive: true,
      showChevron: false,
      onPress: handleSignOut
    },
  ];

     // {
    //   title: 'Developer',
    //   data: [
    //     // {
    //     //   id: 'test-sentry',
    //     //   title: 'Test Sentry Error',
    //     //   icon: 'bug-outline',
    //     //   onPress: () => {
    //     //     try {
    //     //       Sentry.captureException(new Error('Sentry test error from Profile screen'));
    //     //       Alert.alert('Success', 'Sentry test error captured. Check your Sentry dashboard.');
    //     //     } catch (error) {
    //     //       console.error("Sentry test failed:", error);
    //     //       Alert.alert('Error', 'Failed to capture Sentry error.');
    //     //     }
    //     //   }
    //     // },
    //     {
    //       id: 'reset-first-redemption',
    //       title: 'Reset First Redemption',
    //       icon: 'refresh-outline',
    //       onPress: handleResetFirstRedemption
    //     },
    //     {
    //       id: 'reset-tap-onboarding',
    //       title: 'Reset Tap Onboarding',
    //       icon: 'hand-left-outline',
    //       onPress: handleResetTapOnboarding
    //     },
    //     {
    //       id: 'clear-chat',
    //       title: 'Clear Chat History',
    //       icon: 'chatbubble-ellipses-outline',
    //       onPress: handleClearChat
    //     },
    //     // {
    //     //   id: 'show-chat-notification',
    //     //   title: 'Test AI Chat Notification',
    //     //   icon: 'notifications-circle-outline',
    //     //   onPress: handleShowChatNotification
    //     // },
    //     {
    //       id: 'reset-chat-credits',
    //       title: 'Reset Chat Credits',
    //       icon: 'cash-outline',
    //       onPress: handleResetChatCredits
    //     },
    //     {
    //       id: 'reset-notification-prefs',
    //       title: 'Reset Notification Preferences',
    //       icon: 'notifications-outline',
    //       onPress: handleResetNotificationPreferences
    //     },
    //     // {
    //     //   id: 'test-inactivity-message',
    //     //   title: 'Send Suggested AI Message',
    //     //   icon: 'time-outline',
    //     //   onPress: handleTestInactivityMessage
    //     // },
    //     {
    //       id: 'test-perk-expiry-notifications',
    //       title: 'Test All Notifications',
    //       icon: 'timer-outline',
    //       onPress: handleTestPerkExpiryNotifications
    //     },
    //     {
    //       id: 'test-database',
    //       title: 'Test Database',
    //       icon: 'server-outline',
    //       onPress: () => {
    //         logger.log('Test Database button tapped!');
    //         setShowTester(true);
    //       }
    //     },
    //   ],
    //   footer: 'Development tools and testing options.',
    // },


  // Extract first and last name from email (temporary)
  const name = user?.email ? user.email.split('@')[0].split('.').map(
    word => word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ') : 'User';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: TAB_BAR_OFFSET }
        ]}
        showsVerticalScrollIndicator={false}
        bounces
        alwaysBounceVertical
      >
        <ProfileHeader
          name={name}
          email={user?.email || ''}
          avatarUrl={user?.user_metadata?.avatar_url}
          onPress={() => router.push('/(tabs)/profile/edit-profile')}
        />
        
        {user?.id && (
          <>
            {/* <ProfileStatsCards userId={user.id} /> */}
            <QuickInsights userId={user.id} />
            {/* <PersonalJourney userId={user.id} /> */}
            {/* <AchievementsSection userId={user.id} /> */}
          </>
        )}

        <SettingsSection 
          title="Account" 
          items={accountSettings}
        />
        
        <SettingsSection 
          title="Support" 
          items={supportSettings}
        />

        {user?.id && (
          <>
            {/* <ProfileStatsCards userId={user.id} /> */}
            {/* <QuickInsights userId={user.id} /> */}
            <PersonalJourney userId={user.id} />
            <AchievementsSection userId={user.id} />
          </>
        )}
      </ScrollView>

      
      
      <Modal
        visible={showTester}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <SafeAreaView style={{ flex: 1 }}>
          <DatabaseTester onClose={() => {
            logger.log('DatabaseTester closing...');
            setShowTester(false);
          }} />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.systemGroupedBackground,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    // No padding needed since each component handles its own margins
  },
});

export default ProfileScreen; 