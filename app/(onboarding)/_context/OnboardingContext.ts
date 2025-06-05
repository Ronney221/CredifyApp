import { createContext, useContext } from 'react';

export interface NotificationPrefs {
  perkExpiryRemindersEnabled: boolean;
  renewalRemindersEnabled: boolean;
  perkResetConfirmationEnabled: boolean;
  remind1DayBeforeMonthly: boolean;
  remind3DaysBeforeMonthly: boolean;
  remind7DaysBeforeMonthly: boolean;
}

export interface OnboardingContextType {
  step: number; // 0-indexed internally
  setStep: (step: number) => void;
  totalSteps: number;
  isHeaderGloballyHidden: boolean;
  setIsHeaderGloballyHidden: (hidden: boolean) => void;
  
  // Card selection
  selectedCards: string[];
  setSelectedCards: React.Dispatch<React.SetStateAction<string[]>>;

  // Renewal dates
  renewalDates: Record<string, Date>;
  setRenewalDates: React.Dispatch<React.SetStateAction<Record<string, Date>>>;

  // Notification preferences
  notificationPrefs: NotificationPrefs;
  setNotificationPrefs: React.Dispatch<React.SetStateAction<NotificationPrefs>>;
}

export const OnboardingContext = createContext<OnboardingContextType | undefined>(
  undefined
);

export function useOnboardingContext() {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error(
      'useOnboardingContext must be used within an OnboardingProvider'
    );
  }
  return context;
} 