# Perk Definitions Migration Plan

## Problem Statement

We currently have two parallel perk definition systems that must be kept in sync:

1. **`perk_definitions`** (Old hardcoded system)
   - Used in `usePerkStatus.ts`, `database.ts`, `useAutoRedemptions.ts`
   - Contains notification fields (`notification_emoji`, `notification_combo_start`, `notification_combo_end`)
   - Legacy table from hardcoded data era

2. **`benefit_definitions`** (New migration-based system)
   - Used in `supabase-cards.ts` for fetching card data
   - More structured with proper relationships to cards
   - Missing notification fields
   - Populated via migrations 008, 009, 010

**Current Error:** Perk ID `3beba295-b544-4bfa-b7e3-66924c51478c` exists in card data but not in `perk_definitions`, causing "PGRST116" database errors when tracking redemptions.

## Solution: Migrate to benefit_definitions (Option 1)

### Schema Analysis

**Fields in `perk_definitions` missing from `benefit_definitions`:**
- `notification_emoji` (TEXT) - e.g., '🛍️', '✈️', '🍔'
- `notification_combo_start` (TEXT) - e.g., 'don't miss your {{amount}} Saks credit for some retail therapy'
- `notification_combo_end` (TEXT) - e.g., 'and finish strong with your {{amount}} Saks credit'

**Fields in `benefit_definitions` not in `perk_definitions`:**
- `benefit_id` (TEXT UNIQUE) - Structured ID like 'platinum_uber_cash'
- `card_definition_id` (UUID) - Foreign key to card_definitions
- `period` (TEXT) - Human readable period
- `start_date`, `end_date` (DATE) - Validity dates
- `terms`, `redemption_url`, `image_url` (TEXT) - Additional metadata
- `merchant_name`, `merchant_logo` (TEXT) - Merchant info
- `is_anniversary_benefit` (BOOLEAN) - Special benefit flag
- `estimated_value` (NUMERIC) - For variable value benefits

## Implementation Plan

### Phase 1: Schema Updates

**Migration 011: Add notification fields to benefit_definitions**
```sql
-- Add notification fields to benefit_definitions
ALTER TABLE benefit_definitions 
ADD COLUMN notification_emoji TEXT,
ADD COLUMN notification_combo_start TEXT,
ADD COLUMN notification_combo_end TEXT;
```

### Phase 2: Data Migration

**Migration 012: Copy notification data from perk_definitions**
```sql
-- Copy notification data from perk_definitions to benefit_definitions
UPDATE benefit_definitions bd
SET 
  notification_emoji = pd.notification_emoji,
  notification_combo_start = pd.notification_combo_start,
  notification_combo_end = pd.notification_combo_end
FROM perk_definitions pd
WHERE bd.name = pd.name;

-- Add any missing perks that exist in perk_definitions but not benefit_definitions
-- (This should be handled case-by-case)
```

### Phase 3: Code Updates

#### 3.1 Update `hooks/usePerkStatus.ts`

**Current code (line 110):**
```typescript
const { data, error } = await supabase
  .from('perk_definitions')
  .select('id, name, value');
```

**Updated code:**
```typescript
const { data, error } = await supabase
  .from('benefit_definitions')
  .select('id, name, value, benefit_id');
```

#### 3.2 Update `lib/database.ts`

**Multiple locations to update:**

1. **Line 294: Perk definition lookup by ID**
```typescript
// FROM:
const { data: perkDef, error: perkDefError } = await supabase
  .from('perk_definitions')
  .select('id, name, value, period_months, reset_type')
  .eq('id', perk.definition_id)
  .single();

// TO:
const { data: perkDef, error: perkDefError } = await supabase
  .from('benefit_definitions')
  .select('id, name, value, period_months, reset_type')
  .eq('id', perk.definition_id)
  .single();
```

2. **Line 492: Redemption queries with joins**
```typescript
// FROM:
perk_definitions (
  id,
  name,
  value,
  ...
)

// TO:
benefit_definitions (
  id,
  name,
  value,
  ...
)
```

3. **Line 647: Perk lookup by name**
```typescript
// FROM:
const { data: perkDef, error: perkDefError } = await supabase
  .from('perk_definitions')
  .select('id, name')
  .eq('name', perk.name)
  .single();

// TO:
const { data: perkDef, error: perkDefError } = await supabase
  .from('benefit_definitions')
  .select('id, name')
  .eq('name', perk.name)
  .single();
```

