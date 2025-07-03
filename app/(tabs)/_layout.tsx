// app/_layout.tsx
import React from 'react';
import { ActivityIndicator, Alert, View, StyleSheet, Animated , Platform, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Tabs } from 'expo-router';

import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { useColorScheme } from '../../hooks/useColorScheme';
import { BlurView } from 'expo-blur';
import { useProtectedRoute } from '../../hooks/useProtectedRoute';
import { HapticTab } from '../../components/HapticTab';
import TabBarBackground from '../../components/ui/TabBarBackground';

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

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const barStyle = colorScheme === 'dark' ? 'light' : 'dark';

  // Protect all routes in this group
  useProtectedRoute();

  // Define iOS pill-style tab bar
  const iosPillTabBarStyle = {
    backgroundColor: 'transparent',
    borderTopColor: 'transparent',
    position: 'absolute' as const,
    bottom: 20, // Sits above home indicator
    left: 20, // Good width for most devices
    right: 20,
    height: 56,
    paddingBottom: 4,
    paddingTop: 4,
    borderRadius: 30,
    elevation: 4, // Increased for more shadow
    zIndex: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
  };

  // Define iOS pill-style blur
  const iosPillBlurStyle = {
    position: 'absolute' as const,
    bottom: 20,
    left: 20,
    right: 20,
    height: 56,
    borderRadius: 30,
    overflow: 'hidden' as const,
    elevation: 1,
    zIndex: 1,
  };

  // Overlay style for white contrast
  const iosPillOverlayStyle = {
    ...iosPillBlurStyle,
    backgroundColor: 'rgba(255,255,255,0.7)',
    zIndex: 2,
  };

  // Define Android tab bar style
  const androidTabBarStyle = {
    backgroundColor: '#FAFAFE',
    borderTopColor: '#e0e0e0',
    height: 52,
    position: 'absolute' as const,
    bottom: 0, // Android safe area
    left: 20,
    right: 20,
    paddingBottom: 0,
    paddingTop: 0,
    elevation: 2,
    zIndex: 2,
    borderRadius: 30,
  };

  // Animation for active tab icon
  function AnimatedTabIcon({ name, color, size, focused }: { name: any; color: string; size: number; focused: boolean }) {
    return (
      <Animated.View style={{ transform: [{ scale: focused ? 1.12 : 1 }] }}>
        <Ionicons name={name} size={size} color={color} />
      </Animated.View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <StatusBar
        style={barStyle}
        backgroundColor={Platform.OS === 'android' ? '#FAFAFE' : 'transparent'}
        translucent={true}
      />
      {Platform.OS === 'ios' && (
        <>
          <BlurView
            intensity={20} // Increased from 50
            tint={'light'}
            style={iosPillBlurStyle}
          />
          <View pointerEvents="none" style={iosPillOverlayStyle} />
        </>
      )}
      <Tabs
        initialRouteName="01-dashboard"
        screenOptions={{
          headerShown: false,
          tabBarStyle: Platform.select({
            ios: iosPillTabBarStyle,
            android: androidTabBarStyle,
          }),
          tabBarItemStyle: {
            minHeight: 44,
            minWidth: 44,
            justifyContent: 'center',
            alignItems: 'center',
          },
          tabBarActiveTintColor: Colors.light.tint,
          tabBarInactiveTintColor: Platform.select({
            ios: 'rgba(0, 0, 0, 0.65)', // Increased opacity for readability
            android: '#8e8e93',
          }),
        }}
      >
        <Tabs.Screen
          name="01-dashboard"
          options={{
            title: 'Home',
            headerShown: false,
            tabBarIcon: ({ color, size, focused }) => (
              <AnimatedTabIcon name="card-outline" color={color} size={size} focused={focused} />
            ),
            tabBarAccessibilityLabel: 'Dashboard',
          }}
        />
        <Tabs.Screen
          name="03-insights"
          options={{
            title: 'Insights',
            headerShown: false,
            tabBarIcon: ({ color, size, focused }) => (
              <AnimatedTabIcon name="rocket-outline" color={color} size={size} focused={focused} />
            ),
            tabBarAccessibilityLabel: 'Your Journey',
          }}
        />
        <Tabs.Screen
          name="04-profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color, focused, size }) => (
              <AnimatedTabIcon name={'person-outline'} color={color} size={size} focused={focused} />
            ),
            tabBarAccessibilityLabel: 'Profile',
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
        <Tabs.Screen
          name="profile/reminders/first-of-month"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="profile/reminders/card-renewal"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="profile/reminders/perk-expiry"
          options={{
            href: null,
          }}
        />
      </Tabs>
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