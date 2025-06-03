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
        passiveDotWidth={6}
        activeDotWidth={6}
        // For spacing between dots, react-native-dots-pagination uses padding on its internal View.
        // If more control is needed, a different library or custom implementation might be necessary.
        // The default spacing is usually acceptable.
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
        // The header height itself can be controlled by headerStyle: { height: ... }
        // Reducing the top margin above the dots is more about the content inset of the screen
        // or the internal padding of the header component if it's custom.
        // The `headerPlaceholder` in `notification-prefs.tsx` can be adjusted if there's too much space *below* the actual header.
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
    // backgroundColor: 'rgba(0,255,0,0.1)', // For debugging layout and height
    // height: 30, // Example: If you need to control the height of the container for the dots
  },
}); 