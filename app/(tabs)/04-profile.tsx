import React from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { Colors } from '../../constants/Colors';
import { ProfileHeader } from '../components/profile/ProfileHeader';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { schedulePerkExpiryNotifications } from '../services/notification-perk-expiry';
import { NotificationPreferences } from '../utils/notifications';

// Constants
const TAB_BAR_OFFSET = Platform.OS === 'ios' ? 120 : 80; // Increased to account for home indicator
const HAS_REDEEMED_FIRST_PERK_KEY = '@has_redeemed_first_perk';
const CURRENT_CHAT_ID_KEY = '@ai_chat_current_id';
const CHAT_NOTIFICATION_KEY = '@ai_chat_notification_active';
const CHAT_USAGE_KEY = '@ai_chat_usage';

interface ProfileRow {
  id: string;
  title: string;
  icon?: keyof typeof Ionicons.glyphMap;
  isDestructive?: boolean;
  onPress: () => void;
}

interface ProfileSection {
  title: string;
  data: ProfileRow[];
  footer?: string;
}

const ProfileScreen = () => {
  const router = useRouter();
  const { signOut, user } = useAuth();

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
      // Other preferences are not needed for this specific test
      renewalRemindersEnabled: false,
      perkResetConfirmationEnabled: false,
      weeklyDigestEnabled: false,
    };

    try {
      console.log('[ProfileScreen] Scheduling test perk expiry notifications for all periods.');
      const allPromises = [
        schedulePerkExpiryNotifications(user.id, testPreferences, 1, true),
        schedulePerkExpiryNotifications(user.id, testPreferences, 3, true),
        schedulePerkExpiryNotifications(user.id, testPreferences, 6, true),
        schedulePerkExpiryNotifications(user.id, testPreferences, 12, true),
      ];

      const results = await Promise.all(allPromises);
      const scheduledIds = results.flat().filter((id: string | null) => id !== null);

      Alert.alert(
        "Success",
        `Scheduled ${scheduledIds.length} perk expiry test notifications. You should receive them shortly.`
      );
    } catch (error) {
      console.error('Error testing perk expiry notifications:', error);
      Alert.alert('Error', 'Failed to schedule test notifications.');
    }
  };

  const handleResetFirstRedemption = async () => {
    try {
      await AsyncStorage.removeItem(HAS_REDEEMED_FIRST_PERK_KEY);
      Alert.alert(
        "Success",
        "First redemption state has been reset. The onboarding sheet will show after your next perk redemption.",
        [{ text: "OK" }]
      );
    } catch (error) {
      console.error('Error resetting first redemption state:', error);
      Alert.alert('Error', 'Failed to reset first redemption state.');
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
      title: 'Wallet',
      data: [
        { id: 'manage-cards', title: 'Manage Cards', icon: 'card-outline', onPress: () => router.push('/(tabs)/profile/manage_cards') },
      ],
    },
    {
      title: 'Notifications',
      data: [
        { id: 'preferences', title: 'Preferences', icon: 'notifications-outline', onPress: () => router.push('/(tabs)/profile/notifications') },
      ],
    },
    {
      title: 'Support',
      data: [
        { id: 'help-faq', title: 'Help & FAQ', icon: 'help-circle-outline', onPress: () => router.push('/(tabs)/profile/help-faq') },
      ],
      footer: 'Get help with your account, cards, and more.',
    },
    {
      title: 'Developer',
      data: [
        { 
          id: 'reset-first-redemption', 
          title: 'Reset First Redemption', 
          icon: 'refresh-outline', 
          onPress: handleResetFirstRedemption 
        },
        {
          id: 'clear-chat',
          title: 'Clear Chat History',
          icon: 'chatbubble-ellipses-outline',
          onPress: handleClearChat
        },
        {
          id: 'show-chat-notification',
          title: 'Test AI Chat Notification',
          icon: 'notifications-circle-outline',
          onPress: handleShowChatNotification
        },
        {
          id: 'reset-chat-credits',
          title: 'Reset Chat Credits',
          icon: 'cash-outline',
          onPress: handleResetChatCredits
        },
        {
          id: 'test-inactivity-message',
          title: 'Test 48-hour Message',
          icon: 'time-outline',
          onPress: handleTestInactivityMessage
        },
        {
          id: 'test-perk-expiry-notifications',
          title: 'Test Perk Expiry Notifications',
          icon: 'timer-outline',
          onPress: handleTestPerkExpiryNotifications
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
            color={Colors.light.secondaryLabel}
            style={styles.icon}
          />
        )}
        <Text style={[
          styles.rowText,
          item.isDestructive && styles.destructiveText
        ]}>
          {item.title}
        </Text>
        <Ionicons 
          name="chevron-forward" 
          size={20} 
          color={Colors.light.secondaryLabel} 
          style={styles.chevron} 
        />
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
        ListFooterComponent={() => (
          <Pressable 
            style={({ pressed }) => [
              styles.signOutButton,
              pressed && { opacity: 0.8 }
            ]}
            onPress={handleSignOut}
          >
            <Text style={styles.signOutText}>Sign Out</Text>
          </Pressable>
        )}
      />
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
  rowText: {
    fontSize: 17,
    color: Colors.light.text,
    flex: 1,
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
  signOutButton: {
    backgroundColor: Colors.light.background,
    marginTop: 32,
    marginHorizontal: 16,
    minHeight: 52,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  signOutText: {
    fontSize: 17,
    color: Colors.light.error,
    fontWeight: '600',
  },
});

export default ProfileScreen; 