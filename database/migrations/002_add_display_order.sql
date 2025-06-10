-- Add display_order column to user_credit_cards table
ALTER TABLE public.user_credit_cards
ADD COLUMN display_order INTEGER DEFAULT 0;

-- Create an index on display_order for better performance
CREATE INDEX idx_user_credit_cards_display_order ON public.user_credit_cards(user_id, display_order);

-- Update existing rows to have sequential display_order
WITH numbered_cards AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at) - 1 as new_order
  FROM public.user_credit_cards
  WHERE is_active = true
)
UPDATE public.user_credit_cards
SET display_order = numbered_cards.new_order
FROM numbered_cards
WHERE user_credit_cards.id = numbered_cards.id; 