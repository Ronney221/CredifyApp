-- Step 1: Add status column if it doesn't exist (we'll still use this temporarily)
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_credit_cards' AND column_name = 'status') 
  THEN
    ALTER TABLE user_credit_cards
    ADD COLUMN status TEXT CHECK (status IN ('active', 'removed')) DEFAULT 'active';
  END IF;
END $$;

-- Step 2: Create a temporary table to identify the most recent cards
CREATE TEMP TABLE latest_cards AS
WITH RankedCards AS (
  SELECT 
    id,
    user_id,
    card_name,
    renewal_date,
    display_order,
    created_at,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, card_name 
      ORDER BY created_at DESC, id DESC
    ) as rn
  FROM user_credit_cards
)
SELECT id
FROM RankedCards
WHERE rn = 1;

-- Step 3: Create a temporary table for cards referenced by either perk_redemptions or perk_auto_redemptions
CREATE TEMP TABLE referenced_cards AS
SELECT DISTINCT id
FROM user_credit_cards
WHERE id IN (SELECT user_card_id FROM perk_redemptions)
   OR id IN (SELECT user_card_id FROM perk_auto_redemptions);

-- Step 4: Delete duplicates that aren't referenced by either table
DELETE FROM user_credit_cards
WHERE id NOT IN (SELECT id FROM latest_cards)
  AND id NOT IN (SELECT id FROM referenced_cards);

-- Step 5: Mark remaining duplicates (those with redemptions or auto-redemptions) as removed
UPDATE user_credit_cards
SET status = 'removed'
WHERE id NOT IN (SELECT id FROM latest_cards)
  AND id IN (SELECT id FROM referenced_cards);

-- Step 6: Mark all cards from latest_cards as active
UPDATE user_credit_cards
SET status = 'active'
WHERE id IN (SELECT id FROM latest_cards);

-- Step 7: Add unique constraint for active cards
ALTER TABLE user_credit_cards
DROP CONSTRAINT IF EXISTS unique_active_user_cards;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'unique_active_user_cards'
  ) THEN
    CREATE UNIQUE INDEX unique_active_user_cards
    ON user_credit_cards (user_id, card_name)
    WHERE status = 'active';
  END IF;
END $$;

-- Step 8: Add trigger to automatically handle new cards
CREATE OR REPLACE FUNCTION handle_card_status()
RETURNS TRIGGER AS $$
BEGIN
  -- If inserting/updating an active card, handle any existing active cards
  IF (TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.status = 'active')) THEN
    -- Check if the card has any references
    IF EXISTS (
      SELECT 1 
      FROM user_credit_cards old_card
      WHERE old_card.user_id = NEW.user_id
        AND old_card.card_name = NEW.card_name
        AND old_card.id != NEW.id
        AND old_card.status = 'active'
        AND (
          EXISTS (SELECT 1 FROM perk_redemptions WHERE user_card_id = old_card.id)
          OR EXISTS (SELECT 1 FROM perk_auto_redemptions WHERE user_card_id = old_card.id)
        )
    ) THEN
      -- If it has references, mark as removed
      UPDATE user_credit_cards
      SET status = 'removed'
      WHERE user_id = NEW.user_id
        AND card_name = NEW.card_name
        AND id != NEW.id
        AND status = 'active';
    ELSE
      -- If no references, delete the old record
      DELETE FROM user_credit_cards
      WHERE user_id = NEW.user_id
        AND card_name = NEW.card_name
        AND id != NEW.id
        AND status = 'active';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS card_status_trigger ON user_credit_cards;

CREATE TRIGGER card_status_trigger
BEFORE INSERT OR UPDATE ON user_credit_cards
FOR EACH ROW
EXECUTE FUNCTION handle_card_status();

-- Step 9: Clean up temporary tables
DROP TABLE latest_cards;
DROP TABLE referenced_cards;

-- Step 10: Output the cleanup results
SELECT 
  (SELECT COUNT(*) FROM user_credit_cards WHERE status = 'active') as active_cards,
  (SELECT COUNT(*) FROM user_credit_cards WHERE status = 'removed') as removed_cards,
  (SELECT COUNT(DISTINCT user_id) FROM user_credit_cards WHERE status = 'active') as users_with_active_cards; 