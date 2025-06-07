interface ThemeColors {
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
    text: '#1C1C1E',
    background: '#FFFFFF',
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#ccc',
    tabIconSelected: tintColorLight,
    // iOS system colors
    systemGroupedBackground: '#F2F2F7',
    secondarySystemGroupedBackground: '#FFFFFF',
    separator: '#C6C6C8',
    secondaryLabel: '#6D6D72',
    secondaryAccent: '#007AFF',
    error: '#FF3B30',
    // Application-specific colors
    primary: tintColorLight,
    accent: '#34C759',
    textSecondary: '#666666',
    cardBackground: '#FFFFFF',
    warning: '#FF9500',
    pending: '#FFCC00',
    disabledText: '#AEAEB2',
    disabledBackground: '#E5E5EA',
    borderLight: '#DCDCDC',
    progressBarTrack: '#E9ECEF',
    streakBronze: '#CD7F32',
    streakSilver: '#C0C0C0',
    streakGold: '#FFD700',
    coldStreakIcon: '#5CACEE',
    textOnPrimary: '#FFFFFF',
    textOnAccent: '#FFFFFF',
    redeemButtonDefault: tintColorLight,
    redeemButtonDisabled: '#6c757d',
    coldStreakBackground: '#e0f7fa',
    textOnColdStreakBackground: '#00796b',
  },
  dark: {
    text: '#FFFFFF',
    background: '#1C1C1E',
    tint: tintColorDark,
    icon: '#A0A0A0',
    tabIconDefault: '#555',
    tabIconSelected: tintColorDark,
    // iOS system colors
    systemGroupedBackground: '#000000',
    secondarySystemGroupedBackground: '#1C1C1E',
    separator: '#38383A',
    secondaryLabel: '#8E8E93',
    secondaryAccent: '#0A84FF',
    error: '#FF453A',
    // Application-specific colors
    primary: tintColorLight,
    accent: '#34C759',
    textSecondary: '#A0A0A0',
    cardBackground: '#2C2C2E',
    warning: '#FF9500',
    pending: '#FFCC00',
    disabledText: '#555555',
    disabledBackground: '#333333',
    borderLight: '#444444',
    progressBarTrack: '#333333',
    streakBronze: '#CD7F32',
    streakSilver: '#C0C0C0',
    streakGold: '#FFD700',
    coldStreakIcon: '#5CACEE',
    textOnPrimary: '#FFFFFF',
    textOnAccent: '#FFFFFF',
    redeemButtonDefault: tintColorLight,
    redeemButtonDisabled: '#4D4D4D',
    coldStreakBackground: '#1a1a1a',
    textOnColdStreakBackground: '#8E8E93',
  },
}; 