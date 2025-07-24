// utils/notification-preview.ts
import { supabase } from '../lib/supabase';
import { getUserCards } from '../lib/database';
import { Card, Benefit } from '../src/data/card-data';
import { CardService } from '../lib/card-service';
import { NotificationPreferences } from '../types/notification-types';
import { schedulePerkExpiryNotifications } from '../services/notification-perk-expiry';
import { scheduleCardRenewalNotifications, scheduleFirstOfMonthReminder } from './notifications';

export interface NotificationPreview {
  id: string;
  title: string;
  body: string;
  emoji: string;
  category: 'perk_expiry' | 'renewal' | 'first_of_month' | 'perk_reset';
  timing: string;
  scheduledDate?: Date;
  value?: number;
}

interface PerkDefinitionWithReminders {
  id: string;
  name: string;
  value: number;
  notification_emoji: string | null;
  notification_combo_start: string | null;
  notification_combo_end: string | null;
  base_message?: string;
  perk_reminders?: Array<{
    days_before_expiry: number;
    title: string;
    body: string;
  }>;
}

interface AvailablePerk {
  definition_id: string;
  name: string;
  value: number;
  cardName: string;
  notification_emoji: string | null;
  notification_combo_start: string | null;
  notification_combo_end: string | null;
  base_message?: string;
  timing: number; // days before expiry
}

const generatePreviewMessage = (
  perks: AvailablePerk[], 
  timing: number
): { title: string; body: string; emoji: string } => {
  const perkCount = perks.length;

  if (perkCount === 0) {
    return {
      title: 'No notifications',
      body: 'No perks available for preview.',
      emoji: '📱'
    };
  }

  // Single perk - use base message from SQL data
  if (perkCount === 1) {
    const perk = perks[0];
    const amountString = `$${perk.value.toFixed(0)}`;
    
    // Use base message if available, otherwise create generic one
    const body = perk.base_message 
      ? perk.base_message.replace('{{amount}}', amountString)
      : `Your ${perk.name} credit of ${amountString} is expiring soon. Don't miss out!`;

    return {
      title: getTimingTitle(timing, perk.name),
      body,
      emoji: perk.notification_emoji || '💳'
    };
  }

  // Two perks - use combo messages
  if (perkCount === 2) {
    const [perk1, perk2] = perks.sort((a, b) => b.value - a.value);
    
    const fragment1 = (perk1.notification_combo_start || `your $${perk1.value.toFixed(0)} ${perk1.name} credit`)
      .replace('{{amount}}', `$${perk1.value.toFixed(0)}`);
    
    const fragment2 = (perk2.notification_combo_end || `your $${perk2.value.toFixed(0)} ${perk2.name} credit`)
      .replace('{{amount}}', `$${perk2.value.toFixed(0)}`);

    // Use single emoji to avoid double rendering
    const titleEmoji = perk1.notification_emoji || perk2.notification_emoji || '✨';

    return {
      title: `${titleEmoji} ${perk1.name} + ${perk2.name} Expiring!`,
      body: `Don't miss ${fragment1} and ${fragment2}`,
      emoji: titleEmoji
    };
  }

  // Multiple perks
  const totalValue = perks.reduce((sum, perk) => sum + perk.value, 0);
  return {
    title: `✨ ${perkCount} Perks Expiring Soon!`,
    body: `You have ${perkCount} perks worth $${totalValue.toFixed(0)} total expiring in ${timing} days. Check the app to maximize your benefits!`,
    emoji: '✨'
  };
};

const getTimingTitle = (days: number, perkName?: string): string => {
  if (days === 1) {
    return `🚨 LAST DAY${perkName ? ` for ${perkName}` : ''}`;
  } else if (days === 3) {
    return `⏰ ${perkName || 'Perk'} Expires in 3 Days`;
  } else if (days === 7) {
    return `📅 ${perkName || 'Perk'} Expires This Week`;
  } else if (days <= 30) {
    return `📆 ${perkName || 'Perk'} Expires This Month`;
  } else {
    return `🔔 ${perkName || 'Perk'} Expiring Soon`;
  }
};

// Simplified function to get period boundaries (matches notification service logic)
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

// Mock the scheduleNotificationAsync to capture notification data instead of scheduling
let capturedNotifications: Array<{
  title: string;
  body: string;
  date: Date;
  data?: Record<string, any>;
}> = [];

const originalScheduleNotificationAsync = require('./notification-scheduler').scheduleNotificationAsync;

