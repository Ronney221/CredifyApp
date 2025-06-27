/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

const tintColorLight = '#007AFF'; // iOS Blue for primary actions
const tintColorDark = '#0A84FF';

export const Colors = {
  light: {
    text: '#000',
    textOnPrimary: '#fff',
    textOnAccent: '#fff',
    textSecondary: '#8E8E93',
    background: '#fff',
    systemGroupedBackground: '#F2F2F7',
    tint: tintColorLight,
    icon: '#1C1C1E',
    tabIconDefault: '#C7C7CC',
    tabIconSelected: tintColorLight,
    secondaryLabel: '#8E8E93',
    tertiaryLabel: '#C7C7CC',
    quaternaryLabel: '#C7C7CC',
    warning: '#FF3B30',
    error: '#FF3B30',
    separator: '#E5E5E5',
  },
  dark: {
    text: '#fff',
    textOnPrimary: '#fff',
    textOnAccent: '#fff',
    textSecondary: '#8E8E93',
    background: '#000',
    systemGroupedBackground: '#1C1C1E',
    tint: tintColorDark,
    icon: '#fff',
    tabIconDefault: '#C7C7CC',
    tabIconSelected: tintColorDark,
    secondaryLabel: '#8E8E93',
    tertiaryLabel: '#C7C7CC',
    quaternaryLabel: '#C7C7CC',
    warning: '#FF453A',
    error: '#FF453A',
    separator: '#2C2C2E',
  },
};
