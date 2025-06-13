// contexts/AuthContext.tsx (Corrected Version)

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
// These are the functions we are importing
import { signInWithGoogle, signInWithApple } from '../lib/auth-oauth';

// Define the context shape
interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signInGoogle: () => Promise<any>;
  signInApple: () => Promise<any>;
  signOut: () => Promise<any>;
}

// Create the context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Create the Provider component
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // --- THIS IS THE FIX ---
  // We now correctly assign the imported functions to the context value.
  const value = {
    user,
    session,
    loading,
    signInGoogle: signInWithGoogle, // Assign the imported function
    signInApple: signInWithApple,   // Assign the imported function
    signOut: () => supabase.auth.signOut(),
  };
  // --------------------

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