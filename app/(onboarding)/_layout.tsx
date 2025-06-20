import { Stack } from 'expo-router';
import { OnboardingProvider } from './_context/OnboardingContext';

export const onboardingScreenNames = [
  'welcome',
  'card-select',
  'potential-savings',
  'register',
] as const;

export default function OnboardingLayout() {
  return (
    <OnboardingProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen
          name="welcome"
          options={{
            gestureEnabled: false,
          }}
        />
        <Stack.Screen
          name="card-select"
          options={{
            gestureEnabled: true,
          }}
        />
        <Stack.Screen
          name="potential-savings"
          options={{
            gestureEnabled: true,
          }}
        />
        <Stack.Screen
          name="register"
          options={{
            gestureEnabled: false,
          }}
        />
      </Stack>
    </OnboardingProvider>
  );
}

// Removed OnboardingHeaderTitle function and its styles as it's replaced by WizardHeader.tsx
// Removed HEADER_BACK_BUTTON_WIDTH_APPROX as it might not be relevant with headerShown: false

const styles = {
  // Placeholder for any styles that might be needed
}; 