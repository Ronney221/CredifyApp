export interface ThemeColors {
  // Core Palette
  primaryNavy: string;
  accentCoral: string;
  tealHighlight: string;
  softMint: string;
  slateGrey: string;

  // Roles
  text: string;
  textSecondary: string;
  background: string;
  tint: string;
  icon: string;
  tabIconDefault: string;
  tabIconSelected: string;
  separator: string;
  
  // Component Specific
  cardBackground: string;
  systemGroupedBackground: string;
  
  // Status
  error: string;
  warning: string;
  success: string;

  // Overlays/etc
  textOnPrimary: string;
  textOnAccent: string;
  secondaryLabel: string;
  accent: string;
  secondaryAccent: string;
}

const tintColorLight = '#FF6B6B'; // Accent Coral
const tintColorDark = '#FF8A8A'; // A lighter coral for dark mode

export const Colors: { light: ThemeColors; dark: ThemeColors } = {
  light: {
    // Core Palette
    primaryNavy: '#0A1F44',
    accentCoral: '#FF6B6B',
    tealHighlight: '#1BC4C8',
    softMint: '#E6FAF7',
    slateGrey: '#6E7A8A',

    // Roles
    text: '#0A1F44', // Primary Navy for headers, important text
    textSecondary: '#6E7A8A', // Slate Grey for body text
    background: '#FFFFFF',
    tint: tintColorLight,
    icon: '#6E7A8A',
    tabIconDefault: '#6E7A8A',
    tabIconSelected: tintColorLight,
    separator: '#EAEAEA', // A lighter grey for separators
    
    // Component Specific
    cardBackground: '#FFFFFF',
    systemGroupedBackground: '#E6FAF7', // Soft mint for grouped backgrounds
    
    // Status
    error: '#FF3B30', // Keeping standard error red
    warning: '#FF9500', // Keeping standard warning orange
    success: '#1BC4C8', // Teal for success states

    // Overlays/etc
    textOnPrimary: '#FFFFFF',
    textOnAccent: '#FFFFFF',
    secondaryLabel: '#6E7A8A', // Slate Grey
    accent: tintColorLight, // alias for tint
    secondaryAccent: '#1BC4C8', // alias for teal
  },
  dark: {
    // Core Palette (Dark Mode Versions)
    primaryNavy: '#0A1F44', // Can be used as bg
    accentCoral: '#FF8A8A', // Lighter coral
    tealHighlight: '#48D9DD', // Lighter teal
    softMint: '#102A54', // Dark, muted mint/blue
    slateGrey: '#9EADC8', // Lighter slate

    // Roles
    text: '#FFFFFF',
    textSecondary: '#9EADC8',
    background: '#0A1F44', // Using primary navy for dark bg
    tint: tintColorDark,
    icon: '#9EADC8',
    tabIconDefault: '#9EADC8',
    tabIconSelected: tintColorDark,
    separator: '#2D4373',
    
    // Component Specific
    cardBackground: '#102A54',
    systemGroupedBackground: '#1C1C1E', // standard dark grouped bg is fine
    
    // Status
    error: '#FF453A',
    warning: '#FF9F0A',
    success: '#48D9DD',

    // Overlays/etc
    textOnPrimary: '#0A1F44',
    textOnAccent: '#FFFFFF',
    secondaryLabel: '#9EADC8',
    accent: tintColorDark,
    secondaryAccent: '#48D9DD',
  },
};

export type ColorScheme = typeof Colors.light & typeof Colors.dark; 