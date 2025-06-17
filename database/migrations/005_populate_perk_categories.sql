-- Update categories for existing perk definitions
UPDATE "public"."perk_definitions" SET "categories" = ARRAY['Transportation', 'Dining'] WHERE "id" = '207067ca-6933-40cf-ab7b-1d2d36bf067f';
UPDATE "public"."perk_definitions" SET "categories" = ARRAY['Bills & Utilities', 'Entertainment'] WHERE "id" = '7e10ad1b-792e-4c34-8d36-bd0ebbca8591';
UPDATE "public"."perk_definitions" SET "categories" = ARRAY['Shopping', 'Grocery'] WHERE "id" = 'b4ca65e4-a537-4688-b46a-63326bd72f36';
UPDATE "public"."perk_definitions" SET "categories" = ARRAY['Fitness', 'Wellness'] WHERE "id" = '360e8050-d55d-46e4-a604-a3006dc39724';
UPDATE "public"."perk_definitions" SET "categories" = ARRAY['Shopping'] WHERE "id" = '008f140c-56fe-48f1-9e89-6c39391e3def';
UPDATE "public"."perk_definitions" SET "categories" = ARRAY['Travel', 'Flights'] WHERE "id" = '7d9d198c-5fd4-4d3e-b095-8059e89273d2';
UPDATE "public"."perk_definitions" SET "categories" = ARRAY['Travel', 'Flights'] WHERE "id" = 'd8158b44-a979-40a5-ab13-1042577b5263';
UPDATE "public"."perk_definitions" SET "categories" = ARRAY['Travel', 'Lodging'] WHERE "id" = '37eeb419-2110-4ca2-ac70-0eebbd587530';
UPDATE "public"."perk_definitions" SET "categories" = ARRAY['Transportation', 'Dining'] WHERE "id" = '86836d3c-6573-43ec-9b42-33493bec5765';
UPDATE "public"."perk_definitions" SET "categories" = ARRAY['Dining'] WHERE "id" = '8c57ee72-0b5b-4d93-aeee-150c15539514';
UPDATE "public"."perk_definitions" SET "categories" = ARRAY['Dining'] WHERE "id" = 'd538f219-3595-4a96-85da-508054a9b36d';
UPDATE "public"."perk_definitions" SET "categories" = ARRAY['Dining', 'Coffee'] WHERE "id" = '1aab4bed-a106-47a2-a7e5-0ae17b1fde02';
UPDATE "public"."perk_definitions" SET "categories" = ARRAY['Travel'] WHERE "id" = 'e1c07060-3c13-4387-be74-066ecc30b60f';
UPDATE "public"."perk_definitions" SET "categories" = ARRAY['Dining'] WHERE "id" = '8726f459-c527-45c6-8321-59666524784e';
UPDATE "public"."perk_definitions" SET "categories" = ARRAY['Grocery'] WHERE "id" = '38ca9405-eafc-4f95-aac0-c436d050c0d0';
UPDATE "public"."perk_definitions" SET "categories" = ARRAY['Grocery'] WHERE "id" = 'ed2aa3a3-8ad3-4739-bf34-55eb1dd741c5';
UPDATE "public"."perk_definitions" SET "categories" = ARRAY['Transportation'] WHERE "id" = 'f79316d4-5ddd-4591-830b-6e897a3dd0f5';
UPDATE "public"."perk_definitions" SET "categories" = ARRAY['Travel', 'Lodging'] WHERE "id" = '32a15587-31ef-473a-a73b-b40c68026419';
UPDATE "public"."perk_definitions" SET "categories" = ARRAY['Grocery'] WHERE "id" = 'a30da18a-b7f8-4d52-bb8a-80200f62e2b5';
-- brilliant_dining has the same definition_id as amex_gold_grubhub, so it's already updated.
UPDATE "public"."perk_definitions" SET "categories" = ARRAY['Travel', 'Flights'] WHERE "id" = 'd8158b44-a979-40a5-ab13-1042577b5263';
UPDATE "public"."perk_definitions" SET "categories" = ARRAY['Travel'] WHERE "id" = '0faeed05-234e-4110-a710-b8cb41bb0f72';
UPDATE "public"."perk_definitions" SET "categories" = ARRAY['Travel', 'Rewards'] WHERE "id" = 'c6004d5f-c5c4-435e-b717-eb6cafd9a089';
UPDATE "public"."perk_definitions" SET "categories" = ARRAY['Bills & Utilities', 'Entertainment'] WHERE "id" = '55fec7a1-de50-40c9-b5a2-0f456161def0';
-- delta_resy has the same definition_id as amex_gold_resy, so it's already updated.
-- green_clear has the same definition_id as platinum_clear, so it's already updated.
-- boa_pr_airline_incidental has the same definition_id as platinum_airline_fee, so it's already updated.
-- boa_pre_airline_incidental has the same definition_id as platinum_airline_fee, so it's already updated.
UPDATE "public"."perk_definitions" SET "categories" = ARRAY['Shopping', 'Dining', 'Transportation', 'Fitness'] WHERE "id" = 'd8158b44-a979-40a5-ab13-1042577b5261';
-- usb_ar_travel_dining has the same definition_id as csr_travel, so it's already updated.
-- citi_prestige_travel has the same definition_id as csr_travel, so it's already updated. 