import { Stack, useSegments } from 'expo-router';
import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import Dots from 'react-native-dots-pagination';
import { Colors } from '../../constants/Colors'; // Assuming Colors constant path

const onboardingSteps = [
  'card-select',
  'notification-prefs',
  'onboarding-complete'
];

function OnboardingHeaderTitle() {
  const segments = useSegments();
  // The last segment should be the current screen name within this layout
  const currentScreen = segments[segments.length - 1]; 
  const activeDotIndex = onboardingSteps.indexOf(currentScreen);

  if (activeDotIndex === -1) {
    return null; // Or some default title if the route is not part of onboarding steps
  }

  return (
    <View style={styles.headerTitleContainer}>
      <Dots 
        length={onboardingSteps.length} 
        active={activeDotIndex} 
        activeColor={Platform.OS === 'ios' ? Colors.light.tint : Colors.light.text} // iOS often uses tint for active, Android more muted
        passiveColor={Platform.OS === 'ios' ? '#D1D1D6' : '#BDBDBD'} // Standard passive dot colors
        passiveDotWidth={8}
        activeDotWidth={8}
        // Other props like paddingHorizontal, paddingVertical can be adjusted
      />
    </View>
  );
}

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerTitleAlign: 'center', // Center the custom title view
        headerTitle: () => <OnboardingHeaderTitle />,
      }}
    >
      <Stack.Screen 
        name="card-select" 
        options={{
          // Title is now handled by the custom header, but we can keep it for back button text or accessibility
          title: 'Add Your Cards', 
        }} 
      />
      <Stack.Screen 
        name="notification-prefs" 
        options={{
          title: 'Notifications', 
        }} 
      />
      <Stack.Screen 
        name="onboarding-complete" 
        options={{
          title: 'Setup Complete', 
          headerBackVisible: false,
          gestureEnabled: false,
        }} 
      />
      {/* Add other onboarding screens here as needed */}
    </Stack>
  );
}

const styles = StyleSheet.create({
  headerTitleContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    // backgroundColor: 'red', // For debugging layout
    // width: '100%', // Ensure it takes space if needed
  },
}); 