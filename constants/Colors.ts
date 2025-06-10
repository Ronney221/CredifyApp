/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

const tintColorLight = '#007AFF'; // iOS Blue for primary actions
const tintColorDark = '#0A84FF';

export const Colors = {
  light: {
    text: '#000000',
    textOnPrimary: '#FFFFFF',
    textOnAccent: '#FFFFFF',
    background: '#FFFFFF',
    systemGroupedBackground: '#F2F2F7',
    tint: tintColorLight,
    icon: '#8E8E93',
    tabIconDefault: '#8E8E93',
    tabIconSelected: tintColorLight,
    separator: '#C6C6C8',
    secondaryLabel: '#3C3C4399', // 60% opacity of black
    accent: tintColorLight, // Using tint as the main accent
    secondaryAccent: '#F2F2F7', // A subtle accent for placeholders, etc.
    error: '#FF3B30', // iOS Red for errors/destructive actions
    success: '#34C759', // iOS Green for success
    warning: '#FF9500', // iOS Orange for warnings
  },
  dark: {
    text: '#FFFFFF',
    textOnPrimary: '#FFFFFF',
    textOnAccent: '#000000',
    background: '#000000',
    systemGroupedBackground: '#1C1C1E',
    tint: tintColorDark,
    icon: '#8E8E93',
    tabIconDefault: '#8E8E93',
    tabIconSelected: tintColorDark,
    separator: '#38383A',
    secondaryLabel: '#EBEBF599', // 60% opacity of white
    accent: tintColorDark,
    secondaryAccent: '#2C2C2E',
    error: '#FF453A',
    success: '#32D74B',
    warning: '#FF9F0A',
  },
};
