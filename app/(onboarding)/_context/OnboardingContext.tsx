import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
import { Card } from '../../../src/data/card-data';
import AsyncStorage from '@react-native-async-storage/async-storage';

const HAS_REDEEMED_FIRST_PERK_KEY = '@has_redeemed_first_perk';

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

  // Load hasRedeemedFirstPerk from AsyncStorage on mount
  useEffect(() => {
    const loadRedemptionState = async () => {
      try {
        const value = await AsyncStorage.getItem(HAS_REDEEMED_FIRST_PERK_KEY);
        if (value !== null) {
          setHasRedeemedFirstPerk(JSON.parse(value));
        }
      } catch (error) {
        console.error('Error loading redemption state:', error);
      }
    };
    loadRedemptionState();
  }, []);

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

  // Perk Redemption Functions
  const markFirstPerkRedeemed = useCallback(async () => {
    try {
      await AsyncStorage.setItem(HAS_REDEEMED_FIRST_PERK_KEY, JSON.stringify(true));
      setHasRedeemedFirstPerk(true);
    } catch (error) {
      console.error('Error saving redemption state:', error);
    }
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

export default null; 