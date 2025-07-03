import { supabase } from './supabase';
import { Card, Benefit, allCards } from '../src/data/card-data';

export { supabase };

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
    console.log('Fetching cards for user:', userId);
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

    console.log('Successfully fetched cards:', cards?.length || 0);
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
    console.log('Checking if user has cards:', userId);
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
    console.log('User has cards:', hasCards);
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
    console.log('Starting perk redemption tracking:', { 
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

    const { data: existingRedemption, error: existingError } = await supabase
      .from('perk_redemptions')
      .select('id, status, remaining_value, value_redeemed, reset_date')
      .eq('user_id', userId)
      .eq('perk_id', perk.definition_id)
      .gte('redemption_date', startOfPeriod.toISOString())
      .lt('reset_date', now.toISOString())
      .order('redemption_date', { ascending: false })
      .limit(1)
      .single();

    if (existingRedemption && !existingError) {
      return { error: new Error('Perk already redeemed this period') };
    }

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
    const { data: userCardsResult, error: cardError } = await supabase
      .from('user_credit_cards')
      .select('id, card_name, card_brand')
      .eq('user_id', userId)
      .eq('card_brand', cardId.split('_')[0])
      .eq('card_name', allCards.find(c => c.id === cardId)?.name || '')
      .eq('status', 'active');

    if (cardError || !userCardsResult || userCardsResult.length === 0) {
      console.error('Error finding user card:', cardError);
      return { error: new Error('This card is no longer in your wallet. Please refresh the page to see your current cards.') };
    }

    const userCardToUse = userCardsResult[0];

    // Calculate reset date based on perk period and type
    const resetDate = calculateResetDate(
      perk.period || 'monthly',
      perkDef.period_months || 1,
      perkDef.reset_type || 'calendar'
    );

    // Determine redemption status and values
    const isPartialRedemption = valueRedeemed < perkDef.value;
    const status = isPartialRedemption ? 'partially_redeemed' : 'redeemed';
    const totalValue = perkDef.value;
    const remainingValue = isPartialRedemption ? perkDef.value - valueRedeemed : 0;

    // If transitioning from partial to full redemption, delete the partial redemption first
    if (perk.status === 'partially_redeemed' && !isPartialRedemption) {
      const { error: deleteError } = await supabase
        .from('perk_redemptions')
        .delete()
        .eq('user_id', userId)
        .eq('perk_id', perk.definition_id)
        .eq('status', 'partially_redeemed');

      if (deleteError) {
        console.error('Error deleting partial redemption:', deleteError);
        return { error: new Error('Failed to delete partial redemption') };
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
        value_redeemed: valueRedeemed,
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
    console.log('Fetching perk redemptions:', { userId, startDate, endDate, includeExpired });

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

    console.log('Successfully fetched perk redemptions:', processedData?.length || 0);
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
    console.log('[DB] Attempting to delete perk redemption:', { userId, perkDefinitionId });

    // First, check if this is a partial redemption with children
    const { data: redemptionToDelete, error: findError } = await supabase
      .from('perk_redemptions')
      .select('id, parent_redemption_id, value_redeemed')
      .eq('user_id', userId)
      .eq('perk_id', perkDefinitionId)
      .order('redemption_date', { ascending: false })
      .limit(1)
      .single();

    if (findError) {
      console.error('Database error finding perk redemption:', findError);
      return { error: findError };
    }

    // If this is a child redemption, update the parent's remaining value
    if (redemptionToDelete?.parent_redemption_id) {
      // First get the current parent redemption
      const { data: parentRedemption, error: getParentError } = await supabase
        .from('perk_redemptions')
        .select('remaining_value')
        .eq('id', redemptionToDelete.parent_redemption_id)
        .single();

      if (getParentError) {
        console.error('Error getting parent redemption:', getParentError);
        return { error: getParentError };
      }

      const newRemainingValue = (parentRedemption?.remaining_value || 0) + redemptionToDelete.value_redeemed;

      const { error: updateParentError } = await supabase
        .from('perk_redemptions')
        .update({
          remaining_value: newRemainingValue,
          status: 'partially_redeemed'
        })
        .eq('id', redemptionToDelete.parent_redemption_id);

      if (updateParentError) {
        console.error('Error updating parent redemption:', updateParentError);
        return { error: updateParentError };
      }
    }

    // Delete any child redemptions if this is a parent
    if (redemptionToDelete?.id) {
      const { error: deleteChildrenError } = await supabase
        .from('perk_redemptions')
        .delete()
        .eq('parent_redemption_id', redemptionToDelete.id);

      if (deleteChildrenError) {
        console.error('Error deleting child redemptions:', deleteChildrenError);
        return { error: deleteChildrenError };
      }
    }

    // Delete the redemption itself
    const { error: deleteError } = await supabase
      .from('perk_redemptions')
      .delete()
      .eq('user_id', userId)
      .eq('perk_id', perkDefinitionId)
      .eq('id', redemptionToDelete?.id);

    if (deleteError) {
      console.error('Database error deleting perk redemption:', { 
        error: deleteError,
        userId,
        perkDefinitionId
      });
      return { error: deleteError };
    }

    console.log('Successfully deleted perk redemption:', { userId, perkDefinitionId });
    return { error: null };
  } catch (error) {
    console.error('Unexpected error deleting perk redemption:', { 
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
    console.log('Setting auto-redemption:', { 
      userId, 
      cardId, 
      perkName: perk.name,
      enabled 
    });

    // First, find the perk definition
    console.log('Looking up perk definition for:', perk.name);
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

    console.log('Found perk definition:', {
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
      .eq('card_name', allCards.find(c => c.id === cardId)?.name || '')
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
      console.warn('Multiple active cards found for auto-redemption, proceeding with the first one:', {
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
    
    console.log('Using user_card_id for auto-redemption:', userCardToUse.id);

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

      console.log('Successfully set auto-redemption:', data);
      return { data, error: null };
    } else {
      // Delete ALL auto-redemption rows for this user and perk, regardless of user_card_id
      // This handles cases where there might be multiple user_card_id entries for the same user
      console.log('Attempting to delete ALL auto-redemptions for user and perk:', {
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
        console.warn('Could not verify deletion, but delete operation succeeded:', verificationError);
      } else {
        console.log('Verification check:', {
          remainingRows: verificationData?.length || 0,
          data: verificationData
        });
      }

      console.log('Successfully deleted auto-redemption preference(s)');
      return { data: null, error: null };
    }
  } catch (error) {
    console.error('Unexpected error setting auto-redemption:', error);
    return { error };
  }
}

export async function getAutoRedemptions(userId: string) {
  try {
    console.log('Fetching auto-redemptions for user:', userId);

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

    console.log('Successfully fetched auto-redemptions:', data?.length || 0);
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
      .eq('card_name', allCards.find(c => c.id === cardId)?.name || '')
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
    console.log('=== DEBUG: All auto-redemptions for user ===');
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

    console.log(`Found ${data?.length || 0} auto-redemption records:`, data);
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
      .select('perk_id, redemption_date')
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
    const cardNameToOrder = new Map(
      cardIds.map((cardId, index) => [
        allCards.find(c => c.id === cardId)?.name || '',
        index
      ])
    );

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