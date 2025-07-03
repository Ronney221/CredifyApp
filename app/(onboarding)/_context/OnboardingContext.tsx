import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
import { Card } from '../../../src/data/card-data';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const HAS_REDEEMED_FIRST_PERK_KEY = '@has_redeemed_first_perk';

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

  // Load initial state
  useEffect(() => {
    const loadState = async () => {
      try {
        console.log('[OnboardingContext] Loading initial state from AsyncStorage');
        const value = await AsyncStorage.getItem(HAS_REDEEMED_FIRST_PERK_KEY);
        console.log('[OnboardingContext] Initial AsyncStorage value:', value);
        
        // Only set to true if explicitly 'true'
        const shouldMarkRedeemed = value === 'true';
        console.log('[OnboardingContext] Setting initial state:', shouldMarkRedeemed);
        setHasRedeemedFirstPerk(shouldMarkRedeemed);
      } catch (error) {
        console.error('[OnboardingContext] Error loading state:', error);
      }
    };
    loadState();
  }, []);

  const markFirstPerkRedeemed = useCallback(async () => {
    console.log('[OnboardingContext] Marking first perk as redeemed');
    try {
      await AsyncStorage.setItem(HAS_REDEEMED_FIRST_PERK_KEY, 'true');
      const verifyValue = await AsyncStorage.getItem(HAS_REDEEMED_FIRST_PERK_KEY);
      console.log('[OnboardingContext] Verified AsyncStorage value after set:', verifyValue);
      setHasRedeemedFirstPerk(true);
    } catch (error) {
      console.error('[OnboardingContext] Error marking first perk redeemed:', error);
    }
  }, []);

  const resetFirstPerkRedemption = useCallback(async () => {
    console.log('[OnboardingContext] Resetting first perk redemption state');
    try {
      await AsyncStorage.removeItem(HAS_REDEEMED_FIRST_PERK_KEY);
      const verifyValue = await AsyncStorage.getItem(HAS_REDEEMED_FIRST_PERK_KEY);
      console.log('[OnboardingContext] Verified AsyncStorage value after reset:', verifyValue);
      setHasRedeemedFirstPerk(false);
    } catch (error) {
      console.error('[OnboardingContext] Error resetting first perk:', error);
    }
  }, []);

  useEffect(() => {
    console.log('[OnboardingContext] State changed:', {
      hasRedeemedFirstPerk,
      timestamp: new Date().toISOString()
    });
  }, [hasRedeemedFirstPerk]);

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

  // --- This is an example, you should determine the total steps for your flow ---
  const totalSteps = 4; // e.g., Welcome, Card Select, Renewal Dates, Potential Savings

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

export default function OnboardingContextScreen() {
  return null;
} 