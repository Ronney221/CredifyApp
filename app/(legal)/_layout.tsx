import { Stack } from 'expo-router';

export default function LegalLayout() {
  // No auth checks or redirects here – just a plain Stack
  return (
    <Stack
      screenOptions={{
        headerShown: false,           // or true, up to you
        animation: 'slide_from_bottom',
        presentation: 'modal',
      }}
    />
  );
}
