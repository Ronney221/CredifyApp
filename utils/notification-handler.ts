import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';

interface NotificationData {
  screen: '/(tabs)/03-insights' | string;
  params: {
    cardId?: string;
    showRenewalInfo?: string;
    [key: string]: any;
  };
}

export function setupNotificationHandler() {
  // Handle notification taps
  Notifications.addNotificationResponseReceivedListener((response) => {
    const rawData = response.notification.request.content.data as Record<string, unknown>;
    
    // Validate the data structure
    if (typeof rawData?.screen === 'string' && typeof rawData?.params === 'object' && rawData.params) {
      const data: NotificationData = {
        screen: rawData.screen,
        params: rawData.params as NotificationData['params']
      };
      
      // Handle deep linking
      router.push({
        pathname: '/(tabs)/03-insights' as const,
        params: {
          cardId: data.params?.cardId,
          showRenewalInfo: data.params?.showRenewalInfo
        }
      });
    }
  });

  // Handle notifications received while app is foregrounded
  Notifications.addNotificationReceivedListener((notification) => {
    // You can add custom handling for foreground notifications here
    // For now, we'll let the default handler show them
  });
} 