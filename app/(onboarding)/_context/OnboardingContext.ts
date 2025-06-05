import { createContext, useContext } from 'react';

export interface OnboardingContextType {
  step: number; // 0-indexed internally
  setStep: (step: number) => void;
  totalSteps: number;
  isHeaderGloballyHidden: boolean;
  setIsHeaderGloballyHidden: (hidden: boolean) => void;
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