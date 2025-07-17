# Updated Onboarding Overlay Test Instructions

## Changes Made

### 1. **Rounded Corner Cutout**
- Replaced rectangular cutout with SVG mask approach
- Uses `react-native-svg` to create a proper rounded rectangle mask
- Matches the 16px border radius of PerkRow components

### 2. **Improved Positioning**
- Increased measurement delay from 100ms to 300ms for more reliable layout
- Added console logging to debug positioning issues
- Using absolute screen coordinates from `measure()` API

### 3. **Visual Improvements**
- Enhanced glow effect with better shadow properties
- Consistent overlay color (rgba(0, 0, 0, 0.75))
- Proper z-indexing and pointer event handling

## Expected Behavior

When you tap "Reset Tap Onboarding" and then expand a card:

1. **Overlay Shape**: The cutout should have rounded corners matching the PerkRow
2. **Positioning**: Should highlight the first available perk (not redeemed)
3. **Glow Effect**: Blue border with subtle pulsing animation
4. **Interaction**: Only the highlighted perk and "Got it!" button are tappable
5. **Modal Behavior**: Prevents scrolling and blocks tab bar interaction

## Debug Information

Check the console logs for:
- `[PerkRow] Measured layout:` - Shows the coordinates being measured
- `[OnboardingOverlay] Received layout:` - Shows what the overlay receives

## Troubleshooting

If positioning is still off:
1. Check if the card is fully expanded before measurement
2. Verify the first available perk is being selected correctly
3. Consider device-specific header heights that might affect positioning

## Technical Implementation

- **SVG Mask**: Creates a proper rounded rectangle cutout
- **Modal**: Ensures full-screen coverage and interaction blocking
- **Measure API**: Gets absolute screen coordinates after layout