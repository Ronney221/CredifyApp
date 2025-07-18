import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  TouchableOpacity,
  Alert,
  SectionListRenderItemInfo,
  StyleProp,
  ViewStyle,
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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { schedulePerkExpiryNotifications } from '../../services/notification-perk-expiry';
import { scheduleCardRenewalNotifications, scheduleFirstOfMonthReminder, schedulePerkResetNotification } from '../../utils/notifications';
import { NotificationPreferences } from '../../types/notification-types';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../lib/supabase';
import * as Sentry from '@sentry/react-native';
import { useOnboardingContext, HAS_REDEEMED_FIRST_PERK_KEY, HAS_SEEN_TAP_ONBOARDING_KEY, HAS_SEEN_SWIPE_ONBOARDING_KEY } from '../(onboarding)/_context/OnboardingContext';
import { DatabaseTester } from '../../components/debug/DatabaseTester';

// Constants
const TAB_BAR_OFFSET = Platform.OS === 'ios' ? 120 : 80; // Increased to account for home indicator
const CURRENT_CHAT_ID_KEY = '@ai_chat_current_id';
const CHAT_NOTIFICATION_KEY = '@ai_chat_notification_active';
const CHAT_USAGE_KEY = '@ai_chat_usage';

interface ProfileRow {
  id: string;
  title: string;
  icon?: keyof typeof Ionicons.glyphMap;
  isDestructive?: boolean;
  onPress: () => void;
  subtitle?: string;
}

interface ProfileSection {
  title: string;
  data: ProfileRow[];
  footer?: string;
}

