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

export default function BackButton({ label, fallbackRoute }: BackButtonProps) {
  const navigation = useNavigation();
  const router = useRouter();
  const pathname = usePathname();
  const params = useLocalSearchParams<{ backRoute?: string }>();

  const handlePress = () => {
    // If we have a backRoute parameter, always use it first
    if (params.backRoute) {
      router.replace(params.backRoute as any);
      return;
    }

    // If we can go back and we're not on a tab route, use native back
    if (navigation.canGoBack() && !pathname.startsWith('/(tabs)')) {
      navigation.goBack();
      return;
    }

    // If we have a fallback route, use it
    if (fallbackRoute) {
      router.replace(fallbackRoute as any);
      return;
    }

    // Default behavior based on current path
    if (pathname.includes('/profile/')) {
      router.replace('/(tabs)/04-profile' as any);
    } else if (pathname.includes('/01-dashboard/')) {
      router.replace('/(tabs)/01-dashboard' as any);
    } else {
      router.replace('/(tabs)/04-profile' as any);
    }
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