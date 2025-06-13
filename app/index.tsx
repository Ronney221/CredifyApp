// app/index.tsx

import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext'; // Adjust path
import AsyncStorage from '@react-native-async-storage/async-storage';

const AppGateway = () => {
  const { session, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (authLoading) return; // Wait for the auth session to load

    const checkOnboardingStatus = async () => {
      if (session) {
        // User is logged in, always go to the dashboard
        router.replace('/(tabs)/01-dashboard');
        return;
      }
      
      const hasCompletedOnboarding = await AsyncStorage.getItem('@hasCompletedOnboarding');

      if (hasCompletedOnboarding) {
        // Returning user, go to login
        router.replace('/(auth)/login');
      } else {
        // New user, start onboarding
        router.replace('/(onboarding)/welcome');
      }
    };

    checkOnboardingStatus();
  }, [authLoading, session, router]);

  // Show a loading spinner while we figure out where to go
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default AppGateway;