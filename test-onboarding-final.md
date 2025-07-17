# Final Onboarding Overlay Updates

## Latest Changes

### 1. **Animation Synchronization**
- The SVG mask now scales to exactly 1.05 (matching the glow scale)
- Both animations use the same timing and easing configuration
- The mask cutout expands and contracts in perfect sync with the blue glow

### 2. **Positioning Fine-tuning**
- Added a 2-pixel upward adjustment to compensate for measurement discrepancies
- The delay is set to 500ms to ensure card expansion animation completes
- Console logs help debug the exact positioning values

### 3. **Animation Details**
- Duration: 1000ms per cycle
- Scale: 1.0 → 1.05 → 1.0 (continuous loop)
- Easing: Easing.inOut(Easing.ease) for smooth transitions
- Both glow and mask animate together

## Testing the Synchronized Animation

1. Reset tap onboarding from Profile → Developer section
2. Go to Dashboard and expand a card with perks
3. Observe:
   - The blue glow border pulses around the highlighted perk
   - The dark overlay's cutout expands/contracts with the glow
   - The entire animation feels cohesive and synchronized
   - The positioning should be pixel-perfect on the PerkRow

## Technical Implementation

```typescript
// Both animations use identical configuration
const animationConfig = {
  duration: 1000,
  easing: Easing.inOut(Easing.ease)
};

// Glow scales from 1 to 1.05
glowScale.value = withRepeat(
  withSequence(
    withTiming(1.05, animationConfig),
    withTiming(1, animationConfig)
  ),
  -1,
  true
);

// Mask scales identically from 1 to 1.05
maskScale.value = withRepeat(
  withSequence(
    withTiming(1.05, animationConfig),
    withTiming(1, animationConfig)
  ),
  -1,
  true
);
```

## Positioning Adjustment

- The y-coordinate is adjusted by -2 pixels to account for any slight measurement differences
- This helps align the overlay more precisely with the actual PerkRow position

## If Issues Persist

1. Check device-specific factors:
   - Status bar height
   - Navigation bar presence
   - SafeAreaView insets

2. Verify timing:
   - Card expansion animation duration
   - Measurement delay (currently 500ms)

3. Debug with console logs:
   - Look for `[PerkRow] Measured layout:` logs
   - Check `[OnboardingOverlay] Received layout:` logs
   - Compare the y values to see if adjustment is needed