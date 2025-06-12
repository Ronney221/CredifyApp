// app/_layout.tsx
import React, { useEffect } from 'react';
import { ActivityIndicator, Alert, View, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Tabs, useRouter, useSegments } from 'expo-router';
import { Platform, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useAuth } from '@/contexts/AuthContext';
import { BlurView } from 'expo-blur';

// Header Right Component for Insights Tab
const InsightsHeaderRight = () => {
  const handleShare = () => Alert.alert('Share feature coming soon!');
  const handleCompareCards = () => Alert.alert("Coming Soon!", "Compare Cards / ROI feature coming soon!");

  return (
    <View style={{ flexDirection: 'row', marginRight: Platform.OS === 'ios' ? 10 : 20 }}>
      <TouchableOpacity onPress={handleShare} style={{ paddingHorizontal: 8, opacity: 0.4 }} disabled>
        <Ionicons name="share-outline" size={24} color={Colors.light.tint} />
      </TouchableOpacity>
      <TouchableOpacity onPress={handleCompareCards} style={{ paddingHorizontal: 8 }}>
        <Ionicons name="ellipsis-horizontal" size={24} color={Colors.light.tint} />
      </TouchableOpacity>
    </View>
  );
};

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (loading) {
      return;
    }

    if (!user) {
      console.log('[TabLayout AuthGuard] User not authenticated, redirecting to login.');
      router.replace('/');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.light.tint} />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.light.tint} />
      </View>
    );
  }

  return <>{children}</>;
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const barStyle = colorScheme === 'dark' ? 'light' : 'dark';

  // Define tab bar styles for iOS
  const iosTabBarStyle = {
    backgroundColor: 'transparent',
    borderTopColor: 'transparent',
    height: 83,
    position: 'absolute' as const,
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: 34,
    paddingTop: 8,
    elevation: 2, // Ensure tab bar content is above the blur
    zIndex: 2, // Ensure tab bar content is above the blur
  };

  // Define tab bar styles for Android
  const androidTabBarStyle = {
    backgroundColor: '#FAFAFE',
    borderTopColor: '#e0e0e0',
    height: 56,
    position: 'absolute' as const,
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: 0,
    paddingTop: 0,
    elevation: 2,
    zIndex: 2,
  };

  // Define blur view styles to match tab bar position
  const blurViewStyle = {
    position: 'absolute' as const,
    bottom: 0,
    left: 0,
    right: 0,
    height: 83,
    elevation: 1, // Place blur behind tab bar content
    zIndex: 1, // Place blur behind tab bar content
  };

  return (
    <View style={{ flex: 1 }}>
      <StatusBar
        style={barStyle}
        backgroundColor={Platform.OS === 'android' ? '#FAFAFE' : 'transparent'}
        translucent={true}
      />
      <AuthGuard>
        {Platform.OS === 'ios' && (
          <BlurView
            intensity={80}
            tint={colorScheme === 'dark' ? 'dark' : 'light'}
            style={blurViewStyle}
          />
        )}
        <Tabs
          initialRouteName="01-dashboard"
          screenOptions={{
            headerShown: false,
            tabBarStyle: Platform.select({
              ios: iosTabBarStyle,
              android: androidTabBarStyle,
            }),
            tabBarItemStyle: {
              paddingVertical: 8,
            },
            tabBarActiveTintColor: Colors.light.tint,
            tabBarInactiveTintColor: '#8e8e93',
          }}
        >
          <Tabs.Screen
            name="01-dashboard"
            options={{
              title: 'Dashboard',
              headerShown: false,
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="home-outline" size={size} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="02-cards"
            options={{
              href: null,
            }}
          />
          <Tabs.Screen
            name="03-insights"
            options={{
              title: 'Your Journey',
              headerShown: true,
              headerRight: () => <InsightsHeaderRight />,
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="analytics-outline" size={size} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="04-profile"
            options={{
              title: 'Profile',
              tabBarIcon: ({ color, focused, size }) => (
                <Ionicons name={focused ? 'person-circle' : 'person-circle-outline'} color={color} size={size} />
              ),
            }}
          />
          <Tabs.Screen
            name="profile/manage_cards"
            options={{
              href: null,
            }}
          />
          <Tabs.Screen
            name="profile/notifications"
            options={{
              href: null,
            }}
          />
          <Tabs.Screen
            name="profile/edit-profile"
            options={{
              href: null,
            }}
          />
          <Tabs.Screen
            name="profile/help-faq"
            options={{
              href: null,
            }}
          />
        </Tabs>
      </AuthGuard>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
});