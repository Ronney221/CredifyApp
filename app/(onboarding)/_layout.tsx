import { Stack } from 'expo-router';
import React from 'react';

export default function OnboardingLayout() {
  return (
    <Stack>
      <Stack.Screen 
        name="card-select" 
        options={{
          title: 'Add Your Cards (1 of 3)',
        }} 
      />
      <Stack.Screen 
        name="notification-prefs" 
        options={{
          title: 'Notifications (2 of 3)',
        }} 
      />
      <Stack.Screen 
        name="onboarding-complete" 
        options={{
          title: 'Setup Complete (3 of 3)',
          headerBackVisible: false,
          gestureEnabled: false,
        }} 
      />
      {/* Add other onboarding screens here as needed */}
    </Stack>
  );
} 