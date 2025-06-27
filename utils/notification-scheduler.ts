import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export const requestNotificationPermissions = async (): Promise<boolean> => {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.log('Failed to get notification permissions');
      return false;
    }
    return true;
  } catch (error) {
    console.error('Error requesting notification permissions:', error);
    return false;
  }
};

export const scheduleNotificationAsync = async (
  title: string,
  body: string,
  date: Date,
): Promise<string | null> => {
  try {
    // Check if we have permission first
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      console.log('No notification permission, skipping schedule');
      return null;
    }

    // Ensure the notification date is in the future
    if (date.getTime() <= Date.now()) {
      console.log('Notification date is in the past, skipping schedule');
      return null;
    }

    const trigger: Notifications.NotificationTriggerInput = {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date,
      ...(Platform.OS === 'android' ? { channelId: 'default' } : {}),
    };

    console.log(`Scheduling notification: "${title}" for ${date.toLocaleString()}. Current time is ${new Date().toLocaleString()}`);
    
    // Create notification channel for Android
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    return await Notifications.scheduleNotificationAsync({
      content: { title, body },
      trigger,
    });
  } catch (error) {
    console.error('Error scheduling notification:', error);
    return null;
  }
}; 