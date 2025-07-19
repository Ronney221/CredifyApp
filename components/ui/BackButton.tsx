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
    // For profile-related screens, always go back to profile
    if (pathname.includes('/profile/')) {
      router.push('/(tabs)/04-profile' as any);
      return;
    }

    // Try native back navigation first if possible
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    // If we have a fallback route, use it
    if (fallbackRoute) {
      router.push(fallbackRoute as any);
      return;
    }

    // Default behavior based on current path
    if (pathname.includes('/01-dashboard/')) {
      router.push('/(tabs)/01-dashboard' as any);
    } else {
      router.push('/(tabs)/04-profile' as any);
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