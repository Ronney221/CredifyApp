import { supabase } from './supabase';
import { Card, Benefit, allCards } from '../src/data/card-data';
import { cardService } from './card-service';
import { logger } from '../utils/logger';

// Feature flag to switch between hard-coded data and database
const USE_DATABASE_CARDS = true; // Set to true to use database instead of hard-coded data

export { supabase };

/**
 * Get all cards - switches between hard-coded data and database based on feature flag
 */
export async function getAllCardsData(): Promise<Card[]> {
  if (USE_DATABASE_CARDS) {
    try {
      logger.log('📊 Loading cards from database...');
      return await cardService.getAllCards();
    } catch (error) {
      console.error('❌ Database fallback: Using hard-coded cards due to error:', error);
      return allCards;
    }
  }
  return allCards;
}

/**
 * Find a card by ID - switches between hard-coded data and database
 */
export async function findCardByIdData(cardId: string): Promise<Card | undefined> {
  if (USE_DATABASE_CARDS) {
    try {
      const card = await cardService.getCardById(cardId);
      return card || undefined;
    } catch (error) {
      console.error('❌ Database fallback: Using hard-coded cards due to error:', error);
      return allCards.find(c => c.id === cardId);
    }
  }
  return allCards.find(c => c.id === cardId);
}

interface UserCard {
  id: string;
  user_id: string;
  card_name: string;
  card_brand: string;
  card_category: string;
  annual_fee: number;
  status: 'active' | 'removed';
  renewal_date?: string;
  display_order: number;
}

interface PerkRedemption {
  id: string;
  user_id: string;
  user_card_id: string;
  perk_id: string;
  redemption_date: string;
  reset_date: string;
  status: 'available' | 'redeemed' | 'partially_redeemed';
  value_redeemed: number;
  total_value: number;
  remaining_value: number;
  parent_redemption_id?: string;
  is_auto_redemption: boolean;
}

interface PerkWithStatus extends Benefit {
  status?: 'available' | 'redeemed' | 'partially_redeemed';
  remaining_value?: number;
}

// Helper function to calculate reset date based on period
const calculateResetDate = (period: string, periodMonths: number, resetType: 'calendar' | 'anniversary'): Date => {
  const now = new Date();
  const resetDate = new Date();
  
  if (resetType === 'calendar') {
    // For calendar-based resets, align with calendar periods
    switch (period) {
      case 'monthly':
        // Reset on first day of next month
        resetDate.setMonth(now.getMonth() + 1, 1);
        resetDate.setHours(0, 0, 0, 0);
        break;
      case 'quarterly':
        // Reset on first day of next quarter
        const currentQuarter = Math.floor(now.getMonth() / 3);
        resetDate.setMonth((currentQuarter + 1) * 3, 1);
        resetDate.setHours(0, 0, 0, 0);
        if (resetDate <= now) {
          resetDate.setMonth(resetDate.getMonth() + 3);
        }
        break;
      case 'semi_annual':
        // Reset on either January 1 or July 1
        const isFirstHalf = now.getMonth() < 6;
        resetDate.setMonth(isFirstHalf ? 6 : 0);
        resetDate.setDate(1);
        resetDate.setHours(0, 0, 0, 0);
        if (resetDate <= now) {
          resetDate.setFullYear(resetDate.getFullYear() + (isFirstHalf ? 0 : 1));
        }
        break;
      case 'annual':
        // Reset on January 1 of next year
        resetDate.setFullYear(now.getFullYear() + 1, 0, 1);
        resetDate.setHours(0, 0, 0, 0);
        break;
      default:
        // For custom periods, add the period months
        resetDate.setMonth(now.getMonth() + periodMonths);
        resetDate.setDate(1);
        resetDate.setHours(0, 0, 0, 0);
    }
  } else {
    // For anniversary-based resets, simply add the period months to current date
    resetDate.setMonth(now.getMonth() + periodMonths);
  }
  
  return resetDate;
};

export async function getUserCards(userId: string) {
  try {
    logger.log('Fetching cards for user:', userId);
    const { data: cards, error } = await supabase
      .from('user_credit_cards')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('display_order', { ascending: true });

    if (error) {
      console.error('Database error fetching user cards:', error);
      return { data: null, error };
    }

    logger.log('Successfully fetched cards:', cards?.length || 0);
    return { data: cards as UserCard[], error: null };
  } catch (error) {
    console.error('Unexpected error fetching user cards:', error);
    return { data: null, error };
  }
}

