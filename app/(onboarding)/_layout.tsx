import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="card-select" />
      <Stack.Screen name="notification-prefs" />
      {/* Add other onboarding screens here */}
    </Stack>
  );
} 