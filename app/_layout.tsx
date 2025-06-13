// app/_layout.tsx

import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { OnboardingProvider } from './(onboarding)/_context/OnboardingContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

// Add a new component to handle authentication state and routing
function AuthStateHandler() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inOnboardingGroup = segments[0] === '(onboarding)';

    const checkOnboardingStatus = async () => {
      try {
        const hasCompletedOnboarding = await AsyncStorage.getItem('@hasCompletedOnboarding');
        
        if (!user) {
          // Not signed in
          if (!inAuthGroup) {
            router.replace('/(auth)/login');
          }
        } else {
          // Signed in
          if (hasCompletedOnboarding === null) {
            // New user, hasn't completed onboarding
            if (!inOnboardingGroup) {
              router.replace('/(onboarding)/welcome');
            }
          } else {
            // Returning user, has completed onboarding
            if (inAuthGroup || inOnboardingGroup) {
              router.replace('/(tabs)/01-dashboard');
            }
          }
        }
      } catch (error) {
        console.error('Error checking onboarding status:', error);
      }
    };

    checkOnboardingStatus();
  }, [user, loading, segments]);

  return null;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
        <AuthProvider>
          <OnboardingProvider>
            <AuthStateHandler />
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