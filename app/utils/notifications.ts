import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from '../../lib/supabase'; // Corrected path
import { Card, allCards, Benefit } from '../../src/data/card-data'; // Corrected path, removed unused CardPerk
import { getUserCards, getCurrentMonthRedemptions } from '../../lib/database'; // Corrected path and imported types

export interface NotificationPreferences {
  perkExpiryRemindersEnabled?: boolean;
  renewalRemindersEnabled?: boolean;
  perkResetConfirmationEnabled?: boolean;
  monthlyPerkExpiryReminderDays?: number[]; // New: e.g., [1, 3, 7]
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

/**
 * Schedules notifications related to monthly perk resets.
 * - 7 days before end of month
 * - 3 days before end of month
 * - On the 1st of the next month
 * @param userId The ID of the user to fetch perk data for.
 * @param preferences User's notification preferences.
 */
export const scheduleMonthlyPerkResetNotifications = async (userId?: string, preferences?: NotificationPreferences): Promise<(string | null)[]> => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  const endOfMonth = new Date(year, month + 1, 0);
  const startOfNext = new Date(year, month + 1, 1);
  startOfNext.setHours(23, 59, 50, 0); // Set to 11:59:50 PM

  const tasks: Promise<string | null>[] = [];

  const expiryRemindersEnabled = preferences?.perkExpiryRemindersEnabled === undefined ? true : preferences.perkExpiryRemindersEnabled;
  const resetConfirmationEnabled = preferences?.perkResetConfirmationEnabled === undefined ? true : preferences.perkResetConfirmationEnabled;
  // Use provided reminder days or default to [3, 7]
  const reminderDays = preferences?.monthlyPerkExpiryReminderDays && preferences.monthlyPerkExpiryReminderDays.length > 0 
                       ? preferences.monthlyPerkExpiryReminderDays 
                       : [3, 7];

  let totalAvailableValue = 0;
  let availablePerksCount = 0;
  let allMonthlyPerksRedeemed = true;

  if (userId && expiryRemindersEnabled) { // Only fetch data if reminders are enabled and userId is present
    try {
      console.log(`[Notifications] Fetching data for user ${userId} for monthly perk reminders.`);
      const { data: monthlyPerkDefinitions, error: perkDefError } = await supabase
        .from('perk_definitions')
        .select('id, name, value')
        .eq('period_months', 1);

      if (perkDefError) throw perkDefError;
      if (!monthlyPerkDefinitions) throw new Error('No monthly perk definitions found');

      const { data: dbUserCards, error: userCardsError } = await getUserCards(userId);
      if (userCardsError) throw userCardsError;
      
      if (!dbUserCards || dbUserCards.length === 0) {
        console.log('[Notifications] User has no cards, skipping custom perk value in notifications.');
        allMonthlyPerksRedeemed = false; // Assume something could be available if we don't know card details
      } else {
          const userCardSet = new Set(dbUserCards.map((c: any) => c.card_name));
          const currentUserAppCards: Card[] = allCards.filter((appCard: Card) => userCardSet.has(appCard.name));

          const { data: currentRedemptions, error: redemptionError } = await getCurrentMonthRedemptions(userId);
          if (redemptionError) throw redemptionError;
          const redeemedPerkDefIds = new Set(currentRedemptions?.map((r: any) => r.perk_id) || []);

          currentUserAppCards.forEach((appCard: Card) => {
            appCard.benefits.forEach((benefit: Benefit) => {
              if (benefit.periodMonths === 1) {
                const definition = monthlyPerkDefinitions.find((def: { id: string; name: string; value: number}) => def.id === benefit.definition_id);
                if (definition && !redeemedPerkDefIds.has(definition.id)) {
                  totalAvailableValue += benefit.value;
                  availablePerksCount++;
                  allMonthlyPerksRedeemed = false;
                }
              }
            });
          });
          console.log(`[Notifications] User ${userId}: ${availablePerksCount} monthly perks available, total value $${totalAvailableValue.toFixed(0)}. All redeemed: ${allMonthlyPerksRedeemed}`);
      }
    } catch (error) {
      console.error('[Notifications] Error fetching data for personalized notifications:', error);
      totalAvailableValue = 0; 
      availablePerksCount = 0; 
      allMonthlyPerksRedeemed = false; // Fallback: assume not all redeemed to send generic reminder
    }
  }

  if (expiryRemindersEnabled && (!allMonthlyPerksRedeemed || !userId)) { // Send if not all redeemed, or if no user ID (generic)
    reminderDays.forEach(daysBefore => {
      if (daysBefore <= 0) return; // Skip invalid day numbers

      const reminderDate = new Date(endOfMonth);
      reminderDate.setDate(endOfMonth.getDate() - daysBefore);
      reminderDate.setHours(23, 59, 50, 0); // Set to 11:59:50 PM

      if (reminderDate > now) {
        let body = '';
        let title = '';

        if (daysBefore === 1) {
            title = '🚨 Last Day for Monthly Perks!';
            body = totalAvailableValue > 0 && availablePerksCount > 0
            ? `Today's your last chance for $${totalAvailableValue.toFixed(0)} in monthly perks! (${availablePerksCount} perk${availablePerksCount > 1 ? 's' : ''})`
            : `Today is the last day to use your monthly credits.`;
        } else {
            title = availablePerksCount > 0 ? '✨ Perks Expiring Soon!' : '🗓️ Monthly Credits Expiring';
            body = totalAvailableValue > 0 && availablePerksCount > 0
            ? `You have ${availablePerksCount} monthly perk${availablePerksCount > 1 ? 's' : ''} worth $${totalAvailableValue.toFixed(0)} expiring in ${daysBefore} days!`
            : `About ${daysBefore} days left to use your monthly credits.`;
        }
        
        tasks.push(
          scheduleNotificationAsync(
            title,
            body,
            reminderDate,
          ),
        );
      }
    });
  }

  if (startOfNext > now && resetConfirmationEnabled) {
    tasks.push(
      scheduleNotificationAsync(
        '🎉 New Month, New Perks!',
        `Your monthly credits have reset.`,
        startOfNext,
      ),
    );
  }

  return Promise.all(tasks);
}; 