//app/utils/notifications.ts
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import { Card, Benefit } from '../src/data/card-data';
import { CardService } from '../lib/card-service';
import { getUserCards } from '../lib/database';
import { NotificationPreferences } from '../types/notification-types';
import { scheduleNotificationAsync } from './notification-scheduler';
import { generateDummyInsightsData, CardROI } from '../src/data/dummy-insights';

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
          
          const [hours, minutes] = (preferences.renewalReminderTime || '10:00').split(':').map(Number);
          notificationDate.setHours(hours || 10, minutes || 0, 0, 0);
        }

        if (notificationDate > new Date() || isTest) {
          const renewalDate = new Date(card.renewal_date);
          const title = generateRenewalTitle(daysBeforeRenewal);
          const { body, data } = await generateRenewalBody(card.card_name, renewalDate, daysBeforeRenewal);
          tasks.push(scheduleNotificationAsync(title, body, notificationDate, data));
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
      return "💳 Card Review Time";
    case 30:
      return "💳 Annual Fee Coming Up";
    case 7:
      return "💳 Annual Fee Next Week";
    case 1:
      return "⚠️ Annual Fee Tomorrow";
    default:
      return "💳 Annual Fee Reminder";
  }
}

async function generateRenewalBody(cardName: string, renewalDate: Date, daysBeforeRenewal: number): Promise<{ body: string; data: any }> {
  const formattedDate = renewalDate.toLocaleDateString();
  
  // Get cards from CardService instead of undefined allCards
  const cardService = CardService.getInstance();
  const allAppCards = await cardService.getAllCards();
  const card = allAppCards.find(c => c.name === cardName);
  const annualFee = card?.annualFee || 0;
  
  const notificationData = {
    screen: '/(tabs)/03-insights',
    params: {
      cardId: card?.id,
      showRenewalInfo: 'true'
    }
  };

  // Get ROI data from the insights data
  const cardId = card?.id;
  if (!cardId) {
    return {
      body: `Your ${cardName} annual fee ($${annualFee}) is due on ${formattedDate}.`,
      data: notificationData
    };
  }

  // Get the current user ID from Supabase auth
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user?.id) {
    console.error('Error getting user ID for notifications:', userError);
    return {
      body: `Your ${cardName} annual fee ($${annualFee}) is due on ${formattedDate}.`,
      data: notificationData
    };
  }

  // Get user's cards with perks
  const { data: userCards, error: cardsError } = await getUserCards(user.id);
  if (cardsError || !userCards) {
    console.error('Error getting user cards for notifications:', cardsError);
    return {
      body: `Your ${cardName} annual fee ($${annualFee}) is due on ${formattedDate}.`,
      data: notificationData
    };
  }

  // Find the specific card and process its data
  const userCard = userCards.find(uc => uc.card_name === cardName);
  if (!userCard) {
    return {
      body: `Your ${cardName} annual fee ($${annualFee}) is due on ${formattedDate}.`,
      data: notificationData
    };
  }

  // Format the card data as expected by generateDummyInsightsData
  const processedCard = {
    card: {
      id: cardId,
      name: cardName,
      benefits: card?.benefits || [],
      annualFee: annualFee
    },
    perks: card?.benefits.map(benefit => ({
      id: `${cardId}_${benefit.definition_id}`,
      definition_id: benefit.definition_id,
      name: benefit.name,
      value: benefit.value,
      status: 'available' as const,
      period: benefit.period
    })) || []
  };

  const insightsData = await generateDummyInsightsData([cardId], [processedCard], user.id);
  const cardRoi = insightsData.cardRois.find(roi => roi.id === cardId);
  const totalRedeemed = cardRoi?.totalRedeemed || 0;
  const roiPercentage = annualFee > 0 ? (totalRedeemed / annualFee) * 100 : 0;

  let message = '';
  switch (daysBeforeRenewal) {
    case 90:
      message = `Your ${cardName} annual fee of $${annualFee} is due in 3 months. `;
      if (roiPercentage >= 100) {
        message += `You've already gotten great value - $${totalRedeemed.toFixed(0)} in benefits (${Math.round(roiPercentage)}% ROI)! 🎯`;
      } else {
        message += `So far you've redeemed $${totalRedeemed.toFixed(0)} in benefits (${Math.round(roiPercentage)}% ROI). Let's maximize your remaining perks! 💪`;
      }
      break;
    case 30:
      message = `${cardName} annual fee ($${annualFee}) coming up in a month. `;
      if (roiPercentage >= 100) {
        message += `Great job getting $${totalRedeemed.toFixed(0)} in value this year (${Math.round(roiPercentage)}% ROI)! 🏆`;
      } else {
        message += `You've redeemed $${totalRedeemed.toFixed(0)} so far (${Math.round(roiPercentage)}% ROI). Time to review if this card still fits your needs. 🤔`;
      }
      break;
    case 7:
      message = `${cardName} annual fee ($${annualFee}) due next week. `;
      if (roiPercentage >= 100) {
        message += `With $${totalRedeemed.toFixed(0)} in benefits redeemed (${Math.round(roiPercentage)}% ROI), this card's been a great investment! 🌟`;
      } else {
        message += `You've redeemed $${totalRedeemed.toFixed(0)} in benefits (${Math.round(roiPercentage)}% ROI). Consider if the benefits justify the fee. 📊`;
      }
      break;
    case 1:
      message = `${cardName} annual fee ($${annualFee}) due tomorrow! `;
      if (roiPercentage >= 100) {
        message += `You've maximized this card with $${totalRedeemed.toFixed(0)} in value (${Math.round(roiPercentage)}% ROI)! 🎉`;
      } else {
        message += `This year's value: $${totalRedeemed.toFixed(0)} (${Math.round(roiPercentage)}% ROI). Time to decide if you want to keep, downgrade, or cancel. ⚖️`;
      }
      break;
    default:
      message = `${cardName} annual fee ($${annualFee}) is due on ${formattedDate}. `;
      if (roiPercentage >= 100) {
        message += `You've gotten $${totalRedeemed.toFixed(0)} in value this year! 🎯`;
      } else {
        message += `You've redeemed $${totalRedeemed.toFixed(0)} in benefits so far. 📈`;
      }
  }

  return {
    body: message,
    data: notificationData
  };
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
    
    // Get cards from CardService instead of empty allCards array
    const cardService = CardService.getInstance();
    const allAppCards = await cardService.getAllCards();
    const currentUserAppCards = allAppCards.filter((appCard: Card) => userCardSet.has(appCard.name));

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
    
    // Get cards from CardService instead of empty allCards array
    const cardService = CardService.getInstance();
    const allAppCards = await cardService.getAllCards();
    const currentUserAppCards = allAppCards.filter((appCard: Card) => userCardSet.has(appCard.name));

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