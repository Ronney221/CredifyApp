import 'react-native-url-polyfill/auto';
import { createClient, SupabaseClientOptions } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { decode } from 'base64-arraybuffer';

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

// Profile and avatar management
export const updateUserProfile = async (updates: { 
  full_name?: string;
  avatar_url?: string;
}) => {
  const { data: { user }, error } = await supabase.auth.updateUser({
    data: updates
  });
  return { user, error };
};

export const uploadAvatar = async (uri: string, userId: string): Promise<{ url?: string; error?: Error }> => {
  try {
    console.log('Starting avatar upload for user:', userId);
    
    // Get the current user's metadata to find the existing avatar URL
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;

    // If there's an existing avatar, delete it
    if (user?.user_metadata?.avatar_url) {
      const existingAvatarPath = user.user_metadata.avatar_url.split('/').pop();
      if (existingAvatarPath) {
        console.log('Deleting existing avatar:', existingAvatarPath);
        const { error: deleteError } = await supabase.storage
          .from('avatars')
          .remove([existingAvatarPath]);
        
        if (deleteError) {
          console.warn('Error deleting existing avatar:', deleteError);
          // Continue with upload even if delete fails
        }
      }
    }

    // Convert URI to Blob
    const response = await fetch(uri);
    const blob = await response.blob();
    
    // Verify blob is not empty
    if (blob.size === 0) {
      console.error('Blob is empty');
      throw new Error('Selected image is empty');
    }

    // Generate a unique file name
    const fileExt = uri.split('.').pop();
    const fileName = `${userId}_${Date.now()}.${fileExt}`;
    const filePath = fileName;

    console.log('Uploading file:', { fileName, filePath, size: blob.size });

    // Convert blob to base64 for Supabase storage
    const fileReader = new FileReader();
    const base64Promise = new Promise((resolve, reject) => {
      fileReader.onerror = () => reject(new Error('Failed to read file'));
      fileReader.onload = () => resolve(fileReader.result);
      fileReader.readAsDataURL(blob);
    });

    const base64String = await base64Promise;
    const base64Data = (base64String as string).split(',')[1];
    
    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, decode(base64Data), {
        contentType: blob.type,
        cacheControl: '3600',
        upsert: true
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw uploadError;
    }

    console.log('Upload successful, getting public URL');

    // Get public URL
    const { data } = await supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    console.log('Got public URL:', data.publicUrl);
    return { url: data.publicUrl };
  } catch (error) {
    console.error('Error uploading avatar:', error);
    return { error: error as Error };
  }
};

export const deleteAvatar = async (userId: string) => {
  try {
    const { error } = await supabase.storage
      .from('avatars')
      .remove([`avatars/${userId}`]);
    
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error deleting avatar:', error);
    return { error };
  }
}; 