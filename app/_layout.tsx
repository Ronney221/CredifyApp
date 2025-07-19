// app/_layout.tsx

import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { OnboardingProvider } from './(onboarding)/_context/OnboardingContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../constants/Colors';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import * as Sentry from '@sentry/react-native';
import { RootSiblingParent } from 'react-native-root-siblings';
import { setupNotificationHandler } from '../utils/notification-handler';

// Initialize notification handler
setupNotificationHandler();

Sentry.init({
  dsn: 'https://3db3be6e5d65a5d41c649684dad25607@o4509597568204800.ingest.us.sentry.io/4509597574103040',

  // Adds more context data to events (IP address, cookies, user, etc.)
  // For more information, visit: https://docs.sentry.io/platforms/react-native/data-management/data-collected/
  sendDefaultPii: true,

  // Configure Session Replay
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1,
  integrations: [Sentry.mobileReplayIntegration(), Sentry.feedbackIntegration()],

  // uncomment the line below to enable Spotlight (https://spotlightjs.com)
  // spotlight: __DEV__,
});

//Sentry.captureException(new Error('Testing Sentry connection on app launch.'));

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
    const inTabsGroup = segments[0] === '(tabs)';

    const checkOnboardingStatus = async () => {
      try {
        console.log('🔍 [Layout] Checking auth state...');
        console.log('👤 User:', user ? 'exists' : 'none');
        console.log('📍 Full segments array:', segments);
        console.log('📍 Current segment:', segments[0]);
        console.log('🏷️ inAuthGroup:', inAuthGroup, 'inOnboardingGroup:', inOnboardingGroup, 'inTabsGroup:', inTabsGroup, 'inLegalGroup:', inLegalGroup);
        
        const hasCompletedOnboarding = await AsyncStorage.getItem('@hasCompletedOnboarding');
        console.log('🎯 [Layout] hasCompletedOnboarding:', hasCompletedOnboarding);

        // If segments is undefined or empty, we're at the root
        if (!segments || segments.length === 0 || !segments[0]) {
          console.log('➡️ [Layout] At root (segments empty/undefined), determining initial route...');
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
          console.log('✅ [Layout] User is signed in');
          if (inAuthGroup || inOnboardingGroup) {
            console.log('➡️ [Layout] User is in auth/onboarding group, routing to dashboard');
            router.replace('/(tabs)/01-dashboard');
          } else if (inTabsGroup) {
            console.log('✅ [Layout] User is already in tabs group, no redirect needed');
          } else if (inLegalGroup) {
            console.log('✅ [Layout] User is in legal group, no redirect needed');
          } else {
            console.log('❓ [Layout] User is in unknown group, segments:', segments);
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

export default Sentry.wrap(function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.container}>
      <RootSiblingParent>
        <SafeAreaProvider>
          <AuthProvider>
            <OnboardingProvider>
              <AuthStateHandler />
              <RootStack />
            </OnboardingProvider>
          </AuthProvider>
        </SafeAreaProvider>
      </RootSiblingParent>
    </GestureHandlerRootView>
  );
});

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
});