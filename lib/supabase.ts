import 'react-native-url-polyfill/auto';
import { createClient, SupabaseClientOptions } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

const isWeb = Platform.OS === 'web';

const supabaseOptions: SupabaseClientOptions<'public'> = {
  auth: {
    storage: isWeb && typeof window !== 'undefined' ? localStorage : AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: isWeb, // Only true for web
  },
  // Explicitly configure realtime. For mobile, we can pass minimal or no options
  // if we don't intend to use realtime, or provide React Native specific ones if needed.
  // To fully prevent 'ws' issues, ensure no realtime connection is attempted on mobile.
  realtime: isWeb ? undefined : { params: {} }, // Pass undefined for web to use defaults, or empty for mobile to potentially avoid 'ws'
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, supabaseOptions);

// Auth helper functions
export const signInWithEmail = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
};

export const signUpWithEmail = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  return { data, error };
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  return { error };
};

export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  return { user, error };
};

export const resetPassword = async (email: string) => {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email);
  return { data, error };
}; 