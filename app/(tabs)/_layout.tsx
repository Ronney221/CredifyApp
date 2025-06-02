// app/_layout.tsx
import React from 'react';
import { Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Tabs } from 'expo-router';
import { Platform, View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

// Header Right Component for Insights Tab
const InsightsHeaderRight = () => {
  const handleShare = () => Alert.alert('Share feature coming soon!');
  const handleCompareCards = () => Alert.alert("Coming Soon!", "Compare Cards / ROI feature coming soon!");

  return (
    <View style={{ flexDirection: 'row', marginRight: Platform.OS === 'ios' ? 10 : 20 }}>
      <TouchableOpacity onPress={handleShare} style={{ paddingHorizontal: 8 }}>
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

  return (
    <>
      <StatusBar style={barStyle} />
      <Tabs
        initialRouteName="01-dashboard"
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
            title: 'Manage Cards',
            headerShown: true,
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="card-outline" size={size} color={color} />
            ),
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
      </Tabs>
    </>
  );
}