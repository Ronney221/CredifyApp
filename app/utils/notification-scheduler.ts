import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export const scheduleNotificationAsync = async (
  title: string,
  body: string,
  date: Date,
): Promise<string> => {
  const trigger: Notifications.NotificationTriggerInput = {
    type: Notifications.SchedulableTriggerInputTypes.DATE,
    date,
    ...(Platform.OS === 'android' ? { channelId: 'default' } : {}),
  };

  console.log(`Scheduling notification: "${title}" for ${date.toLocaleString()}. Current time is ${new Date().toLocaleString()}`);
  return Notifications.scheduleNotificationAsync({
    content: { title, body },
    trigger,
  });
}; 