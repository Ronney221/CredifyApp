// contexts/AuthContext.tsx (Corrected Version)

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
// These are the functions we are importing
import { signInWithGoogle, signInWithApple, signInWithEmail } from '../lib/auth-oauth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';

// Define the context shape
interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  storageLoaded: boolean;
  signInGoogle: () => Promise<any>;
  signInApple: () => Promise<any>;
  signInEmail: (email: string, password: string) => Promise<any>;
  signOut: () => Promise<any>;
}

// Create the context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Create the Provider component
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [storageLoaded, setStorageLoaded] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // First ensure storage is loaded
    AsyncStorage.getItem('supabase.auth.token')
      .finally(() => {
        setStorageLoaded(true);
        // Only initialize Supabase auth after storage is confirmed loaded
        initializeAuth();
      });
  }, []);

  const initializeAuth = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setUser(session?.user ?? null);
    } catch (error) {
      console.error('Error getting session:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!storageLoaded) return;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth event:', event);
        setSession(session);
        setUser(session?.user ?? null);

        if (event === 'TOKEN_REFRESH_FAILED') {
          console.warn('[Auth] Token refresh failed, retrying...');
          try {
            const { error: refreshError } = await supabase.auth.refreshSession();
            if (refreshError) {
              console.warn('[Auth] First refresh failed, retrying once...');
              await new Promise(r => setTimeout(r, 1000));
              await supabase.auth.refreshSession();
            }
          } catch (error) {
            console.error('[Auth] All refresh attempts failed:', error);
            Alert.alert(
              'Session expired',
              'Please sign in again.',
              [{ text: 'OK', onPress: () => router.replace('/(auth)/login') }],
            );
          }
        }

        if (event === 'SIGNED_OUT') {
          router.replace('/(auth)/login');
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [storageLoaded, router]);

  // --- THIS IS THE FIX ---
  // We now correctly assign the imported functions to the context value.
  const value = {
    user,
    session,
    loading,
    storageLoaded,
    signInGoogle: signInWithGoogle, // Assign the imported function
    signInApple: signInWithApple,   // Assign the imported function
    signInEmail: signInWithEmail,   // Assign the imported function
    signOut: () => supabase.auth.signOut(),
  };
  // --------------------

  // Don't render children until storage is loaded
  if (!storageLoaded) {
    return null;
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Create the consumer hook
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};