const ProfileScreen = () => {
  const router = useRouter();
  const { signOut, user } = useAuth();
  const { setHasRedeemedFirstPerk } = useOnboardingContext();
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
      console.log('[ProfileScreen] Testing all notification types');

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
      console.log('[Profile] Resetting first redemption state');
      const beforeValue = await AsyncStorage.getItem(HAS_REDEEMED_FIRST_PERK_KEY);
      console.log('[Profile] Current value before reset:', beforeValue);

      await AsyncStorage.removeItem(HAS_REDEEMED_FIRST_PERK_KEY);
      setHasRedeemedFirstPerk(false);

      const afterValue = await AsyncStorage.getItem(HAS_REDEEMED_FIRST_PERK_KEY);
      console.log('[Profile] Value after reset:', afterValue);

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
      console.log('[Profile] Resetting tap onboarding state');
      
      // Remove both tap and swipe onboarding keys to reset the full flow
      await AsyncStorage.multiRemove([HAS_SEEN_TAP_ONBOARDING_KEY, HAS_SEEN_SWIPE_ONBOARDING_KEY]);
      
      Alert.alert(
        "Success",
        "Tap onboarding has been reset. The tap tutorial will show when you next expand a card with perks.",
        [{ text: "OK" }]
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
      console.log('[Profile] Successfully cleared notification preferences');

      Alert.alert(
        "Success",
        "Notification preferences have been reset to defaults. All notifications are now enabled.",
        [{
          text: "OK",
          onPress: () => {
            // Optionally navigate to the notifications screen to see the changes
            router.push('/(tabs)/profile/notifications');
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

  const sections: ProfileSection[] = [
    {
      title: 'Account',
      data: [
        {
          id: 'manage-cards',
          title: 'Manage Cards',
          icon: 'card-outline',
          onPress: () => router.push({
            pathname: '/profile/manage_cards',
            params: { backRoute: '/(tabs)/04-profile' }
          }),
        },
        {
          id: 'preferences',
          title: 'Notification Preferences',
          icon: 'notifications-outline',
          subtitle: 'Customize your notification settings',
          onPress: () => router.push('/(tabs)/profile/notifications')
        },
      ],
    },
    {
      title: 'Support',
      data: [
        {
          id: 'help-faq',
          title: 'Help & FAQ',
          icon: 'help-circle-outline',
          subtitle: 'Get answers to common questions',
          onPress: () => router.push('/(tabs)/profile/help-faq')
        },
        {
          id: 'legal',
          title: 'Legal',
          icon: 'document-text-outline',
          subtitle: 'Privacy Policy and Terms of Service',
          onPress: () => router.push('/(legal)/terms')
        },
        {
          id: 'sign-out',
          title: 'Sign Out',
          icon: 'log-out-outline',
          isDestructive: true,
          onPress: handleSignOut
        },
      ],
      footer: 'Get help with your account, cards, and more.',
    },
    {
      title: 'Developer',
      data: [
        // {
        //   id: 'test-sentry',
        //   title: 'Test Sentry Error',
        //   icon: 'bug-outline',
        //   onPress: () => {
        //     try {
        //       Sentry.captureException(new Error('Sentry test error from Profile screen'));
        //       Alert.alert('Success', 'Sentry test error captured. Check your Sentry dashboard.');
        //     } catch (error) {
        //       console.error("Sentry test failed:", error);
        //       Alert.alert('Error', 'Failed to capture Sentry error.');
        //     }
        //   }
        // },
        {
          id: 'reset-first-redemption',
          title: 'Reset First Redemption',
          icon: 'refresh-outline',
          onPress: handleResetFirstRedemption
        },
        {
          id: 'reset-tap-onboarding',
          title: 'Reset Tap Onboarding',
          icon: 'hand-left-outline',
          onPress: handleResetTapOnboarding
        },
        {
          id: 'clear-chat',
          title: 'Clear Chat History',
          icon: 'chatbubble-ellipses-outline',
          onPress: handleClearChat
        },
        // {
        //   id: 'show-chat-notification',
        //   title: 'Test AI Chat Notification',
        //   icon: 'notifications-circle-outline',
        //   onPress: handleShowChatNotification
        // },
        {
          id: 'reset-chat-credits',
          title: 'Reset Chat Credits',
          icon: 'cash-outline',
          onPress: handleResetChatCredits
        },
        {
          id: 'reset-notification-prefs',
          title: 'Reset Notification Preferences',
          icon: 'notifications-outline',
          onPress: handleResetNotificationPreferences
        },
        // {
        //   id: 'test-inactivity-message',
        //   title: 'Send Suggested AI Message',
        //   icon: 'time-outline',
        //   onPress: handleTestInactivityMessage
        // },
        {
          id: 'test-perk-expiry-notifications',
          title: 'Test All Notifications',
          icon: 'timer-outline',
          onPress: handleTestPerkExpiryNotifications
        },
        {
          id: 'test-database',
          title: 'Test Database',
          icon: 'server-outline',
          onPress: () => {
            console.log('Test Database button tapped!');
            setShowTester(true);
          }
        },
      ],
      footer: 'Development tools and testing options.',
    },
  ];

  const renderItem = ({ item, index, section }: SectionListRenderItemInfo<ProfileRow, ProfileSection>) => {
    const isFirstItem = index === 0;
    const isLastItem = index === section.data.length - 1;

    const rowStyle: StyleProp<ViewStyle> = [styles.row];
    if (isFirstItem && isLastItem) {
      rowStyle.push(styles.rowSingle);
    } else if (isFirstItem) {
      rowStyle.push(styles.rowFirst);
    } else if (isLastItem) {
      rowStyle.push(styles.rowLast);
    }

    return (
      <Pressable
        onPress={item.onPress}
        style={({ pressed }) => [
          rowStyle,
          pressed && { opacity: 0.8 }
        ]}
      >
        {item.icon && (
          <Ionicons
            name={item.icon}
            size={22}
            color={item.isDestructive ? Colors.light.error : Colors.light.secondaryLabel}
            style={styles.icon}
          />
        )}
        <View style={styles.textContainer}>
          <Text style={[
            styles.rowText,
            item.isDestructive && styles.destructiveText
          ]}>
            {item.title}
          </Text>
          {item.subtitle && !item.isDestructive && (
            <Text style={styles.subtitleText}>{item.subtitle}</Text>
          )}
        </View>
        {!item.isDestructive && (
          <Ionicons
            name="chevron-forward"
            size={20}
            color={Colors.light.secondaryLabel}
            style={styles.chevron}
          />
        )}
      </Pressable>
    );
  };

  const renderSectionHeader = ({ section }: { section: ProfileSection }) => (
    <Text style={styles.sectionHeader}>{section.title}</Text>
  );

  const renderSectionFooter = ({ section }: { section: ProfileSection }) => (
    section.footer ? <Text style={styles.sectionFooter}>{section.footer}</Text> : null
  );

  // Extract first and last name from email (temporary)
  const name = user?.email ? user.email.split('@')[0].split('.').map(
    word => word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ') : 'User';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ProfileHeader
        name={name}
        email={user?.email || ''}
        avatarUrl={user?.user_metadata?.avatar_url}
        onPress={() => router.push('/(tabs)/profile/edit-profile')}
      />

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        renderSectionFooter={renderSectionFooter}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: TAB_BAR_OFFSET }
        ]}
        stickySectionHeadersEnabled={false}
        bounces
        alwaysBounceVertical
        overScrollMode="never"
      />
      
      <Modal
        visible={showTester}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <SafeAreaView style={{ flex: 1 }}>
          <DatabaseTester onClose={() => {
            console.log('DatabaseTester closing...');
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
    backgroundColor: '#FAFAFE',
  },
  listContent: {
    paddingHorizontal: 16,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.light.secondaryLabel,
    textTransform: 'uppercase',
    marginTop: 36,
    marginBottom: 8,
    marginLeft: 16,
    letterSpacing: 0.1,
  },
  sectionFooter: {
    fontSize: 13,
    color: Colors.light.secondaryLabel,
    marginTop: 8,
    marginBottom: 16,
    marginLeft: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.background,
    paddingHorizontal: 16,
    minHeight: 52,
  },
  rowSingle: {
    borderRadius: 13,
  },
  rowFirst: {
    borderTopLeftRadius: 13,
    borderTopRightRadius: 13,
  },
  rowLast: {
    borderBottomLeftRadius: 13,
    borderBottomRightRadius: 13,
  },
  icon: {
    marginRight: 16,
    width: 24,
  },
  textContainer: {
    flex: 1,
    paddingVertical: 12,
  },
  rowText: {
    fontSize: 17,
    color: Colors.light.text,
  },
  subtitleText: {
    fontSize: 13,
    color: Colors.light.secondaryLabel,
    marginTop: 2,
  },
  destructiveText: {
    color: Colors.light.error,
  },
  chevron: {
    marginLeft: 'auto',
    marginRight: 8,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.light.separator,
    marginLeft: 56,
  },
});

export default ProfileScreen; 