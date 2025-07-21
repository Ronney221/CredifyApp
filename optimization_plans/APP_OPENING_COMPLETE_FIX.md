# Complete App Opening Fix Documentation

## Issues Identified and Fixed

### 1. Database Property Name Mismatch
**Issue**: The multi-choice config data was transformed to camelCase (`targetPerkName`) but the code was looking for snake_case (`target_perk_name`).
**Fix**: Updated `openPerkTarget` in `card-data.ts` to use `choice.targetPerkName`.

### 2. Missing LSApplicationQueriesSchemes
**Issue**: iOS requires declaring URL schemes in Info.plist. Many app schemes were missing, causing the error:
```
Unable to open URL: disneyplus://. Add disneyplus to LSApplicationQueriesSchemes in your Info.plist.
```
**Fix**: Updated `app.json` to include all necessary schemes.

### 3. Database Schema Issues
**Issue**: 
- Apple Services Credit had `app_scheme: 'apple'` but no 'apple' entry in app_schemes table
- Duplicate entries in multi_choice_perk_configs table
**Fix**: Created migration `022_fix_app_scheme_mappings.sql` to:
- Set multi-choice perks' app_scheme to NULL
- Remove duplicate multi-choice configs
- Add unique index to prevent future duplicates

### 4. Mixed URL Scheme Types
**Discovery**: Some apps use HTTPS URLs as their "scheme" which work without LSApplicationQueriesSchemes:
- NYTimes: `https://www.nytimes.com/`
- Walmart: `https://www.walmart.com/`
- Capital One: `https://www.capitalone.com/`
- Saks: `https://www.saksfifthavenue.com/`

## How the System Works

### Single-Choice Perks
1. Perk has direct `appScheme` (e.g., "Dunkin' Credit" → 'dunkin')
2. Opens app directly using the scheme

### Multi-Choice Perks
1. Perk has no direct `appScheme` (NULL in database)
2. Shows choice dialog from `multi_choice_perk_configs`
3. User selects option (e.g., "Open Apple TV+")
4. Maps `targetPerkName` to app scheme key via `TARGET_PERK_TO_APP_SCHEME_MAP`
5. Opens the selected app

### Fallback Logic
When an app isn't installed:
1. Tries to open the custom scheme (e.g., `grubhub://`)
2. If that fails, opens the fallback URL (e.g., `https://www.grubhub.com/`)
3. If no fallback URL, tries app store URL

## Required Actions

1. **Rebuild the app** after updating app.json to include new LSApplicationQueriesSchemes
2. **Run the database migration** to fix schema issues
3. **Test thoroughly** on both iOS and Android

## Testing Checklist

### Multi-Choice Perks to Test:
- [ ] Apple Services Credit → Apple TV+/Apple Music
- [ ] Digital Entertainment Credit → Disney+/Hulu/ESPN+/etc.
- [ ] Uber Cash → Uber Rides/Uber Eats
- [ ] Lifestyle Convenience Credits → Various apps
- [ ] Dining Credit → Grubhub/Resy

### Single-Choice Perks to Test:
- [ ] Dunkin' Credit
- [ ] Walmart+ Membership Credit
- [ ] Grubhub Credit (direct)
- [ ] Resy Dining Credit (direct)

## Notes

- Apps with HTTPS schemes (NYTimes, Walmart, etc.) will always open in browser
- Some apps may still fail if not installed and no fallback URL exists
- The fallback behavior is intentional and provides good UX