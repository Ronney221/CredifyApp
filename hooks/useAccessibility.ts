import { useState, useEffect } from 'react';
import { AccessibilityInfo } from 'react-native';

interface AccessibilityState {
  isScreenReaderEnabled: boolean;
  isReduceMotionEnabled: boolean;
  isHighContrastEnabled: boolean;
  isBoldTextEnabled: boolean;
  isGrayscaleEnabled: boolean;
}

export const useAccessibility = (): AccessibilityState => {
  const [accessibilityState, setAccessibilityState] = useState<AccessibilityState>({
    isScreenReaderEnabled: false,
    isReduceMotionEnabled: false,
    isHighContrastEnabled: false,
    isBoldTextEnabled: false,
    isGrayscaleEnabled: false,
  });

  useEffect(() => {
    const checkAccessibilitySettings = async () => {
      try {
        const [
          screenReader,
          reduceMotion,
          highContrast,
          boldText,
          grayscale,
        ] = await Promise.all([
          AccessibilityInfo.isScreenReaderEnabled(),
          AccessibilityInfo.isReduceMotionEnabled(),
          AccessibilityInfo.isHighContrastEnabled?.() ?? false,
          AccessibilityInfo.isBoldTextEnabled?.() ?? false,
          AccessibilityInfo.isGrayscaleEnabled?.() ?? false,
        ]);

        setAccessibilityState({
          isScreenReaderEnabled: screenReader,
          isReduceMotionEnabled: reduceMotion,
          isHighContrastEnabled: highContrast,
          isBoldTextEnabled: boldText,
          isGrayscaleEnabled: grayscale,
        });
      } catch (error) {
        console.warn('Error checking accessibility settings:', error);
      }
    };

    checkAccessibilitySettings();

    // Listen for changes
    const screenReaderListener = AccessibilityInfo.addEventListener(
      'screenReaderChanged',
      (isEnabled) => {
        setAccessibilityState(prev => ({ ...prev, isScreenReaderEnabled: isEnabled }));
      }
    );

    const reduceMotionListener = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      (isEnabled) => {
        setAccessibilityState(prev => ({ ...prev, isReduceMotionEnabled: isEnabled }));
      }
    );

    const boldTextListener = AccessibilityInfo.addEventListener(
      'boldTextChanged',
      (isEnabled) => {
        setAccessibilityState(prev => ({ ...prev, isBoldTextEnabled: isEnabled }));
      }
    );

    return () => {
      screenReaderListener?.remove();
      reduceMotionListener?.remove();
      boldTextListener?.remove();
    };
  }, []);

  return accessibilityState;
};

// Helper to get minimum touch target size
export const getMinTouchTarget = () => ({
  minWidth: 44,
  minHeight: 44,
});

// Helper for accessible colors
export const getAccessibleColors = (isHighContrast: boolean) => ({
  text: isHighContrast ? '#000000' : '#1C1C1E',
  secondaryText: isHighContrast ? '#000000' : '#8E8E93',
  background: isHighContrast ? '#FFFFFF' : '#F2F2F7',
  border: isHighContrast ? '#000000' : '#E5E5E5',
});