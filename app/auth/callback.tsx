import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../lib/supabase';

export default function AuthCallback() {
  const router = useRouter();
  const params = useLocalSearchParams();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        console.log('Auth callback params:', params);
        
        // Extract tokens from URL parameters
        const { access_token, refresh_token, error } = params;
        
        if (error) {
          console.error('OAuth error:', error);
          router.replace('/');
          return;
        }

        if (access_token) {
          const { data, error: sessionError } = await supabase.auth.setSession({
            access_token: access_token as string,
            refresh_token: refresh_token as string || '',
          });

          if (sessionError) {
            console.error('Session error:', sessionError);
            router.replace('/');
          } else {
            console.log('Authentication successful:', data);
            router.replace('/(onboarding)/card-select');
          }
        } else {
          console.log('No access token found, redirecting to index');
          router.replace('/');
        }
      } catch (error) {
        console.error('Callback handler error:', error);
        router.replace('/');
      }
    };

    handleAuthCallback();
  }, [params, router]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color="#007aff" />
      <Text style={{ marginTop: 16, fontSize: 16 }}>
        Completing authentication...
      </Text>
    </View>
  );
} 