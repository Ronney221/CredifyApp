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
        return;
      }

      let selectedIds: string[] = [];

      // If we have URL params (from card selection screen), use those
      if (selectedCardIds) {
        selectedIds = selectedCardIds.split(',');
      } else {
        // Otherwise fetch from database
        const { data: userCards, error: dbError } = await getUserCards(user.id);
        if (dbError) {
          throw dbError;
        }
        selectedIds = allCards
          .filter(card => userCards?.some(uc => uc.card_name === card.name))
          .map(card => card.id);
      }

      if (selectedIds.length === 0) {
        setUserCardsWithPerks([]);
        return;
      }

      const cardsWithPerks = allCards
        .filter(card => selectedIds.includes(card.id))
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
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load user cards'));
      console.error('Error loading user cards:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedCardIds, router]);

  useEffect(() => {
    loadUserCards();
  }, [loadUserCards, refreshKey]);

  const refreshUserCards = useCallback(async () => {
    setRefreshKey(prev => prev + 1);
  }, []);

  return { userCardsWithPerks, isLoading, error, refreshUserCards };
} 