/**
 * Comprehensive Design System
 * Typography and Colors for consistent UI across the app
 */

import { TextStyle } from 'react-native';

/**
 * Typography Design System
 */
export const Typography = {
  // Font sizes following 4pt progression
  size: {
    xs: 11,    // Captions, fine print
    sm: 13,    // Secondary text, labels
    md: 15,    // Primary body text
    lg: 17,    // Large body text
    xl: 20,    // Section headers
    xxl: 24,   // Page headers
    huge: 28,  // Large headers
    massive: 32, // Hero text
  },
  
  // Font weights
  weight: {
    light: '300',
    regular: '400',
    medium: '500',
    semibold: '600', 
    bold: '700',
  },
  
  // Line heights optimized for readability
  lineHeight: {
    xs: 16,    // 11pt text
    sm: 18,    // 13pt text  
    md: 20,    // 15pt text
    lg: 24,    // 17pt text
    xl: 28,    // 20pt text
    xxl: 32,   // 24pt text
    huge: 36,  // 28pt text
    massive: 40, // 32pt text
  },
  
  // Semantic text styles
  styles: {
    // Headers
    headlineLarge: {
      fontSize: 28,
      lineHeight: 36,
      fontWeight: '700',
    } as TextStyle,
    
    headlineMedium: {
      fontSize: 24,
      lineHeight: 32,
      fontWeight: '600',
    } as TextStyle,
    
    headlineSmall: {
      fontSize: 20,
      lineHeight: 28,
      fontWeight: '600',
    } as TextStyle,
    
    // Titles for cards, lists
    titleLarge: {
      fontSize: 17,
      lineHeight: 24,
      fontWeight: '500',
    } as TextStyle,
    
    titleMedium: {
      fontSize: 15,
      lineHeight: 20,
      fontWeight: '500',
    } as TextStyle,
    
    titleSmall: {
      fontSize: 13,
      lineHeight: 18,
      fontWeight: '500',
    } as TextStyle,
    
    // Body text
    bodyLarge: {
      fontSize: 17,
      lineHeight: 24,
      fontWeight: '400',
    } as TextStyle,
    
    bodyMedium: {
      fontSize: 15,
      lineHeight: 20,
      fontWeight: '400',
    } as TextStyle,
    
    bodySmall: {
      fontSize: 13,
      lineHeight: 18,
      fontWeight: '400',
    } as TextStyle,
    
    // Labels for UI elements
    labelLarge: {
      fontSize: 15,
      lineHeight: 20,
      fontWeight: '500',
    } as TextStyle,
    
    labelMedium: {
      fontSize: 13,
      lineHeight: 18,
      fontWeight: '500',
    } as TextStyle,
    
    labelSmall: {
      fontSize: 11,
      lineHeight: 16,
      fontWeight: '500',
    } as TextStyle,
    
    // Caption for metadata
    caption: {
      fontSize: 11,
      lineHeight: 16,
      fontWeight: '400',
    } as TextStyle,
    
    // Monospace for numbers
    monoLarge: {
      fontSize: 22,
      lineHeight: 28,
      fontWeight: '400',
      fontFamily: 'SF Mono',
    } as TextStyle,
    
    monoMedium: {
      fontSize: 15,
      lineHeight: 20,
      fontWeight: '400',
      fontFamily: 'SF Mono',
    } as TextStyle,
  },
} as const;

/**
 * Color Design System
 */
export const DesignColors = {
  // Primary brand colors
  primary: {
    50: '#EBF8FF',
    100: '#BEE3F8', 
    200: '#90CDF4',
    300: '#63B3ED',
    400: '#4299E1',
    500: '#007AFF', // iOS Blue - Main primary
    600: '#2B77CB',
    700: '#2C5AA0',
    800: '#2A4365',
    900: '#1A365D',
  },
  
  // Success colors
  success: {
    50: '#F0FDF4',
    100: '#DCFCE7',
    200: '#BBF7D0', 
    300: '#86EFAC',
    400: '#4ADE80',
    500: '#34C759', // iOS Green
    600: '#16A34A',
    700: '#15803D',
  },
  
  // Warning colors
  warning: {
    50: '#FFFBEB',
    100: '#FEF3C7',
    200: '#FDE68A',
    300: '#FCD34D', 
    400: '#FBBF24',
    500: '#FF9500', // iOS Orange
    600: '#D97706',
    700: '#B45309',
  },
  
  // Error colors
  error: {
    50: '#FEF2F2',
    100: '#FEE2E2',
    200: '#FECACA',
    300: '#FCA5A5',
    400: '#F87171',
    500: '#FF3B30', // iOS Red
    600: '#DC2626',
    700: '#B91C1C',
  },
  
  // Neutral grays
  gray: {
    50: '#FAFAFA',   // Lightest background
    100: '#F5F5F5',  // Light background  
    200: '#E5E5E5',  // Border light
    300: '#D4D4D4',  // Border
    400: '#A3A3A3',  // Disabled text
    500: '#8E8E93',  // iOS secondary label
    600: '#6C6C70',  // iOS tertiary label
    700: '#48484A',  // Emphasized text
    800: '#3A3A3C',  // High contrast text
    900: '#1C1C1E',  // iOS label (main text)
  },
  
  // Purple for auto-redemption
  purple: {
    50: '#FAF5FF',
    100: '#E9D5FF',
    200: '#DDD6FE',
    300: '#C4B5FD',
    400: '#A78BFA',
    500: '#8B5CF6',
    600: '#7C3AED',
    700: '#6D28D9',
  },
} as const;