4. **Lines 788 & 875: Auto-redemption joins**
```typescript
// FROM:
perk_definitions (
  name,
  value
)

// TO:
benefit_definitions (
  name,
  value
)
```

#### 3.3 Update `hooks/useAutoRedemptions.ts`

Search for `perk_definitions` and replace with `benefit_definitions`

#### 3.4 Update `services/notification-perk-expiry.ts`

Update any perk definition queries to use `benefit_definitions`

#### 3.5 Update `hooks/useOptimizedPerkStatus.ts`

Update any perk definition references

### Phase 4: Database Relationship Updates

Since `benefit_definitions` has proper foreign key relationships, update queries to leverage these:

```typescript
// Example: Get all benefits for a specific card
const { data: benefits } = await supabase
  .from('benefit_definitions')
  .select(`
    *,
    card_definitions (
      card_id,
      name
    )
  `)
  .eq('card_definitions.card_id', 'chase_sapphire_reserve');
```

### Phase 5: Testing & Validation

1. **Test perk status loading** - Ensure all perks load correctly
2. **Test redemption tracking** - Verify redemptions are tracked properly
3. **Test notifications** - Confirm notification text is preserved
4. **Test auto-redemptions** - Validate auto-redemption functionality
5. **Test card data fetching** - Ensure card benefits still load

### Phase 6: Cleanup

Once everything is working:

1. **Drop perk_definitions table**
```sql
DROP TABLE IF EXISTS perk_definitions CASCADE;
```

2. **Remove migration 001** that populates perk_definitions
3. **Remove migration 004** and 005 if they're perk_definitions related
4. **Update database schema documentation**

## Files to Modify

### Database Migrations
- Create `database/migrations/011_add_notification_fields.sql`
- Create `database/migrations/012_migrate_notification_data.sql`

### Code Files
- `hooks/usePerkStatus.ts` - Line 110 and other references
- `lib/database.ts` - Lines 294, 492, 647, 788, 875
- `hooks/useAutoRedemptions.ts` - All perk_definitions references
- `services/notification-perk-expiry.ts` - Perk lookup queries
- `hooks/useOptimizedPerkStatus.ts` - If it references perk_definitions

### Type Definitions
- Update `types/database.ts` if it has perk_definitions types
- Ensure benefit_definitions types include notification fields

## Current Files Using perk_definitions

Based on grep search:
```
C:\Users\Ronney\Desktop\CredifyApp\hooks\useOptimizedPerkStatus.ts
C:\Users\Ronney\Desktop\CredifyApp\hooks\useAutoRedemptions.ts
C:\Users\Ronney\Desktop\CredifyApp\lib\database.ts
C:\Users\Ronney\Desktop\CredifyApp\services\notification-perk-expiry.ts
C:\Users\Ronney\Desktop\CredifyApp\hooks\usePerkStatus.ts
```

## Benefits of Migration

1. **Single Source of Truth** - Eliminates sync issues between two tables
2. **Better Data Structure** - Proper relationships with card_definitions
3. **Migration-Based** - Data changes are version controlled
4. **Extensibility** - Easier to add new fields and relationships
5. **Performance** - Better indexing and query optimization

## Risks & Considerations

1. **Data Loss Risk** - Ensure all notification data is properly migrated
2. **Breaking Changes** - All perk-related functionality needs testing
3. **ID Mapping** - May need to update any hardcoded perk IDs in the code
4. **Migration Dependencies** - Ensure migrations run in correct order

## Estimated Timeline

- **Phase 1 (Schema):** 30 minutes
- **Phase 2 (Data Migration):** 1 hour
- **Phase 3 (Code Updates):** 2-3 hours
- **Phase 4 (Relationships):** 1 hour
- **Phase 5 (Testing):** 2 hours
- **Phase 6 (Cleanup):** 30 minutes

**Total: 7-8 hours**

## Next Steps

1. Create the migration files for schema and data updates
2. Update each code file systematically
3. Test thoroughly in development environment
4. Deploy and validate in production
5. Clean up old perk_definitions table and migrations

## Notes

- The error with ID `3beba295-b544-4bfa-b7e3-66924c51478c` should be resolved once we remove the H2 perks from the codebase and migrate to benefit_definitions
- Consider backing up perk_definitions before dropping it
- Make sure to update any documentation that references the old table structure