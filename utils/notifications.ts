//app/utils/notifications.ts
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import { Card, allCards, Benefit } from '../src/data/card-data';
import { getUserCards } from '../lib/database';
import { NotificationPreferences } from '../app/types/notification-types';
import { scheduleNotificationAsync } from '../app/utils/notification-scheduler';

interface UserCard {
  card_name: string;
  renewal_date?: string;
}

Notifications.setNotificationHandler({
  handleNotification: async (): Promise<Notifications.NotificationBehavior> => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function getNotificationPermissions(): Promise<boolean> {
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

export const scheduleCardRenewalNotifications = async (
  userId: string,
  preferences: NotificationPreferences,
  isTest: boolean = false
): Promise<(string | null)[]> => {
  if (!preferences.renewalRemindersEnabled) {
    return [];
  }
  try {
    const { data: dbUserCards, error: userCardsError } = await getUserCards(userId);
    if (userCardsError) throw userCardsError;
    if (!dbUserCards || dbUserCards.length === 0) {
      return [];
    }
    const cardsWithRenewalDates = (dbUserCards as UserCard[]).filter((card) => card.renewal_date);
    if (cardsWithRenewalDates.length === 0) {
      return [];
    }
    const tasks: Promise<string | null>[] = [];
    for (const card of cardsWithRenewalDates) {
      if (!card.renewal_date) continue;
      let notificationDate: Date;
      if (isTest) {
        notificationDate = new Date();
        notificationDate.setSeconds(notificationDate.getSeconds() + 10);
      } else {
        const renewalDate = new Date(card.renewal_date);
        notificationDate = new Date(renewalDate);
        notificationDate.setDate(renewalDate.getDate() - 7);
        notificationDate.setHours(10, 0, 0, 0);
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

export const sendTestNotification = async (userId: string, preferences: NotificationPreferences): Promise<(string | null)[]> => {
  const isGranted = await getNotificationPermissions();
  if (!isGranted) {
    return [];
  }
  const allPromises: Promise<(string | null)[]>[] = [];
  if (preferences.renewalRemindersEnabled) {
    allPromises.push(scheduleCardRenewalNotifications(userId, preferences, true));
  }
  if (preferences.perkResetConfirmationEnabled) {
    allPromises.push(Promise.resolve([await schedulePerkResetNotification(userId, preferences)]));
  }
  const results = await Promise.all(allPromises);
  return results.flat();
};

export const cancelNotification = async (): Promise<void> => {
  await Notifications.cancelAllScheduledNotificationsAsync();
};

export const scheduleCardRenewalReminder = async (
  cardName: string,
  renewalDate: Date,
  daysBefore = 7,
  preferences?: NotificationPreferences,
): Promise<string | null> => {
  const enabled = preferences?.renewalRemindersEnabled === undefined ? true : preferences.renewalRemindersEnabled;
  if (!enabled) {
    return null;
  }
  const reminderDate = new Date(renewalDate);
  reminderDate.setDate(renewalDate.getDate() - daysBefore);
  reminderDate.setHours(23, 59, 50, 0);
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
    return null;
  }
  try {
    const { data: dbUserCards, error: userCardsError } = await getUserCards(userId);
    if (userCardsError) throw userCardsError;
    if (!dbUserCards || dbUserCards.length === 0) {
      return null;
    }
    const userCardSet = new Set(dbUserCards.map((c: UserCard) => c.card_name));
    const currentUserAppCards = allCards.filter((appCard: Card) => userCardSet.has(appCard.name));
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
    const notificationDate = new Date();
    notificationDate.setDate(notificationDate.getDate() + 1);
    notificationDate.setHours(9, 0, 0, 0);
    let title = "🎉 Your Perks Have Reset!";
    let body = `Your monthly perks, worth over $${totalMonthlyValue}, are now available.`;
    if (otherPeriodsResetting) {
      body += " Some quarterly/annual perks have also reset.";
    }
    if (monthlyPerkCount > 0) {
      return scheduleNotificationAsync(title, body, notificationDate);
    }
    return null;
  } catch (error) {
    console.error('[Notifications] Error scheduling perk reset notification:', error);
    return null;
  }
}; 