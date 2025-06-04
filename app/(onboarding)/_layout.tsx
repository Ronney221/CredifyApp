import { Stack, usePathname } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { View, Platform } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import WizardHeader, { WIZARD_HEADER_HEIGHT } from './WizardHeader';
import { OnboardingContext, OnboardingContextType } from './context/OnboardingContext';

// Define onboarding steps order and names (route names)
export const onboardingScreenNames = [
  'card-select',
  'renewal-dates',
  'notification-prefs',
  'onboarding-complete',
];

const totalSteps = onboardingScreenNames.length;

// This component will be the main layout for the onboarding flow
export default function OnboardingLayout() {
  const [currentStep, setCurrentStep] = useState(-1); // 0-indexed, -1 means no specific step for header
  const [isHeaderHidden, setIsHeaderHidden] = useState(false);
  const pathname = usePathname(); // Get current path to help determine initial step for direct loads

  // Effect to set initial step based on path, useful for deep linking or reloads
  useEffect(() => {
    const currentRouteName = pathname.split('/').pop();
    const initialIndex = onboardingScreenNames.indexOf(currentRouteName || '');
    if (initialIndex !== -1) {
      setCurrentStep(initialIndex);
    }
    // Reset header hidden state on deep link / layout mount unless it is for onboarding-complete
    if (currentRouteName !== 'onboarding-complete') {
        setIsHeaderHidden(false);
    }

  }, [pathname]);

  const contextValue: OnboardingContextType = {
    step: currentStep,
    setStep: setCurrentStep,
    totalSteps: totalSteps,
    isHeaderGloballyHidden: isHeaderHidden,
    setIsHeaderGloballyHidden: setIsHeaderHidden,
  };

  return (
    <OnboardingContext.Provider value={contextValue}>
      <SafeAreaProvider> 
        <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff', paddingTop: 32 }} edges={['top']}> 
          <WizardHeader />
          <Stack
            screenOptions={{
              headerShown: false, // Main header is now external WizardHeader
              animation: 'none', // Retain no animation for step transitions
            }}
          >
            <Stack.Screen
              name="card-select" // Corrected name
              options={{
                // No specific header options here anymore, WizardHeader handles it
              }}
            />
            <Stack.Screen
              name="renewal-dates"
              // Dummy headerRight might not be needed anymore if headerShown is false
              // Back button visibility will be handled by screen content or WizardHeader if needed
            />
            <Stack.Screen
              name="notification-prefs"
            />
            <Stack.Screen
              name="onboarding-complete"
              options={{
                gestureEnabled: false,
              }}
            />
          </Stack>
        </SafeAreaView>
      </SafeAreaProvider>
    </OnboardingContext.Provider>
  );
}

// Removed OnboardingHeaderTitle function and its styles as it's replaced by WizardHeader.tsx
// Removed HEADER_BACK_BUTTON_WIDTH_APPROX as it might not be relevant with headerShown: false

const styles = {
  // Placeholder for any styles that might be needed
}; 