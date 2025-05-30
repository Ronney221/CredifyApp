import { makeRedirectUri } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from './supabase';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

WebBrowser.maybeCompleteAuthSession();

export const signInWithGoogle = async () => {
  const redirectUrl = 'credify://auth/callback';
  console.log('Using redirect URL:', redirectUrl);

  // Kick off OAuth; supabase-js will open the browser for you
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: redirectUrl },
  });
  
  if (error) {
    console.error('Supabase OAuth error:', error);
    return { data: null, error };
  }

  // Manually handle the browser flow so we can close it on redirect
  const result = await WebBrowser.openAuthSessionAsync(
    data.url,
    redirectUrl
  );

  console.log('WebBrowser result:', result);

  if (result.type === 'success' && result.url) {
    // The URL contains the callback with tokens in the hash
    console.log('OAuth success, callback URL:', result.url);
    
    // Get the hash fragment (remove the leading #)
    const hash = result.url.split('#')[1];
    // Parse the hash string into an object
    const hashParams = new URLSearchParams(hash);
    
    const access_token = hashParams.get('access_token');
    const refresh_token = hashParams.get('refresh_token');

    if (access_token) {
      console.log('Setting session with tokens');
      const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
        access_token,
        refresh_token: refresh_token || '',
      });

      if (sessionError) {
        console.error('Session error:', sessionError);
        return { data: null, error: sessionError };
      }

      console.log('Session set successfully:', sessionData);
      return { data: sessionData, error: null };
    } else {
      console.log('No access token found in callback URL hash');
      return { data: null, error: { message: 'No access token received' } };
    }
  } else if (result.type === 'cancel') {
    console.log('OAuth cancelled by user');
    return { data: null, error: { message: 'Authentication was cancelled' } };
  } else {
    console.log('OAuth failed:', result);
    return { data: null, error: { message: 'Authentication failed' } };
  }
};

// Placeholder for Apple Sign In (disabled for now)
export const signInWithApple = async () => {
  return { 
    data: null, 
    error: { message: 'Apple Sign In is temporarily disabled. Please use email or Google authentication.' } 
  };
};

// OAuth configuration helpers
export const getOAuthRedirectUrl = () => {
  return makeRedirectUri();
}; 