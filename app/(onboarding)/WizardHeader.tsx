import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import Dots from 'react-native-dots-pagination';
// import { useSafeAreaInsets } from 'react-native-safe-area-context'; // Removed
import { Colors } from '../constants/Colors';
import { useOnboardingContext } from './_context/OnboardingContext';

// Constants for dot styling and animation - can be shared or defined here
const ACTIVE_DOT_BASE_SIZE = 8;
const PASSIVE_DOT_SIZE = 8;
const ACTIVE_DOT_POP_SCALE_FACTOR = 1.2;
const ACTIVE_DOT_POP_WIDTH = ACTIVE_DOT_BASE_SIZE * ACTIVE_DOT_POP_SCALE_FACTOR;
const ANIMATION_DURATION = 200;

// Recalculated height based on content: Text (16) + Margin (8/6) + Dots (8) + PaddingBottom (10)
export const WIZARD_HEADER_HEIGHT = Platform.OS === 'ios' ? 42 : 40;

export default function WizardHeader() {
  const {
    step, // 0-indexed from context
    totalSteps,
    isHeaderGloballyHidden,
  } = useOnboardingContext();
  // const insets = useSafeAreaInsets(); // Removed

  const [currentActiveDotWidth, setCurrentActiveDotWidth] = useState(ACTIVE_DOT_BASE_SIZE);

  // Animation for the active dot pop
  useEffect(() => {
    if (step >= 0 && step < totalSteps) { // Only animate if step is valid
      setCurrentActiveDotWidth(ACTIVE_DOT_POP_WIDTH);
      const timer = setTimeout(() => {
        setCurrentActiveDotWidth(ACTIVE_DOT_BASE_SIZE);
      }, ANIMATION_DURATION);
      return () => clearTimeout(timer);
    } else {
      setCurrentActiveDotWidth(ACTIVE_DOT_BASE_SIZE); // Reset if step is out of bounds
    }
  }, [step, totalSteps]);

  if (isHeaderGloballyHidden || step < 0 || step >= totalSteps) {
    // Render a spacer with the same height to prevent layout jumps when header is hidden
    // The parent SafeAreaView in _layout.tsx handles the actual top inset.
    return <View style={{ height: WIZARD_HEADER_HEIGHT }} />;
  }

  const displayStep = step + 1; // Convert 0-indexed to 1-indexed for display
  const stepText = `Step ${displayStep} of ${totalSteps}`;

  return (
    // Removed insets.top from height and paddingTop here
    <View style={[styles.headerContainer, { height: WIZARD_HEADER_HEIGHT }]}>
      <Text style={styles.stepText}>{stepText}</Text>
      <View style={styles.dotsWrapper}>
        <Dots
          length={totalSteps}
          active={step} // context step is 0-indexed
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

const styles = StyleSheet.create({
  headerContainer: {
    justifyContent: 'flex-end', // Align content to bottom (dots below text)
    alignItems: 'center',
    flexDirection: 'column',
    width: '100%',
    paddingBottom: 10, // Space below dots
    backgroundColor: '#ffffff', // Assuming a white header background
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#c7c7cc',
  },
  stepText: {
    fontSize: 14,
    color: Colors.light.icon,
    fontWeight: '500',
    marginBottom: Platform.OS === 'ios' ? 8 : 6,
    textAlign: 'center',
  },
  dotsWrapper: {
    // No specific styles needed currently, centers by default
  },
}); 