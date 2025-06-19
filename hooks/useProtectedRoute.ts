// hooks/useProtectedRoute.ts

import { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext'; // Make sure this path is correct
import { useRouter, useSegments } from 'expo-router';

export function useProtectedRoute() {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    const inTabsGroup = segments[0] === '(tabs)';

    // If the auth state is still loading, or the user is not in a protected area, do nothing.
    if (loading || !inTabsGroup) {
      return;
    }

    if (!session) {
      // Redirect to the login page if the user is not authenticated.
      router.replace('/(auth)/login');
    }
  }, [session, loading, segments, router]);
}