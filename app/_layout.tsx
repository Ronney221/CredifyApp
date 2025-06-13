// app/_layout.tsx

import React from 'react';
import { Stack } from 'expo-router';
import { AuthProvider } from '../contexts/AuthContext'; // Adjust path
import { OnboardingProvider } from './(onboarding)/_context/OnboardingContext'; // Adjust path
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';

// This is a simple Presentational Component. No hooks, no logic.
function RootStack() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* Set the auth group as the initial route by placing it first. */}
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(onboarding)" />
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
        <AuthProvider>
          <OnboardingProvider>
            <RootStack />
          </OnboardingProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});