// app/_layout.tsx

import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { OnboardingProvider } from './(onboarding)/_context/OnboardingContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet, View, ActivityIndicator, Text, Pressable } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../constants/Colors';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import type { ErrorBoundaryProps } from 'expo-router';

// This is a simple Presentational Component. No hooks, no logic.
function RootStack() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* Set the auth group as the initial route by placing it first. */}
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(onboarding)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen 
        name="(legal)" 
        options={{
          presentation: 'modal',
          animation: 'slide_from_bottom',
        }}
      />
    </Stack>
  );
}

// Add a new component to handle authentication state and routing
function AuthStateHandler() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const [isInitialized, setIsInitialized] = React.useState(false);

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inOnboardingGroup = segments[0] === '(onboarding)';
    const inLegalGroup = segments[0] === '(legal)';

    const checkOnboardingStatus = async () => {
      try {
        console.log('🔍 [Layout] Checking auth state...');
        console.log('👤 User:', user ? 'exists' : 'none');
        console.log('📍 Current segment:', segments[0]);
        
        const hasCompletedOnboarding = await AsyncStorage.getItem('@hasCompletedOnboarding');
        console.log('🎯 [Layout] hasCompletedOnboarding:', hasCompletedOnboarding);

        // If segments is undefined or empty, we're at the root
        if (!segments[0]) {
          console.log('➡️ [Layout] At root, determining initial route...');
          if (!user) {
            if (hasCompletedOnboarding === null) {
              console.log('➡️ [Layout] New user at root, routing to welcome');
              router.replace('/(onboarding)/welcome');
            } else {
              console.log('➡️ [Layout] Returning user at root, routing to login');
              router.replace('/(auth)/login');
            }
          } else {
            console.log('➡️ [Layout] Logged in user at root, routing to dashboard');
            router.replace('/(tabs)/01-dashboard');
          }
          return;
        }

        if (!user) {
          // Not signed in
          if (hasCompletedOnboarding === null) {
            // New user, hasn't completed onboarding
            console.log('➡️ [Layout] New user, routing to welcome');
            if (!inOnboardingGroup && !inLegalGroup) {
              router.replace('/(onboarding)/welcome');
            }
          } else {
            // Returning user, has completed onboarding
            console.log('➡️ [Layout] Returning user, routing to login');
            if (!inAuthGroup && !inLegalGroup) {
              router.replace('/(auth)/login');
            }
          }
        } else {
          // Signed in
          console.log('➡️ [Layout] User is logged in, routing to dashboard');
          if ((inAuthGroup || inOnboardingGroup) && !inLegalGroup) {
            router.replace('/(tabs)/01-dashboard');
          }
        }
      } catch (error) {
        console.error('Error checking onboarding status:', error);
      } finally {
        setIsInitialized(true);
      }
    };

    checkOnboardingStatus();
  }, [user, loading, segments]);

  // Show loading state while initializing
  if (!isInitialized || loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.light.tint} />
      </View>
    );
  }

  return null;
}

export function ErrorBoundary(props: ErrorBoundaryProps) {
  return (
    <View style={styles.errorContainer}>
      <Text style={styles.errorTitle}>Something went wrong</Text>
      <Text style={styles.errorMessage}>{props.error.message}</Text>
      <Pressable style={styles.retryButton} onPress={props.retry}>
        <Text style={styles.retryText}>Try Again</Text>
      </Pressable>
    </View>
  );
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#ffffff',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    color: Colors.light.error || '#ff0000',
  },
  errorMessage: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    color: Colors.light.text || '#000000',
  },
  retryButton: {
    backgroundColor: Colors.light.tint || '#2196F3',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});