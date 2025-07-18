import type {
  CardDefinitionWithRelations,
  BenefitDefinitionWithRelations,
  BenefitWithServices,
  AppScheme,
  MultiChoicePerkConfig,
  TransformedCard,
  TransformedBenefit,
} from '../types/database';
import type { Card, Benefit } from '../src/data/card-data';

/**
 * Image mapping for card assets
 * Maps database image_url paths to React Native require() statements
 */
const IMAGE_MAP: Record<string, any> = {
  '../../assets/images/amex_plat.avif': require('../assets/images/amex_plat.avif'),
  '../../assets/images/amex_gold.avif': require('../assets/images/amex_gold.avif'),
  '../../assets/images/chase_sapphire_reserve.png': require('../assets/images/chase_sapphire_reserve.png'),
  '../../assets/images/chase_sapphire_preferred.png': require('../assets/images/chase_sapphire_preferred.png'),
  '../../assets/images/marriott_bonvoy_brilliant.avif': require('../assets/images/marriott_bonvoy_brilliant.avif'),
  '../../assets/images/hilton_aspire.avif': require('../assets/images/hilton_aspire.avif'),
  '../../assets/images/venture_x.avif': require('../assets/images/venture_x.avif'),
  '../../assets/images/blue_cash_preferred.avif': require('../assets/images/blue_cash_preferred.avif'),
  '../../assets/images/delta_reserve.avif': require('../assets/images/delta_reserve.avif'),
  '../../assets/images/amex_green.avif': require('../assets/images/amex_green.avif'),
  '../../assets/images/boa_premium_rewards.png': require('../assets/images/boa_premium_rewards.png'),
  '../../assets/images/boa_premium_rewards_elite.png': require('../assets/images/boa_premium_rewards_elite.png'),
  '../../assets/images/usb_altitude_reserve.png': require('../assets/images/usb_altitude_reserve.png'),
  '../../assets/images/citi_prestige.jpeg': require('../assets/images/citi_prestige.jpeg'),
};

/**
 * Transform database benefit to app benefit format
 */
export function transformBenefit(dbBenefit: BenefitWithServices): TransformedBenefit {
  return {
    id: dbBenefit.benefit_id,
    name: dbBenefit.name,
    value: dbBenefit.value,
    period: dbBenefit.period,
    periodMonths: dbBenefit.period_months as 1 | 3 | 6 | 12 | 48,
    resetType: dbBenefit.reset_type,
    definition_id: dbBenefit.id, // Database UUID for tracking redemptions
    description: dbBenefit.description || undefined,
    redemptionInstructions: dbBenefit.redemption_instructions || undefined,
    appScheme: dbBenefit.app_scheme as any || undefined,
    eligibleServices: dbBenefit.eligible_services?.map((service: any) => service.service_name) || [],
    categories: dbBenefit.categories,
    isActive: dbBenefit.is_active,
    startDate: dbBenefit.start_date || undefined,
    endDate: dbBenefit.end_date || undefined,
    terms: dbBenefit.terms || undefined,
    redemptionUrl: dbBenefit.redemption_url || undefined,
    imageUrl: dbBenefit.image_url || undefined,
    merchantName: dbBenefit.merchant_name || undefined,
    merchantLogo: dbBenefit.merchant_logo || undefined,
  };
}

/**
 * Transform database card to app card format
 */
export function transformCard(dbCard: CardDefinitionWithRelations): TransformedCard {
  const image = dbCard.image_url ? IMAGE_MAP[dbCard.image_url] : undefined;
  
  if (dbCard.image_url && !image) {
    console.warn(`Missing image mapping for: ${dbCard.image_url}`);
  }

  return {
    id: dbCard.card_id,
    name: dbCard.name,
    image,
    annualFee: dbCard.annual_fee || undefined,
    statementCredit: dbCard.statement_credit || undefined,
    rewardsCurrency: dbCard.rewards_currency || undefined,
    network: dbCard.network || undefined,
    benefits: dbCard.benefit_definitions.map(transformBenefit),
    renewalDate: undefined, // This comes from user_credit_cards table
  };
}

/**
 * Transform database cards array to app cards format
 */
export function transformCards(dbCards: CardDefinitionWithRelations[]): TransformedCard[] {
  return dbCards.map(transformCard);
}

/**
 * Transform database benefits array to app benefits format
 */
export function transformBenefits(dbBenefits: BenefitWithServices[]): TransformedBenefit[] {
  return dbBenefits.map(transformBenefit);
}

/**
 * Convert app card format back to database format (for backwards compatibility)
 */
export function appCardToDbCard(appCard: Card): Partial<CardDefinitionWithRelations> {
  // Find the image path from the IMAGE_MAP
  const imagePath = Object.keys(IMAGE_MAP).find(path => IMAGE_MAP[path] === appCard.image);
  
  return {
    card_id: appCard.id,
    name: appCard.name,
    image_url: imagePath || null,
    annual_fee: appCard.annualFee || null,
    statement_credit: appCard.statementCredit || null,
    rewards_currency: appCard.rewardsCurrency || null,
    network: appCard.network || null,
    is_active: true,
    // benefits would need separate transformation
  };
}

/**
 * Convert app benefit format back to database format (for backwards compatibility)
 */
