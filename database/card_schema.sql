-- Enum for perk reset types
CREATE TYPE perk_reset_type AS ENUM ('calendar', 'anniversary');

-- Enum for perk periods
CREATE TYPE perk_period AS ENUM ('monthly', 'quarterly', 'semi_annual', 'annual');

-- Table for storing credit card perk definitions
CREATE TABLE perk_definitions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    value DECIMAL(10,2) NOT NULL,
    period_months INTEGER NOT NULL, -- 1, 3, 6, or 12
    reset_type perk_reset_type NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table for storing eligible services for perks (e.g., Digital Entertainment options)
CREATE TABLE perk_eligible_services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    perk_id UUID REFERENCES perk_definitions(id),
    service_name TEXT NOT NULL,
    service_url TEXT,
    app_deep_link TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table for tracking user perk redemptions
CREATE TABLE perk_redemptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    user_card_id UUID REFERENCES user_credit_cards(id),
    perk_id UUID REFERENCES perk_definitions(id),
    redemption_date TIMESTAMPTZ NOT NULL,
    reset_date TIMESTAMPTZ NOT NULL, -- When this perk will reset
    status TEXT NOT NULL DEFAULT 'redeemed',
    value_redeemed DECIMAL(10,2) NOT NULL, -- For future partial redemption support
    is_auto_redemption BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table for storing user auto-redemption preferences
CREATE TABLE perk_auto_redemptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    perk_id UUID REFERENCES perk_definitions(id),
    user_card_id UUID REFERENCES user_credit_cards(id),
    is_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, perk_id, user_card_id) -- Prevent duplicate entries
);

-- Add indexes for performance
CREATE INDEX idx_perk_redemptions_user_id ON perk_redemptions(user_id);
CREATE INDEX idx_perk_redemptions_user_card_id ON perk_redemptions(user_card_id);
CREATE INDEX idx_perk_redemptions_date ON perk_redemptions(redemption_date);
CREATE INDEX idx_perk_auto_redemptions_user_id ON perk_auto_redemptions(user_id);
CREATE INDEX idx_perk_auto_redemptions_perk_id ON perk_auto_redemptions(perk_id);

-- Add RLS policies (examples)
ALTER TABLE perk_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE perk_eligible_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE perk_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE perk_auto_redemptions ENABLE ROW LEVEL SECURITY;

-- Everyone can read perk definitions and eligible services
CREATE POLICY "Public can read perk definitions" ON perk_definitions
    FOR SELECT USING (true);

CREATE POLICY "Public can read eligible services" ON perk_eligible_services
    FOR SELECT USING (true);

-- Users can only access their own redemptions
CREATE POLICY "Users can manage their redemptions" ON perk_redemptions
    FOR ALL USING (auth.uid() = user_id);

-- Users can only access their own auto-redemption preferences
CREATE POLICY "Users can manage their auto-redemptions" ON perk_auto_redemptions
    FOR ALL USING (auth.uid() = user_id);