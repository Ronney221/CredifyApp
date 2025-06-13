import { makeRedirectUri } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from './supabase';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as AppleAuthentication from 'expo-apple-authentication';

// Ensure browser sessions are cleaned up
WebBrowser.maybeCompleteAuthSession();

// Add a function to safely close any open browser sessions
const closeBrowserSession = async () => {
  try {
    await WebBrowser.dismissBrowser();
  } catch (error) {
    console.log('No active browser session to close');
  }
};

export const signInWithGoogle = async () => {
  const redirectUrl = 'credify://auth/callback';
  console.log('Using redirect URL:', redirectUrl);

  try {
    // First, ensure any existing browser sessions are closed
    await closeBrowserSession();

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

        console.log('Session set successfully');
        return { data: sessionData, error: null };
      }
      
      return { data: null, error: { message: 'No access token received' } };
    } else if (result.type === 'cancel') {
      return { data: null, error: null }; // User cancelled, return without error
    }
    
    return { data: null, error: null };
  } catch (error) {
    console.error('Unexpected error during Google Sign In:', error);
    // Ensure browser session is closed on error
    await closeBrowserSession();
    return { data: null, error };
  }
};

export const signInWithApple = async () => {
  try {
    // First, ensure any existing browser sessions are closed
    await closeBrowserSession();

    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    if (credential.identityToken) {
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
      });

      if (error) {
        console.error('Supabase Apple Sign In error:', error);
        return { data: null, error };
      }

      console.log('Apple Sign In successful');
      return { data, error: null };
    }
    
    return { data: null, error: { message: 'No identity token received from Apple' } };
  } catch (error: any) {
    if (error.code === 'ERR_REQUEST_CANCELED') {
      return { data: null, error: null }; // User cancelled, return without error
    }
    console.error('Unexpected error during Apple Sign In:', error);
    // Ensure browser session is closed on error
    await closeBrowserSession();
    return { data: null, error };
  }
};

// OAuth configuration helpers
export const getOAuthRedirectUrl = () => {
  return makeRedirectUri();
}; 