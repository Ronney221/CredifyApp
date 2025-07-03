// lib/auth-oauth.ts
import { makeRedirectUri } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from './supabase';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as AppleAuthentication from 'expo-apple-authentication';

WebBrowser.maybeCompleteAuthSession();

const redirectUrl = makeRedirectUri({
  scheme: 'credify',
  path: 'auth/callback',   // gives credify://auth/callback in prod
});

// Log Supabase connection details for debugging
const supabaseUrl = Constants.expoConfig?.extra?.SUPABASE_URL;
const supabaseAnonKey = Constants.expoConfig?.extra?.SUPABASE_KEY;

console.log('--- Supabase Auth ---');
console.log('Redirect URL:', redirectUrl);
console.log('Supabase URL:', supabaseUrl ? 'Loaded' : 'MISSING');
console.log('Supabase Anon Key:', supabaseAnonKey ? 'Loaded' : 'MISSING');
console.log('---------------------');

export const signInWithGoogle = async () => {
  console.log('[Auth] Attempting Google Sign-In...');
  
  try {
    // Kick off OAuth; supabase-js will open the browser for you
    console.log('[Auth] Initiating Supabase OAuth flow...');
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { 
        redirectTo: redirectUrl,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent'
        }
      },
    });
    
    if (error) {
      console.error('[Auth] Supabase OAuth Error:', error.message);
      return { data: null, error };
    }
    
    if (!data.url) {
      console.error('[Auth] No URL returned from Supabase OAuth.');
      return { data: null, error: { message: 'No URL returned from Supabase' } };
    }

    // Manually handle the browser flow so we can close it on redirect
    console.log('[Auth] Opening WebBrowser for URL:', data.url);
    const result = await WebBrowser.openAuthSessionAsync(
      data.url,
      redirectUrl,
      { showInRecents: true }  // This might help with iOS 14+ issues
    );
    console.log('[Auth] WebBrowser Result:', result);

    if (result.type === 'success' && result.url) {
      // The URL contains the callback with tokens in the hash
      console.log('[Auth] OAuth success, callback URL:', result.url);
      
      // Get the hash fragment (remove the leading #)
      const hash = result.url.split('#')[1];
      if (!hash) {
        console.error('[Auth] No hash found in callback URL.');
        return { data: null, error: { message: 'Invalid callback URL' } };
      }
      
      // Parse the hash string into an object
      const hashParams = new URLSearchParams(hash);
      
      const access_token = hashParams.get('access_token');
      const refresh_token = hashParams.get('refresh_token');

      console.log('[Auth] Tokens extracted:', { 
        hasAccessToken: !!access_token,
        hasRefreshToken: !!refresh_token 
      });

      if (access_token) {
        console.log('[Auth] Found access token. Setting session...');
        const sessionData = {
          access_token,
          ...(refresh_token && { refresh_token }),
        };
        
        const { data: sessionResponse, error: sessionError } = await supabase.auth.setSession(sessionData as any);

        if (sessionError) {
          console.error('[Auth] Supabase setSession Error:', sessionError.message);
          return { data: null, error: sessionError };
        }

        console.log('[Auth] Session set successfully. User:', sessionResponse.user?.id);
        return { data: sessionResponse, error: null };
      }
      
      console.error('[Auth] No access token found in callback URL.');
      return { data: null, error: { message: 'No access token received' } };
    } else if (result.type === 'cancel' || result.type === 'dismiss') {
      console.log('[Auth] OAuth flow cancelled or dismissed by user.');
      return { data: null, error: { message: 'User cancelled' } };
    }
    
    console.error('[Auth] Unknown error during WebBrowser flow.');
    return { data: null, error: { message: 'Unknown error occurred' } };
  } catch (error) {
    console.error('[Auth] Unexpected error during Google Sign In:', error);
    console.error('[Auth] Unexpected error during Google Sign In:', error);
    return { data: null, error };
  }
};

export const signInWithApple = async () => {
  console.log('[Auth] Attempting Apple Sign-In...');
  try {
    console.log('[Auth] Requesting Apple authentication...');
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });
    console.log('[Auth] Apple credential received.');

    if (credential.identityToken) {
      console.log('[Auth] Identity token found, signing in with Supabase...');
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
      });

      if (error) {
        console.error('[Auth] Supabase Apple Sign In Error:', error.message);
        return { data: null, error };
      }

      console.log('[Auth] Apple Sign In successful. User:', data.user?.id);
      return { data, error: null };
    }
    
    console.error('[Auth] No identity token received from Apple.');
    return { data: null, error: { message: 'No identity token received from Apple' } };
  } catch (error: any) {
    if (error.code === 'ERR_REQUEST_CANCELED') {
      console.log('[Auth] Apple Sign In cancelled by user.');
      return { data: null, error: { message: 'User cancelled' } };
    }
    console.error('[Auth] Unexpected error during Apple Sign In:', error);
    console.error('[Auth] Unexpected error during Apple Sign In:', error);
    return { data: null, error };
  }
};

export const signInWithEmail = async (email: string, password: string) => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('Supabase Email Sign In error:', error);
      return { data: null, error };
    }

    console.log('Email Sign In successful');
    return { data, error: null };
  } catch (error: any) {
    console.error('Unexpected error during Email Sign In:', error);
    return { data: null, error };
  }
};

// OAuth configuration helpers
// No longer needed 