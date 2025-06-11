-- Migration: Add partial redemption support and performance optimizations
-- Description: This migration adds support for tracking partial redemptions of perks
-- and adds performance optimization indexes.

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Add new columns for partial redemption support
ALTER TABLE perk_redemptions
ADD COLUMN total_value numeric NOT NULL DEFAULT 0.0,
ADD COLUMN remaining_value numeric NOT NULL DEFAULT 0.0,
ADD COLUMN parent_redemption_id uuid REFERENCES perk_redemptions(id),
ADD CONSTRAINT check_remaining_value CHECK (remaining_value >= 0),
ADD CONSTRAINT check_total_value CHECK (total_value >= 0),
ADD CONSTRAINT check_value_consistency CHECK (remaining_value <= total_value);

-- Update existing records to set total_value equal to value_redeemed
-- and remaining_value to 0 (assuming all existing redemptions were full)
UPDATE perk_redemptions
SET total_value = value_redeemed,
    remaining_value = 0
WHERE total_value = 0;

-- Add new status types for partial redemptions
DO $$ BEGIN
    -- Check if the type exists
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'redemption_status') THEN
        -- Create the enum type if it doesn't exist
        CREATE TYPE redemption_status AS ENUM (
            'pending',
            'redeemed',
            'partially_redeemed',
            'expired',
            'cancelled'
        );
        
        -- Convert status column to use the new enum
        ALTER TABLE perk_redemptions
        ALTER COLUMN status TYPE redemption_status USING status::redemption_status;
    ELSE
        -- Add new values to existing enum if it exists
        ALTER TYPE redemption_status ADD VALUE IF NOT EXISTS 'partially_redeemed' BEFORE 'expired';
    END IF;
END $$;

-- Add performance optimization indexes
CREATE INDEX IF NOT EXISTS idx_perk_redemptions_user_date 
ON perk_redemptions(user_id, redemption_date DESC);

CREATE INDEX IF NOT EXISTS idx_perk_redemptions_perk_date 
ON perk_redemptions(perk_id, redemption_date DESC);

CREATE INDEX IF NOT EXISTS idx_perk_redemptions_status 
ON perk_redemptions(status, redemption_date DESC);

CREATE INDEX IF NOT EXISTS idx_perk_redemptions_parent 
ON perk_redemptions(parent_redemption_id) 
WHERE parent_redemption_id IS NOT NULL;

-- Add a function to handle partial redemptions
CREATE OR REPLACE FUNCTION process_partial_redemption()
RETURNS TRIGGER AS $$
BEGIN
    -- If this is a child redemption (has parent_redemption_id)
    IF NEW.parent_redemption_id IS NOT NULL THEN
        -- Check if parent exists and has sufficient remaining value
        IF NOT EXISTS (
            SELECT 1 
            FROM perk_redemptions 
            WHERE id = NEW.parent_redemption_id 
            AND remaining_value >= NEW.value_redeemed
        ) THEN
            RAISE EXCEPTION 'Invalid partial redemption: insufficient remaining value or invalid parent';
        END IF;
        
        -- Update parent's remaining value
        UPDATE perk_redemptions 
        SET remaining_value = remaining_value - NEW.value_redeemed,
            status = CASE 
                WHEN remaining_value - NEW.value_redeemed > 0 THEN 'partially_redeemed'::redemption_status
                ELSE 'redeemed'::redemption_status
            END
        WHERE id = NEW.parent_redemption_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for partial redemptions
CREATE TRIGGER trigger_process_partial_redemption
    BEFORE INSERT ON perk_redemptions
    FOR EACH ROW
    EXECUTE FUNCTION process_partial_redemption();

-- Add comments for documentation
COMMENT ON COLUMN perk_redemptions.total_value IS 'The total value of the perk when first redeemed';
COMMENT ON COLUMN perk_redemptions.remaining_value IS 'The remaining value available for partial redemptions';
COMMENT ON COLUMN perk_redemptions.parent_redemption_id IS 'Reference to the parent redemption for partial redemptions'; 