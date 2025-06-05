import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase, signInWithEmail, signUpWithEmail, signOut } from '../lib/supabase';
import { signInWithGoogle, signInWithApple } from '../lib/auth-oauth';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ data: any; error: any }>;
  signUp: (email: string, password: string) => Promise<{ data: any; error: any }>;
  signInGoogle: () => Promise<{ data: any; error: any }>;
  signInApple: () => Promise<{ data: any; error: any }>;
  logOut: () => Promise<{ error: any }>;
  resetPassword: (email: string) => Promise<{ data: any; error: any }>;
  updateUserMetadata: (metadata: object) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      const { data: { session: initialSession } } = await supabase.auth.getSession();
      setSession(initialSession);
      setUser(initialSession?.user || null);
      setLoading(false);
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        console.log('Auth state changed:', event, 'Session:', currentSession);
        setSession(currentSession);
        setUser(currentSession?.user || null);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const handleSignIn = async (email: string, password: string) => {
    setLoading(true);
    const result = await signInWithEmail(email, password);
    setLoading(false);
    return result;
  };

  const handleSignUp = async (email: string, password: string) => {
    setLoading(true);
    const result = await signUpWithEmail(email, password);
    setLoading(false);
    return result;
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    const result = await signInWithGoogle();
    setLoading(false);
    return result;
  };

  const handleAppleSignIn = async () => {
    setLoading(true);
    const result = await signInWithApple();
    setLoading(false);
    return result;
  };

  const handleSignOut = async () => {
    setLoading(true);
    const result = await signOut();
    setLoading(false);
    return result;
  };

  const handleResetPassword = async (email: string) => {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email);
    return { data, error };
  };

  const handleUpdateUserMetadata = async (metadata: object): Promise<boolean> => {
    setLoading(true);
    try {
      const { data: updatedUserData, error } = await supabase.auth.updateUser({
        data: metadata,
      });
      if (error) {
        console.error('Error updating user metadata:', error.message);
        setLoading(false);
        return false;
      }
      // Manually update the local user state for immediate UI reflection
      if (updatedUserData?.user) {
        setUser(updatedUserData.user); // Update the user in our context
        console.log('[AuthContext] User state manually updated after metadata change:', updatedUserData.user);
      } else {
        // If for some reason updatedUserData.user is null, try to refresh the session to get the latest user data
        // This is a fallback, ideally updatedUserData.user is populated.
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        if (currentSession?.user) {
          setUser(currentSession.user);
          console.log('[AuthContext] User state refreshed from session after metadata change:', currentSession.user);
        }
      }
      console.log('User metadata updated successfully via context. Updated user object from Supabase:', updatedUserData.user);
      setLoading(false);
      return true;
    } catch (e) {
      console.error('Unexpected error during metadata update:', e);
      setLoading(false);
      return false;
    }
  };

  const value: AuthContextType = {
    user,
    session,
    loading,
    signIn: handleSignIn,
    signUp: handleSignUp,
    signInGoogle: handleGoogleSignIn,
    signInApple: handleAppleSignIn,
    logOut: handleSignOut,
    resetPassword: handleResetPassword,
    updateUserMetadata: handleUpdateUserMetadata,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 