export async function upsertUserCard(
  userId: string,
  card: Card,
  renewalDate?: Date | null,
  displayOrder?: number
) {
  const { data, error } = await supabase
    .from('user_credit_cards')
    .upsert({
      user_id: userId,
      card_name: card.name,
      card_brand: card.id.split('_')[0],
      card_category: 'rewards',
      annual_fee: card.annualFee || 0,
      renewal_date: renewalDate,
      display_order: displayOrder,
      status: 'active',
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'user_id,card_name'
    });
  
  return { data, error };
}

export async function markCardAsRemoved(
  userId: string,
  cardName: string
) {
  const { data, error } = await supabase
    .from('user_credit_cards')
    .update({
      status: 'removed',
      updated_at: new Date().toISOString()
    })
    .match({ user_id: userId, card_name: cardName });

  return { data, error };
}

export async function getUserActiveCards(userId: string) {
  const { data, error } = await supabase
    .from('user_credit_cards')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('display_order');

  if (error) {
    console.error('Error fetching active user cards:', error);
  }

  return { data, error };
}

export async function saveUserCards(
  userId: string,
  cards: Card[],
  renewalDates: Record<string, Date | null> = {}
) {
  try {
    // First, mark all existing active cards as removed
    const { error: updateError } = await supabase
      .from('user_credit_cards')
      .update({ 
        status: 'removed',
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('status', 'active');

    if (updateError) throw updateError;

    // Then insert new active cards
    const cardsToInsert = cards.map((card, index) => ({
      user_id: userId,
      card_name: card.name,
      card_brand: card.id.split('_')[0],
      card_category: 'rewards',
      annual_fee: card.annualFee || 0,
      renewal_date: renewalDates[card.id] ? renewalDates[card.id]?.toISOString() : null,
      display_order: index,
      status: 'active' as const,
      updated_at: new Date().toISOString()
    }));

    // Use insert instead of upsert since we've already marked existing cards as removed
    const { error: insertError } = await supabase
      .from('user_credit_cards')
      .insert(cardsToInsert);

    if (insertError) throw insertError;

    return { error: null };
  } catch (error) {
    console.error('Error saving user cards:', error);
    return { error };
  }
}

export async function hasUserSelectedCards(userId: string): Promise<boolean> {
  try {
    logger.log('Checking if user has cards:', userId);
    const { data: cards, error } = await supabase
      .from('user_credit_cards')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'active')
      .limit(1);

    if (error) {
      console.error('Database error checking user cards:', error);
      return false;
    }

    const hasCards = cards && cards.length > 0;
    logger.log('User has cards:', hasCards);
    return hasCards;
  } catch (error) {
    console.error('Unexpected error checking user cards:', error);
    return false;
  }
}

export async function trackPerkRedemption(
  userId: string,
  cardId: string,
  perk: PerkWithStatus,
  valueRedeemed: number,
  parentRedemptionId?: string
) {
  try {
    logger.log('Starting perk redemption tracking:', { 
      userId, 
      cardId, 
      perkId: perk.id,
      perkName: perk.name,
      value: valueRedeemed,
      parentRedemptionId,
      currentStatus: perk.status,
      remainingValue: perk.remaining_value
    });

    // First, find the perk definition
    const { data: perkDef, error: perkDefError } = await supabase
      .from('perk_definitions')
      .select('id, name, value, period_months, reset_type')
      .eq('id', perk.definition_id)
      .single();

    if (perkDefError || !perkDef) {
      console.error('Error finding perk definition by ID:', { 
        error: perkDefError, 
        perkDefinitionId: perk.definition_id,
        perkName: perk.name
      });
      return { error: new Error(`Perk definition not found for ID: ${perk.definition_id} (Name: ${perk.name})`) };
    }

    // Check if perk is already redeemed in the current period
    const now = new Date();
    const startOfPeriod = new Date();
    startOfPeriod.setDate(1);
    startOfPeriod.setHours(0, 0, 0, 0);
    
    if (perkDef.period_months > 1) {
      // Adjust start date for multi-month periods
      startOfPeriod.setMonth(Math.floor(now.getMonth() / perkDef.period_months) * perkDef.period_months);
    }

    const { data: existingRedemptions, error: existingError } = await supabase
      .from('perk_redemptions')
      .select('id, status, remaining_value, value_redeemed, reset_date')
      .eq('user_id', userId)
      .eq('perk_id', perk.definition_id)
      .gt('reset_date', now.toISOString()) // Current period redemptions have reset_date > now
      .order('redemption_date', { ascending: false });

    if (existingError) {
      console.error('Error checking existing redemptions:', existingError);
    }

    // Check for existing full redemption in current period
    const existingFullRedemption = existingRedemptions?.find(r => r.status === 'redeemed');
    if (existingFullRedemption) {
      return { error: new Error('Perk already fully redeemed this period') };
    }

    // Check for existing partial redemption that we might be completing
    const existingPartialRedemption = existingRedemptions?.find(r => r.status === 'partially_redeemed');

    // If this is a partial redemption (has parent), verify parent exists and has sufficient remaining value
    if (parentRedemptionId) {
      const { data: parentRedemption, error: parentError } = await supabase
        .from('perk_redemptions')
        .select('remaining_value, status')
        .eq('id', parentRedemptionId)
        .single();

      if (parentError || !parentRedemption) {
        console.error('Error finding parent redemption:', parentError);
        return { error: new Error('Parent redemption not found') };
      }

      if (parentRedemption.remaining_value < valueRedeemed) {
        console.error('Insufficient remaining value for partial redemption');
        return { error: new Error('Insufficient remaining value for partial redemption') };
      }

      // If parent is already fully redeemed, don't allow further redemptions
      if (parentRedemption.status === 'redeemed') {
        return { error: new Error('Parent perk is already fully redeemed') };
      }
    }

    // Get the user's card ID from the database
    const cardData = await findCardByIdData(cardId);
    logger.log(`[trackPerkRedemption] Looking up card: ${cardId}, found card data:`, cardData?.name);
    
    // First, let's see what cards this user actually has
    const { data: allUserCards } = await supabase
      .from('user_credit_cards')
      .select('id, card_name, card_brand, status')
      .eq('user_id', userId);
    
    logger.log(`[trackPerkRedemption] All user cards:`, allUserCards);
    
    const expectedBrand = cardId.split('_')[0];
    const expectedName = cardData?.name || '';
    
    logger.log(`[trackPerkRedemption] Looking for:`, {
      expectedBrand,
      expectedName,
      cardId
    });
    
    const { data: userCardsResult, error: cardError } = await supabase
      .from('user_credit_cards')
      .select('id, card_name, card_brand')
      .eq('user_id', userId)
      .eq('card_brand', expectedBrand)
      .eq('card_name', expectedName)
      .eq('status', 'active');

    logger.log(`[trackPerkRedemption] User cards query result:`, userCardsResult);

    let userCardToUse: any = null;
    
    if (cardError || !userCardsResult || userCardsResult.length === 0) {
      console.error('Error finding user card:', cardError);
      console.error('Query params:', {
        userId,
        cardBrand: cardId.split('_')[0],
        cardName: cardData?.name || '',
        cardId
      });
      
      // TEMPORARY FALLBACK: Try to find ANY active card for this user
      logger.log('[trackPerkRedemption] Card lookup failed, trying fallback...');
      const { data: fallbackCards } = await supabase
        .from('user_credit_cards')
        .select('id, card_name, card_brand')
        .eq('user_id', userId)
        .eq('status', 'active')
        .limit(1);
      
      if (fallbackCards && fallbackCards.length > 0) {
        userCardToUse = fallbackCards[0];
        logger.log('[trackPerkRedemption] Using fallback card:', userCardToUse.id);
      } else {
        console.error('[trackPerkRedemption] No fallback cards found');
        // Continue with null user_card_id for now
        userCardToUse = { id: null };
      }
    } else {
      userCardToUse = userCardsResult[0];
      logger.log(`[trackPerkRedemption] Using matched card:`, userCardToUse.id);
    }

    // Calculate reset date based on perk period and type
    const resetDate = calculateResetDate(
      perk.period || 'monthly',
      perkDef.period_months || 1,
      perkDef.reset_type || 'calendar'
    );

    // Calculate total redemption value including any existing partial redemption
    let totalValueRedeemed = valueRedeemed;
    let isCompletingPartialRedemption = false;
    
    if (existingPartialRedemption && perk.status === 'partially_redeemed') {
      // We're adding to an existing partial redemption
      totalValueRedeemed = existingPartialRedemption.value_redeemed + valueRedeemed;
      isCompletingPartialRedemption = totalValueRedeemed >= perkDef.value;
      
      logger.log('[trackPerkRedemption] Completing partial redemption:', {
        existingValue: existingPartialRedemption.value_redeemed,
        newValue: valueRedeemed,
        totalValue: totalValueRedeemed,
        perkValue: perkDef.value,
        isComplete: isCompletingPartialRedemption
      });
    }

    // Determine redemption status and values
    const isPartialRedemption = totalValueRedeemed < perkDef.value;
    const status = isPartialRedemption ? 'partially_redeemed' : 'redeemed';
    const totalValue = perkDef.value;
    const remainingValue = isPartialRedemption ? perkDef.value - totalValueRedeemed : 0;

    // If transitioning from partial to full redemption, delete the existing partial redemption
    if (existingPartialRedemption && isCompletingPartialRedemption) {
      const { error: deleteError } = await supabase
        .from('perk_redemptions')
        .delete()
        .eq('id', existingPartialRedemption.id);

      if (deleteError) {
        console.error('Error deleting existing partial redemption:', deleteError);
        return { error: new Error('Failed to delete existing partial redemption') };
      }
    }

    // Insert the new redemption with the calculated reset date
    const { error: insertError } = await supabase
      .from('perk_redemptions')
      .insert({
        user_id: userId,
        user_card_id: userCardToUse.id,
        perk_id: perk.definition_id,
        redemption_date: now.toISOString(),
        reset_date: resetDate.toISOString(),
        status,
        value_redeemed: totalValueRedeemed, // Use total value including any existing partial
        total_value: totalValue,
        remaining_value: remainingValue,
        parent_redemption_id: parentRedemptionId,
        is_auto_redemption: false
      });

    if (insertError) {
      console.error('Error inserting redemption:', insertError);
      return { error: insertError };
    }

    return { error: null };
  } catch (error) {
    console.error('Unexpected error in trackPerkRedemption:', error);
    return { error };
  }
}

export async function getPerkRedemptions(
  userId: string,
  startDate?: Date,
  endDate?: Date,
  includeExpired: boolean = false
) {
  try {
    logger.log('Fetching perk redemptions:', { userId, startDate, endDate, includeExpired });

    let query = supabase
      .from('perk_redemptions')
      .select(`
        *,
        perk_definitions (
          id,
          name,
          value,
          period_months,
          reset_type
        ),
        user_credit_cards (
          card_name,
          card_brand
        )
      `)
      .eq('user_id', userId);

    const now = new Date();

    if (!includeExpired) {
      // Only include redemptions that haven't expired (reset_date > now)
      query = query.gt('reset_date', now.toISOString());
    }

    if (startDate) {
      query = query.gte('redemption_date', startDate.toISOString());
    }
    
    if (endDate) {
      query = query.lt('redemption_date', endDate.toISOString());
    }

    // Order by redemption date descending to get most recent first
    query = query.order('redemption_date', { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching perk redemptions:', error);
      return { error };
    }

    // Post-process the results to add period information
    const processedData = data?.map(redemption => {
      const periodStart = new Date(redemption.redemption_date);
      const periodEnd = new Date(redemption.reset_date);
      
      return {
        ...redemption,
        period: {
          start: periodStart,
          end: periodEnd,
          months: redemption.perk_definitions?.period_months || 1
        }
      };
    });

    logger.log('Successfully fetched perk redemptions:', processedData?.length || 0);
    return { data: processedData, error: null };
  } catch (error) {
    console.error('Unexpected error fetching perk redemptions:', error);
    return { error };
  }
}

export async function getCurrentMonthRedemptions(userId: string) {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const startOfNextMonth = new Date(startOfMonth);
  startOfNextMonth.setMonth(startOfMonth.getMonth() + 1);

  return getPerkRedemptions(userId, startOfMonth, startOfNextMonth);
}

export async function getAnnualRedemptions(userId: string) {
  const startOfYear = new Date();
  startOfYear.setMonth(0, 1);
  startOfYear.setHours(0, 0, 0, 0);

  const startOfNextYear = new Date(startOfYear);
  startOfNextYear.setFullYear(startOfYear.getFullYear() + 1);

  return getPerkRedemptions(userId, startOfYear, startOfNextYear);
}

export async function deletePerkRedemption(userId: string, perkDefinitionId: string) {
  try {
    logger.log('[DB] Attempting to delete CURRENT PERIOD perk redemptions only:', { userId, perkDefinitionId });

    // First, get the perk definition to understand its period and reset type
    const { data: perkDef, error: perkDefError } = await supabase
      .from('perk_definitions')
      .select('id, name, period_months, reset_type')
      .eq('id', perkDefinitionId)
      .single();

    if (perkDefError || !perkDef) {
      console.error('Error finding perk definition for deletion:', perkDefError);
      return { error: new Error(`Perk definition not found for ID: ${perkDefinitionId}`) };
    }

    // Get current active redemptions only (those with reset_date > now)
    const now = new Date();
    const { data: currentRedemptions, error: findError } = await supabase
      .from('perk_redemptions')
      .select('id, parent_redemption_id, value_redeemed, status, reset_date, redemption_date')
      .eq('user_id', userId)
      .eq('perk_id', perkDefinitionId)
      .gt('reset_date', now.toISOString()) // Only current period redemptions
      .order('redemption_date', { ascending: false });

    if (findError) {
      console.error('Database error finding current perk redemptions:', findError);
      return { error: findError };
    }

    if (!currentRedemptions || currentRedemptions.length === 0) {
      logger.log('No current period redemption records found to delete');
      return { error: null };
    }

    logger.log(`[DB] Found ${currentRedemptions.length} CURRENT PERIOD redemption records to delete:`, 
      currentRedemptions.map(r => ({ 
        id: r.id, 
        status: r.status, 
        value: r.value_redeemed,
        redemption_date: r.redemption_date,
        reset_date: r.reset_date 
      }))
    );

    // Also check if there are historical redemptions that will be preserved
    const { data: historicalRedemptions, error: historicalError } = await supabase
      .from('perk_redemptions')
      .select('id, redemption_date, reset_date')
      .eq('user_id', userId)
      .eq('perk_id', perkDefinitionId)
      .lte('reset_date', now.toISOString()); // Historical redemptions

    if (!historicalError && historicalRedemptions && historicalRedemptions.length > 0) {
      logger.log(`[DB] Preserving ${historicalRedemptions.length} historical redemption records:`,
        historicalRedemptions.map(r => ({ 
          id: r.id,
          redemption_date: r.redemption_date,
          reset_date: r.reset_date 
        }))
      );
    }

    // Delete ONLY current period redemption records
    const { error: deleteError } = await supabase
      .from('perk_redemptions')
      .delete()
      .eq('user_id', userId)
      .eq('perk_id', perkDefinitionId)
      .gt('reset_date', now.toISOString()); // Only delete current period

    if (deleteError) {
      console.error('Database error deleting current period perk redemptions:', { 
        error: deleteError,
        userId,
        perkDefinitionId
      });
      return { error: deleteError };
    }

    logger.log(`Successfully deleted ${currentRedemptions.length} CURRENT PERIOD perk redemption(s). Historical data preserved.`, { 
      userId, 
      perkDefinitionId,
      perkName: perkDef.name,
      deletedCount: currentRedemptions.length,
      preservedCount: historicalRedemptions?.length || 0
    });
    
    return { error: null };
  } catch (error) {
    console.error('Unexpected error deleting perk redemptions:', { 
      error,
      userId,
      perkDefinitionId
    });
    return { error };
  }
}

// Auto-redemption management functions
export async function setAutoRedemption(
  userId: string,
  cardId: string,
  perk: Benefit,
  enabled: boolean = true
) {
  try {
    logger.log('Setting auto-redemption:', { 
      userId, 
      cardId, 
      perkName: perk.name,
      enabled 
    });

    // First, find the perk definition
    logger.log('Looking up perk definition for:', perk.name);
    const { data: perkDef, error: perkDefError } = await supabase
      .from('perk_definitions')
      .select('id, name')
      .eq('name', perk.name)
      .single();

    if (perkDefError || !perkDef) {
      console.error('Error finding perk definition:', { 
        error: perkDefError, 
        perkName: perk.name,
        searchedName: perk.name
      });
      return { error: new Error(`Perk definition not found for: ${perk.name}`) };
    }

    logger.log('Found perk definition:', {
      id: perkDef.id,
      name: perkDef.name,
      matches: perkDef.name === perk.name
    });

    // Get the user's card ID from the database
    const { data: userCardsResult, error: cardError } = await supabase
      .from('user_credit_cards')
      .select('id, card_name, card_brand')
      .eq('user_id', userId)
      .eq('card_brand', cardId.split('_')[0])
      .eq('card_name', (await findCardByIdData(cardId))?.name || '')
      .eq('status', 'active');

    if (cardError) {
      console.error('Error querying user card for auto-redemption:', {
        error: cardError,
        cardId,
        brand: cardId.split('_')[0],
        name: allCards.find(c => c.id === cardId)?.name
      });
      return { error: cardError };
    }

    if (!userCardsResult || userCardsResult.length === 0) {
      console.error('User card not found for auto-redemption:', {
        cardId,
        brand: cardId.split('_')[0],
        name: allCards.find(c => c.id === cardId)?.name
      });
      return { error: new Error('User card not found for auto-redemption setup') };
    }

    let userCardToUse;
    if (userCardsResult.length > 1) {
      logger.warn('Multiple active cards found for auto-redemption, proceeding with the first one:', {
        userId,
        cardId,
        brand: cardId.split('_')[0],
        name: allCards.find(c => c.id === cardId)?.name,
        count: userCardsResult.length,
        foundCards: userCardsResult.map(c => ({ id: c.id, name: c.card_name }))
      });
      userCardToUse = userCardsResult[0];
    } else {
      userCardToUse = userCardsResult[0];
    }
    
    logger.log('Using user_card_id for auto-redemption:', userCardToUse.id);

    if (enabled) {
      // Insert/update the auto-redemption preference
      const { data, error } = await supabase
        .from('perk_auto_redemptions')
        .upsert({
          user_id: userId,
          perk_id: perkDef.id,
          user_card_id: userCardToUse.id,
          is_enabled: true,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,perk_id,user_card_id'
        })
        .select()
        .single();

      if (error) {
        console.error('Error setting auto-redemption:', error);
        return { error };
      }

      logger.log('Successfully set auto-redemption:', data);
      return { data, error: null };
    } else {
      // Delete ALL auto-redemption rows for this user and perk, regardless of user_card_id
      // This handles cases where there might be multiple user_card_id entries for the same user
      logger.log('Attempting to delete ALL auto-redemptions for user and perk:', {
        userId,
        perkId: perkDef.id,
        perkName: perk.name
      });

      const { error } = await supabase
        .from('perk_auto_redemptions')
        .delete()
        .eq('user_id', userId)
        .eq('perk_id', perkDef.id);

      if (error) {
        console.error('Error deleting auto-redemptions:', error);
        return { error };
      }

      // Verify the deletion by checking if any rows still exist
      const { data: verificationData, error: verificationError } = await supabase
        .from('perk_auto_redemptions')
        .select('id')
        .eq('user_id', userId)
        .eq('perk_id', perkDef.id);

      if (verificationError) {
        logger.warn('Could not verify deletion, but delete operation succeeded:', verificationError);
      } else {
        logger.log('Verification check:', {
          remainingRows: verificationData?.length || 0,
          data: verificationData
        });
      }

      logger.log('Successfully deleted auto-redemption preference(s)');
      return { data: null, error: null };
    }
  } catch (error) {
    console.error('Unexpected error setting auto-redemption:', error);
    return { error };
  }
}

export async function getAutoRedemptions(userId: string) {
  try {
    logger.log('Fetching auto-redemptions for user:', userId);

    const { data, error } = await supabase
      .from('perk_auto_redemptions')
      .select(`
        *,
        perk_definitions (
          name,
          value
        ),
        user_credit_cards (
          card_name,
          card_brand
        )
      `)
      .eq('user_id', userId)
      .eq('is_enabled', true);

    if (error) {
      console.error('Error fetching auto-redemptions:', error);
      return { error };
    }

    logger.log('Successfully fetched auto-redemptions:', data?.length || 0);
    return { data, error: null };
  } catch (error) {
    console.error('Unexpected error fetching auto-redemptions:', error);
    return { error };
  }
}

export async function checkAutoRedemption(
  userId: string,
  perkDefinitionId: string,
  userCardId: string
) {
  try {
    const { data, error } = await supabase
      .from('perk_auto_redemptions')
      .select('is_enabled')
      .eq('user_id', userId)
      .eq('perk_id', perkDefinitionId)
      .eq('user_card_id', userCardId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error checking auto-redemption:', error);
      return { error };
    }

    return { data: data?.is_enabled || false, error: null };
  } catch (error) {
    console.error('Unexpected error checking auto-redemption:', error);
    return { error };
  }
}

export async function checkAutoRedemptionByCardId(
  userId: string,
  perkDefinitionId: string,
  cardId: string
) {
  try {
    // First, get the user's card ID from the database
    const { data: userCards, error: cardError } = await supabase
      .from('user_credit_cards')
      .select('id')
      .eq('user_id', userId)
      .eq('card_brand', cardId.split('_')[0])
      .eq('card_name', (await findCardByIdData(cardId))?.name || '')
      .eq('status', 'active')
      .single();

    if (cardError || !userCards) {
      console.error('Error finding user card for auto-redemption check:', cardError);
      return { data: false, error: null }; // Return false if card not found
    }

    // Now check auto-redemption with the actual user_card_id
    return await checkAutoRedemption(userId, perkDefinitionId, userCards.id);
  } catch (error) {
    console.error('Unexpected error checking auto-redemption by card ID:', error);
    return { data: false, error: null };
  }
}

export async function debugAutoRedemptions(userId: string) {
  try {
    logger.log('=== DEBUG: All auto-redemptions for user ===');
    const { data, error } = await supabase
      .from('perk_auto_redemptions')
      .select(`
        *,
        perk_definitions (
          name,
          value
        ),
        user_credit_cards (
          card_name,
          card_brand
        )
      `)
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching debug auto-redemptions:', error);
      return { error };
    }

    logger.log(`Found ${data?.length || 0} auto-redemption records:`, data);
    return { data, error: null };
  } catch (error) {
    console.error('Unexpected error in debug function:', error);
    return { error };
  }
}

export async function getRedemptionsForPeriod(userId: string, startDate: Date, endDate: Date) {
  try {
    const { data, error } = await supabase
      .from('perk_redemptions')
      .select('perk_id, redemption_date, status, value_redeemed, total_value, remaining_value')
      .eq('user_id', userId)
      .gte('redemption_date', startDate.toISOString())
      .lte('redemption_date', endDate.toISOString());

    if (error) {
      console.error('Database error fetching redemptions for period:', error);
      return { data: null, error };
    }
    return { data, error: null };
  } catch (error) {
    console.error('Unexpected error fetching redemptions for period:', error);
    return { data: null, error };
  }
}

export async function updateCardOrder(userId: string, cardIds: string[]) {
  try {
    // Get current active cards
    const { data: existingCards, error: fetchError } = await supabase
      .from('user_credit_cards')
      .select('id, card_name')
      .eq('user_id', userId)
      .eq('status', 'active');

    if (fetchError) throw fetchError;

    // Create a map of card names to their new order
    const cardNameToOrder = new Map();
    
    // Process cardIds sequentially to handle async lookups
    for (let index = 0; index < cardIds.length; index++) {
      const cardId = cardIds[index];
      const cardData = await findCardByIdData(cardId);
      const cardName = cardData?.name || '';
      cardNameToOrder.set(cardName, index);
    }

    // Update each card's display order one by one
    for (const card of existingCards) {
      const newOrder = cardNameToOrder.get(card.card_name) ?? 0;
      const { error: updateError } = await supabase
        .from('user_credit_cards')
        .update({
          display_order: newOrder,
          updated_at: new Date().toISOString()
        })
        .eq('id', card.id)
        .eq('user_id', userId);

      if (updateError) throw updateError;
    }

    return { error: null };
  } catch (error) {
    console.error('Error updating card order:', error);
    return { error };
  }
} 