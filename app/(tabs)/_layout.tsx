// app/_layout.tsx
import React, { useEffect } from 'react';
import { ActivityIndicator, Alert, View, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Tabs, useRouter, useSegments } from 'expo-router';
import { Platform, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useAuth } from '@/contexts/AuthContext'; // Assuming path is correct

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

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    // If loading, wait until auth state is resolved.
    if (loading) {
      return;
    }

    // If not loading and no user, redirect to login.
    // This guard is for the (tabs) group.
    // Other groups like (auth) or (onboarding) handle their own logic or are public.
    if (!user) {
      console.log('[TabLayout AuthGuard] User not authenticated, redirecting to login.');
      router.replace('/(auth)/login');
    }
  }, [user, loading, router]);

  // While loading auth state, show a loading indicator.
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.light.tint} />
      </View>
    );
  }

  // If there's no user and we haven't redirected yet (effect will handle redirect),
  // show loading to prevent flash of content. Or, if user is null and effect already ran,
  // this might prevent rendering children until redirect happens.
  if (!user) {
     return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.light.tint} />
      </View>
    );
  }

  // If user is authenticated, render the children (the Tabs navigator).
  return <>{children}</>;
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const barStyle = colorScheme === 'dark' ? 'light' : 'dark';

  return (
    <View style={{ flex: 1, backgroundColor: '#FAFAFE' }}>
      <StatusBar 
        style={barStyle} 
        backgroundColor="#FAFAFE" 
        translucent={true} 
      />
      <AuthGuard>
        <Tabs
          initialRouteName="01-dashboard"
          screenOptions={{
            headerShown: false,
            tabBarStyle: Platform.select({
              ios: {
                backgroundColor: '#FAFAFE',
                borderTopColor: 'rgba(0, 0, 0, 0.1)',
                height: 83,
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                paddingBottom: 34,
                paddingTop: 8,
              },
              android: {
                backgroundColor: '#FAFAFE',
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
          <Tabs.Screen
            name="04-more/edit-profile"
            options={{
              href: null,
            }}
          />
          <Tabs.Screen
            name="04-more/help-faq"
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
    backgroundColor: '#ffffff', // Or your app's default background
  },
});