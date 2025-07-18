-- Migration: Fix app scheme mappings and remove duplicate multi-choice configs
-- This migration fixes the mapping issues between benefit_definitions and app_schemes

-- 1. Update Apple Services Credit to remove invalid app_scheme
-- Since it's a multi-choice perk, it doesn't need a direct app_scheme
UPDATE benefit_definitions 
SET app_scheme = NULL
WHERE benefit_id = 'csr_apple_subscriptions' 
AND name = 'Apple Services Credit';

-- 2. Remove duplicate entries from multi_choice_perk_configs
-- Keep only one entry per unique parent_perk_name + target_perk_name combination
DELETE FROM multi_choice_perk_configs
WHERE id NOT IN (
    SELECT MIN(id)
    FROM multi_choice_perk_configs
    GROUP BY parent_perk_name, label, target_perk_name
);

-- 3. Add missing app schemes if they don't exist
INSERT INTO app_schemes (scheme_key, ios_scheme, android_scheme, fallback_url, android_package, app_store_url_ios, app_store_url_android)
VALUES 
    ('apple', NULL, NULL, 'https://www.apple.com/', NULL, NULL, NULL)
ON CONFLICT (scheme_key) DO NOTHING;

-- 4. Ensure all multi-choice perks that don't need direct app schemes have NULL app_scheme
UPDATE benefit_definitions 
SET app_scheme = NULL
WHERE name IN (
    'Digital Entertainment Credit',
    'Lifestyle Convenience Credits', 
    'Disney Bundle Credit',
    'Rideshare Credit',
    'Dining Credit'
);

-- 5. Create an index to prevent duplicate multi-choice configs in the future
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_multi_choice_config 
ON multi_choice_perk_configs(parent_perk_name, label, target_perk_name);