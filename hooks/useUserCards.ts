import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Card, allCards , CardPerk } from '../src/data/card-data';
import { getUserCards } from '../lib/database';


interface UserCard {
  id: string;
  user_id: string;
  card_name: string;
  card_brand: string;
  card_category: string;
  annual_fee: number;
  is_active: boolean;
  renewal_date?: string;
  display_order: number;
}

interface UserCardsHookResult {
  userCardsWithPerks: { card: Card; perks: CardPerk[] }[];
  isLoading: boolean;
  isRefreshing: boolean;
  error: Error | null;
  refreshUserCards: () => Promise<void>;
}

export function useUserCards(): UserCardsHookResult {
  const [userCardsWithPerks, setUserCardsWithPerks] = useState<{ card: Card; perks: CardPerk[] }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const initialLoadDoneRef = useRef(false);

  const loadUserCards = useCallback(async () => {
    try {
      if (!initialLoadDoneRef.current) {
        setIsLoading(true);
      } else {
        setIsRefreshing(true);
      }
      
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.log('[useUserCards] No authenticated user. Returning empty cards.');
        setUserCardsWithPerks([]);
        setIsLoading(false);
        return;
      }

      console.log('[useUserCards] Authenticated user, fetching from DB for user:', user.id);
      const { data: userCardsFromDb, error: dbError } = await getUserCards(user.id);
      if (dbError) {
        throw dbError;
      }

      let finalCards: { card: Card; perks: CardPerk[] }[] = [];
      if (userCardsFromDb && userCardsFromDb.length > 0) {
        // Create a map of card names to their database records (which include display_order)
        const cardNameToDbRecord = new Map(
          userCardsFromDb.map(dbCard => [dbCard.card_name, dbCard])
        );

        console.log('[useUserCards] Database records:', userCardsFromDb.map(card => ({
          name: card.card_name,
          renewal_date: card.renewal_date
        })));

        // Filter and map allCards to match the database records
        const matchedCards = allCards
          .filter(card => cardNameToDbRecord.has(card.name))
          .map(card => ({
            card,
            dbRecord: cardNameToDbRecord.get(card.name)!
          }));

        // Sort by display_order from the database
        matchedCards.sort((a, b) => 
          (a.dbRecord.display_order || 0) - (b.dbRecord.display_order || 0)
        );

        // Transform to final format with proper perk transformation
        finalCards = matchedCards.map(({ card, dbRecord }) => {
          const renewalDate = dbRecord.renewal_date ? new Date(dbRecord.renewal_date) : null;
          console.log('[useUserCards] Processing card:', {
            name: card.name,
            dbRenewalDate: dbRecord.renewal_date,
            parsedRenewalDate: renewalDate
          });
          
          return {
            card: {
              ...card,
              renewalDate
            },
            perks: card.benefits.map(benefit => ({
              ...benefit,
              cardId: card.id,
              status: 'available' as const,
              streakCount: 0,
              coldStreakCount: 0,
            }))
          };
        });

        console.log('[useUserCards] Processed cards with order:', 
          finalCards.map(c => `${c.card.name} (${cardNameToDbRecord.get(c.card.name)?.display_order})`));
      } else {
        console.log('[useUserCards] No cards found in DB for authenticated user.');
      }

      setUserCardsWithPerks(finalCards);
      initialLoadDoneRef.current = true;
      setIsLoading(false);
      setIsRefreshing(false);
      setError(null);
    } catch (error) {
      console.error('[useUserCards] Error loading cards:', error);
      setError(error as Error);
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    console.log(`[useUserCards] useEffect triggered. refreshKey: ${refreshKey}, initialLoadDone: ${initialLoadDoneRef.current}`);
    loadUserCards();
  }, [loadUserCards, refreshKey]);

  const refreshUserCards = useCallback(async () => {
    console.log('[useUserCards] refreshUserCards called, incrementing refreshKey.');
    setRefreshKey(prevKey => prevKey + 1);
  }, []);

  return {
    userCardsWithPerks,
    isLoading,
    isRefreshing,
    error,
    refreshUserCards,
  };
}