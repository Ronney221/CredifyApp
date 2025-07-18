import { supabase } from './supabase';
import type {
  CardDefinition,
  BenefitDefinition,
  AppScheme,
  BenefitEligibleService,
  MultiChoicePerkConfig,
  CardWithBenefits,
  BenefitWithServices,
  CardDefinitionWithRelations,
  CardQueryOptions,
  BenefitQueryOptions,
} from '../types/database';

/**
 * Fetch all card definitions with their benefits
 */
export async function fetchAllCards(options: CardQueryOptions = {}) {
  try {
    console.log('Fetching all cards from database...');
    
    let query = supabase
      .from('card_definitions')
      .select(`
        *,
        benefit_definitions!inner (
          *,
          benefit_eligible_services (
            service_name,
            service_url,
            app_deep_link
          )
        )
      `)
      .order('name');

    if (!options.includeInactive) {
      query = query.eq('is_active', true);
    }

    if (options.cardIds && options.cardIds.length > 0) {
      query = query.in('card_id', options.cardIds);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching cards:', error);
      return { data: null, error };
    }

    console.log(`Successfully fetched ${data?.length || 0} cards`);
    return { data: data as CardDefinitionWithRelations[], error: null };
  } catch (error) {
    console.error('Unexpected error fetching cards:', error);
    return { data: null, error };
  }
}

/**
 * Fetch a single card by card_id with its benefits
 */
export async function fetchCardById(cardId: string) {
  try {
    console.log('Fetching card by ID:', cardId);
    
    const { data, error } = await supabase
      .from('card_definitions')
      .select(`
        *,
        benefit_definitions!inner (
          *,
          benefit_eligible_services (
            service_name,
            service_url,
            app_deep_link
          )
        )
      `)
      .eq('card_id', cardId)
      .eq('is_active', true)
      .single();

    if (error) {
      console.error('Error fetching card by ID:', error);
      return { data: null, error };
    }

    console.log('Successfully fetched card:', data?.name);
    return { data: data as CardDefinitionWithRelations, error: null };
  } catch (error) {
    console.error('Unexpected error fetching card by ID:', error);
    return { data: null, error };
  }
}

/**
 * Fetch benefits for a specific card
 */
export async function fetchBenefitsByCardId(cardId: string, options: BenefitQueryOptions = {}) {
  try {
    console.log('Fetching benefits for card:', cardId);
    
    // First get the card definition ID
    const { data: cardData, error: cardError } = await supabase
      .from('card_definitions')
      .select('id')
      .eq('card_id', cardId)
      .single();

    if (cardError || !cardData) {
      console.error('Error finding card definition:', cardError);
      return { data: null, error: cardError || new Error('Card not found') };
    }

    let query = supabase
      .from('benefit_definitions')
      .select(`
        *,
        benefit_eligible_services (
          service_name,
          service_url,
          app_deep_link
        )
      `)
      .eq('card_definition_id', cardData.id)
      .order('name');

    if (!options.includeInactive) {
      query = query.eq('is_active', true);
    }

    if (options.categories && options.categories.length > 0) {
      query = query.overlaps('categories', options.categories);
    }

    if (options.period) {
      query = query.eq('period', options.period);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching benefits:', error);
      return { data: null, error };
    }

    console.log(`Successfully fetched ${data?.length || 0} benefits for card ${cardId}`);
    return { data: data as BenefitWithServices[], error: null };
  } catch (error) {
    console.error('Unexpected error fetching benefits:', error);
    return { data: null, error };
  }
}

/**
 * Fetch a single benefit by benefit_id
 */
export async function fetchBenefitById(benefitId: string) {
  try {
    console.log('Fetching benefit by ID:', benefitId);
    
    const { data, error } = await supabase
      .from('benefit_definitions')
      .select(`
        *,
        benefit_eligible_services (
          service_name,
          service_url,
          app_deep_link
        )
      `)
      .eq('benefit_id', benefitId)
      .eq('is_active', true)
      .single();

    if (error) {
      console.error('Error fetching benefit by ID:', error);
      return { data: null, error };
    }

    console.log('Successfully fetched benefit:', data?.name);
    return { data: data as BenefitWithServices, error: null };
  } catch (error) {
    console.error('Unexpected error fetching benefit by ID:', error);
    return { data: null, error };
  }
}

/**
 * Fetch all app schemes
 */
export async function fetchAppSchemes() {
  try {
    console.log('Fetching app schemes...');
    
    const { data, error } = await supabase
      .from('app_schemes')
      .select('*')
      .order('scheme_key');

    if (error) {
      console.error('Error fetching app schemes:', error);
      return { data: null, error };
    }

    console.log(`Successfully fetched ${data?.length || 0} app schemes`);
    return { data: data as AppScheme[], error: null };
  } catch (error) {
    console.error('Unexpected error fetching app schemes:', error);
    return { data: null, error };
  }
}

/**
 * Fetch app scheme by key
 */
