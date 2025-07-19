/**
 * Design System Spacing Constants
 * Based on 4pt grid system used by top tech companies
 */

export const Spacing = {
  // Base unit: 4pt
  xs: 4,      // 4pt  - Micro spacing
  sm: 8,      // 8pt  - Small spacing
  md: 12,     // 12pt - Medium spacing
  lg: 16,     // 16pt - Large spacing  
  xl: 20,     // 20pt - Extra large spacing
  xxl: 24,    // 24pt - 2x large spacing
  xxxl: 32,   // 32pt - 3x large spacing
  huge: 40,   // 40pt - Huge spacing
  massive: 48, // 48pt - Massive spacing
} as const;

/**
 * Component-specific spacing tokens
 */
export const ComponentSpacing = {
  // Container padding/margins
  containerPadding: Spacing.lg,           // 16pt
  containerMargin: Spacing.md,            // 12pt
  
  // Card spacing
  cardPadding: Spacing.lg,                // 16pt
  cardMargin: Spacing.sm,                 // 8pt
  cardInnerSpacing: Spacing.md,           // 12pt
  
  // List item spacing
  listItemPadding: Spacing.lg,            // 16pt
  listItemMargin: Spacing.xs,             // 4pt
  listItemInnerSpacing: Spacing.md,       // 12pt
  
  // Icon spacing
  iconMargin: Spacing.md,                 // 12pt
  iconPadding: Spacing.sm,                // 8pt
  
  // Text spacing
  textMarginSmall: Spacing.xs,            // 4pt
  textMarginMedium: Spacing.sm,           // 8pt
  textMarginLarge: Spacing.md,            // 12pt
  
  // Button spacing
  buttonPadding: Spacing.md,              // 12pt
  buttonMargin: Spacing.sm,               // 8pt
  
  // Input spacing
  inputPadding: Spacing.lg,               // 16pt
  inputMargin: Spacing.md,                // 12pt
} as const;

/**
 * Border radius tokens following 4pt grid
 */
export const BorderRadius = {
  sm: 4,      // 4pt  - Small radius
  md: 8,      // 8pt  - Medium radius
  lg: 12,     // 12pt - Large radius
  xl: 16,     // 16pt - Extra large radius
  xxl: 20,    // 20pt - 2x large radius
  pill: 999,  // Pill shape
} as const;

/**
 * Helper function to get consistent spacing
 */
export const getSpacing = (size: keyof typeof Spacing): number => Spacing[size];

/**
 * Helper function to create consistent insets
 */
export const createInsets = (
  top?: number, 
  right?: number, 
  bottom?: number, 
  left?: number
) => ({
  paddingTop: top || 0,
  paddingRight: right || 0,
  paddingBottom: bottom || 0,
  paddingLeft: left || 0,
});

/**
 * Helper function to create consistent margins
 */
export const createMargins = (
  top?: number, 
  right?: number, 
  bottom?: number, 
  left?: number
) => ({
  marginTop: top || 0,
  marginRight: right || 0,
  marginBottom: bottom || 0,
  marginLeft: left || 0,
});