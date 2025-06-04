import { Stack } from 'expo-router';
import { useRoute, useIsFocused } from '@react-navigation/native';
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import Dots from 'react-native-dots-pagination';
import { Colors } from '../../constants/Colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const onboardingSteps = [
  'card-select',
  'renewal-dates',
  'notification-prefs',
  'onboarding-complete',
];

const ACTIVE_DOT_BASE_SIZE = 8;
const PASSIVE_DOT_SIZE = 8;
const ACTIVE_DOT_POP_SCALE_FACTOR = 1.2;
const ACTIVE_DOT_POP_WIDTH = ACTIVE_DOT_BASE_SIZE * ACTIVE_DOT_POP_SCALE_FACTOR;
const ANIMATION_DURATION = 200;
const HEADER_BACK_BUTTON_WIDTH_APPROX = 30; // Approximate width for balance

function OnboardingHeaderTitle() {
  const route = useRoute();
  const isFocused = useIsFocused();
  
  // Initialize to -1, effect will set it.
  const [activeDotIndex, setActiveDotIndex] = useState(-1);
  const insets = useSafeAreaInsets();
  const [currentActiveDotWidth, setCurrentActiveDotWidth] = useState(ACTIVE_DOT_BASE_SIZE);

  useEffect(() => {
    const currentScreenName = route.name;
    // console.log(`[OnboardingHeaderTitle Effect] Attempting update. isFocused: ${isFocused}, route.name: ${currentScreenName}`);

    if (isFocused) {
      const newIndex = onboardingSteps.indexOf(currentScreenName);
      if (newIndex !== -1) {
        // console.log(`[OnboardingHeaderTitle Effect] Screen is focused and found: "${currentScreenName}". Setting activeDotIndex to ${newIndex}`);
        setActiveDotIndex(newIndex);
      } else {
        // console.warn(`[OnboardingHeaderTitle Effect] Screen is focused but "${currentScreenName}" not in onboardingSteps. Setting to -1.`);
        setActiveDotIndex(-1); // Explicitly set to -1 if focused but not a recognized step
      }
    } else {
      // When screen is not focused, we don't necessarily want to change the index immediately to -1,
      // as it might be a transition. The activeDotIndex will reflect the last focused known step.
      // However, if the goal is for dots to *only* show for the *absolutely* focused screen, then:
      // setActiveDotIndex(-1);
      // For now, let's allow it to persist briefly to avoid flicker during push/pop animations
      // if this header is somehow involved in those too.
      // The key is that when a *new* screen *becomes* focused, this effect will run for it and set the correct index.
    }
  }, [isFocused, route.name]); // Re-run when focus status or route name changes.
  
  // Animation for the active dot
  useEffect(() => {
    if (activeDotIndex !== -1) {
      setCurrentActiveDotWidth(ACTIVE_DOT_POP_WIDTH);
      const timer = setTimeout(() => {
        setCurrentActiveDotWidth(ACTIVE_DOT_BASE_SIZE);
      }, ANIMATION_DURATION);
      return () => clearTimeout(timer);
    } else {
      setCurrentActiveDotWidth(ACTIVE_DOT_BASE_SIZE); // Reset if dots are hidden
    }
  }, [activeDotIndex]);
  
  if (activeDotIndex === -1) {
    // console.log(`[OnboardingHeaderTitle Render] activeDotIndex is -1. Hiding dots. Current route.name: ${route.name}, isFocused: ${isFocused}`);
    return <View style={[styles.headerTitleContainer, {paddingTop: insets.top + 10, minHeight: insets.top + 50}]} />;
  }

  const stepText = `Step ${activeDotIndex + 1} of ${onboardingSteps.length}`;
  // console.log(`[OnboardingHeaderTitle Render] Rendering step text: "${stepText}" for index ${activeDotIndex}`);

  return (
    <View style={[styles.headerTitleContainer, {paddingTop: insets.top + 10, minHeight: insets.top + 50}]}>
      <Text style={styles.stepText}>{stepText}</Text>
      <View style={styles.dotsWrapper}>
        <Dots
          length={onboardingSteps.length}
          active={activeDotIndex}
          activeColor={Colors.light.tint}
          passiveColor={Platform.OS === 'ios' ? '#D1D1D6' : '#BDBDBD'}
          passiveDotWidth={PASSIVE_DOT_SIZE}
          passiveDotHeight={PASSIVE_DOT_SIZE}
          activeDotWidth={currentActiveDotWidth}
          activeDotHeight={ACTIVE_DOT_BASE_SIZE}
          marginHorizontal={4}
        />
      </View>
    </View>
  );
}

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerTitleAlign: 'center',
        headerTransparent: true,
        animation: 'none',
        // For screens other than card-select, OnboardingHeaderTitle will be used.
        // card-select will override this in its options.
        headerTitle: () => <OnboardingHeaderTitle />,
        headerStyle: {
          // @ts-ignore
          borderBottomWidth: 0,
          // @ts-ignore
          elevation: 0,
          // @ts-ignore
          shadowOpacity: 0,
          // @ts-ignore
          shadowColor: 'transparent',
        },
      }}
    >
      <Stack.Screen
        name="Step 1 of 4" // This will get a custom headerTitle in the next step
        options={{
          headerBackVisible: false,
          // headerTitle will be set dynamically from card-select.tsx screen itself
          headerTitle: () => null, // Explicitly hide the shared header title content for this screen
        }}
      />
      <Stack.Screen
        name="renewal-dates"
        options={{
          headerBackVisible: true,
          headerRight: () => (
            <View style={{ width: HEADER_BACK_BUTTON_WIDTH_APPROX }} />
          ),
        }}
      />
      <Stack.Screen
        name="notification-prefs"
        options={{
          headerBackVisible: true,
          headerRight: () => (
            <View style={{ width: HEADER_BACK_BUTTON_WIDTH_APPROX }} />
          ),
        }}
      />
      <Stack.Screen
        name="onboarding-complete"
        options={{
          headerBackVisible: true,
          headerRight: () => (
            <View style={{ width: HEADER_BACK_BUTTON_WIDTH_APPROX }} />
          ),
          gestureEnabled: false,
        }}
      />
    </Stack>
  );
}

const styles = StyleSheet.create({
  headerTitleContainer: {
    justifyContent: 'flex-end',
    alignItems: 'center',
    flexDirection: 'column',
    width: '100%',
    paddingBottom: 10,
  },
  stepText: {
    fontSize: 14,
    color: Colors.light.icon,
    fontWeight: '500',
    marginBottom: Platform.OS === 'ios' ? 8 : 6,
    textAlign: 'center',
  },
  dotsWrapper: {
  },
}); 