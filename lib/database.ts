import { supabase } from './supabase';
import { Card } from '../src/data/card-data';

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
        card_brand: card.id.split('_')[0] || 'unknown', // Extract brand from card ID (e.g., 'amex_gold' -> 'amex')
        card_category: 'rewards', // Default category
        annual_fee: card.annualFee || 0,
        is_active: true,
        renewal_date: renewalDates[card.id] ? renewalDates[card.id].toISOString() : null
      };
      console.log('Preparing card for insertion:', cardData.card_name);
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