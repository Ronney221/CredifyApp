import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { Card, allCards } from '../../src/data/card-data';
import { getUserCards } from '../../lib/database';
import { CardPerk } from '../../src/data/card-data';

interface UserCardsHookResult {
  userCardsWithPerks: { card: Card; perks: CardPerk[] }[];
  isLoading: boolean;
  error: Error | null;
  refreshUserCards: () => Promise<void>;
}

export function useUserCards(selectedCardIds?: string): UserCardsHookResult {
  const [userCardsWithPerks, setUserCardsWithPerks] = useState<{ card: Card; perks: CardPerk[] }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const router = useRouter();

  const loadUserCards = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/(auth)/login');
        setIsLoading(false);
        return;
      }

      let finalSelectedIds: string[] = [];

      if (selectedCardIds && selectedCardIds.length > 0) {
        console.log('[useUserCards] Using selectedCardIds from prop:', selectedCardIds);
        finalSelectedIds = selectedCardIds.split(',');
      } else {
        console.log('[useUserCards] No selectedCardIds prop, fetching from DB for user:', user.id);
        const { data: userCardsFromDb, error: dbError } = await getUserCards(user.id);
        if (dbError) {
          throw dbError;
        }
        if (userCardsFromDb && userCardsFromDb.length > 0) {
          finalSelectedIds = allCards
            .filter(card => userCardsFromDb.some(uc => uc.card_name === card.name))
            .map(card => card.id);
          console.log('[useUserCards] Fetched card IDs from DB:', finalSelectedIds);
        } else {
          console.log('[useUserCards] No cards found in DB for user.');
        }
      }

      if (finalSelectedIds.length === 0) {
        console.log('[useUserCards] No selected card IDs to process, setting empty userCardsWithPerks.');
        setUserCardsWithPerks([]);
      } else {
        const cardsWithPerks = allCards
          .filter(card => finalSelectedIds.includes(card.id))
          .map(card => ({
            card,
            perks: card.benefits.map(benefit => ({
              ...benefit,
              cardId: card.id,
              status: 'available' as const,
              streakCount: 0,
              coldStreakCount: 0,
            })),
          }));
        setUserCardsWithPerks(cardsWithPerks);
        console.log('[useUserCards] Successfully processed cardsWithPerks:', cardsWithPerks.length);
      }

    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load user cards'));
      console.error('Error loading user cards in useUserCards:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedCardIds, router]);

  useEffect(() => {
    console.log(`[useUserCards] useEffect triggered. refreshKey: ${refreshKey}, selectedCardIds prop: ${selectedCardIds}`);
    loadUserCards();
  }, [loadUserCards, refreshKey]);

  const refreshUserCards = useCallback(async () => {
    console.log('[useUserCards] refreshUserCards called, incrementing refreshKey.');
    setRefreshKey(prevKey => prevKey + 1);
    loadUserCards();
  }, [loadUserCards]);

  return {
    userCardsWithPerks,
    isLoading,
    error,
    refreshUserCards,
  };
}