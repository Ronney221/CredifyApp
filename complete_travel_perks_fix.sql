-- COMPLETE FIX: Update all travel perks to use multi-choice instead of opening Amex app
-- Run this entire script in your Supabase SQL editor

-- 1. Update Delta with better app schemes (your existing update)
UPDATE "public"."app_schemes"
SET
  "ios_scheme" = 'flydelta://mytrips',
  "android_scheme" = 'flydelta://',
  "updated_at" = NOW()
WHERE
  "scheme_key" = 'delta';

-- 2. Insert United Airlines  
INSERT INTO "public"."app_schemes" ("id", "scheme_key", "ios_scheme", "android_scheme", "fallback_url", "android_package", "app_store_url_ios", "app_store_url_android", "created_at", "updated_at")
VALUES
  ('1e6924b4-a21c-4731-8199-d1052f36f44a', 'united', 'united://', 'united://', 'https://www.united.com/', 'com.united.mobile.android', 'https://apps.apple.com/us/app/united-airlines/id449488235', 'https://play.google.com/store/apps/details?id=com.united.mobile.android', NOW(), NOW())
ON CONFLICT (scheme_key) DO NOTHING;

-- 3. Insert American Airlines
INSERT INTO "public"."app_schemes" ("id", "scheme_key", "ios_scheme", "android_scheme", "fallback_url", "android_package", "app_store_url_ios", "app_store_url_android", "created_at", "updated_at")
VALUES
  ('3a73f1b4-c89a-42fb-8e34-a151b72b8ac3', 'american', 'americanairlines://', 'aa://', 'https://www.aa.com/', 'com.aa.android', 'https://apps.apple.com/us/app/american-airlines/id382698565', 'https://play.google.com/store/apps/details?id=com.aa.android', NOW(), NOW())
ON CONFLICT (scheme_key) DO NOTHING;

-- 4. Multi-choice configurations for ALL travel perks

-- Airline Fee Credit (Bank of America)
INSERT INTO "public"."multi_choice_perk_configs" ("id", "parent_perk_name", "label", "target_perk_name", "created_at", "updated_at")
VALUES
  (gen_random_uuid(), 'Airline Fee Credit', 'Open United Airlines', 'United Airlines Credit', NOW(), NOW()),
  (gen_random_uuid(), 'Airline Fee Credit', 'Open Delta Airlines', 'Delta Airlines Credit', NOW(), NOW()),
  (gen_random_uuid(), 'Airline Fee Credit', 'Open American Airlines', 'American Airlines Credit', NOW(), NOW());

-- Airline Flight Credit (Aspire)
INSERT INTO "public"."multi_choice_perk_configs" ("id", "parent_perk_name", "label", "target_perk_name", "created_at", "updated_at")
VALUES
  (gen_random_uuid(), 'Airline Flight Credit', 'Open United Airlines', 'United Airlines Credit', NOW(), NOW()),
  (gen_random_uuid(), 'Airline Flight Credit', 'Open Delta Airlines', 'Delta Airlines Credit', NOW(), NOW()),
  (gen_random_uuid(), 'Airline Flight Credit', 'Open American Airlines', 'American Airlines Credit', NOW(), NOW());

-- Airline Incidental Credit (Bank of America Premium Rewards)
INSERT INTO "public"."multi_choice_perk_configs" ("id", "parent_perk_name", "label", "target_perk_name", "created_at", "updated_at")
VALUES
  (gen_random_uuid(), 'Airline Incidental Credit', 'Open United Airlines', 'United Airlines Credit', NOW(), NOW()),
  (gen_random_uuid(), 'Airline Incidental Credit', 'Open Delta Airlines', 'Delta Airlines Credit', NOW(), NOW()),
  (gen_random_uuid(), 'Airline Incidental Credit', 'Open American Airlines', 'American Airlines Credit', NOW(), NOW());

-- Airline Incidental Credits (Bank of America Premium Rewards Elite)
INSERT INTO "public"."multi_choice_perk_configs" ("id", "parent_perk_name", "label", "target_perk_name", "created_at", "updated_at")
VALUES
  (gen_random_uuid(), 'Airline Incidental Credits', 'Open United Airlines', 'United Airlines Credit', NOW(), NOW()),
  (gen_random_uuid(), 'Airline Incidental Credits', 'Open Delta Airlines', 'Delta Airlines Credit', NOW(), NOW()),
  (gen_random_uuid(), 'Airline Incidental Credits', 'Open American Airlines', 'American Airlines Credit', NOW(), NOW());

-- Annual Travel Credit (Citi Prestige)
INSERT INTO "public"."multi_choice_perk_configs" ("id", "parent_perk_name", "label", "target_perk_name", "created_at", "updated_at")
VALUES
  (gen_random_uuid(), 'Annual Travel Credit', 'Open United Airlines', 'United Airlines Credit', NOW(), NOW()),
  (gen_random_uuid(), 'Annual Travel Credit', 'Open Delta Airlines', 'Delta Airlines Credit', NOW(), NOW()),
  (gen_random_uuid(), 'Annual Travel Credit', 'Open American Airlines', 'American Airlines Credit', NOW(), NOW()),
  (gen_random_uuid(), 'Annual Travel Credit', 'Open Chase Travel', 'Chase Travel Credit', NOW(), NOW());

-- Travel & Dining Credit (US Bank Altitude Reserve)
INSERT INTO "public"."multi_choice_perk_configs" ("id", "parent_perk_name", "label", "target_perk_name", "created_at", "updated_at")
VALUES
  (gen_random_uuid(), 'Travel & Dining Credit', 'Open United Airlines', 'United Airlines Credit', NOW(), NOW()),
  (gen_random_uuid(), 'Travel & Dining Credit', 'Open Delta Airlines', 'Delta Airlines Credit', NOW(), NOW()),
  (gen_random_uuid(), 'Travel & Dining Credit', 'Open American Airlines', 'American Airlines Credit', NOW(), NOW()),
  (gen_random_uuid(), 'Travel & Dining Credit', 'Open DoorDash', 'DoorDash Credit', NOW(), NOW()),
  (gen_random_uuid(), 'Travel & Dining Credit', 'Open Uber Eats', 'Uber Eats Credit', NOW(), NOW());