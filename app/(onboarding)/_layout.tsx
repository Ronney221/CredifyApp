import { Stack, useSegments } from 'expo-router';
import { useRoute } from '@react-navigation/native';
import React, { useEffect, useState, useRef } from 'react';
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
const ACTIVE_DOT_POP_WIDTH = 12;
const ANIMATION_DURATION = 150;
const HEADER_BACK_BUTTON_WIDTH_APPROX = 30; // Approximate width for balance

function OnboardingHeaderTitle() {
  const route = useRoute();
  const currentScreen = route.name;
  const activeDotIndex = onboardingSteps.indexOf(currentScreen);
  const insets = useSafeAreaInsets();

  const [currentActiveDotWidth, setCurrentActiveDotWidth] = useState(ACTIVE_DOT_BASE_SIZE);

  useEffect(() => {
    if (activeDotIndex !== -1) {
      setCurrentActiveDotWidth(ACTIVE_DOT_POP_WIDTH);
      const timer = setTimeout(() => {
        setCurrentActiveDotWidth(ACTIVE_DOT_BASE_SIZE);
      }, ANIMATION_DURATION);
      return () => clearTimeout(timer);
    }
  }, [activeDotIndex]);
  
  if (activeDotIndex === -1) {
    console.warn(`OnboardingHeaderTitle: currentScreen "${currentScreen}" not in onboardingSteps. Dots will not render.`);
    return <View style={[styles.headerTitleContainer, {paddingTop: insets.top + 10, minHeight: insets.top + 50}]} />;
  }

  const stepText = `Step ${activeDotIndex + 1} of ${onboardingSteps.length}`;

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
        name="card-select"
        options={{
          headerBackVisible: false,
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
    // paddingVertical: 5, // If needed for spacing
  },
}); 