export interface ThemeColors {
  text: string;
  background: string;
  tint: string;
  icon: string;
  tabIconDefault: string;
  tabIconSelected: string;
  // iOS system colors
  systemGroupedBackground: string;
  secondarySystemGroupedBackground: string;
  separator: string;
  secondaryLabel: string;
  secondaryAccent: string;
  error: string;
  // Application-specific colors
  primary: string;
  accent: string;
  textSecondary: string;
  cardBackground: string;
  warning: string;
  pending: string;
  disabledText: string;
  disabledBackground: string;
  borderLight: string;
  progressBarTrack: string;
  streakBronze: string;
  streakSilver: string;
  streakGold: string;
  coldStreakIcon: string;
  textOnPrimary: string;
  textOnAccent: string;
  redeemButtonDefault: string;
  redeemButtonDisabled: string;
  coldStreakBackground: string;
  textOnColdStreakBackground: string;
}

const tintColorLight = '#007AFF'; // Our primary color
const tintColorDark = '#FFFFFF';  // A common dark mode tint

export const Colors: { light: ThemeColors; dark: ThemeColors } = {
  light: {
    text: '#000',
    background: '#fff',
    tint: '#2f95dc',
    icon: '#000',
    tabIconDefault: '#ccc',
    tabIconSelected: '#2f95dc',
    accent: '#007AFF',
    secondaryAccent: '#5856D6',
    error: '#FF3B30',
    separator: '#C6C6C8',
    secondaryLabel: '#8E8E93',
    systemGroupedBackground: '#F2F2F7',
    textOnPrimary: '#FFFFFF',
    textOnAccent: '#FFFFFF',
  },
  dark: {
    text: '#fff',
    background: '#000',
    tint: '#fff',
    icon: '#fff',
    tabIconDefault: '#ccc',
    tabIconSelected: '#fff',
    accent: '#0A84FF',
    secondaryAccent: '#5E5CE6',
    error: '#FF453A',
    separator: '#38383A',
    secondaryLabel: '#8E8E93',
    systemGroupedBackground: '#000000',
    textOnPrimary: '#FFFFFF',
    textOnAccent: '#FFFFFF',
  },
};

export type ColorScheme = typeof Colors.light & typeof Colors.dark; 