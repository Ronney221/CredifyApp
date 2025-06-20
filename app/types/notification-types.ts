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