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
import { useSmartNotificationPrompts } from '../../hooks/useSmartNotificationPrompts';
import NotificationPromptBanner from '../../components/notifications/NotificationPromptBanner';

// Constants
const TAB_BAR_OFFSET = Platform.OS === 'ios' ? 120 : 80; // Increased to account for home indicator
const CURRENT_CHAT_ID_KEY = '@ai_chat_current_id';
const CHAT_NOTIFICATION_KEY = '@ai_chat_notification_active';
const CHAT_USAGE_KEY = '@ai_chat_usage';


const ProfileScreen = () => {
  const router = useRouter();
  const { signOut, user } = useAuth();
  const { setHasRedeemedFirstPerk, setNotificationChoice } = useOnboardingContext();
  const { reloadOnboardingFlags } = useOnboarding();
  const [showTester, setShowTester] = useState(false);
  const [showNotificationBanner, setShowNotificationBanner] = useState(false);
  const { promptAfterFirstPerk, promptAfterViewingSavings, checkNotificationStatus } = useSmartNotificationPrompts();

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

  const handleTestFirstPerkPrompt = async () => {
    try {
      console.log('🧪 Testing first perk prompt...');
      
      // Set the required conditions for the prompt to show
      await setNotificationChoice('declined'); // Ensure we're in a state to show prompts
      await setHasRedeemedFirstPerk(true); // Set that user has redeemed first perk
      await AsyncStorage.removeItem('@last_notification_prompt_date'); // Clear cooldown
      
      console.log('🧪 Conditions set, waiting for prompt...');
      
      // Wait a moment for state to update
      setTimeout(async () => {
        console.log('🧪 Triggering prompt now...');
        await promptAfterFirstPerk();
        console.log('🧪 Prompt function called');
      }, 500); // Increased delay
      
      // Show immediate feedback
      Alert.alert('Debug', 'Conditions set for first perk prompt. Check console logs.');
    } catch (error) {
      console.error('Error testing first perk prompt:', error);
      Alert.alert('Error', `Failed to show first perk prompt: ${error.message}`);
    }
  };

  const handleTestSavingsPrompt = async () => {
    try {
      console.log('🧪 Testing savings prompt...');
      
      await setNotificationChoice('declined'); // Ensure we're in a state to show prompts
      await AsyncStorage.removeItem('@last_notification_prompt_date'); // Clear cooldown
      const mockSavings = 342; // Mock savings amount
      
      console.log('🧪 Conditions set for savings prompt, waiting...');
      
      // Wait a moment for state to update
      setTimeout(async () => {
        console.log('🧪 Triggering savings prompt now...');
        await promptAfterViewingSavings(mockSavings);
        console.log('🧪 Savings prompt function called');
      }, 500); // Increased delay
      
      // Show immediate feedback
      Alert.alert('Debug', 'Conditions set for savings prompt. Check console logs.');
    } catch (error) {
      console.error('Error testing savings prompt:', error);
      Alert.alert('Error', `Failed to show savings prompt: ${error.message}`);
    }
  };

  const handleToggleNotificationBanner = () => {
    const newValue = !showNotificationBanner;
    console.log('Toggling banner from', showNotificationBanner, 'to', newValue);
    setShowNotificationBanner(newValue);
    
    // Show a confirmation alert
    Alert.alert(
      'Banner Toggle',
      `Banner is now ${newValue ? 'visible' : 'hidden'}. ${newValue ? 'Look for the blue banner below.' : ''}`,
      [{ text: 'OK' }]
    );
  };

  const handleTestNotificationStatus = async () => {
    try {
      const hasPermissions = await checkNotificationStatus();
      Alert.alert(
        'Notification Status',
        `Current notification permissions: ${hasPermissions ? 'Granted' : 'Not granted'}`
      );
    } catch (error) {
      console.error('Error checking notification status:', error);
      Alert.alert('Error', 'Failed to check notification status.');
    }
  };

  const handleResetNotificationChoice = async () => {
    try {
      await setNotificationChoice('declined');
      // Also clear the last prompt date
      await AsyncStorage.removeItem('@last_notification_prompt_date');
      Alert.alert(
        'Success',
        'Notification choice reset to "declined". Smart prompts will now show again.'
      );
    } catch (error) {
      console.error('Error resetting notification choice:', error);
      Alert.alert('Error', 'Failed to reset notification choice.');
    }
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

  const developerSettings = [
    {
      id: 'test-first-perk-prompt',
      title: 'Test First Perk Prompt',
      subtitle: 'Trigger notification prompt after first redemption',
      icon: 'trophy-outline' as keyof typeof Ionicons.glyphMap,
      onPress: handleTestFirstPerkPrompt
    },
    {
      id: 'test-savings-prompt',
      title: 'Test Savings Prompt',
      subtitle: 'Trigger prompt with $342 savings amount',
      icon: 'cash-outline' as keyof typeof Ionicons.glyphMap,
      onPress: handleTestSavingsPrompt
    },
    {
      id: 'toggle-banner',
      title: showNotificationBanner ? 'Hide Banner' : 'Show Banner',
      subtitle: 'Toggle notification re-engagement banner',
      icon: 'flag-outline' as keyof typeof Ionicons.glyphMap,
      onPress: handleToggleNotificationBanner
    },
    {
      id: 'check-status',
      title: 'Check Notification Status',
      subtitle: 'Check current notification permissions',
      icon: 'checkmark-circle-outline' as keyof typeof Ionicons.glyphMap,
      onPress: handleTestNotificationStatus
    },
    {
      id: 'reset-notification-choice',
      title: 'Reset Notification Choice',
      subtitle: 'Reset to show smart prompts again',
      icon: 'refresh-outline' as keyof typeof Ionicons.glyphMap,
      onPress: handleResetNotificationChoice
    },
    {
      id: 'notification-intro',
      title: 'Go to Notification Intro',
      subtitle: 'See the onboarding notification screen',
      icon: 'notifications-outline' as keyof typeof Ionicons.glyphMap,
      onPress: () => router.push('/(onboarding)/notifications-intro')
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

        {/* Test Notification Banner - Show at top for visibility */}
        {showNotificationBanner && (
          <View style={styles.bannerContainer}>
            <Text style={styles.debugText}>🧪 Testing Notification Banner</Text>
            {/* Simple test banner */}
            <View style={styles.testBanner}>
              <Text style={styles.testBannerText}>
                💰 You've saved $342! Enable reminders to maximize your remaining perks
              </Text>
              <Pressable 
                style={styles.testBannerButton}
                onPress={() => {
                  Alert.alert('Test Banner', 'This is a test notification banner!');
                }}
              >
                <Text style={styles.testBannerButtonText}>Enable</Text>
              </Pressable>
              <Pressable 
                style={styles.testBannerClose}
                onPress={() => setShowNotificationBanner(false)}
              >
                <Text style={styles.testBannerCloseText}>✕</Text>
              </Pressable>
            </View>
            <Text style={styles.debugText}>🧪 Banner shown above</Text>
          </View>
        )}

        {/* <SettingsSection 
          title="🧪 Notification Testing" 
          items={developerSettings}
        /> */}

        {user?.id && (
          <>
            {/* <ProfileStatsCards userId={user.id} /> */}
            {/* <QuickInsights userId={user.id} /> */}
            <AchievementsSection userId={user.id} />
            <PersonalJourney userId={user.id} />
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
  bannerContainer: {
    marginBottom: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)', // Slight background to make it visible
    borderRadius: 8,
    padding: 4,
  },
  debugText: {
    fontSize: 14,
    color: Colors.light.text,
    textAlign: 'center',
    padding: 8,
    backgroundColor: 'rgba(255, 0, 0, 0.1)', // Red background for debugging
  },
  testBanner: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    margin: 8,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  testBannerText: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    marginRight: 12,
  },
  testBannerButton: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  testBannerButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
  },
  testBannerClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  testBannerCloseText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default ProfileScreen; 