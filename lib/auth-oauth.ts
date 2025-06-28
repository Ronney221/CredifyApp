import { makeRedirectUri } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from './supabase';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as AppleAuthentication from 'expo-apple-authentication';

WebBrowser.maybeCompleteAuthSession();

// Get the redirect URL based on the environment
const getRedirectUrl = () => {
  if (__DEV__) {
    // In development, use the Expo redirect
    return makeRedirectUri({
      scheme: 'credify',
      path: 'auth/callback'
    });
  } else {
    // In production, use the explicit URL
    return 'credify://auth/callback';
  }
};

export const signInWithGoogle = async () => {
  const redirectUrl = getRedirectUrl();
  console.log('[Auth] Starting Google sign in with redirect URL:', redirectUrl);

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
      console.error('[Auth] Supabase OAuth error:', error);
      return { data: null, error };
    }

    console.log('[Auth] OAuth URL received:', data.url?.substring(0, 30) + '...');

    // Manually handle the browser flow so we can close it on redirect
    console.log('[Auth] Opening auth session in browser...');
    const result = await WebBrowser.openAuthSessionAsync(
      data.url,
      redirectUrl,
      { showInRecents: true }  // This might help with iOS 14+ issues
    );

    console.log('[Auth] Browser session result:', { type: result.type });

    if (result.type === 'success' && result.url) {
      console.log('[Auth] Success URL received:', result.url.substring(0, 30) + '...');
      
      // Get the hash fragment (remove the leading #)
      const hash = result.url.split('#')[1];
      // Parse the hash string into an object
      const hashParams = new URLSearchParams(hash);
      
      const access_token = hashParams.get('access_token');
      const refresh_token = hashParams.get('refresh_token');

      console.log('[Auth] Tokens extracted:', { 
        hasAccessToken: !!access_token,
        hasRefreshToken: !!refresh_token 
      });

      if (access_token) {
        console.log('[Auth] Setting session with tokens...');
        const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
          access_token,
          refresh_token: refresh_token ?? undefined,
        });

        if (sessionError) {
          console.error('[Auth] Session error:', sessionError);
          return { data: null, error: sessionError };
        }

        console.log('[Auth] Session set successfully');
        return { data: sessionData, error: null };
      }
      
      return { data: null, error: { message: 'No access token received' } };
    } else if (result.type === 'cancel') {
      console.log('[Auth] OAuth cancelled by user');
      return { data: null, error: { message: 'User cancelled' } };
    }
    
    return { data: null, error: { message: 'Unknown error occurred' } };
  } catch (error) {
    console.error('[Auth] Unexpected error during Google Sign In:', error);
    return { data: null, error };
  }
};

export const signInWithApple = async () => {
  console.log('[Auth] Starting Apple sign in...');
  try {
    console.log('[Auth] Requesting Apple authentication...');
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    console.log('[Auth] Apple credential received:', {
      hasIdentityToken: !!credential.identityToken,
      hasEmail: !!credential.email,
      hasFullName: !!(credential.fullName?.givenName || credential.fullName?.familyName)
    });

    if (credential.identityToken) {
      console.log('[Auth] Signing in with Apple ID token...');
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
      });

      if (error) {
        console.error('[Auth] Supabase Apple Sign In error:', error);
        return { data: null, error };
      }

      console.log('[Auth] Apple Sign In successful');
      return { data, error: null };
    }
    
    return { data: null, error: { message: 'No identity token received from Apple' } };
  } catch (error: any) {
    if (error.code === 'ERR_REQUEST_CANCELED') {
      console.log('[Auth] Apple Sign In cancelled by user');
      return { data: null, error: { message: 'User cancelled' } };
    }
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
export const getOAuthRedirectUrl = () => {
  return makeRedirectUri();
}; 