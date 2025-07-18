-- Migration: Create card definitions and benefits tables
-- This migration creates tables to store the card data from card-data.ts

-- Create card_definitions table to store the main card information
CREATE TABLE IF NOT EXISTS card_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    card_id TEXT UNIQUE NOT NULL, -- e.g., 'amex_platinum', 'chase_sapphire_reserve'
    name TEXT NOT NULL, -- e.g., 'American Express Platinum'
    image_url TEXT, -- Store the image path/URL
    annual_fee NUMERIC(10,2),
    statement_credit NUMERIC(10,2),
    rewards_currency TEXT,
    network TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create benefit_definitions table to store individual benefits
CREATE TABLE IF NOT EXISTS benefit_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    benefit_id TEXT UNIQUE NOT NULL, -- e.g., 'platinum_uber_cash', 'amex_gold_uber'
    card_definition_id UUID NOT NULL REFERENCES card_definitions(id) ON DELETE CASCADE,
    name TEXT NOT NULL, -- e.g., 'Uber Cash', 'Digital Entertainment Credit'
    value NUMERIC(10,2) NOT NULL,
    period TEXT NOT NULL CHECK (period IN ('monthly', 'quarterly', 'semi_annual', 'annual', 'other')),
    period_months INTEGER NOT NULL CHECK (period_months IN (1, 3, 6, 12, 48)),
    reset_type TEXT NOT NULL CHECK (reset_type IN ('calendar', 'anniversary')),
    description TEXT,
    redemption_instructions TEXT,
    app_scheme TEXT, -- Link to APP_SCHEMES
    categories TEXT[] NOT NULL DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    start_date DATE,
    end_date DATE,
    terms TEXT,
    redemption_url TEXT,
    image_url TEXT,
    merchant_name TEXT,
    merchant_logo TEXT,
    -- Additional fields for special benefit types
    is_anniversary_benefit BOOLEAN DEFAULT false,
    estimated_value NUMERIC(10,2), -- For benefits like free nights where value varies
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create eligible_services table for benefit-specific services
CREATE TABLE IF NOT EXISTS benefit_eligible_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    benefit_definition_id UUID NOT NULL REFERENCES benefit_definitions(id) ON DELETE CASCADE,
    service_name TEXT NOT NULL,
    service_url TEXT,
    app_deep_link TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create app_schemes table to store the APP_SCHEMES configuration
CREATE TABLE IF NOT EXISTS app_schemes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scheme_key TEXT UNIQUE NOT NULL, -- e.g., 'uber', 'grubhub', 'disneyPlus'
    ios_scheme TEXT,
    android_scheme TEXT,
    fallback_url TEXT,
    android_package TEXT,
    app_store_url_ios TEXT,
    app_store_url_android TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create multi_choice_perk_configs table
CREATE TABLE IF NOT EXISTS multi_choice_perk_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_perk_name TEXT NOT NULL, -- e.g., 'Digital Entertainment Credit'
    label TEXT NOT NULL, -- e.g., 'Open Disney+'
    target_perk_name TEXT NOT NULL, -- e.g., 'Disney+ Credit'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_card_definitions_card_id ON card_definitions(card_id);
CREATE INDEX IF NOT EXISTS idx_benefit_definitions_benefit_id ON benefit_definitions(benefit_id);
CREATE INDEX IF NOT EXISTS idx_benefit_definitions_card_id ON benefit_definitions(card_definition_id);
CREATE INDEX IF NOT EXISTS idx_benefit_definitions_categories ON benefit_definitions USING GIN(categories);
CREATE INDEX IF NOT EXISTS idx_benefit_eligible_services_benefit_id ON benefit_eligible_services(benefit_definition_id);
CREATE INDEX IF NOT EXISTS idx_app_schemes_key ON app_schemes(scheme_key);
CREATE INDEX IF NOT EXISTS idx_multi_choice_perk_configs_parent ON multi_choice_perk_configs(parent_perk_name);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at columns
CREATE TRIGGER update_card_definitions_updated_at 
    BEFORE UPDATE ON card_definitions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_benefit_definitions_updated_at 
    BEFORE UPDATE ON benefit_definitions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_benefit_eligible_services_updated_at 
    BEFORE UPDATE ON benefit_eligible_services 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_app_schemes_updated_at 
    BEFORE UPDATE ON app_schemes 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_multi_choice_perk_configs_updated_at 
    BEFORE UPDATE ON multi_choice_perk_configs 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add RLS (Row Level Security) policies
ALTER TABLE card_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE benefit_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE benefit_eligible_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_schemes ENABLE ROW LEVEL SECURITY;
ALTER TABLE multi_choice_perk_configs ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access (these are reference data)
CREATE POLICY "Allow public read access to card_definitions" ON card_definitions
    FOR SELECT USING (true);

CREATE POLICY "Allow public read access to benefit_definitions" ON benefit_definitions
    FOR SELECT USING (true);

CREATE POLICY "Allow public read access to benefit_eligible_services" ON benefit_eligible_services
    FOR SELECT USING (true);

CREATE POLICY "Allow public read access to app_schemes" ON app_schemes
    FOR SELECT USING (true);

CREATE POLICY "Allow public read access to multi_choice_perk_configs" ON multi_choice_perk_configs
    FOR SELECT USING (true);

-- Create policies for authenticated users to insert/update (for admin purposes)
CREATE POLICY "Allow authenticated users to manage card_definitions" ON card_definitions
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to manage benefit_definitions" ON benefit_definitions
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to manage benefit_eligible_services" ON benefit_eligible_services
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to manage app_schemes" ON app_schemes
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to manage multi_choice_perk_configs" ON multi_choice_perk_configs
    FOR ALL USING (auth.role() = 'authenticated'); 