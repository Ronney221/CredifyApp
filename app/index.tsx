// app/index.tsx
import '../polyfills'; 
import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext'; // Adjust path
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function AppGateway() {
  const { session, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (authLoading) return; // Wait for the auth session to load
    console.log('📱 AppGateway: Auth session loaded');
  }, [authLoading, session]);

  return null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});