// Database schema interfaces that match our Supabase tables

export interface CardDefinition {
  id: string;
  card_id: string;
  name: string;
  image_url: string | null;
  annual_fee: number | null;
  statement_credit: number | null;
  rewards_currency: string | null;
  network: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BenefitDefinition {
  id: string;
  benefit_id: string;
  card_definition_id: string;
  name: string;
  value: number;
  period: 'monthly' | 'quarterly' | 'semi_annual' | 'annual' | 'other';
  period_months: number;
  reset_type: 'calendar' | 'anniversary';
  description: string | null;
  redemption_instructions: string | null;
  app_scheme: string | null;
  categories: string[];
  is_active: boolean;
  start_date: string | null;
  end_date: string | null;
  terms: string | null;
  redemption_url: string | null;
  image_url: string | null;
  merchant_name: string | null;
  merchant_logo: string | null;
  is_anniversary_benefit: boolean;
  estimated_value: number | null;
  created_at: string;
  updated_at: string;
}

export interface AppScheme {
  id: string;
  scheme_key: string;
  ios_scheme: string | null;
  android_scheme: string | null;
  fallback_url: string | null;
  android_package: string | null;
  app_store_url_ios: string | null;
  app_store_url_android: string | null;
  created_at: string;
  updated_at: string;
}

export interface BenefitEligibleService {
  id: string;
  benefit_definition_id: string;
  service_name: string;
  service_url: string | null;
  app_deep_link: string | null;
  created_at: string;
  updated_at: string;
}

export interface MultiChoicePerkConfig {
  id: string;
  parent_perk_name: string;
  label: string;
  target_perk_name: string;
  created_at: string;
  updated_at: string;
}

// Combined interfaces for API responses
export interface CardWithBenefits extends CardDefinition {
  benefits: BenefitWithServices[];
}

export interface BenefitWithServices extends BenefitDefinition {
  eligible_services?: BenefitEligibleService[];
  app_schemes?: AppScheme;
}

// Transformation interfaces to match existing app structure
export interface TransformedCard {
  id: string;
  name: string;
  image: any; // React Native ImageSourcePropType
  annualFee?: number;
  statementCredit?: number;
  rewardsCurrency?: string;
  network?: string;
  benefits: TransformedBenefit[];
  renewalDate?: string;
}

export interface TransformedBenefit {
  id: string;
  name: string;
  value: number;
  period: 'monthly' | 'quarterly' | 'semi_annual' | 'annual' | 'other';
  periodMonths: number;
  resetType: 'calendar' | 'anniversary';
  definition_id: string;
  description?: string;
  redemptionInstructions?: string;
  appScheme?: string;
  eligibleServices?: string[];
  categories: string[];
  isActive?: boolean;
  startDate?: string;
  endDate?: string;
  terms?: string;
  redemptionUrl?: string;
  imageUrl?: string;
  merchantName?: string;
  merchantLogo?: string;
}

// Query result types with relationships
export interface CardDefinitionWithRelations extends CardDefinition {
  benefit_definitions: BenefitDefinitionWithRelations[];
}

export interface BenefitDefinitionWithRelations extends BenefitDefinition {
  benefit_eligible_services: BenefitEligibleService[];
}

// Database query options
export interface CardQueryOptions {
  includeInactive?: boolean;
  cardIds?: string[];
  includeServices?: boolean;
}

export interface BenefitQueryOptions {
  cardDefinitionId?: string;
  categories?: string[];
  period?: string;
  includeInactive?: boolean;
}