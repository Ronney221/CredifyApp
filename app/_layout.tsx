import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { AuthProvider } from '../contexts/AuthContext';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as Linking from 'expo-linking';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useEffect(() => {
    // Hide splash screen after a short delay
    const hideSplashScreen = async () => {
      await SplashScreen.hideAsync();
    };
    
    const timer = setTimeout(hideSplashScreen, 1000);
    return () => clearTimeout(timer);
  }, []);

  // Handle deep links when app is already running
  useEffect(() => {
    const handleDeepLink = (url: string) => {
      console.log('Deep link received:', url);
      // The router will automatically handle the navigation
      // based on the URL structure
    };

    // Listen for incoming links when app is running
    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleDeepLink(url);
    });

    // Handle initial URL when app is opened from a link
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink(url);
      }
    });

    return () => subscription?.remove();
  }, []);

  return (
    <AuthProvider>
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen 
          name="(auth)" 
          options={{
            headerShown: false,
            presentation: 'modal',
          }}
        />
        <Stack.Screen name="auth/callback" />
        <Stack.Screen name="auth/confirm" />
        <Stack.Screen name="card-selection" />
        <Stack.Screen name="(tabs)" />
      </Stack>
      <StatusBar style="auto" />
    </AuthProvider>
  );
} 