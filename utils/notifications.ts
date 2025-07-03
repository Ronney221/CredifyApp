//app/utils/notifications.ts
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import { Card, allCards, Benefit } from '../src/data/card-data';
import { getUserCards } from '../lib/database';
import { NotificationPreferences } from '../types/notification-types';
import { scheduleNotificationAsync } from './notification-scheduler';

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

  // Default reminder days if not specified
  const reminderDays = preferences.renewalReminderDays || [90, 30, 7, 1];
  
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

      for (const daysBeforeRenewal of reminderDays) {
        let notificationDate: Date;
        
        if (isTest) {
          notificationDate = new Date();
          notificationDate.setSeconds(notificationDate.getSeconds() + 10);
        } else {
          const renewalDate = new Date(card.renewal_date);
          notificationDate = new Date(renewalDate);
          notificationDate.setDate(renewalDate.getDate() - daysBeforeRenewal);
          
          // Set notification time (default to 10 AM if not specified)
          const [hours, minutes] = (preferences.renewalReminderTime || '10:00').split(':').map(Number);
          notificationDate.setHours(hours || 10, minutes || 0, 0, 0);
        }

        if (notificationDate > new Date() || isTest) {
          const renewalDate = new Date(card.renewal_date);
          const title = generateRenewalTitle(daysBeforeRenewal);
          const body = generateRenewalBody(card.card_name, renewalDate, daysBeforeRenewal);
          tasks.push(scheduleNotificationAsync(title, body, notificationDate));
        }
      }
    }
    return Promise.all(tasks);
  } catch (error) {
    console.error('[Notifications] Error scheduling renewal notifications:', error);
    return [];
  }
};

function generateRenewalTitle(daysBeforeRenewal: number): string {
  switch (daysBeforeRenewal) {
    case 90:
      return "💳 Card Renewal Planning";
    case 30:
      return "💳 Card Renewal Coming Up";
    case 7:
      return "💳 Card Renewal Next Week";
    case 1:
      return "⚠️ Card Renewal Tomorrow";
    default:
      return "💳 Card Renewal Reminder";
  }
}

function generateRenewalBody(cardName: string, renewalDate: Date, daysBeforeRenewal: number): string {
  const formattedDate = renewalDate.toLocaleDateString();
  
  switch (daysBeforeRenewal) {
    case 90:
      return `Your ${cardName} will renew on ${formattedDate}. Start planning if you want to keep, cancel, or upgrade this card.`;
    case 30:
      return `${cardName} renews in 30 days on ${formattedDate}. Review your card benefits and decide if it's worth keeping.`;
    case 7:
      return `${cardName} renews next week on ${formattedDate}. Make sure you've maximized your card benefits before renewal.`;
    case 1:
      return `Important: ${cardName} renews tomorrow on ${formattedDate}. Last chance to decide if you want to keep or cancel the card.`;
    default:
      return `${cardName} renews in ${daysBeforeRenewal} days on ${formattedDate}. Review your card benefits and usage.`;
  }
}

export const scheduleFirstOfMonthReminder = async (
  userId: string,
  preferences: NotificationPreferences,
  isTest: boolean = false
): Promise<string | null> => {
  if (!preferences.firstOfMonthRemindersEnabled) {
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

    // Calculate total value of monthly perks
    let totalMonthlyValue = 0;
    let monthlyPerkCount = 0;

    currentUserAppCards.forEach((appCard: Card) => {
      appCard.benefits.forEach((benefit: Benefit) => {
        if (benefit.periodMonths === 1) {
          totalMonthlyValue += benefit.value;
          monthlyPerkCount++;
        }
      });
    });

    if (monthlyPerkCount === 0) {
      return null;
    }

    // Schedule for 9 AM on the first of next month
    const now = new Date();
    const notificationDate = isTest 
      ? new Date(now.getTime() + 10000) // 10 seconds for testing
      : new Date(now.getFullYear(), now.getMonth() + 1, 1, 9, 0, 0, 0);

    const title = "🎉 New Month, Fresh Benefits!";
    const body = `Your monthly perks worth $${totalMonthlyValue} have reset. Start the month right by planning how to use your benefits!`;

    return scheduleNotificationAsync(title, body, notificationDate);
  } catch (error) {
    console.error('[Notifications] Error scheduling first of month reminder:', error);
    return null;
  }
};