export function appBenefitToDbBenefit(appBenefit: Benefit, cardDefinitionId: string): Partial<BenefitWithServices> {
  return {
    benefit_id: appBenefit.id,
    card_definition_id: cardDefinitionId,
    name: appBenefit.name,
    value: appBenefit.value,
    period: appBenefit.period,
    period_months: appBenefit.periodMonths,
    reset_type: appBenefit.resetType,
    description: appBenefit.description || null,
    redemption_instructions: appBenefit.redemptionInstructions || null,
    app_scheme: appBenefit.appScheme || null,
    categories: appBenefit.categories,
    is_active: appBenefit.isActive !== false,
    start_date: appBenefit.startDate || null,
    end_date: appBenefit.endDate || null,
    terms: appBenefit.terms || null,
    redemption_url: appBenefit.redemptionUrl || null,
    image_url: appBenefit.imageUrl || null,
    merchant_name: appBenefit.merchantName || null,
    merchant_logo: appBenefit.merchantLogo || null,
    is_anniversary_benefit: false,
    estimated_value: null,
  };
}

/**
 * Create an APP_SCHEMES object from database app schemes
 */
export function createAppSchemesFromDb(dbAppSchemes: AppScheme[]): Record<string, any> {
  const appSchemes: Record<string, any> = {};
  
  dbAppSchemes.forEach(scheme => {
    appSchemes[scheme.scheme_key] = {
      ios: scheme.ios_scheme ? [scheme.ios_scheme] : undefined,
      android: scheme.android_scheme ? [scheme.android_scheme] : undefined,
      fallbackUrl: scheme.fallback_url || undefined,
      androidPackage: scheme.android_package || undefined,
      appStoreUrl: {
        ios: scheme.app_store_url_ios || undefined,
        android: scheme.app_store_url_android || undefined,
      },
    };
  });
  
  return appSchemes;
}

/**
 * Create PERK_TO_APP_MAP from database benefits
 */
export function createPerkToAppMapFromDb(dbBenefits: BenefitWithServices[]): Record<string, string> {
  const perkToAppMap: Record<string, string> = {};
  
  dbBenefits.forEach(benefit => {
    if (benefit.app_scheme) {
      perkToAppMap[benefit.name] = benefit.app_scheme;
    }
  });
  
  return perkToAppMap;
}

/**
 * Create multiChoicePerksConfig from database configurations
 */
export function createMultiChoiceConfigFromDb(dbConfigs: MultiChoicePerkConfig[]): Record<string, Array<{ label: string; targetPerkName: string }>> {
  const multiChoiceConfig: Record<string, Array<{ label: string; targetPerkName: string }>> = {};
  
  dbConfigs.forEach(config => {
    if (!multiChoiceConfig[config.parent_perk_name]) {
      multiChoiceConfig[config.parent_perk_name] = [];
    }
    
    multiChoiceConfig[config.parent_perk_name].push({
      label: config.label,
      targetPerkName: config.target_perk_name,
    });
  });
  
  return multiChoiceConfig;
}

/**
 * Validate transformed card data
 */
export function validateTransformedCard(card: TransformedCard): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!card.id) errors.push('Card ID is required');
  if (!card.name) errors.push('Card name is required');
  if (!card.image) errors.push(`Missing image for card: ${card.name}`);
  if (!card.benefits || card.benefits.length === 0) errors.push(`No benefits found for card: ${card.name}`);
  
  // Validate each benefit
  card.benefits.forEach((benefit, index) => {
    if (!benefit.id) errors.push(`Benefit ${index} missing ID in card: ${card.name}`);
    if (!benefit.name) errors.push(`Benefit ${index} missing name in card: ${card.name}`);
    if (!benefit.definition_id) errors.push(`Benefit ${index} missing definition_id in card: ${card.name}`);
    if (benefit.value <= 0) errors.push(`Benefit ${benefit.name} has invalid value: ${benefit.value}`);
  });
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Get image asset for a card by card_id
 */
export function getCardImage(imageUrl: string | null): any {
  if (!imageUrl) return undefined;
  return IMAGE_MAP[imageUrl];
}

/**
 * Transform a single database benefit for use in existing components
 * This is useful when fetching individual benefits
 */
export function dbBenefitToAppBenefit(dbBenefit: BenefitWithServices): Benefit {
  return {
    id: dbBenefit.benefit_id,
    name: dbBenefit.name,
    value: dbBenefit.value,
    period: dbBenefit.period,
    periodMonths: dbBenefit.period_months as 1 | 3 | 6 | 12 | 48,
    resetType: dbBenefit.reset_type,
    definition_id: dbBenefit.id,
    description: dbBenefit.description || undefined,
    redemptionInstructions: dbBenefit.redemption_instructions || undefined,
    appScheme: dbBenefit.app_scheme as any || undefined,
    eligibleServices: dbBenefit.eligible_services?.map((service: any) => service.service_name) || [],
    categories: dbBenefit.categories,
    isActive: dbBenefit.is_active,
    startDate: dbBenefit.start_date || undefined,
    endDate: dbBenefit.end_date || undefined,
    terms: dbBenefit.terms || undefined,
    redemptionUrl: dbBenefit.redemption_url || undefined,
    imageUrl: dbBenefit.image_url || undefined,
    merchantName: dbBenefit.merchant_name || undefined,
    merchantLogo: dbBenefit.merchant_logo || undefined,
  };
}

/**
 * Transform a single database card for use in existing components
 */
export function dbCardToAppCard(dbCard: CardDefinitionWithRelations): Card {
  return {
    id: dbCard.card_id,
    name: dbCard.name,
    image: getCardImage(dbCard.image_url),
    annualFee: dbCard.annual_fee || undefined,
    statementCredit: dbCard.statement_credit || undefined,
    rewardsCurrency: dbCard.rewards_currency || undefined,
    network: dbCard.network || undefined,
    benefits: dbCard.benefit_definitions.map(dbBenefitToAppBenefit),
    renewalDate: undefined,
  };
}