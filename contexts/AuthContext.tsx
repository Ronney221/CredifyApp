// contexts/AuthContext.tsx (Corrected Version)

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
// These are the functions we are importing
import { signInWithGoogle, signInWithApple, signInWithEmail } from '../lib/auth-oauth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { deleteUserAccount } from '../lib/supabase';

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
  updateUserMetadata?: (updates: Record<string, any>) => Promise<void>;
  deleteAccount: () => Promise<{ error: Error | null }>;
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
    const fetchSession = async () => {
      setLoading(true);
      // Ensure we only try to get the session after storage has been loaded.
      // This is a common pattern to avoid race conditions on mobile.
      await AsyncStorage.getItem('supabase.auth.token');
      setStorageLoaded(true);
      
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    };

    fetchSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth event:', event);
        setSession(session);
        setUser(session?.user ?? null);

        if (event === 'SIGNED_OUT') {
          router.replace('/(auth)/login');
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  useEffect(() => {
    if (loading) return; // Wait for initial session load

    if (!session?.user) {
      // If no user and not loading, we can consider them logged out.
      // You might want to navigate them to a login screen here if appropriate.
    }

  }, [session, loading, router]);

  // --- THIS IS THE FIX ---
  // We now correctly assign the imported functions to the context value.
  const updateUserMetadata = async (updates: Record<string, any>) => {
    // Update local user object shallowly; supabase update handled elsewhere
    setUser(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        user_metadata: {
          ...prev.user_metadata,
          ...updates,
        },
      } as User;
    });
  };

  const deleteAccount = async () => {
    try {
      const result = await deleteUserAccount();
      if (!result.error) {
        try {
          // First sign out from Supabase
          await supabase.auth.signOut();
          
          // Clear all local storage
          await AsyncStorage.clear();
          
          // Clear local state
          setUser(null);
          setSession(null);
          
          // Force navigation to welcome screen
          router.replace('/(onboarding)/welcome');
        } catch (error) {
          console.error('Error during cleanup after account deletion:', error);
          // Even if cleanup fails, we should still navigate away since the account is deleted
          router.replace('/(onboarding)/welcome');
        }
      }
      return { error: result.error as Error | null };
    } catch (error) {
      console.error('Error deleting account:', error);
      return { error: error instanceof Error ? error : new Error('Unknown error') };
    }
  };

  const value = {
    user,
    session,
    loading,
    storageLoaded,
    signInGoogle: signInWithGoogle, // Assign the imported function
    signInApple: signInWithApple,   // Assign the imported function
    signInEmail: signInWithEmail,   // Assign the imported function
    signOut: () => supabase.auth.signOut(),
    updateUserMetadata,
    deleteAccount,
  };
  // --------------------

  // Don't render children until storage is loaded
  if (loading) {
    return null; // Or a loading spinner
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