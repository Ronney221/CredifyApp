import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
import { Card } from '../../../src/data/card-data';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '../../../utils/logger';

export const HAS_REDEEMED_FIRST_PERK_KEY = '@has_redeemed_first_perk';
export const HAS_SEEN_ONBOARDING_SHEET_KEY = '@has_seen_onboarding_sheet';
export const HAS_SEEN_TAP_ONBOARDING_KEY = '@has_seen_tap_onboarding';
export const HAS_SEEN_SWIPE_ONBOARDING_KEY = '@has_seen_swipe_onboarding';
export const NOTIFICATION_CHOICE_KEY = '@notification_choice';
export const NOTIFICATION_REQUEST_COUNT_KEY = '@notification_request_count';

interface OnboardingContextType {
  // Card Management
  selectedCards: string[];
  addCard: (cardId: string) => void;
  removeCard: (cardId: string) => void;
  clearCards: () => void;
  hasCard: (cardId: string) => boolean;
  toggleCard: (cardId: string) => void;
  
  // Step Management
  step: number;
  setStep: (step: number) => void;
  totalSteps: number;
  
  // UI State
  isHeaderGloballyHidden: boolean;
  setIsHeaderGloballyHidden: (hidden: boolean) => void;

  // Perk Redemption State
  hasRedeemedFirstPerk: boolean;
  setHasRedeemedFirstPerk: (value: boolean) => void;
  markFirstPerkRedeemed: () => Promise<void>;
  hasSeenOnboardingSheet: boolean;
  markOnboardingSheetSeen: () => Promise<void>;
  isOnboardingFlagsReady: boolean;
  
  // New Contextual Onboarding State
  hasSeenTapOnboarding: boolean;
  hasSeenSwipeOnboarding: boolean;
  markTapOnboardingAsSeen: () => Promise<void>;
  markSwipeOnboardingAsSeen: () => Promise<void>;
  reloadOnboardingFlags: () => Promise<void>;

