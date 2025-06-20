import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from '../../lib/supabase';
import { Card, allCards, Benefit } from '../../src/data/card-data';
import { getUserCards, getRedemptionsForPeriod } from '../../lib/database';
import { scheduleNotificationAsync } from '../utils/notifications';
import { NotificationPreferences } from '../utils/notifications';

// For the new table perk_reminders
interface PerkReminder {
  days_before_expiry: number;
  title: string;
  body: string;
}

interface RedemptionWithStatus {
    perk_id: string;
    status: 'redeemed' | 'partially_redeemed' | 'pending';
}

// The comprehensive object we'll use in our logic
interface AvailablePerk {
  definition_id: string;
  name: string;
  value: number;
  cardName: string;
  notification_emoji: string | null;
  notification_combo_start: string | null;
  notification_combo_end: string | null;
  reminders: PerkReminder[];
}

// To type the result from our new Supabase query
interface PerkDefinitionWithReminders {
    id: string;
    name: string;
    value: number;
    notification_emoji: string | null;
    notification_combo_start: string | null;
    notification_combo_end: string | null;
    perk_reminders: PerkReminder[];
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
  
  // This function is no longer needed in the new logic, but can be kept for other purposes if desired.
  const getSmartReminderDays = (periodMonths: number): number[] => {
    switch (periodMonths) {
      case 1:  // Monthly
        return [1, 3, 7];
      case 3:  // Quarterly
        return [7, 14];
      case 6:  // Semi-Annual
        return [14, 30];
      case 12: // Annual
        return [30, 60];
      default:
        return [7];
    }
  };

// CHANGE: The generateDynamicMessage function is simplified as it now receives a pre-filtered list of perks
const generateDynamicMessage = (
    perksForThisDate: AvailablePerk[]
  ): { title: string; body: string } | null => {

    const perkCount = perksForThisDate.length;
  
    if (perkCount === 0) {
      return null;
    }
  
    // Case 1: Exactly one perk
    if (perkCount === 1) {
      const perk = perksForThisDate[0];
      // Since all perks in this group share a reminder day, we can safely take the first one.
      const reminder = perk.reminders[0]; 
  
      if (!reminder) return null;
  
      const amountString = `$${perk.value.toFixed(0)}`;
      return {
        title: reminder.title.replace('{{amount}}', amountString),
        body: reminder.body.replace('{{amount}}', amountString),
      };
    }
  
    // Case 2: Exactly two perks
    if (perkCount === 2) {
      const [perk1, perk2] = perksForThisDate.sort((a, b) => b.value - a.value);
  
      const title = `${perk1.notification_emoji || '✨'}${perk2.notification_emoji || '🛍️'} ${perk1.name} + ${perk2.name} Expiring!`;
  
      const fragment1 = (perk1.notification_combo_start || `Your ${perk1.name} credit is expiring.`)
        .replace('{{amount}}', `$${perk1.value.toFixed(0)}`);
  
      const fragment2 = (perk2.notification_combo_end || `Don't miss your ${perk2.name} credit.`)
        .replace('{{amount}}', `$${perk2.value.toFixed(0)}`);
  
      const body = `${fragment1} and ${fragment2}`;
  
      return { title, body };
    }
  
    // Case 3: Three or more perks
    if (perkCount >= 3) {
      const totalValue = perksForThisDate.reduce((sum, perk) => sum + perk.value, 0);
      const title = `✨ ${perkCount} Perks Expiring Soon!`;
      // We can get the daysBefore from the first reminder of the first perk
      const daysBefore = perksForThisDate[0]?.reminders[0]?.days_before_expiry || 'soon';
      const body = `You have ${perkCount} perks worth a total of $${totalValue.toFixed(0)} expiring in about ${daysBefore} days. Check the app to see them all.`;
      return { title, body };
    }
  
    return null;
  };

// NEW: Helper function to group perks by their next reminder date
const groupPerksByReminderDate = (
    availablePerks: AvailablePerk[],
    endOfPeriod: Date,
    now: Date
): Record<string, AvailablePerk[]> => {
    const groups: Record<string, AvailablePerk[]> = {};

    for (const perk of availablePerks) {
        let nextReminderDate: Date | null = null;
        let chosenReminder: PerkReminder | null = null;

        // Find the closest reminder date in the future for this perk
        perk.reminders
            .sort((a, b) => a.days_before_expiry - b.days_before_expiry) // Sort from furthest to closest
            .forEach(reminder => {
                const reminderDate = new Date(endOfPeriod);
                reminderDate.setDate(endOfPeriod.getDate() - reminder.days_before_expiry);
                reminderDate.setHours(10, 0, 0, 0); // Set time for 10 AM

                if (reminderDate > now) {
                    nextReminderDate = reminderDate;
                    chosenReminder = reminder;
                }
            });

        // If we found a valid future reminder date, add the perk to the corresponding group
        if (nextReminderDate && chosenReminder) {
            const dateKey = (nextReminderDate as Date).toISOString();
            if (!groups[dateKey]) {
                groups[dateKey] = [];
            }
            // We only add the *chosen* reminder to the perk to simplify the logic later
            groups[dateKey].push({ ...perk, reminders: [chosenReminder] });
        }
    }
    return groups;
};

// NEW: Helper function to determine if a redemption is still valid for the current cycle.
// This logic is borrowed from usePerkStatus.ts for consistency.
const isRedemptionStillActive = (
  redemption: { redemption_date: string; reset_date: string | null; status: string }
): boolean => {
  // A partially redeemed perk is NEVER considered fully redeemed.
  // It should always be available for notifications, so we return false.
  if (redemption.status === 'partially_redeemed') {
    return false; 
  }

  // Only check reset dates for fully redeemed perks
  if (redemption.status === 'redeemed') {
    const now = new Date();
    const resetDate = redemption.reset_date ? new Date(redemption.reset_date) : null;
    // If there's a reset date and it's in the future, the redemption is active.
    if (resetDate && resetDate > now) {
      return true;
    }
  }
  
  // If status isn't 'redeemed' or the reset date has passed, it's not an active redemption.
  return false;
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
    
    let availablePerks: AvailablePerk[] = []; // CHANGE: Made this a let instead of const
    
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
  
      // ADD THIS LOG to see the IDs being sent to the database
      console.log(`[DEBUG] Querying Supabase with perk definition IDs:`, userPerkDefinitionIds);

      // CHANGE: Updated the Supabase query to fetch new fields and join with the new table
      const { data: perkDefinitions, error: perkDefError } = await supabase
        .from('perk_definitions')
        .select(`
          id,
          name,
          value,
          notification_emoji,
          notification_combo_start,
          notification_combo_end,
          perk_reminders!inner(
            days_before_expiry,
            title,
            body
          )
        `)
        .in('id', userPerkDefinitionIds)
        .returns<PerkDefinitionWithReminders[]>();
        
      if (perkDefError) throw perkDefError;
      if (!perkDefinitions) return [];
      
      // ADD THIS LOG: See what the DB returns
      console.log('[DEBUG] Raw perk definitions from Supabase:', JSON.stringify(perkDefinitions, null, 2));
      
      // CHANGE: Fetch all redemptions for the user, including remaining value.
      const { data: allRedemptions, error: redemptionError } = await supabase
        .from('perk_redemptions')
        .select('perk_id, status, reset_date, redemption_date, remaining_value')
        .eq('user_id', userId);
        
      if (redemptionError) throw redemptionError;
      
      // CHANGE: Use the helper to find fully redeemed perks to exclude.
      const fullyRedeemedPerkDefIds = new Set(
        allRedemptions
          ?.filter(isRedemptionStillActive)
          .map(r => r.perk_id) || []
      );
      
      // NEW: Create a map to hold the remaining value of partially redeemed perks.
      const partialRedemptionsMap = new Map<string, number>();
      allRedemptions?.forEach(r => {
        if (r.status === 'partially_redeemed') {
          partialRedemptionsMap.set(r.perk_id, r.remaining_value);
        }
      });
      
      // CHANGE: Updated the data mapping to populate the new AvailablePerk structure
      const allAvailablePerks: AvailablePerk[] = [];
      currentUserAppCards.forEach((appCard: Card) => {
        appCard.benefits.forEach((benefit: Benefit) => {
          if (benefit.periodMonths === periodMonths) {
            const definition = perkDefinitions.find(def => def.id === benefit.definition_id);
            // Only include perks that are NOT fully redeemed.
            if (definition && !fullyRedeemedPerkDefIds.has(definition.id)) {
                const remainingValue = partialRedemptionsMap.get(definition.id);

                allAvailablePerks.push({
                definition_id: definition.id,
                name: definition.name,
                // Use the remaining value if this perk was partially redeemed.
                value: remainingValue !== undefined ? remainingValue : definition.value,
                cardName: appCard.name,
                notification_emoji: definition.notification_emoji,
                notification_combo_start: definition.notification_combo_start,
                notification_combo_end: definition.notification_combo_end,
                reminders: definition.perk_reminders,
              });
            }
          }
        });
      });
  
      if (allAvailablePerks.length > 0) {
        let logMessage = `[Notifications] User ${userId} (${periodMonths}-month): ${allAvailablePerks.length} total perks available.`;
        console.log(logMessage);
        availablePerks = allAvailablePerks; // Assign to the outer scope variable
      }
  
    } catch (error) {
      console.error(`[Notifications] Error fetching data for ${periodMonths}-month personalized notifications:`, error);
      return [];
    }
    
    if (availablePerks.length === 0) {
      console.log(`[Notifications] All perks for period ${periodMonths} already redeemed or none exist.`);
      return [];
    }
  
    // CHANGE: The main scheduling loop is completely replaced with the new grouping logic
    const tasks: Promise<string | null>[] = [];
    const groupedPerks = groupPerksByReminderDate(availablePerks, endOfPeriod, now);

    console.log(`[Notifications] Found ${Object.keys(groupedPerks).length} upcoming notification groups.`);

    for (const [reminderDateStr, perksForThisDate] of Object.entries(groupedPerks)) {
        const reminderDate = new Date(reminderDateStr);

        // For testing, we can force the notification to be in a few seconds
        const finalReminderDate = isTest ? new Date(now.getTime() + 10000) : reminderDate; // Changed from 5000 to 10000

        if (finalReminderDate > now) {
            const message = generateDynamicMessage(perksForThisDate);
            if (message) {
                console.log(`[Notifications] Scheduling notification for ${perksForThisDate.length} perk(s) on ${finalReminderDate.toISOString()}`);
                tasks.push(
                    scheduleNotificationAsync(message.title, message.body, finalReminderDate)
                );
            }
        }
    }
  
    return Promise.all(tasks);
  }; 