/**
 * Semantic color tokens for components
 */
export const ComponentColors = {
  // Text colors
  text: {
    primary: DesignColors.gray[900],      // Main text
    secondary: DesignColors.gray[600],    // Secondary text
    tertiary: DesignColors.gray[500],     // Supporting text
    disabled: DesignColors.gray[400],     // Disabled text
    inverse: '#FFFFFF',                   // Text on dark backgrounds
  },
  
  // Background colors
  background: {
    primary: '#FFFFFF',                   // Main background
    secondary: DesignColors.gray[50],     // Secondary background
    tertiary: DesignColors.gray[100],     // Card backgrounds
    elevated: '#FFFFFF',                  // Modal backgrounds
  },
  
  // Border colors
  border: {
    light: DesignColors.gray[200],        // Subtle borders
    medium: DesignColors.gray[300],       // Standard borders
    strong: DesignColors.gray[400],       // Strong borders
    focus: DesignColors.primary[500],     // Focus states
  },
  
  // Status colors
  status: {
    success: DesignColors.success[500],
    successBg: DesignColors.success[50],
    warning: DesignColors.warning[500],
    warningBg: DesignColors.warning[50],
    error: DesignColors.error[500],
    errorBg: DesignColors.error[50],
    info: DesignColors.primary[500],
    infoBg: DesignColors.primary[50],
  },
} as const;

/**
 * Perk-specific design tokens
 */
export const PerkDesign = {
  // Available perks
  available: {
    background: ComponentColors.background.primary,
    border: ComponentColors.border.light,
    text: ComponentColors.text.primary,
    icon: DesignColors.primary[500],
    typography: Typography.styles.titleMedium,
    descriptionTypography: Typography.styles.bodySmall,
    valueTypography: Typography.styles.monoLarge,
  },
  
  // Redeemed perks
  redeemed: {
    background: DesignColors.gray[100],
    text: DesignColors.gray[500],
    icon: DesignColors.gray[500],
    typography: {
      ...Typography.styles.titleMedium,
      color: DesignColors.gray[500],
    },
    descriptionTypography: {
      ...Typography.styles.bodySmall,
      color: DesignColors.gray[400],
    },
    valueTypography: {
      ...Typography.styles.monoLarge,
      color: DesignColors.gray[500],
    },
  },
  
  // Auto-redeemed perks
  autoRedeemed: {
    background: DesignColors.purple[50],
    text: DesignColors.purple[700],
    icon: DesignColors.purple[600],
    border: DesignColors.purple[200],
    typography: {
      ...Typography.styles.titleMedium,
      color: DesignColors.purple[700],
    },
    descriptionTypography: {
      ...Typography.styles.bodySmall,
      color: DesignColors.purple[600],
    },
    valueTypography: {
      ...Typography.styles.monoLarge,
      color: DesignColors.purple[700],
    },
  },
  
  // Partially redeemed perks
  partiallyRedeemed: {
    background: DesignColors.warning[50],
    text: DesignColors.warning[700],
    icon: DesignColors.warning[500],
    border: DesignColors.warning[200],
    progress: DesignColors.warning[500],
    typography: {
      ...Typography.styles.titleMedium,
      color: DesignColors.warning[700],
    },
    descriptionTypography: {
      ...Typography.styles.bodySmall,
      color: DesignColors.warning[600],
    },
    valueTypography: {
      ...Typography.styles.monoLarge,
      color: DesignColors.warning[700],
    },
  },
  
  // Urgency indicators
  urgency: {
    urgent: {
      background: DesignColors.error[50],
      border: DesignColors.error[500],
      text: DesignColors.error[500],
      icon: DesignColors.error[500],
      typography: Typography.styles.labelSmall,
    },
    warning: {
      background: DesignColors.warning[50],
      border: DesignColors.warning[500],
      text: DesignColors.warning[500],
      icon: DesignColors.warning[500],
      typography: Typography.styles.labelSmall,
    },
    normal: {
      background: DesignColors.success[50],
      border: DesignColors.success[500],
      text: DesignColors.success[500],
      icon: DesignColors.success[500],
      typography: Typography.styles.labelSmall,
    },
    monthly: {
      background: DesignColors.primary[50],
      border: DesignColors.primary[500],
      text: DesignColors.primary[500],
      icon: DesignColors.primary[500],
      typography: Typography.styles.labelSmall,
    },
  },
} as const;