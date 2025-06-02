// app/_layout.tsx
import React, { useEffect, useState } from 'react';
import { Alert, ActivityIndicator, View, StyleSheet, Text } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Tabs, useRouter, usePathname } from 'expo-router';
import { Platform, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

// Added imports
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../contexts/AuthContext'; // Adjust path if needed
import { supabase } from '../../lib/supabase'; // Adjust path if needed
import { Card, allCards } from '../../src/data/card-data'; // Adjust path if needed
import { saveUserCards, saveUserNotificationSettings, getUserNotificationSettings } from '../../lib/database'; // Adjust path if needed - saveUserNotificationSettings will be created
import {
  scheduleMonthlyPerkResetNotifications,
  scheduleCardRenewalReminder,
  NotificationPreferences, // Ensure this is exported from notifications.ts
  cancelAllScheduledNotificationsAsync,
  requestPermissionsAsync,
} from '../utils/notifications'; // Corrected path

const ONBOARDING_PREFS_KEY = '@onboarding_preferences';

// Header Right Component for Insights Tab
const InsightsHeaderRight = () => {
  const handleShare = () => Alert.alert('Share feature coming soon!');
  const handleCompareCards = () => Alert.alert("Coming Soon!", "Compare Cards / ROI feature coming soon!");

  return (
    <View style={{ flexDirection: 'row', marginRight: Platform.OS === 'ios' ? 10 : 20 }}>
      <TouchableOpacity onPress={handleShare} style={{ paddingHorizontal: 8 }}>
        <Ionicons name="share-outline" size={24} color={Colors.light.tint} />
      </TouchableOpacity>
      <TouchableOpacity onPress={handleCompareCards} style={{ paddingHorizontal: 8 }}>
        <Ionicons name="ellipsis-horizontal" size={24} color={Colors.light.tint} />
      </TouchableOpacity>
    </View>
  );
};

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const barStyle = colorScheme === 'dark' ? 'light' : 'dark';
  const router = useRouter();
  const { user, loading: authLoading } = useAuth(); // Removed isInitialized
  const [isProcessingOnboarding, setIsProcessingOnboarding] = useState(true);
  const pathname = usePathname();

  useEffect(() => {
    const processOnboardingAndAuth = async () => {
      // Wait until auth loading is complete
      if (authLoading) {
        return;
      }

      if (!user) {
        if (!pathname.startsWith('/(auth)') && !pathname.startsWith('/(onboarding)') && pathname !== '/') {
            console.log('[TabLayout] User not authenticated, redirecting to /welcome');
            router.replace('/'); 
        }
        setIsProcessingOnboarding(false);
        return;
      }

      // User is authenticated
      try {
        const onboardingPrefsString = await AsyncStorage.getItem(ONBOARDING_PREFS_KEY);

        if (onboardingPrefsString) {
          console.log('[TabLayout] Found onboarding preferences, processing...');
          const parsedPrefs = JSON.parse(onboardingPrefsString);
          const { selectedCardIds, notificationPreferences } = parsedPrefs;

          // 1. Save Cards
          if (selectedCardIds && Array.isArray(selectedCardIds)) {
            const cardObjectsToSave: Card[] = selectedCardIds
              .map((id: string) => allCards.find(card => card.id === id))
              .filter((card?: Card): card is Card => card !== undefined);
            
            if (cardObjectsToSave.length > 0) {
                await saveUserCards(user.id, cardObjectsToSave, {}); // Passing empty renewal dates
                console.log('[TabLayout] Onboarding cards saved.');
            }
          }

          // 2. Save Notification Preferences to Supabase
          if (notificationPreferences) {
            await saveUserNotificationSettings(user.id, notificationPreferences);
            console.log('[TabLayout] Onboarding notification preferences saved to DB.');
          }
          
          // 3. Schedule Notifications based on onboarding preferences
          const hasPermission = await requestPermissionsAsync();
          if (hasPermission) {
            await cancelAllScheduledNotificationsAsync(); // Clear any old ones
            await scheduleMonthlyPerkResetNotifications(user.id, notificationPreferences);
            // Renewal reminders are not set up here as onboarding doesn't collect renewal dates
            console.log('[TabLayout] Initial notifications scheduled based on onboarding.');
          } else {
            Alert.alert("Permissions Required", "Please enable notifications in settings to receive reminders.");
          }

          // 4. Clear Onboarding Preferences from AsyncStorage
          await AsyncStorage.removeItem(ONBOARDING_PREFS_KEY);
          console.log('[TabLayout] Onboarding preferences cleared from AsyncStorage.');
          
        } else {
          console.log('[TabLayout] No onboarding preferences found. Scheduling notifications with existing settings.');
          // For returning users, load their settings and schedule notifications
          const existingSettings = await getUserNotificationSettings(user.id);
          const hasPermission = await requestPermissionsAsync();
          if (hasPermission) {
            await cancelAllScheduledNotificationsAsync();
            await scheduleMonthlyPerkResetNotifications(user.id, existingSettings || {});
            // Also fetch their cards and schedule renewal reminders if dates exist
            // This part might need more robust logic from 01-dashboard.tsx's setupNotifications
            console.log('[TabLayout] Notifications (re)scheduled for returning user.');
          } 
        }
        // Ensure user is on the dashboard after processing or if no prefs found
        if (pathname !== '/(tabs)/01-dashboard') {
             // router.replace('/(tabs)/01-dashboard');
             // Temporarily disabling this redirect to avoid potential loops during setup.
             // The main goal is processing; navigation should ideally be handled by initial route or other logic.
        }

      } catch (error) {
        console.error('[TabLayout] Error processing onboarding preferences:', error);
        Alert.alert("Error", "There was an issue setting up your account. Please try restarting the app.");
      } finally {
        setIsProcessingOnboarding(false);
      }
    };

    processOnboardingAndAuth();
  }, [user, authLoading, router, pathname]); // Changed from isInitialized to authLoading

  if (authLoading || (isProcessingOnboarding && user)) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.light.tint} />
        <Text style={styles.loadingText}>Setting things up...</Text>
      </View>
    );
  }

  // If user is not authenticated and not on a public/auth path, this part might not be strictly necessary 
  // as the useEffect should redirect. However, it can prevent brief flashes of the Tabs UI.
  if (!user && !pathname.startsWith('/(auth)') && !pathname.startsWith('/(onboarding)') && pathname !== '/') {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.light.tint} />
        <Text style={styles.loadingText}>Redirecting...</Text>
      </View>
    );
  }

  // If user is null and we are on an auth/onboarding path, or if auth is done and user is present, render Tabs
  // This condition allows auth/onboarding screens to render without being prematurely blanked by this layout's loading state.
  if (user || pathname.startsWith('/(auth)') || pathname.startsWith('/(onboarding)') || pathname === '/') {
      return (
        <>
          <StatusBar style={barStyle} />
          <Tabs
            initialRouteName="01-dashboard"
            screenOptions={{
              headerShown: false,
              tabBarStyle: Platform.select({
                ios: {
                  backgroundColor: 'rgba(255, 255, 255, 0.85)',
                  borderTopColor: 'rgba(0, 0, 0, 0.2)',
                  height: 83,
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  paddingBottom: 34,
                  paddingTop: 8,
                },
                android: {
                  backgroundColor: '#ffffff',
                  borderTopColor: '#e0e0e0',
                  height: 56,
                  paddingBottom: 0,
                  paddingTop: 0,
                },
              }),
              tabBarItemStyle: {
                paddingVertical: 8,
              },
              tabBarActiveTintColor: Colors.light.tint,
              tabBarInactiveTintColor: '#8e8e93',
            }}
          >
            <Tabs.Screen
              name="01-dashboard"
              options={{
                title: 'Dashboard',
                headerShown: false,
                tabBarIcon: ({ color, size }) => (
                  <Ionicons name="home-outline" size={size} color={color} />
                ),
              }}
            />
            <Tabs.Screen
              name="02-cards"
              options={{
                title: 'Manage Cards',
                headerShown: true,
                tabBarIcon: ({ color, size }) => (
                  <Ionicons name="card-outline" size={size} color={color} />
                ),
              }}
            />
            <Tabs.Screen
              name="03-insights"
              options={{
                title: 'Your Journey',
                headerShown: true,
                headerRight: () => <InsightsHeaderRight />,
                tabBarIcon: ({ color, size }) => (
                  <Ionicons name="analytics-outline" size={size} color={color} />
                ),
              }}
            />
          </Tabs>
        </>
      );
  }
  // Fallback for any other unhandled case, though the loading indicator should cover most.
  return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.light.tint} />
      </View>
  );
}

// Styles for loading indicator (can be moved to a separate file or enhanced)
const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: Colors.light.background, // Or your app's background
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        color: Colors.light.text,
    }
});