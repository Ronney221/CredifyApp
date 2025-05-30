import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../lib/supabase';

export default function EmailConfirm() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [status, setStatus] = useState('confirming');

  useEffect(() => {
    const confirmEmail = async () => {
      try {
        console.log('Email confirmation params:', params);
        
        const { token_hash, type } = params;
        
        if (type === 'signup' && token_hash) {
          const { data, error } = await supabase.auth.verifyOtp({
            token_hash: token_hash as string,
            type: 'signup'
          });

          if (error) {
            console.error('Email confirmation error:', error);
            setStatus('error');
            setTimeout(() => router.replace('/(auth)/login'), 3000);
          } else {
            console.log('Email confirmed successfully:', data);
            setStatus('success');
            setTimeout(() => router.replace('/card-selection'), 2000);
          }
        } else {
          setStatus('error');
          setTimeout(() => router.replace('/(auth)/login'), 3000);
        }
      } catch (error) {
        console.error('Confirmation handler error:', error);
        setStatus('error');
        setTimeout(() => router.replace('/(auth)/login'), 3000);
      }
    };

    confirmEmail();
  }, [params, router]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
      {status === 'confirming' && (
        <>
          <ActivityIndicator size="large" color="#007aff" />
          <Text style={{ marginTop: 16, fontSize: 16, textAlign: 'center' }}>
            Confirming your email...
          </Text>
        </>
      )}
      
      {status === 'success' && (
        <>
          <Text style={{ fontSize: 24, marginBottom: 16, color: '#28a745' }}>✅</Text>
          <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 8, textAlign: 'center' }}>
            Email Confirmed!
          </Text>
          <Text style={{ fontSize: 16, color: '#666', textAlign: 'center' }}>
            Redirecting to your dashboard...
          </Text>
        </>
      )}
      
      {status === 'error' && (
        <>
          <Text style={{ fontSize: 24, marginBottom: 16, color: '#dc3545' }}>❌</Text>
          <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 8, textAlign: 'center' }}>
            Confirmation Failed
          </Text>
          <Text style={{ fontSize: 16, color: '#666', textAlign: 'center' }}>
            Redirecting to login...
          </Text>
        </>
      )}
    </View>
  );
} 