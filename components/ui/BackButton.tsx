// components/ui/BackButton.tsx
import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRouter, usePathname, useLocalSearchParams } from 'expo-router';
import { Colors } from '../../constants/Colors';

interface BackButtonProps {
  label?: string;
  fallbackRoute?: string;
}

type ValidRoute = '/(tabs)/04-profile' | '/(tabs)/01-dashboard';

export default function BackButton({ label, fallbackRoute }: BackButtonProps) {
  const navigation = useNavigation();
  const router = useRouter();
  const pathname = usePathname();
  const params = useLocalSearchParams<{ backRoute?: ValidRoute }>();

  const handlePress = () => {
    // 1. First priority: Use backRoute parameter if provided during navigation
    if (params.backRoute) {
      router.replace(params.backRoute as ValidRoute);
      return;
    }

    // 2. Second priority: Handle known sub-routes
    if (pathname.includes('/profile/')) {
      router.replace('/(tabs)/04-profile' as ValidRoute);
      return;
    }

    if (pathname.includes('/01-dashboard/')) {
      router.replace('/(tabs)/01-dashboard' as ValidRoute);
      return;
    }

    // 3. Third priority: Try native back navigation
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    // 4. Fourth priority: Use provided fallback route
    if (fallbackRoute) {
      router.replace(fallbackRoute as ValidRoute);
      return;
    }

    // 5. Last resort: Default to profile
    router.replace('/(tabs)/04-profile' as ValidRoute);
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handlePress}
      hitSlop={10}
    >
      <Ionicons name="chevron-back" size={26} color={Colors.light.tint} />
      {label && <Text style={styles.label}>{label}</Text>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 4,
  },
  label: {
    fontSize: 17,
    color: Colors.light.tint,
    marginLeft: -4,
  },
}); 