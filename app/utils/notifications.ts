import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from '../../lib/supabase'; // Corrected path
import { Card, allCards, Benefit } from '../../src/data/card-data'; // Corrected path, removed unused CardPerk
import { getUserCards, getRedemptionsForPeriod } from '../../lib/database';
import { schedulePerkExpiryNotifications } from '../services/notification-perk-expiry';

export interface NotificationPreferences {
  perkExpiryRemindersEnabled: boolean;
  renewalRemindersEnabled: boolean;
  perkResetConfirmationEnabled: boolean;
  weeklyDigestEnabled: boolean;
  quarterlyPerkRemindersEnabled: boolean;
  semiAnnualPerkRemindersEnabled: boolean;
  annualPerkRemindersEnabled: boolean;
  monthlyPerkExpiryReminderDays?: number[];
  quarterlyPerkExpiryReminderDays?: number[];
  semiAnnualPerkExpiryReminderDays?: number[];
  annualPerkExpiryReminderDays?: number[];
  perkExpiryReminderTime?: string;
  renewalReminderDays?: number[];
}

interface UserCard {
  card_name: string;
  renewal_date?: string;
}

// --- Basic Notification Configuration ---

// Tell Expo exactly how to display notifications in the foreground.
Notifications.setNotificationHandler({
  handleNotification: async (): Promise<Notifications.NotificationBehavior> => ({
    shouldShowAlert: true,
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

  console.log(`Scheduling notification: "${title}" for ${date.toLocaleString()}`);
  return Notifications.scheduleNotificationAsync({
    content: { title, body },
    trigger,
  });
};

// Add this function before the sendTestNotification function
export const scheduleCardRenewalNotifications = async (
  userId: string,
  preferences: NotificationPreferences,
  isTest: boolean = false
): Promise<(string | null)[]> => {
  if (!preferences.renewalRemindersEnabled) {
    console.log('[Notifications] Card renewal notifications are disabled.');
    return [];
  }

  try {
    // Fetch user's cards with renewal dates
    const { data: dbUserCards, error: userCardsError } = await getUserCards(userId);
    if (userCardsError) throw userCardsError;
    if (!dbUserCards || dbUserCards.length === 0) {
      console.log('[Notifications] User has no cards, skipping renewal notifications.');
      return [];
    }

    // Filter to cards with renewal dates
    const cardsWithRenewalDates = (dbUserCards as UserCard[]).filter((card) => card.renewal_date);
    if (cardsWithRenewalDates.length === 0) {
      console.log('[Notifications] No cards with renewal dates found.');
      return [];
    }

    const tasks: Promise<string | null>[] = [];

    for (const card of cardsWithRenewalDates) {
      if (!card.renewal_date) continue;

      let notificationDate: Date;
      if (isTest) {
        notificationDate = new Date();
        notificationDate.setSeconds(notificationDate.getSeconds() + 6); // Set 6 seconds from now for test
      } else {
        const renewalDate = new Date(card.renewal_date);
        notificationDate = new Date(renewalDate);
        notificationDate.setDate(renewalDate.getDate() - 7); // 7 days before renewal
        notificationDate.setHours(10, 0, 0, 0); // 10 AM
      }

      if (notificationDate > new Date() || isTest) {
        const title = `💳 Card Renewal Reminder`;
        const body = `${card.card_name} renews in 7 days on ${new Date(card.renewal_date).toLocaleDateString()}.`;
        tasks.push(scheduleNotificationAsync(title, body, notificationDate));
      }
    }

    return Promise.all(tasks);
  } catch (error) {
    console.error('[Notifications] Error scheduling renewal notifications:', error);
    return [];
  }
};

/**
 * Schedules an immediate test notification.
 * @returns {Promise<string>} The ID of the scheduled notification, or an empty string if permissions are denied.
 */
export const sendTestNotification = async (userId: string, preferences: NotificationPreferences): Promise<(string | null)[]> => {
  const hasPermissions = await requestPermissionsAsync();
  if (!hasPermissions) {
    console.warn('[Notifications] Permission not granted for test notification.');
    return [];
  }

  console.log('[Notifications] Sending test notifications for all enabled types.');
  
  const allPromises: Promise<(string | null)[]>[] = [];

  // Monthly
  if (preferences.perkExpiryRemindersEnabled) {
    allPromises.push(schedulePerkExpiryNotifications(userId, preferences, 1, true));
  }
  // Quarterly
  if (preferences.quarterlyPerkRemindersEnabled) {
    allPromises.push(schedulePerkExpiryNotifications(userId, preferences, 3, true));
  }
  // Semi-Annual
  if (preferences.semiAnnualPerkRemindersEnabled) {
    allPromises.push(schedulePerkExpiryNotifications(userId, preferences, 6, true));
  }
  // Annual
  if (preferences.annualPerkRemindersEnabled) {
    allPromises.push(schedulePerkExpiryNotifications(userId, preferences, 12, true));
  }
  // Card Renewal
  if (preferences.renewalRemindersEnabled) {
    allPromises.push(scheduleCardRenewalNotifications(userId, preferences, true));
  }
  // Perk Reset
  if (preferences.perkResetConfirmationEnabled) {
    allPromises.push(Promise.resolve([await schedulePerkResetNotification(userId, preferences)]));
  }

  const results = await Promise.all(allPromises);
  return results.flat();
};

/**
 * Cancels all previously scheduled local notifications for the app.
 */
export const cancelAllScheduledNotificationsAsync = async (): Promise<void> => {
  console.log('Cancelling all scheduled notifications.');
  await Notifications.cancelAllScheduledNotificationsAsync();
};

// --- App-Specific Notification Helpers ---

/**
 * Schedules a renewal reminder notification for a specific card.
 * @param cardName The name of the card.
 * @param renewalDate The renewal date of the card.
 * @param daysBefore The number of days before renewal to send the reminder.
 * @param preferences User's notification preferences.
 */
export const scheduleCardRenewalReminder = async (
  cardName: string,
  renewalDate: Date,
  daysBefore = 7,
  preferences?: NotificationPreferences,
): Promise<string | null> => {
  // Default to true if preferences or specific setting is undefined
  const enabled = preferences?.renewalRemindersEnabled === undefined ? true : preferences.renewalRemindersEnabled;
  if (!enabled) {
    console.log(`[Notifications] Card renewal reminders disabled for ${cardName}.`);
    return null;
  }

  const reminderDate = new Date(renewalDate);
  reminderDate.setDate(renewalDate.getDate() - daysBefore);
  reminderDate.setHours(23, 59, 50, 0); // Set to 11:59:50 PM

  if (reminderDate > new Date()) {
    return scheduleNotificationAsync(
      `💳 Card Renewal Reminder`,
      `${cardName} renews in ${daysBefore} days on ${renewalDate.toLocaleDateString()}.`,
      reminderDate,
    );
  }
  return null;
};

export const schedulePerkResetNotification = async (
  userId: string,
  preferences: NotificationPreferences
): Promise<string | null> => {
  if (!preferences.perkResetConfirmationEnabled) {
    console.log('[Notifications] Perk reset notifications are disabled.');
    return null;
  }

  try {
    // Get the user's cards and their perks
    const { data: dbUserCards, error: userCardsError } = await getUserCards(userId);
    if (userCardsError) throw userCardsError;
    if (!dbUserCards || dbUserCards.length === 0) {
      console.log('[Notifications] User has no cards, skipping perk reset notification.');
      return null;
    }

    // Filter app's card data to just the user's cards
    const userCardSet = new Set(dbUserCards.map((c: UserCard) => c.card_name));
    const currentUserAppCards = allCards.filter((appCard: Card) => userCardSet.has(appCard.name));

    // Calculate total value of perks that will reset
    let totalMonthlyValue = 0;
    let monthlyPerkCount = 0;
    let otherPeriodsResetting = false;

    const now = new Date();
    const isLastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() === now.getDate();
    const isLastDayOfQuarter = isLastDayOfMonth && ((now.getMonth() + 1) % 3 === 0);
    const isLastDayOfHalfYear = isLastDayOfMonth && ((now.getMonth() + 1) % 6 === 0);
    const isLastDayOfYear = isLastDayOfMonth && now.getMonth() === 11;

    currentUserAppCards.forEach((appCard: Card) => {
      appCard.benefits.forEach((benefit: Benefit) => {
        if (benefit.periodMonths === 1) {
          totalMonthlyValue += benefit.value;
          monthlyPerkCount++;
        } else if (
          (benefit.periodMonths === 3 && isLastDayOfQuarter) ||
          (benefit.periodMonths === 6 && isLastDayOfHalfYear) ||
          (benefit.periodMonths === 12 && isLastDayOfYear)
        ) {
          otherPeriodsResetting = true;
        }
      });
    });

    // Schedule notification for tomorrow morning at 9 AM
    const notificationDate = new Date();
    notificationDate.setDate(notificationDate.getDate() + 1);
    notificationDate.setHours(9, 0, 0, 0);

    let title = "🎉 Your Perks Have Reset!";
    let body = `${monthlyPerkCount} monthly perks worth $${totalMonthlyValue.toFixed(0)} are ready to use.`;
    
    if (otherPeriodsResetting) {
      body += " Some quarterly, semi-annual, or annual perks have also reset!";
    }

    return scheduleNotificationAsync(title, body, notificationDate);
  } catch (error) {
    console.error('[Notifications] Error scheduling perk reset notification:', error);
    return null;
  }
}; 