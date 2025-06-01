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
  is_active: boolean;
  renewal_date?: string;
}

interface PerkRedemption {
  id: string;
  user_id: string;
  user_card_id: string;
  perk_id: string;
  redemption_date: string;
  reset_date: string;
  status: 'available' | 'redeemed';
  value_redeemed: number;
  is_auto_redemption: boolean;
}

export async function getUserCards(userId: string) {
  try {
    console.log('Fetching cards for user:', userId);
    const { data: cards, error } = await supabase
      .from('user_credit_cards')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true);

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

export async function saveUserCards(
  userId: string, 
  selectedCards: Card[], 
  renewalDates: Record<string, Date>
) {
  try {
    console.log('Saving cards for user:', userId);
    console.log('Selected cards:', selectedCards.length);

    // First, deactivate all existing cards
    const { error: deactivateError } = await supabase
      .from('user_credit_cards')
      .update({ is_active: false })
      .eq('user_id', userId);

    if (deactivateError) {
      console.error('Database error deactivating existing cards:', deactivateError);
      return { error: deactivateError };
    }

    // Prepare cards for insertion
    const cardsToInsert = selectedCards.map(card => {
      const cardData = {
        user_id: userId,
        card_name: card.name,
        card_brand: card.id.split('_')[0], // Extract brand from card ID (e.g., 'amex_gold' -> 'amex')
        card_category: 'rewards', // Default category
        annual_fee: card.annualFee || 0,
        is_active: true,
        renewal_date: renewalDates[card.id] ? renewalDates[card.id].toISOString() : null
      };
      console.log('Preparing card for insertion:', card.name);
      return cardData;
    });

    // Insert new cards
    const { data, error: insertError } = await supabase
      .from('user_credit_cards')
      .insert(cardsToInsert)
      .select();

    if (insertError) {
      console.error('Database error inserting new cards:', insertError);
      return { error: insertError };
    }

    console.log('Successfully saved cards:', data?.length || 0);
    return { data, error: null };
  } catch (error) {
    console.error('Unexpected error saving user cards:', error);
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
      .eq('is_active', true)
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
  perk: Benefit,
  valueRedeemed: number
) {
  try {
    console.log('Starting perk redemption tracking:', { 
      userId, 
      cardId, 
      perkId: perk.id,
      perkName: perk.name,
      value: valueRedeemed 
    });

    // First, find the perk definition
    const { data: perkDef, error: perkDefError } = await supabase
      .from('perk_definitions')
      .select('id, name')
      .eq('name', perk.name)
      .single();

    if (perkDefError) {
      console.error('Error finding perk definition:', { 
        error: perkDefError, 
        perkName: perk.name 
      });
      return { error: new Error(`Perk definition not found for: ${perk.name}`) };
    }

    if (!perkDef) {
      console.error('Perk definition missing:', { 
        perkName: perk.name,
        perkDetails: {
          value: perk.value,
          periodMonths: perk.periodMonths,
          resetType: perk.resetType
        }
      });
      return { error: new Error(`Perk definition not found: ${perk.name}`) };
    }

    // Check for existing redemption in the current period
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const startOfNextMonth = new Date(startOfMonth);
    startOfNextMonth.setMonth(startOfMonth.getMonth() + 1);

    const { data: existingRedemptions } = await supabase
      .from('perk_redemptions')
      .select('id')
      .eq('user_id', userId)
      .eq('perk_id', perkDef.id)
      .gte('redemption_date', startOfMonth.toISOString())
      .lt('redemption_date', startOfNextMonth.toISOString());

    if (existingRedemptions && existingRedemptions.length > 0) {
      console.log('Perk already redeemed this period:', {
        perkName: perk.name,
        perkId: perkDef.id,
        existingRedemptions: existingRedemptions.length
      });
      return { error: new Error('Perk already redeemed this period') };
    }

    // Get the user's card ID from the database
    const { data: userCards, error: cardError } = await supabase
      .from('user_credit_cards')
      .select('id, card_name, card_brand')
      .eq('user_id', userId)
      .eq('card_brand', cardId.split('_')[0])
      .eq('card_name', allCards.find(c => c.id === cardId)?.name || '')
      .eq('is_active', true)
      .single();

    if (cardError || !userCards) {
      console.error('Error finding user card:', {
        error: cardError,
        cardId,
        brand: cardId.split('_')[0],
        name: allCards.find(c => c.id === cardId)?.name
      });
      return { error: cardError || new Error('User card not found') };
    }

    // Calculate reset date based on period and type
    const now = new Date();
    let resetDate = new Date();

    if (perk.resetType === 'calendar') {
      switch (perk.period) {
        case 'monthly':
          resetDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
          break;
        case 'quarterly':
          resetDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3 + 3, 1);
          break;
        case 'semi_annual':
          resetDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 6) * 6 + 6, 1);
          break;
        case 'yearly':
          resetDate = new Date(now.getFullYear() + 1, 0, 1);
          break;
      }
    } else {
      // Anniversary based - add months based on period
      resetDate.setMonth(resetDate.getMonth() + perk.periodMonths);
    }

    // Insert the redemption record
    const { data, error } = await supabase
      .from('perk_redemptions')
      .insert({
        user_id: userId,
        user_card_id: userCards.id,
        perk_id: perkDef.id,
        redemption_date: now.toISOString(),
        reset_date: resetDate.toISOString(),
        status: 'redeemed',
        value_redeemed: valueRedeemed,
        is_auto_redemption: false
      })
      .select()
      .single();

    if (error) {
      console.error('Error inserting redemption record:', error);
      return { error };
    }

    console.log('Successfully tracked perk redemption:', data);
    return { data, error: null };
  } catch (error) {
    console.error('Unexpected error tracking perk redemption:', error);
    return { error };
  }
}

export async function getPerkRedemptions(
  userId: string,
  startDate?: Date,
  endDate?: Date
) {
  try {
    console.log('Fetching perk redemptions:', { userId, startDate, endDate });

    let query = supabase
      .from('perk_redemptions')
      .select(`
        *,
        user_credit_cards (
          card_name,
          card_brand
        )
      `)
      .eq('user_id', userId);

    if (startDate) {
      query = query.gte('redemption_date', startDate.toISOString());
    }
    if (endDate) {
      query = query.lt('redemption_date', endDate.toISOString());
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching perk redemptions:', error);
      return { error };
    }

    console.log('Successfully fetched perk redemptions:', data?.length || 0);
    return { data, error: null };
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
    // No longer need to find perkDef by name, we have the UUID (perkDefinitionId)

    const { error: deleteError } = await supabase
      .from('perk_redemptions')
      .delete()
      .eq('user_id', userId)
      .eq('perk_id', perkDefinitionId); // Use the provided perkDefinitionId (UUID)

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