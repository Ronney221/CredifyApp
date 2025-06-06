import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from '../../lib/supabase'; // Corrected path
import { Card, allCards, Benefit, APP_SCHEMES } from '../../src/data/card-data'; // Corrected path, removed unused CardPerk
import { getUserCards, getCurrentMonthRedemptions } from '../../lib/database'; // Corrected path and imported types

export interface NotificationPreferences {
  perkExpiryRemindersEnabled?: boolean;
  renewalRemindersEnabled?: boolean;
  perkResetConfirmationEnabled?: boolean;
  monthlyPerkExpiryReminderDays?: number[]; // New: e.g., [1, 3, 7]
  weeklyDigestEnabled?: boolean;
  quarterlyPerkExpiryReminderDays?: number[];
  semiAnnualPerkExpiryReminderDays?: number[];
  annualPerkExpiryReminderDays?: number[];
}

const generateEngagingText = (
  perkInfo: { perk: Benefit; cardName: string } | null,
  daysBefore: number,
  totalValue: number,
  perkCount: number
) => {
  if (perkInfo) {
    const { perk, cardName } = perkInfo;
    const perkValueString = `$${perk.value.toFixed(0)}`;
    const cardNameShort = cardName.replace('American Express', 'Amex').replace(' (AmEx)', '');
    
    let title = `Don't lose your ${perkValueString} credit!`;
    let body = `Your ${cardNameShort} ${perk.name} credit expires in ${daysBefore} days.`;

    switch (perk.appScheme) {
      case 'uber':
      case 'uberEats':
        body = `Your ${cardNameShort} credit expires soon. Order a coffee or catch a ride! ☕️`;
        break;
      case 'grubhub':
      case 'doordash':
        title = `Your ${perkValueString} food credit is expiring!`;
        body = `Grab some snacks with your ${cardNameShort} credit before it's gone. Chips and a soda, anyone? 🥤`;
        break;
      case 'saks':
        title = `Your ${perkValueString} Saks credit is waiting`;
        body = `Treat yourself with your ${cardNameShort} benefit. A nice gift is just a tap away. 🎁`;
        break;
      default:
        if (perk.name.toLowerCase().includes('dining')) {
          title = `Don't miss your ${perkValueString} dining credit!`;
          body = `Your ${cardNameShort} perk for a tasty meal out expires soon.`;
        } else if (perk.name.toLowerCase().includes('entertainment')) {
          title = `Binge-watching on us!`;
          body = `Your ${perkValueString} entertainment credit from ${cardNameShort} is expiring. Catch up on your favorite shows. 📺`;
        }
        break;
    }
    
    if (daysBefore === 1) {
        title = '🚨 Last Day for Monthly Perks!';
        body = `Today is your last chance to use your ${perkValueString} ${perk.name} from ${cardNameShort}.`;
    }
    
    return { title, body };
  }

  // Fallback for when there's no specific perk to highlight
  const totalValueString = `$${totalValue.toFixed(0)}`;
  const perkCountString = `${perkCount} perk${perkCount > 1 ? 's' : ''}`;
  if (daysBefore === 1) {
    return {
      title: '🚨 Last Day for Monthly Perks!',
      body: `Today is your last chance for ${perkCountString} worth ${totalValueString}!`,
    };
  }
  return {
    title: '✨ Perks Expiring Soon!',
    body: `You have ${perkCountString} worth ${totalValueString} expiring in ${daysBefore} days.`,
  };
};

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
 * Schedules an immediate test notification.
 * @returns {Promise<string>} The ID of the scheduled notification, or an empty string if permissions are denied.
 */
