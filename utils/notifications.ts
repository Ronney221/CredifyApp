//app/utils/notifications.ts
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// --- Basic Notification Configuration ---

// Tell Expo exactly how to display notifications in the foreground.
Notifications.setNotificationHandler({
  handleNotification: async (): Promise<Notifications.NotificationBehavior> => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,    // new in recent versions
    shouldShowList: true,      // new in recent versions
  }),
});

// --- Permission Handling ---

/**
 * Requests permission from the user to send notifications.
 * @returns {Promise<boolean>} True if permission granted, false otherwise.
 */
export const requestPermissionsAsync = async (): Promise<boolean> => {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
};

// --- Scheduling and Canceling ---

/**
 * Schedules a local notification.
 * @param title The title of the notification.
 * @param body The body/message of the notification.
 * @param date The Date object when the notification should trigger.
 * @returns {Promise<string>} The ID of the scheduled notification.
 */
export const scheduleNotificationAsync = async (
  title: string,
  body: string,
  date: Date,
): Promise<string> => {
  // Build a trigger that Expo expects exactly
  const trigger: Notifications.NotificationTriggerInput = {
    type: Notifications.SchedulableTriggerInputTypes.DATE,
    date,                           // when to fire
    ...(Platform.OS === 'android'
      ? { channelId: 'default' }    // ensure Android channel
      : {}),
  };

  console.log(`Scheduling notification: "${title}" for ${date.toLocaleString()}. Current time is ${new Date().toLocaleString()}`);
  return Notifications.scheduleNotificationAsync({
    content: { title, body },
    trigger,
  });
};

/**
 * Cancels all previously scheduled local notifications for the app.
 */
export const cancelAllScheduledNotificationsAsync = async (): Promise<void> => {
  console.log('Cancelling all scheduled notifications.');
  await Notifications.cancelAllScheduledNotificationsAsync();
}; 