export const generateNotificationPreviews = async (
  userId: string,
  preferences: NotificationPreferences
): Promise<NotificationPreview[]> => {
  if (!userId) {
    return [];
  }

  try {
    // Reset captured notifications
    capturedNotifications = [];
    
    // Temporarily override the scheduleNotificationAsync function to capture data
    const mockScheduleNotificationAsync = (title: string, body: string, date: Date, data?: Record<string, any>) => {
      capturedNotifications.push({ title, body, date, data });
      return Promise.resolve('mock-notification-id');
    };
    
    // Replace the function temporarily
    require('./notification-scheduler').scheduleNotificationAsync = mockScheduleNotificationAsync;
    
    console.log('[NotificationPreview] 📅 Generating previews using actual notification logic...');
    
    // Call the actual notification scheduling functions to capture their output
    const promises = [];
    
    if (preferences.perkExpiryRemindersEnabled) {
      promises.push(schedulePerkExpiryNotifications(userId, preferences, 1, false));
    }
    if (preferences.quarterlyPerkRemindersEnabled) {
      promises.push(schedulePerkExpiryNotifications(userId, preferences, 3, false)); 
    }
    if (preferences.semiAnnualPerkRemindersEnabled) {
      promises.push(schedulePerkExpiryNotifications(userId, preferences, 6, false));
    }
    if (preferences.annualPerkRemindersEnabled) {
      promises.push(schedulePerkExpiryNotifications(userId, preferences, 12, false));
    }
    if (preferences.renewalRemindersEnabled) {
      promises.push(scheduleCardRenewalNotifications(userId, preferences, false));
    }
    if (preferences.firstOfMonthRemindersEnabled) {
      promises.push(scheduleFirstOfMonthReminder(userId, preferences, false));
    }
    
    // Wait for all notifications to be "scheduled" (captured)
    await Promise.all(promises);
    
    // Restore the original function
    require('./notification-scheduler').scheduleNotificationAsync = originalScheduleNotificationAsync;
    
    // Sort captured notifications by date (earliest/most urgent first)
    capturedNotifications.sort((a, b) => a.date.getTime() - b.date.getTime());
    
    console.log(`[NotificationPreview] 📋 Captured ${capturedNotifications.length} notification previews, sorted by date (earliest first)`);
    
    // Convert captured notifications to preview format
    const previews: NotificationPreview[] = capturedNotifications
      .slice(0, 6) // Limit to 6 previews
      .map((notif, index) => {
        // Determine category based on title/content
        let category: NotificationPreview['category'] = 'perk_expiry';
        if (notif.title.toLowerCase().includes('renewal') || notif.title.toLowerCase().includes('annual fee')) {
          category = 'renewal';
        } else if (notif.title.toLowerCase().includes('new month') || notif.title.toLowerCase().includes('fresh')) {
          category = 'first_of_month';
        } else if (notif.title.toLowerCase().includes('reset')) {
          category = 'perk_reset';
        }
        
        // Extract emoji from title
        const emojiMatch = notif.title.match(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u);
        const emoji = emojiMatch ? emojiMatch[0] : '🔔';
        
        // Calculate timing from date
        const now = new Date();
        const diffDays = Math.ceil((notif.date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        let timing = `${diffDays} days`;
        if (diffDays === 1) timing = '1 day';
        else if (diffDays <= 0) timing = 'Today';
        
        return {
          id: `preview_${index}`,
          title: notif.title,
          body: notif.body,
          emoji,
          category,
          timing,
          scheduledDate: notif.date,
          // Try to extract value from body text
          value: extractValueFromText(notif.body)
        };
      });
    
    if (previews.length === 0) {
      // Return example previews if no real notifications were captured
      return getExamplePreviews(preferences);
    }
    
    return previews;
    
  } catch (error) {
    console.error('[NotificationPreview] Error generating notification previews:', error);
    
    // Restore the original function in case of error
    require('./notification-scheduler').scheduleNotificationAsync = originalScheduleNotificationAsync;
    
    return getExamplePreviews(preferences);
  }
};

// Helper function to extract monetary value from notification text
const extractValueFromText = (text: string): number | undefined => {
  const match = text.match(/\$(\d+(?:,\d{3})*(?:\.\d{2})?)/);
  return match ? parseFloat(match[1].replace(/,/g, '')) : undefined;
};

// Fallback example previews
const getExamplePreviews = (preferences: NotificationPreferences): NotificationPreview[] => {
  const examplePreviews: NotificationPreview[] = [];
  const now = new Date();
  
  if (preferences.perkExpiryRemindersEnabled) {
    const tomorrowDate = new Date(now);
    tomorrowDate.setDate(now.getDate() + 1);
    tomorrowDate.setHours(10, 0, 0, 0);
    
    examplePreviews.push({
      id: 'example_monthly_1',
      title: '🚨 LAST DAY for your Uber Cash',
      body: 'Your monthly Uber Cash credit of $15 is expiring today. Don\'t leave money on the table!',
      emoji: '🚗',
      category: 'perk_expiry',
      timing: '1 day before expiry',
      scheduledDate: tomorrowDate,
      value: 15
    });
  }
  
  if (preferences.renewalRemindersEnabled) {
    const monthFromNow = new Date(now);
    monthFromNow.setDate(now.getDate() + 30);
    monthFromNow.setHours(10, 0, 0, 0);
    
    examplePreviews.push({
      id: 'example_renewal',
      title: '💳 Card Renewal Coming Up',
      body: 'Your Chase Sapphire Preferred annual fee ($95) is due next month. You\'ve redeemed $347 in benefits this year (365% ROI). 🎯',
      emoji: '💳',
      category: 'renewal',
      timing: '30 days before renewal',
      scheduledDate: monthFromNow,
      value: 347
    });
  }
  
  if (preferences.firstOfMonthRemindersEnabled) {
    const firstOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1, 9, 0, 0, 0);
    
    examplePreviews.push({
      id: 'example_first_month',
      title: '🎉 New Month, Fresh Benefits!',
      body: 'Your monthly perks worth $42 have reset. Start the month right by planning how to use your benefits!',
      emoji: '🎉',
      category: 'first_of_month',
      timing: 'First of every month',
      scheduledDate: firstOfNextMonth,
      value: 42
    });
  }
  
  // Sort example previews by scheduled date (earliest first)
  examplePreviews.sort((a, b) => {
    if (!a.scheduledDate || !b.scheduledDate) return 0;
    return a.scheduledDate.getTime() - b.scheduledDate.getTime();
  });
  
  return examplePreviews;
};