  // Notification Preferences
  notificationChoice: 'enable' | 'later' | 'declined' | null;
  notificationRequestCount: number;
  setNotificationChoice: (choice: 'enable' | 'later' | 'declined') => Promise<void>;
  shouldShowNotificationPrompt: () => boolean;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

interface OnboardingProviderProps {
  children: ReactNode;
}

export function OnboardingProvider({ children }: OnboardingProviderProps) {
  // Card Management State
  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  
  // Step Management State
  const [step, setStep] = useState(0);
  
  // UI State
  const [isHeaderGloballyHidden, setIsHeaderGloballyHidden] = useState(false);

  // Perk Redemption State
  const [hasRedeemedFirstPerk, setHasRedeemedFirstPerk] = useState(false);
  const [hasSeenOnboardingSheet, setHasSeenOnboardingSheet] = useState(false);
  const [isOnboardingFlagsReady, setIsOnboardingFlagsReady] = useState(false);
  
  // New Contextual Onboarding State
  const [hasSeenTapOnboarding, setHasSeenTapOnboarding] = useState(false);
  const [hasSeenSwipeOnboarding, setHasSeenSwipeOnboarding] = useState(false);

  // Notification Preferences State
  const [notificationChoice, setNotificationChoiceState] = useState<'enable' | 'later' | 'declined' | null>(null);
  const [notificationRequestCount, setNotificationRequestCount] = useState(0);

  // Load initial state
  useEffect(() => {
    const loadFlags = async () => {
      try {
        logger.log('[OnboardingContext] Loading onboarding flags');
        const [[, redeemedVal], [, seenVal], [, tapVal], [, swipeVal], [, notifChoiceVal], [, notifCountVal]] = await AsyncStorage.multiGet([
          HAS_REDEEMED_FIRST_PERK_KEY,
          HAS_SEEN_ONBOARDING_SHEET_KEY,
          HAS_SEEN_TAP_ONBOARDING_KEY,
          HAS_SEEN_SWIPE_ONBOARDING_KEY,
          NOTIFICATION_CHOICE_KEY,
          NOTIFICATION_REQUEST_COUNT_KEY,
        ]);

        const redeemedBool = redeemedVal === 'true';
        const seenBool = seenVal === 'true';
        const tapBool = tapVal === 'true';
        const swipeBool = swipeVal === 'true';
        const notifChoice = notifChoiceVal as 'enable' | 'later' | 'declined' | null;
        const notifCount = parseInt(notifCountVal || '0', 10);

        setHasRedeemedFirstPerk(redeemedBool);
        setHasSeenOnboardingSheet(seenBool);
        setHasSeenTapOnboarding(tapBool);
        setHasSeenSwipeOnboarding(swipeBool);
        setNotificationChoiceState(notifChoice);
        setNotificationRequestCount(notifCount);
      } catch (err) {
        console.error('[OnboardingContext] Failed to load onboarding flags', err);
      } finally {
        setIsOnboardingFlagsReady(true);
      }
    };
    loadFlags();
  }, []);

  const markFirstPerkRedeemed = useCallback(async () => {
    logger.log('[OnboardingContext] Marking first perk as redeemed');
    try {
      // Only set if it hasn't been set before to avoid unnecessary writes
      if (!hasRedeemedFirstPerk) {
        await AsyncStorage.setItem(HAS_REDEEMED_FIRST_PERK_KEY, 'true');
        setHasRedeemedFirstPerk(true);
        // Ensure the sheet will display next load
        await AsyncStorage.removeItem(HAS_SEEN_ONBOARDING_SHEET_KEY);
        setHasSeenOnboardingSheet(false);
      } else {
        logger.log('[OnboardingContext] First perk already redeemed, skipping');
      }
    } catch (error) {
      console.error('[OnboardingContext] Error marking first perk redeemed:', error);
    }
  }, [hasRedeemedFirstPerk]);

  const markOnboardingSheetSeen = useCallback(async () => {
    try {
      if (!hasSeenOnboardingSheet) {
        await AsyncStorage.setItem(HAS_SEEN_ONBOARDING_SHEET_KEY, 'true');
        setHasSeenOnboardingSheet(true);
      }
    } catch (err) {
      console.error('[OnboardingContext] Failed to persist sheet seen flag', err);
    }
  }, [hasSeenOnboardingSheet]);

  const markTapOnboardingAsSeen = useCallback(async () => {
    try {
      if (!hasSeenTapOnboarding) {
        await AsyncStorage.setItem(HAS_SEEN_TAP_ONBOARDING_KEY, 'true');
        setHasSeenTapOnboarding(true);
        logger.log('[OnboardingContext] Marked tap onboarding as seen');
      }
    } catch (err) {
      console.error('[OnboardingContext] Failed to persist tap onboarding flag', err);
    }
  }, [hasSeenTapOnboarding]);

  const markSwipeOnboardingAsSeen = useCallback(async () => {
    try {
      if (!hasSeenSwipeOnboarding) {
        await AsyncStorage.setItem(HAS_SEEN_SWIPE_ONBOARDING_KEY, 'true');
        setHasSeenSwipeOnboarding(true);
        logger.log('[OnboardingContext] Marked swipe onboarding as seen');
      }
    } catch (err) {
      console.error('[OnboardingContext] Failed to persist swipe onboarding flag', err);
    }
  }, [hasSeenSwipeOnboarding]);

  const reloadOnboardingFlags = useCallback(async () => {
    try {
      logger.log('[OnboardingContext] Reloading onboarding flags');
      const [[, redeemedVal], [, seenVal], [, tapVal], [, swipeVal]] = await AsyncStorage.multiGet([
        HAS_REDEEMED_FIRST_PERK_KEY,
        HAS_SEEN_ONBOARDING_SHEET_KEY,
        HAS_SEEN_TAP_ONBOARDING_KEY,
        HAS_SEEN_SWIPE_ONBOARDING_KEY,
      ]);

      const redeemedBool = redeemedVal === 'true';
      const seenBool = seenVal === 'true';
      const tapBool = tapVal === 'true';
      const swipeBool = swipeVal === 'true';

      setHasRedeemedFirstPerk(redeemedBool);
      setHasSeenOnboardingSheet(seenBool);
      setHasSeenTapOnboarding(tapBool);
      setHasSeenSwipeOnboarding(swipeBool);
      
      logger.log('[OnboardingContext] Flags reloaded:', { tapBool, swipeBool });
    } catch (err) {
      console.error('[OnboardingContext] Failed to reload onboarding flags', err);
    }
  }, []);

  const resetFirstPerkRedemption = useCallback(async () => {
    logger.log('[OnboardingContext] Resetting first perk redemption state');
    try {
      await AsyncStorage.removeItem(HAS_REDEEMED_FIRST_PERK_KEY);
      await AsyncStorage.removeItem(HAS_SEEN_ONBOARDING_SHEET_KEY);
      const verifyValue = await AsyncStorage.getItem(HAS_REDEEMED_FIRST_PERK_KEY);
      logger.log('[OnboardingContext] Verified AsyncStorage value after reset:', verifyValue);
      setHasRedeemedFirstPerk(false);
      setHasSeenOnboardingSheet(false);
    } catch (error) {
      console.error('[OnboardingContext] Error resetting first perk:', error);
    }
  }, []);

  useEffect(() => {
    logger.log('[OnboardingContext] State changed:', {
      hasRedeemedFirstPerk,
      timestamp: new Date().toISOString()
    });
  }, [hasRedeemedFirstPerk]);

  // Notification Management Functions
  const setNotificationChoice = useCallback(async (choice: 'enable' | 'later' | 'declined') => {
    try {
      await AsyncStorage.setItem(NOTIFICATION_CHOICE_KEY, choice);
      setNotificationChoiceState(choice);
      
      // Increment request count if user declined or chose later
      if (choice === 'declined' || choice === 'later') {
        const newCount = notificationRequestCount + 1;
        await AsyncStorage.setItem(NOTIFICATION_REQUEST_COUNT_KEY, newCount.toString());
        setNotificationRequestCount(newCount);
      }
      
      logger.log('[OnboardingContext] Set notification choice:', choice);
    } catch (err) {
      console.error('[OnboardingContext] Failed to save notification choice', err);
    }
  }, [notificationRequestCount]);

  const shouldShowNotificationPrompt = useCallback(() => {
    // Don't show if user already enabled
    if (notificationChoice === 'enable') return false;
    
    // Don't show if user declined and we've asked too many times (max 3)
    if (notificationChoice === 'declined' && notificationRequestCount >= 3) return false;
    
    // Show if user chose "later" or if we haven't asked before
    return notificationChoice === 'later' || notificationChoice === null || notificationRequestCount < 3;
  }, [notificationChoice, notificationRequestCount]);

  // Card Management Functions
  const addCard = useCallback((cardId: string) => {
    setSelectedCards(prev => {
      if (!prev.includes(cardId)) {
        return [...prev, cardId];
      }
      return prev;
    });
  }, []);

  const removeCard = useCallback((cardId: string) => {
    setSelectedCards(prev => prev.filter(id => id !== cardId));
  }, []);

  const clearCards = useCallback(() => {
    setSelectedCards([]);
  }, []);

  const hasCard = useCallback((cardId: string) => {
    return selectedCards.includes(cardId);
  }, [selectedCards]);

  const toggleCard = useCallback((cardId: string) => {
    setSelectedCards(prev => {
      if (prev.includes(cardId)) {
        return prev.filter(id => id !== cardId);
      }
      return [...prev, cardId];
    });
  }, []);

  // Updated flow without wizard header progress tracking
  const totalSteps = 4; // Welcome, Card Select, Why This Matters, Potential Savings, Register (but no header shown)

  const value: OnboardingContextType = {
    // Card Management
    selectedCards,
    addCard,
    removeCard,
    clearCards,
    hasCard,
    toggleCard,
    
    // Step Management
    step,
    setStep,
    totalSteps,
    
    // UI State
    isHeaderGloballyHidden,
    setIsHeaderGloballyHidden,

    // Perk Redemption State
    hasRedeemedFirstPerk,
    setHasRedeemedFirstPerk,
    markFirstPerkRedeemed,
    hasSeenOnboardingSheet,
    markOnboardingSheetSeen,
    isOnboardingFlagsReady,
    
    // New Contextual Onboarding State
    hasSeenTapOnboarding,
    hasSeenSwipeOnboarding,
    markTapOnboardingAsSeen,
    markSwipeOnboardingAsSeen,
    reloadOnboardingFlags,

    // Notification Preferences
    notificationChoice,
    notificationRequestCount,
    setNotificationChoice,
    shouldShowNotificationPrompt,
  };

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboardingContext() {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error('useOnboardingContext must be used within an OnboardingProvider');
  }
  return context;
}

export function useOnboarding() {
  const context = useOnboardingContext();
  return {
    hasSeenTapOnboarding: context.hasSeenTapOnboarding,
    hasSeenSwipeOnboarding: context.hasSeenSwipeOnboarding,
    markTapOnboardingAsSeen: context.markTapOnboardingAsSeen,
    markSwipeOnboardingAsSeen: context.markSwipeOnboardingAsSeen,
    isOnboardingFlagsReady: context.isOnboardingFlagsReady,
    reloadOnboardingFlags: context.reloadOnboardingFlags,
  };
}

export default function OnboardingContextScreen() {
  return null;
} 