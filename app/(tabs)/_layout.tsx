// app/_layout.tsx
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { Tabs } from 'expo-router';
import { Platform, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { BlurView } from 'expo-blur';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const barStyle = colorScheme === 'dark' ? 'light' : 'dark';

  return (
    <>
      <StatusBar style={barStyle} />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: Platform.select({
            ios: {
              backgroundColor: 'rgba(255, 255, 255, 0.85)',
              borderTopColor: 'rgba(0, 0, 0, 0.2)',
              height: 52,
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              paddingBottom: 0,
              paddingTop: 0,
              backdropFilter: 'blur(15px)',
            },
            android: {
              backgroundColor: '#ffffff',
              borderTopColor: '#e0e0e0',
              height: 56,
              paddingBottom: 0,
              paddingTop: 0,
            },
          }),
          tabBarItemStyle: {
            paddingVertical: 8,
          },
          tabBarActiveTintColor: '#007aff',
          tabBarInactiveTintColor: '#8e8e93',
        }}
      >
        <Tabs.Screen
          name="dashboard"
          options={{
            title: 'Dashboard',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="home" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="cards"
          options={{
            title: 'Cards',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="card" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="insights"
          options={{
            title: 'Insights',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="analytics" size={size} color={color} />
            ),
          }}
        />
      </Tabs>
    </>
  );
}