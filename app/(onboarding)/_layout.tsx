import { Stack } from 'expo-router';
import React from 'react';

export default function OnboardingLayout() {
  return (
    <Stack>
      <Stack.Screen 
        name="card-select" 
        options={{
          title: 'Add your first card (1 of 3)',
        }} 
      />
      <Stack.Screen 
        name="notification-prefs" 
        options={{
          title: 'Notification Preferences (2 of 3)',
        }} 
      />
      {/* Add other onboarding screens here as needed */}
    </Stack>
  );
} 