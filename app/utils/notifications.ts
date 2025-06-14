import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from '../../lib/supabase'; // Corrected path
import { Card, allCards, Benefit } from '../../src/data/card-data'; // Corrected path, removed unused CardPerk
import { getUserCards, getRedemptionsForPeriod } from '../../lib/database';

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

interface PerkDefinition {
  id: string;
  name: string;
  value: number;
}

interface ExpensivePerk {
  name: string;
  value: number;
  cardName: string;
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

const getPeriodBoundaries = (periodMonths: number, now: Date): { start: Date, end: Date } => {
  const year = now.getFullYear();
  const month = now.getMonth();
  
  switch (periodMonths) {
    case 1: // Monthly
      return {
        start: new Date(year, month, 1),
        end: new Date(year, month + 1, 0)
      };
    case 3: // Quarterly
      const quarter = Math.floor(month / 3);
      return {
        start: new Date(year, quarter * 3, 1),
        end: new Date(year, quarter * 3 + 3, 0)
      };
    case 6: // Semi-Annual
      const semiAnnual = Math.floor(month / 6);
      return {
        start: new Date(year, semiAnnual * 6, 1),
        end: new Date(year, semiAnnual * 6 + 6, 0)
      };
    case 12: // Annual
      return {
        start: new Date(year, 0, 1),
        end: new Date(year, 11, 31)
      };
    default:
      // Fallback to monthly for unknown periods
      return {
        start: new Date(year, month, 1),
        end: new Date(year, month + 1, 0)
      };
  }
};

const getSmartReminderDays = (periodMonths: number): number[] => {
  switch (periodMonths) {
    case 1:  // Monthly
      return [1, 3, 7];  // Remind 1, 3, and 7 days before end of month
    case 3:  // Quarterly
      return [7, 14];    // Remind 7 and 14 days before end of quarter
    case 6:  // Semi-Annual
      return [14, 30];   // Remind 14 and 30 days before end of period
    case 12: // Annual
      return [30, 60];   // Remind 30 and 60 days before end of year
    default:
      return [7];        // Default to 7 days for unknown periods
  }
};

export const schedulePerkExpiryNotifications = async (
  userId: string, 
  preferences: NotificationPreferences, 
  periodMonths: number,
  isTest: boolean = false
): Promise<(string | null)[]> => {
  const now = new Date();
  const { start, end: endOfPeriod } = getPeriodBoundaries(periodMonths, now);
  
  // Check if reminders are enabled for this period
  let isEnabled = false;
  switch (periodMonths) {
    case 1:
      isEnabled = preferences.perkExpiryRemindersEnabled;
      break;
    case 3:
      isEnabled = preferences.quarterlyPerkRemindersEnabled;
      break;
    case 6:
      isEnabled = preferences.semiAnnualPerkRemindersEnabled;
      break;
    case 12:
      isEnabled = preferences.annualPerkRemindersEnabled;
      break;
  }

  if (!isEnabled && !isTest) {
    console.log(`[Notifications] ${periodMonths}-month reminders are disabled.`);
    return [];
  }
  
  let totalAvailableValue = 0;
  let availablePerksCount = 0;
  let allPerksRedeemed = true;
  let mostExpensiveAvailablePerk: ExpensivePerk | null = null;
  
  try {
    console.log(`[Notifications] Fetching data for user ${userId} for ${periodMonths}-month perk reminders.`);
    
    // 1. Fetch user's cards
    const { data: dbUserCards, error: userCardsError } = await getUserCards(userId);
    if (userCardsError) throw userCardsError;
    if (!dbUserCards || dbUserCards.length === 0) {
      console.log('[Notifications] User has no cards, skipping custom perk value in notifications.');
      return [];
    }
    
    // 2. Filter app's card data to just the user's cards
    const userCardSet = new Set(dbUserCards.map((c: UserCard) => c.card_name));
    const currentUserAppCards = allCards.filter((appCard: Card) => userCardSet.has(appCard.name));
    const userPerkDefinitionIds = currentUserAppCards
      .flatMap(card => card.benefits)
      .filter(benefit => benefit.periodMonths === periodMonths)
      .map(benefit => benefit.definition_id);

    if (userPerkDefinitionIds.length === 0) {
        console.log(`[Notifications] User has no cards with perks for period ${periodMonths}.`);
        return [];
    }

    // 3. Fetch perk definitions for the relevant period
    const { data: perkDefinitions, error: perkDefError } = await supabase
      .from('perk_definitions')
      .select('id, name, value')
      .in('id', userPerkDefinitionIds)
      .returns<PerkDefinition[]>();
    if (perkDefError) throw perkDefError;
    if (!perkDefinitions) throw new Error(`No perk definitions found for period ${periodMonths}`);
    
    // 4. Fetch redemptions for the current period
    const { data: periodRedemptions, error: redemptionError } = await getRedemptionsForPeriod(userId, start, endOfPeriod);
    if (redemptionError) throw redemptionError;
    const redeemedPerkDefIds = new Set(periodRedemptions?.map((r: { perk_id: string }) => r.perk_id) || []);
    
    // 5. Calculate available perks
    let currentMostExpensiveValue = 0;
    currentUserAppCards.forEach((appCard: Card) => {
      appCard.benefits.forEach((benefit: Benefit) => {
        if (benefit.periodMonths === periodMonths) {
          const definition = perkDefinitions.find(def => def.id === benefit.definition_id);
          if (definition && !redeemedPerkDefIds.has(definition.id)) {
            totalAvailableValue += benefit.value;
            availablePerksCount++;
            allPerksRedeemed = false;
            if (benefit.value > currentMostExpensiveValue) {
              currentMostExpensiveValue = benefit.value;
              mostExpensiveAvailablePerk = {
                name: definition.name,
                value: benefit.value,
                cardName: appCard.name
              };
            }
          }
        }
      });
    });

    let logMessage = `[Notifications] User ${userId} (${periodMonths}-month): ${availablePerksCount} perks available, total $${totalAvailableValue.toFixed(0)}.`;
    if (mostExpensiveAvailablePerk) {
      logMessage += ` Most expensive: ${mostExpensiveAvailablePerk.name} ($${mostExpensiveAvailablePerk.value.toFixed(0)}) from ${mostExpensiveAvailablePerk.cardName}`;
    }
    console.log(logMessage);

  } catch (error) {
    console.error(`[Notifications] Error fetching data for ${periodMonths}-month personalized notifications:`, error);
    // Reset values to not send misleading notifications
    totalAvailableValue = 0;
    availablePerksCount = 0;
    allPerksRedeemed = true;
    mostExpensiveAvailablePerk = null;
  }
  
  if (allPerksRedeemed) {
    console.log(`[Notifications] All perks for period ${periodMonths} already redeemed.`);
    return [];
  }

  // Use smart reminder days instead of preferences
  const reminderDays = getSmartReminderDays(periodMonths);
  const tasks: Promise<string | null>[] = [];

  reminderDays.forEach((daysBefore, index) => {
    if (daysBefore <= 0) return;

    let reminderDate: Date;
    if (isTest) {
      reminderDate = new Date();
      // Stagger tests to avoid all notifications firing at the exact same second
      const baseDelay = periodMonths === 1 ? 2 : (periodMonths === 3 ? 4 : (periodMonths === 6 ? 6 : 8));
      reminderDate.setSeconds(now.getSeconds() + baseDelay + index * 2);
    } else {
      reminderDate = new Date(endOfPeriod);
      reminderDate.setDate(endOfPeriod.getDate() - (daysBefore - 1));
      reminderDate.setHours(10, 0, 0, 0); // 10 AM
    }
    
    if (reminderDate > now || isTest) {
      const periodName = periodMonths === 1 ? 'Monthly' : (periodMonths === 3 ? 'Quarterly' : (periodMonths === 6 ? 'Semi-Annual' : 'Annual'));
      const totalValueString = `$${totalAvailableValue.toFixed(0)}`;
      const perkCountString = `${availablePerksCount} perk${availablePerksCount > 1 ? 's' : ''}`;
      
      let title = `✨ ${periodName} Perks Expiring Soon!`;
      let body = `You have ${perkCountString} worth ${totalValueString} expiring in ${daysBefore} days.`;

      if (mostExpensiveAvailablePerk) {
        body += ` Don't miss the $${mostExpensiveAvailablePerk.value.toFixed(0)} ${mostExpensiveAvailablePerk.name} credit!`;
      }
      
      tasks.push(
        scheduleNotificationAsync(title, body, reminderDate)
      );
    }
  });

  return Promise.all(tasks);
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