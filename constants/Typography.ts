/**
 * Typography Design System
 * Inspired by Apple's Human Interface Guidelines and Material Design
 */

import { TextStyle } from 'react-native';

/**
 * Font Family Tokens
 */
export const FontFamily = {
  // System fonts optimized for each platform
  display: 'SF Pro Display', // For large text, headers
  text: 'SF Pro Text',       // For body text, UI elements
  mono: 'SF Mono',           // For code, numbers
  
  // Fallbacks for Android
  fallback: {
    display: 'Roboto',
    text: 'Roboto', 
    mono: 'Roboto Mono',
  }
} as const;

/**
 * Font Weight Tokens
 * Semantic naming for consistent usage
 */
export const FontWeight = {
  light: '300',
  regular: '400',
  medium: '500',
  semibold: '600', 
  bold: '700',
  heavy: '800',
} as const;

/**
 * Font Size Scale (4pt progression)
 * Based on iOS and Material Design guidelines
 */
export const FontSize = {
  // Small text
  xs: 11,    // Captions, fine print
  sm: 13,    // Secondary text, labels
  
  // Body text  
  md: 15,    // Primary body text
  lg: 17,    // Large body text, emphasized content
  
  // Headlines
  xl: 20,    // Section headers
  xxl: 24,   // Page headers
  xxxl: 28,  // Large headers
  
  // Display
  huge: 32,  // Hero text
  massive: 40, // Marketing headers
} as const;

/**
 * Line Height Scale
 * Calculated for optimal readability
 */
export const LineHeight = {
  xs: 16,    // 11pt text
  sm: 18,    // 13pt text  
  md: 20,    // 15pt text
  lg: 24,    // 17pt text
  xl: 28,    // 20pt text
  xxl: 32,   // 24pt text
  xxxl: 36,  // 28pt text
  huge: 40,  // 32pt text
  massive: 48, // 40pt text
} as const;

/**
 * Semantic Typography Styles
 * Pre-defined text styles for common use cases
 */
export const Typography = {
  // Display styles for marketing, hero sections
  displayLarge: {
    fontFamily: FontFamily.display,
    fontSize: FontSize.massive,
    lineHeight: LineHeight.massive,
    fontWeight: FontWeight.bold,
    letterSpacing: -0.5,
  } as TextStyle,
  
  displayMedium: {
    fontFamily: FontFamily.display,
    fontSize: FontSize.huge,
    lineHeight: LineHeight.huge,
    fontWeight: FontWeight.semibold,
    letterSpacing: -0.25,
  } as TextStyle,

  // Headline styles for page/section titles
  headlineLarge: {
    fontFamily: FontFamily.display,
    fontSize: FontSize.xxxl,
    lineHeight: LineHeight.xxxl,
    fontWeight: FontWeight.bold,
  } as TextStyle,
  
  headlineMedium: {
    fontFamily: FontFamily.display,
    fontSize: FontSize.xxl,
    lineHeight: LineHeight.xxl,
    fontWeight: FontWeight.semibold,
  } as TextStyle,
  
  headlineSmall: {
    fontFamily: FontFamily.display,
    fontSize: FontSize.xl,
    lineHeight: LineHeight.xl,
    fontWeight: FontWeight.semibold,
  } as TextStyle,

  // Title styles for cards, lists
  titleLarge: {
    fontFamily: FontFamily.text,
    fontSize: FontSize.lg,
    lineHeight: LineHeight.lg,
    fontWeight: FontWeight.medium,
  } as TextStyle,
  
  titleMedium: {
    fontFamily: FontFamily.text,
    fontSize: FontSize.md,
    lineHeight: LineHeight.md,
    fontWeight: FontWeight.medium,
  } as TextStyle,
  
  titleSmall: {
    fontFamily: FontFamily.text,
    fontSize: FontSize.sm,
    lineHeight: LineHeight.sm,
    fontWeight: FontWeight.medium,
  } as TextStyle,

  // Body text styles
  bodyLarge: {
    fontFamily: FontFamily.text,
    fontSize: FontSize.lg,
    lineHeight: LineHeight.lg,
    fontWeight: FontWeight.regular,
  } as TextStyle,
  
  bodyMedium: {
    fontFamily: FontFamily.text,
    fontSize: FontSize.md,
    lineHeight: LineHeight.md,
    fontWeight: FontWeight.regular,
  } as TextStyle,
  
  bodySmall: {
    fontFamily: FontFamily.text,
    fontSize: FontSize.sm,
    lineHeight: LineHeight.sm,
    fontWeight: FontWeight.regular,
  } as TextStyle,

  // Label styles for UI elements
  labelLarge: {
    fontFamily: FontFamily.text,
    fontSize: FontSize.md,
    lineHeight: LineHeight.md,
    fontWeight: FontWeight.medium,
  } as TextStyle,
  
  labelMedium: {
    fontFamily: FontFamily.text,
    fontSize: FontSize.sm,
    lineHeight: LineHeight.sm,
    fontWeight: FontWeight.medium,
  } as TextStyle,
  
  labelSmall: {
    fontFamily: FontFamily.text,
    fontSize: FontSize.xs,
    lineHeight: LineHeight.xs,
    fontWeight: FontWeight.medium,
  } as TextStyle,

  // Caption for fine print, metadata
  caption: {
    fontFamily: FontFamily.text,
    fontSize: FontSize.xs,
    lineHeight: LineHeight.xs,
    fontWeight: FontWeight.regular,
  } as TextStyle,

  // Monospace for numbers, code
  mono: {
    fontFamily: FontFamily.mono,
    fontSize: FontSize.md,
    lineHeight: LineHeight.md,
    fontWeight: FontWeight.regular,
  } as TextStyle,
} as const;

/**
 * Component-specific typography tokens
 */
export const ComponentTypography = {
  // Perk-specific styles
  perkTitle: Typography.titleMedium,
  perkDescription: Typography.bodySmall,
  perkValue: {
    ...Typography.mono,
    fontSize: 22,
    fontWeight: FontWeight.regular,
  },
  
  // Button styles
  buttonLarge: Typography.labelLarge,
  buttonMedium: Typography.labelMedium,
  buttonSmall: Typography.labelSmall,
  
  // Navigation
  navTitle: Typography.headlineSmall,
  tabLabel: Typography.labelMedium,
  
  // Form elements
  inputLabel: Typography.labelMedium,
  inputText: Typography.bodyMedium,
  inputHelper: Typography.caption,
} as const;

/**
 * Utility functions for dynamic typography
 */
export const createTextStyle = (
  size: keyof typeof FontSize,
  weight: keyof typeof FontWeight,
  lineHeight?: keyof typeof LineHeight
): TextStyle => ({
  fontSize: FontSize[size],
  fontWeight: FontWeight[weight],
  lineHeight: lineHeight ? LineHeight[lineHeight] : undefined,
  fontFamily: FontFamily.text,
});

/**
 * Platform-specific adjustments
 */
export const PlatformTypography = {
  // iOS uses SF Pro, Android uses Roboto
  getSystemFont: (type: 'display' | 'text' | 'mono') => {
    // In React Native, system fonts are handled automatically
    // This is for future platform-specific customizations
    return FontFamily[type];
  }
};