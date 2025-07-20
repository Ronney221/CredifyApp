import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Card, CardPerk } from '../src/data/card-data';
import { getUserActiveCards, getAllCardsData } from '../lib/database';
import { logger } from '../utils/logger';

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
  updated_at?: string;
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
        logger.log('[useUserCards] No authenticated user. Returning empty cards.');
        setUserCardsWithPerks([]);
        setIsLoading(false);
        return;
      }

      // logger.log('[useUserCards] Authenticated user, fetching from DB for user:', user.id);
      const { data: userCardsFromDb, error: dbError } = await getUserActiveCards(user.id);
      if (dbError) {
        throw dbError;
      }

      let finalCards: { card: Card; perks: CardPerk[] }[] = [];
      if (userCardsFromDb && userCardsFromDb.length > 0) {
        // Get all cards from database instead of hard-coded data
        const allCardsFromDb = await getAllCardsData();
        
        // Create a map of card names to their database records (which include display_order)
        const cardNameToDbRecord = new Map(
          userCardsFromDb.map(dbCard => [dbCard.card_name, dbCard])
        );

        // logger.log('[useUserCards] Database records:', userCardsFromDb.map(card => ({
        //   name: card.card_name,
        //   renewal_date: card.renewal_date,
        //   status: card.status
        // })));

        // Filter and map database cards to match the user's selected cards
        const matchedCards = allCardsFromDb
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
          // logger.log('[useUserCards] Processing card:', {
          //   name: card.name,
          //   dbRenewalDate: dbRecord.renewal_date,
          //   parsedRenewalDate: renewalDate,
          //   status: dbRecord.status
          // });

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

        logger.log('[useUserCards] Processed cards with order:', 
          finalCards.map(c => `${c.card.name} (${cardNameToDbRecord.get(c.card.name)?.display_order})`));
      } else {
        logger.log('[useUserCards] No active cards found in DB for authenticated user.');
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
    logger.log(`[useUserCards] useEffect triggered. refreshKey: ${refreshKey}, initialLoadDone: ${initialLoadDoneRef.current}`);
    loadUserCards();
  }, [loadUserCards, refreshKey]);

  const refreshUserCards = useCallback(async () => {
    logger.log('[useUserCards] refreshUserCards called, incrementing refreshKey.');
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