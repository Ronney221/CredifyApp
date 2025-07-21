# App Scheme Mapping Fix Documentation

## Issue Summary
When clicking "Open App" for certain perks, especially multi-choice perks like "Apple Services Credit", the app was navigating to undefined URLs because of mapping issues between the database structure and the code.

## Root Causes Identified

1. **Database Schema Mismatch**: The `benefit_definitions` table had `app_scheme: 'apple'` for Apple Services Credit, but there was no corresponding 'apple' entry in the `app_schemes` table.

2. **Property Name Mismatch**: The `createMultiChoiceConfigFromDb` function creates objects with `targetPerkName` (camelCase), but the code was trying to access `choice.target_perk_name` (snake_case).

3. **Duplicate Multi-Choice Configs**: The `multi_choice_perk_configs` table had duplicate entries, causing the same option to appear multiple times.

## Solutions Implemented

### 1. Database Migration (022_fix_app_scheme_mappings.sql)
- Set `app_scheme = NULL` for multi-choice perks (they don't need direct app schemes)
- Removed duplicate entries from `multi_choice_perk_configs` table
- Added unique index to prevent future duplicates

### 2. Code Fix (src/data/card-data.ts)
- Updated `openPerkTarget` function to use `choice.targetPerkName` instead of `choice.target_perk_name`
- Expanded `TARGET_PERK_TO_APP_SCHEME_MAP` to include all necessary mappings

### 3. Mapping Strategy
Multi-choice perks work as follows:
1. Parent perk (e.g., "Apple Services Credit") has no direct app_scheme
2. User selects from options (e.g., "Open Apple TV+", "Open Apple Music")
3. Each option maps to a target perk name (e.g., "Apple TV+ Credit")
4. The target perk name is mapped to an app scheme key (e.g., "appletv")
5. The app scheme key retrieves the actual URL from the app_schemes table

## Testing Instructions

1. Run the database migration:
   ```sql
   -- Execute migration 022_fix_app_scheme_mappings.sql
   ```

2. Test multi-choice perks:
   - Apple Services Credit → Should show Apple TV+ and Apple Music options
   - Digital Entertainment Credit → Should show Disney+, Hulu, ESPN+, etc.
   - Lifestyle Convenience Credits → Should show Uber, Lyft, DoorDash, etc.

3. Test single-choice perks:
   - Dunkin' Credit → Should open Dunkin' app directly
   - Walmart+ Membership Credit → Should open Walmart app directly

## Future Considerations

1. Consider adding validation in `data-transform.ts` to ensure app schemes exist
2. Add TypeScript interfaces for multi-choice configurations
3. Consider moving the TARGET_PERK_TO_APP_SCHEME_MAP to the database for easier maintenance