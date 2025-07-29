import { PixelRatio, Dimensions } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ResponsiveConfig {
  fontScale: number;
  isLargeText: boolean;
  isExtraLargeText: boolean;
  screenWidth: number;
  screenHeight: number;
  isSmallScreen: boolean;
  isLargeScreen: boolean;
}

export const useResponsiveStyles = (): ResponsiveConfig => {
  const fontScale = PixelRatio.getFontScale();
  const isLargeText = fontScale > 1.2;
  const isExtraLargeText = fontScale > 1.4;
  const isSmallScreen = SCREEN_WIDTH < 375;
  const isLargeScreen = SCREEN_WIDTH > 414;

  return {
    fontScale,
    isLargeText,
    isExtraLargeText,
    screenWidth: SCREEN_WIDTH,
    screenHeight: SCREEN_HEIGHT,
    isSmallScreen,
    isLargeScreen,
  };
};

export const getResponsiveFontSize = (baseSize: number, fontScale?: number): number => {
  const scale = fontScale || PixelRatio.getFontScale();
  
  if (scale > 1.4) {
    return Math.max(12, baseSize * 0.9);
  }
  if (scale > 1.2) {
    return Math.max(12, baseSize * 0.95);
  }
  return baseSize;
};

export const getResponsiveSpacing = (baseSpacing: number, isLargeText?: boolean): number => {
  const large = isLargeText ?? PixelRatio.getFontScale() > 1.2;
  return large ? baseSpacing * 1.3 : baseSpacing;
};

export const getResponsiveHeight = (baseHeight: number, isLargeText?: boolean, isExtraLargeText?: boolean): number => {
  const fontScale = PixelRatio.getFontScale();
  const extra = isExtraLargeText ?? fontScale > 1.4;
  const large = isLargeText ?? fontScale > 1.2;
  
  if (extra) return baseHeight * 1.2;
  if (large) return baseHeight * 1.1;
  return baseHeight;
};