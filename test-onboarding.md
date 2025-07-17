# Onboarding Overlay Test Instructions

## Setup
1. Make sure you have the app running
2. Navigate to Profile tab
3. Tap "Reset Tap Onboarding" in the Developer section

## Test Steps
1. Go back to the Dashboard (Home tab)
2. Expand any card that has perks
3. You should see:
   - A dark overlay covering the entire screen (consistent color)
   - The first perk row is highlighted with a glow effect
   - A tooltip appears below the highlighted perk
   - The tab bar is not clickable
   - You cannot scroll the screen
   - Only the "Got it!" button is clickable

## Expected Behavior
- The overlay should use absolute positioning to correctly highlight the first perk
- The dark overlay should be a consistent color (rgba(0, 0, 0, 0.75))
- The Modal component prevents interaction with anything except the "Got it!" button
- After tapping "Got it!", the overlay disappears and normal interaction resumes

## Fixes Applied
1. **Positioning**: Used `measure()` to get absolute screen coordinates of the PerkRow
2. **Scrolling Prevention**: Used Modal component with `pointerEvents="box-only"`
3. **Consistent Overlay**: Single overlay color rgba(0, 0, 0, 0.75)
4. **Tab Bar Blocking**: Modal component covers entire screen including tab bar

## Known Issues to Watch For
- The positioning delay (100ms) might need adjustment based on device performance
- If the perk is partially off-screen when expanded, the tooltip position might need adjustment