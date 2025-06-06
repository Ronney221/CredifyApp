import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { useNotificationPreferences } from '../../components/cards/hooks/useNotificationPreferences';
import { ReminderToggleGroup } from '../../components/notifications/ReminderToggleGroup';
import { useCardManagement } from '../../components/cards/hooks/useCardManagement';
import { useAuth } from '../../../contexts/AuthContext';

export default function NotificationSettingsScreen() {
  const { user } = useAuth();
  const { anyRenewalDateSet } = useCardManagement(user?.id);
  const notificationPreferences = useNotificationPreferences();
  const { buildNotificationItems } = notificationPreferences;
  const notificationItems = buildNotificationItems(anyRenewalDateSet);

  return (
    <>
      <Stack.Screen options={{ title: 'Notification Preferences', headerShown: true }} />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.section}>
            {notificationItems.map((itemProps, index) => (
              <ReminderToggleGroup
                key={itemProps.title}
                {...itemProps}
                mode="manage"
                index={index}
                isLastItem={index === notificationItems.length - 1}
              />
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f2f2f7',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  section: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    overflow: 'hidden',
  },
}); 