export async function fetchAppSchemeByKey(schemeKey: string) {
  try {
    console.log('Fetching app scheme by key:', schemeKey);
    
    const { data, error } = await supabase
      .from('app_schemes')
      .select('*')
      .eq('scheme_key', schemeKey)
      .single();

    if (error) {
      console.error('Error fetching app scheme by key:', error);
      return { data: null, error };
    }

    console.log('Successfully fetched app scheme:', data?.scheme_key);
    return { data: data as AppScheme, error: null };
  } catch (error) {
    console.error('Unexpected error fetching app scheme by key:', error);
    return { data: null, error };
  }
}

/**
 * Fetch multi-choice perk configurations
 */
export async function fetchMultiChoiceConfigs() {
  try {
    console.log('Fetching multi-choice perk configurations...');
    
    const { data, error } = await supabase
      .from('multi_choice_perk_configs')
      .select('*')
      .order('parent_perk_name', { ascending: true })
      .order('label', { ascending: true });

    if (error) {
      console.error('Error fetching multi-choice configs:', error);
      return { data: null, error };
    }

    console.log(`Successfully fetched ${data?.length || 0} multi-choice configurations`);
    return { data: data as MultiChoicePerkConfig[], error: null };
  } catch (error) {
    console.error('Unexpected error fetching multi-choice configs:', error);
    return { data: null, error };
  }
}

/**
 * Fetch multi-choice configurations for a specific parent perk
 */
export async function fetchMultiChoiceConfigsByPerk(parentPerkName: string) {
  try {
    console.log('Fetching multi-choice configs for perk:', parentPerkName);
    
    const { data, error } = await supabase
      .from('multi_choice_perk_configs')
      .select('*')
      .eq('parent_perk_name', parentPerkName)
      .order('label');

    if (error) {
      console.error('Error fetching multi-choice configs by perk:', error);
      return { data: null, error };
    }

    console.log(`Successfully fetched ${data?.length || 0} multi-choice configurations for ${parentPerkName}`);
    return { data: data as MultiChoicePerkConfig[], error: null };
  } catch (error) {
    console.error('Unexpected error fetching multi-choice configs by perk:', error);
    return { data: null, error };
  }
}

/**
 * Search benefits by category
 */
export async function searchBenefitsByCategory(categories: string[]) {
  try {
    console.log('Searching benefits by categories:', categories);
    
    const { data, error } = await supabase
      .from('benefit_definitions')
      .select(`
        *,
        card_definitions!inner (
          card_id,
          name
        ),
        benefit_eligible_services (
          service_name,
          service_url,
          app_deep_link
        )
      `)
      .overlaps('categories', categories)
      .eq('is_active', true)
      .order('value', { ascending: false });

    if (error) {
      console.error('Error searching benefits by category:', error);
      return { data: null, error };
    }

    console.log(`Successfully found ${data?.length || 0} benefits in categories: ${categories.join(', ')}`);
    return { data, error: null };
  } catch (error) {
    console.error('Unexpected error searching benefits by category:', error);
    return { data: null, error };
  }
}

/**
 * Search benefits by value range
 */
export async function searchBenefitsByValue(minValue: number, maxValue?: number) {
  try {
    console.log('Searching benefits by value range:', { minValue, maxValue });
    
    let query = supabase
      .from('benefit_definitions')
      .select(`
        *,
        card_definitions!inner (
          card_id,
          name
        )
      `)
      .gte('value', minValue)
      .eq('is_active', true)
      .order('value', { ascending: false });

    if (maxValue) {
      query = query.lte('value', maxValue);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error searching benefits by value:', error);
      return { data: null, error };
    }

    console.log(`Successfully found ${data?.length || 0} benefits in value range`);
    return { data, error: null };
  } catch (error) {
    console.error('Unexpected error searching benefits by value:', error);
    return { data: null, error };
  }
}

/**
 * Test database connectivity and performance
 */
export async function testDatabaseConnection() {
  try {
    console.log('Testing database connection...');
    
    const startTime = Date.now();
    
    // Test basic connectivity
    const { data: cardCount, error: cardError } = await supabase
      .from('card_definitions')
      .select('id', { count: 'exact', head: true });

    if (cardError) {
      console.error('Database connection test failed:', cardError);
      return { success: false, error: cardError };
    }

    const { data: benefitCount, error: benefitError } = await supabase
      .from('benefit_definitions')
      .select('id', { count: 'exact', head: true });

    if (benefitError) {
      console.error('Database connection test failed:', benefitError);
      return { success: false, error: benefitError };
    }

    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log('Database connection test successful:', {
      cardCount: cardCount?.length || 0,
      benefitCount: benefitCount?.length || 0,
      duration: `${duration}ms`
    });

    return {
      success: true,
      stats: {
        cardCount: cardCount?.length || 0,
        benefitCount: benefitCount?.length || 0,
        responseTime: duration
      }
    };
  } catch (error) {
    console.error('Unexpected error testing database connection:', error);
    return { success: false, error };
  }
}