export const sendTestNotification = async (userId: string, preferences: NotificationPreferences): Promise<(string | null)[]> => {
  const isGranted = await getNotificationPermissions();
  if (!isGranted) {
    return [];
  }

  const allPromises: Promise<(string | null)[]>[] = [];

  // Test card renewal notifications
  if (preferences.renewalRemindersEnabled) {
    allPromises.push(scheduleCardRenewalNotifications(userId, preferences, true));
  }

  // Test first of month reminder
  if (preferences.firstOfMonthRemindersEnabled) {
    allPromises.push(Promise.resolve([await scheduleFirstOfMonthReminder(userId, preferences, true)]));
  }

  // Test perk reset notifications (if enabled)
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

    // Group perks by their reset period
    const perksByPeriod: Record<number, { totalValue: number, count: number, perks: string[] }> = {
      1: { totalValue: 0, count: 0, perks: [] },   // Monthly
      3: { totalValue: 0, count: 0, perks: [] },   // Quarterly
      6: { totalValue: 0, count: 0, perks: [] },   // Semi-annual
      12: { totalValue: 0, count: 0, perks: [] },  // Annual
    };

    const now = new Date();
    const isLastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() === now.getDate();
    const isLastDayOfQuarter = isLastDayOfMonth && ((now.getMonth() + 1) % 3 === 0);
    const isLastDayOfHalfYear = isLastDayOfMonth && ((now.getMonth() + 1) % 6 === 0);
    const isLastDayOfYear = isLastDayOfMonth && now.getMonth() === 11;

    currentUserAppCards.forEach((appCard: Card) => {
      appCard.benefits.forEach((benefit: Benefit) => {
        const shouldInclude = 
          (benefit.periodMonths === 1) ||
          (benefit.periodMonths === 3 && isLastDayOfQuarter) ||
          (benefit.periodMonths === 6 && isLastDayOfHalfYear) ||
          (benefit.periodMonths === 12 && isLastDayOfYear);

        if (shouldInclude) {
          const period = perksByPeriod[benefit.periodMonths];
          period.totalValue += benefit.value;
          period.count++;
          period.perks.push(benefit.name);
        }
      });
    });

    // Prepare notification for tomorrow at 9 AM
    const notificationDate = new Date();
    notificationDate.setDate(notificationDate.getDate() + 1);
    notificationDate.setHours(9, 0, 0, 0);

    // Generate notification content based on which perks are resetting
    const resettingPeriods = Object.entries(perksByPeriod)
      .filter(([_, data]) => data.count > 0)
      .map(([period, data]) => ({
        period: Number(period),
        ...data
      }));

    if (resettingPeriods.length === 0) {
      return null;
    }

    const { title, body } = generatePerkResetMessage(resettingPeriods);
    return scheduleNotificationAsync(title, body, notificationDate);

  } catch (error) {
    console.error('[Notifications] Error scheduling perk reset notification:', error);
    return null;
  }
};

interface ResettingPeriod {
  period: number;
  totalValue: number;
  count: number;
  perks: string[];
}

function generatePerkResetMessage(resettingPeriods: ResettingPeriod[]): { title: string; body: string } {
  const periodNames: Record<number, string> = {
    1: 'monthly',
    3: 'quarterly',
    6: 'semi-annual',
    12: 'annual'
  };

  // Sort by period (monthly first, then quarterly, etc.)
  resettingPeriods.sort((a, b) => a.period - b.period);

  // If only one period type is resetting
  if (resettingPeriods.length === 1) {
    const period = resettingPeriods[0];
    const periodName = periodNames[period.period];
    
    if (period.count === 1) {
      return {
        title: `🎉 Your ${period.perks[0]} Benefit Has Reset!`,
        body: `Your ${periodName} ${period.perks[0]} credit worth $${period.totalValue} is now available. Time to start using your benefits!`
      };
    }
    
    return {
      title: `🎉 Your ${periodName.charAt(0).toUpperCase() + periodName.slice(1)} Benefits Have Reset!`,
      body: `${period.count} ${periodName} perks worth $${period.totalValue} total are now available. Check them out!`
    };
  }

  // If multiple periods are resetting
  const totalValue = resettingPeriods.reduce((sum, p) => sum + p.totalValue, 0);
  const totalCount = resettingPeriods.reduce((sum, p) => sum + p.count, 0);
  
  const periodSummaries = resettingPeriods
    .map(p => `${p.count} ${periodNames[p.period]}`)
    .join(', ');

  return {
    title: `🎉 Multiple Benefits Have Reset!`,
    body: `${totalCount} perks (${periodSummaries}) worth $${totalValue} total have reset. Start the period fresh with your new benefits!`
  };
} 