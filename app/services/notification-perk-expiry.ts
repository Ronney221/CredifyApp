import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from '../../lib/supabase';
import { Card, allCards, Benefit } from '../../src/data/card-data';
import { getUserCards, getRedemptionsForPeriod } from '../../lib/database';
import { scheduleNotificationAsync } from '../utils/notifications';
import { NotificationPreferences } from '../utils/notifications';

interface ReminderDetails {
  title: string;
  time_modifier: string;
}

interface ReminderSchedule {
  [daysBefore: string]: ReminderDetails;
}

interface AvailablePerk {
  definition_id: string;
  name: string;
  value: number;
  cardName: string;
  base_message: string | null;
  reminder_schedule: ReminderSchedule | null;
}

interface PerkDefinitionWithNotifications {
    id: string;
    name: string;
    value: number;
    perk_notifications: {
        base_message: string | null;
        reminder_schedule: ReminderSchedule | null;
    } | null;
}

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

const generateDynamicMessage = (
    availablePerks: AvailablePerk[],
    daysBefore: number
  ): { title: string; body: string } | null => {
    if (availablePerks.length === 0) {
      return null;
    }
  
    // Prioritize the most valuable perk for the notification content
    const topPerk = availablePerks.sort((a, b) => b.value - a.value)[0];
    const perkCount = availablePerks.length;
    const totalValue = availablePerks.reduce((sum, perk) => sum + perk.value, 0);
  
    const amountString = `$${topPerk.value.toFixed(0)}`;
    const reminderDetails = topPerk.reminder_schedule?.[daysBefore.toString()];
  
    let title: string;
    let body: string;
  
    if (reminderDetails) {
      title = reminderDetails.title.replace('{{amount}}', amountString);
      body = reminderDetails.time_modifier.replace('{{amount}}', amountString);
    } else {
      // Enhanced Fallback Logic
      title = `Reminder for your ${topPerk.name}`;
      if (topPerk.base_message) {
        body = topPerk.base_message.replace('{{amount}}', amountString);
      } else {
        body = `Your ${topPerk.name} credit is expiring in ${daysBefore} days. Don't miss out!`;
      }
    }
  
    if (perkCount > 1) {
      const otherPerksValue = totalValue - topPerk.value;
      body += ` You also have ${perkCount - 1} other perk(s) worth $${otherPerksValue.toFixed(0)} expiring.`;
    }
  
    return { title, body };
  };

export const schedulePerkExpiryNotifications = async (
    userId: string, 
    preferences: NotificationPreferences, 
    periodMonths: number,
    isTest: boolean = false
  ): Promise<(string | null)[]> => {
    const now = new Date();
    const { start, end: endOfPeriod } = getPeriodBoundaries(periodMonths, now);
    
    let isEnabled = false;
    switch (periodMonths) {
      case 1: isEnabled = preferences.perkExpiryRemindersEnabled; break;
      case 3: isEnabled = preferences.quarterlyPerkRemindersEnabled; break;
      case 6: isEnabled = preferences.semiAnnualPerkRemindersEnabled; break;
      case 12: isEnabled = preferences.annualPerkRemindersEnabled; break;
    }
  
    if (!isEnabled && !isTest) {
      console.log(`[Notifications] ${periodMonths}-month reminders are disabled.`);
      return [];
    }
    
    const availablePerks: AvailablePerk[] = [];
    
    try {
      console.log(`[Notifications] Fetching data for user ${userId} for ${periodMonths}-month perk reminders.`);
      
      const { data: dbUserCards, error: userCardsError } = await getUserCards(userId);
      if (userCardsError) throw userCardsError;
      if (!dbUserCards || dbUserCards.length === 0) return [];
      
      const userCardSet = new Set(dbUserCards.map((c: { card_name: string }) => c.card_name));
      const currentUserAppCards = allCards.filter((appCard: Card) => userCardSet.has(appCard.name));
      const userPerkDefinitionIds = currentUserAppCards
        .flatMap(card => card.benefits)
        .filter(benefit => benefit.periodMonths === periodMonths)
        .map(benefit => benefit.definition_id);
  
      if (userPerkDefinitionIds.length === 0) return [];
  
      const { data: perkDefinitions, error: perkDefError } = await supabase
        .from('perk_definitions')
        .select(`
          id,
          name,
          value,
          perk_notifications!inner (
            base_message,
            reminder_schedule
          )
        `)
        .in('id', userPerkDefinitionIds)
        .returns<PerkDefinitionWithNotifications[]>();
        
      if (perkDefError) throw perkDefError;
      if (!perkDefinitions) return [];
      
      const { data: periodRedemptions, error: redemptionError } = await getRedemptionsForPeriod(userId, start, endOfPeriod);
      if (redemptionError) throw redemptionError;
      const redeemedPerkDefIds = new Set(periodRedemptions?.map((r: { perk_id: string }) => r.perk_id) || []);
      
      currentUserAppCards.forEach((appCard: Card) => {
        appCard.benefits.forEach((benefit: Benefit) => {
          if (benefit.periodMonths === periodMonths) {
            const definition = perkDefinitions.find(def => def.id === benefit.definition_id);
            if (definition && !redeemedPerkDefIds.has(definition.id)) {
              availablePerks.push({
                definition_id: definition.id,
                name: definition.name,
                value: definition.value,
                cardName: appCard.name,
                base_message: definition.perk_notifications?.base_message || null,
                reminder_schedule: definition.perk_notifications?.reminder_schedule || null,
              });
            }
          }
        });
      });
  
      if (availablePerks.length > 0) {
        let logMessage = `[Notifications] User ${userId} (${periodMonths}-month): ${availablePerks.length} perks available.`;
        console.log(logMessage);
      }
  
    } catch (error) {
      console.error(`[Notifications] Error fetching data for ${periodMonths}-month personalized notifications:`, error);
      return [];
    }
    
    if (availablePerks.length === 0) {
      console.log(`[Notifications] All perks for period ${periodMonths} already redeemed or none exist.`);
      return [];
    }
  
    const reminderDays = getSmartReminderDays(periodMonths);
    const tasks: Promise<string | null>[] = [];
  
    reminderDays.forEach((daysBefore, index) => {
      if (daysBefore <= 0) return;
  
      let reminderDate: Date;
      if (isTest) {
        const baseDelay = periodMonths === 1 ? 2 : (periodMonths === 3 ? 4 : (periodMonths === 6 ? 6 : 8));
        reminderDate = new Date(now.getTime() + (baseDelay + index * 2) * 1000);
      } else {
        reminderDate = new Date(endOfPeriod);
        reminderDate.setDate(endOfPeriod.getDate() - (daysBefore - 1));
        reminderDate.setHours(10, 0, 0, 0);
      }
      
      if (reminderDate > now || isTest) {
        const message = generateDynamicMessage(availablePerks, daysBefore);
        if (message) {
            tasks.push(
              scheduleNotificationAsync(message.title, message.body, reminderDate)
            );
        }
      }
    });
  
    return Promise.all(tasks);
  }; 