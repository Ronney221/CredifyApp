// hooks/useProtectedRoute.ts

import { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext'; // Make sure this path is correct
import { useRouter, useSegments, useRootNavigationState } from 'expo-router';

export function useProtectedRoute() {
  const { user, isReady } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const navigationState = useRootNavigationState();

  useEffect(() => {
    if (!isReady || !navigationState?.key) {
      return;
    }

    const inAuthGroup = segments[0] === '(auth)';
    const inOnboardingGroup = segments[0] === '(onboarding)';

    if (user) {
      if (inAuthGroup) {
        router.replace('/');
      } else if (!inOnboardingGroup && !user.user_metadata?.full_name) {
        const isEditingProfile = segments.join('/') === '(tabs)/profile/edit-profile';
        if (!isEditingProfile) {
          router.replace('/(tabs)/profile/edit-profile');
        }
      }
    } else {
      if (!inAuthGroup && !inOnboardingGroup) {
        router.replace('/login');
      }
    }
  }, [user, segments, isReady, navigationState, router]);
}