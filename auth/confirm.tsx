import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '../lib/supabase';
import { logger } from '../utils/logger';

export default function EmailConfirm() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [status, setStatus] = useState('confirming');

  useEffect(() => {
    const confirmEmail = async () => {
      try {
        logger.log('Email confirmation params:', params);
        
        const { token_hash, type } = params;
        
        if (type === 'signup' && token_hash) {
          const { data, error } = await supabase.auth.verifyOtp({
            token_hash: token_hash as string,
            type: 'signup'
          });

          if (error) {
            console.error('Email confirmation error:', error);
            setStatus('error');
            setTimeout(() => router.replace('/'), 3000);
          } else {
            logger.log('Email confirmed successfully:', data);
            setStatus('success');
            setTimeout(() => router.replace('/(tabs)/01-dashboard'), 2000);
          }
        } else {
          setStatus('error');
          setTimeout(() => router.replace('/'), 3000);
        }
      } catch (error) {
        console.error('Confirmation handler error:', error);
        setStatus('error');
        setTimeout(() => router.replace('/'), 3000);
      }
    };

    confirmEmail();
  }, [params, router]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color="#007aff" />
      <Text style={{ marginTop: 16, fontSize: 16 }}>
        {status === 'confirming' && 'Confirming your email...'}
        {status === 'success' && 'Email confirmed! Redirecting...'}
        {status === 'error' && 'Error confirming email. Redirecting...'}
      </Text>
    </View>
  );
} 