export const sendTestNotification = async (userId: string, preferences: NotificationPreferences): Promise<(string | null)[]> => {
  const hasPermissions = await requestPermissionsAsync();
  if (!hasPermissions) {
    console.warn('[Notifications] Permission not granted for test notification.');
    return []; 
  }

  console.log('[Notifications] Sending a test notification for perk expiry.');
  return scheduleMonthlyPerkResetNotifications(userId, preferences, true);
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
export const scheduleMonthlyPerkResetNotifications = async (userId?: string, preferences?: NotificationPreferences, isTest: boolean = false): Promise<(string | null)[]> => {
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
  let mostExpensiveAvailablePerk: { name: string; value: number; cardName: string } | null = null;

  if (userId && expiryRemindersEnabled) {
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
        allMonthlyPerksRedeemed = false; 
      } else {
          const userCardSet = new Set(dbUserCards.map((c: any) => c.card_name));
          const currentUserAppCards: Card[] = allCards.filter((appCard: Card) => userCardSet.has(appCard.name));

          const { data: currentRedemptions, error: redemptionError } = await getCurrentMonthRedemptions(userId);
          if (redemptionError) throw redemptionError;
          const redeemedPerkDefIds = new Set(currentRedemptions?.map((r: any) => r.perk_id) || []);

          let currentMostExpensiveValue = 0;

          currentUserAppCards.forEach((appCard: Card) => {
            appCard.benefits.forEach((benefit: Benefit) => {
              if (benefit.periodMonths === 1) {
                const definition = monthlyPerkDefinitions.find((def: { id: string; name: string; value: number}) => def.id === benefit.definition_id);
                if (definition && !redeemedPerkDefIds.has(definition.id)) {
                  totalAvailableValue += benefit.value;
                  availablePerksCount++;
                  allMonthlyPerksRedeemed = false;
                  if (benefit.value > currentMostExpensiveValue) {
                    currentMostExpensiveValue = benefit.value;
                    mostExpensiveAvailablePerk = { name: definition.name, value: benefit.value, cardName: appCard.name };
                  }
                }
              }
            });
          });
          
          let logMessage = `[Notifications] User ${userId}: ${availablePerksCount} monthly perks available, total $${totalAvailableValue.toFixed(0)}.`;
          if (mostExpensiveAvailablePerk) {
            logMessage += ` Most expensive: ${mostExpensiveAvailablePerk.name} ($${mostExpensiveAvailablePerk.value.toFixed(0)}) from ${mostExpensiveAvailablePerk.cardName}`;
          }
          console.log(logMessage);
      }
    } catch (error) {
      console.error('[Notifications] Error fetching data for personalized notifications:', error);
      totalAvailableValue = 0; 
      availablePerksCount = 0; 
      allMonthlyPerksRedeemed = false; 
      mostExpensiveAvailablePerk = null;
    }
  }

  if (expiryRemindersEnabled && (!allMonthlyPerksRedeemed || !userId)) { 
    reminderDays.forEach((daysBefore, index) => {
      if (daysBefore <= 0) return; 

      let reminderDate: Date;
      if (isTest) {
        reminderDate = new Date();
        reminderDate.setSeconds(now.getSeconds() + (index + 1) * 3); // Stagger tests
      } else {
        reminderDate = new Date(endOfMonth);
        reminderDate.setDate(endOfMonth.getDate() - daysBefore);
        reminderDate.setHours(23, 59, 50, 0); 
      }

      if (reminderDate > now || isTest) {
        let body = '';
        let title = '';

        const totalValueString = `$${totalAvailableValue.toFixed(0)}`;
        const perkCountString = `${availablePerksCount} perk${availablePerksCount > 1 ? 's' : ''}`;

        if (daysBefore === 1) {
            title = '🚨 Last Day for Monthly Perks!';
            if (totalAvailableValue > 0 && availablePerksCount > 0) {
                body = `Today is your last chance for ${perkCountString} worth ${totalValueString}!`;
                if (mostExpensiveAvailablePerk && mostExpensiveAvailablePerk.value > 0) {
                    body += ` Don't miss your $${mostExpensiveAvailablePerk.value.toFixed(0)} ${mostExpensiveAvailablePerk.name} credit from your ${mostExpensiveAvailablePerk.cardName}.`;
                }
            } else {
                body = `Today is the last day to use your monthly credits.`;
            }
        } else {
            title = availablePerksCount > 0 ? '✨ Perks Expiring Soon!' : '🗓️ Monthly Credits Expiring';
            if (totalAvailableValue > 0 && availablePerksCount > 0) {
                body = `You have ${perkCountString} worth ${totalValueString} expiring in ${daysBefore} days.`;
                if (mostExpensiveAvailablePerk && mostExpensiveAvailablePerk.value > 0) {
                    body += ` Key perk: $${mostExpensiveAvailablePerk.value.toFixed(0)} ${mostExpensiveAvailablePerk.name} from your ${mostExpensiveAvailablePerk.cardName}.`;
                }
            } else {
                body = `About ${daysBefore} days left to use your monthly credits.`;
            }
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

  // Schedule weekly digest
  const weeklyDigestEnabled = preferences?.weeklyDigestEnabled === undefined ? true : preferences.weeklyDigestEnabled;
  if (startOfNext > now && weeklyDigestEnabled) {
      const weeklyDigestDate = new Date(startOfNext);
      weeklyDigestDate.setDate(weeklyDigestDate.getDate() + 6); // First Saturday of the month
      weeklyDigestDate.setHours(18, 0, 0, 0); // 6 PM
      
      if (weeklyDigestDate > now) {
          tasks.push(
              scheduleNotificationAsync(
                  '📈 Your Weekly Digest',
                  'A summary of your perks and benefits is ready.',
                  weeklyDigestDate,
              ),
          );
      }
  }

  return Promise.all(tasks);
}; 