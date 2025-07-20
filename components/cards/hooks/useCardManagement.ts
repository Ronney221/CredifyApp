import { useState, useEffect, useRef, useMemo } from 'react';
import { Animated, Easing, Platform , Alert } from 'react-native';
import { useRouter } from 'expo-router';

import { Card } from '../../../src/data/card-data';
import { getUserCards, saveUserCards, getAllCardsData } from '../../../lib/database';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '../../../utils/logger';

const UNIQUE_PERK_PERIODS_STORAGE_KEY = '@user_unique_perk_periods';

export const useCardManagement = (userId: string | undefined) => {
  const router = useRouter();
  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  const [initialSelectedCards, setInitialSelectedCards] = useState<string[]>([]);
  const [renewalDates, setRenewalDates] = useState<Record<string, Date>>({});
  const [initialRenewalDates, setInitialRenewalDates] = useState<Record<string, Date>>({});
  const [removedCardDates, setRemovedCardDates] = useState<Record<string, Date>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deletedCard, setDeletedCard] = useState<{card: Card, renewalDate?: Date} | null>(null);
  const [flashingCardId, setFlashingCardId] = useState<string | null>(null);
  const [allCards, setAllCards] = useState<Card[]>([]);
  const scaleValues = useRef(new Map<string, Animated.Value>()).current;

  const getScaleValue = (cardId: string) => {
    if (!scaleValues.has(cardId)) {
      scaleValues.set(cardId, new Animated.Value(1));
    }
    return scaleValues.get(cardId)!;
  };

  const formatDate = (date: Date | undefined): string => {
    if (!date) return 'Set renewal date ›';
    
    const renewalDateObj = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    let nextRenewal = new Date(now.getFullYear(), renewalDateObj.getMonth(), renewalDateObj.getDate());
    
    if (nextRenewal.getTime() < now.getTime() - (24*60*60*1000)) {
      nextRenewal.setFullYear(now.getFullYear() + 1);
    }
    
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthName = months[nextRenewal.getMonth()];
    const year = nextRenewal.getFullYear().toString().slice(-2);
    
    return `${monthName} ’${year}`;
  };

  const hasChanges = useMemo(() => {
    const selectedCardsSorted = [...selectedCards].sort();
    const initialSelectedCardsSorted = [...initialSelectedCards].sort();

    if (JSON.stringify(selectedCardsSorted) !== JSON.stringify(initialSelectedCardsSorted)) {
      return true;
    }

    // If card lists are the same, check renewal dates for these cards
    for (const cardId of selectedCards) { // Iterates over the current selection
      const currentDate = renewalDates[cardId] ? new Date(renewalDates[cardId]).toISOString() : undefined;
      const initialDate = initialRenewalDates[cardId] ? new Date(initialRenewalDates[cardId]).toISOString() : undefined;
      if (currentDate !== initialDate) {
        return true;
      }
    }
    
    // This explicitly checks if a card that was meant to be deleted is still pending.
    // If handleRemoveCard correctly updates selectedCards, this might be redundant
    // but provides an explicit check for the deletedCard state affecting 'hasChanges'.
    if (deletedCard !== null) {
        // Check if the deletion is the *only* change.
        // If selectedCards (after deletion) + renewalDates (after deletion) match initial state (pre-deletion state for other cards)
        // then only the deletion is the change. This is complex.
        // Simpler: if deletedCard is set, it's a change until saved/undone.
        // The previous logic already updates selectedCards, so that should trigger hasChanges.
        // This line is to ensure that if deletedCard is set, it's always considered a change.
        // However, the above checks on selectedCards and renewalDates should cover states modified by deletion.
        // Let's rely on selectedCards and renewalDates comparison.
        // If deletedCard is not null, selectedCards should be different from initialSelectedCards.
    }

    return false;
  }, [selectedCards, initialSelectedCards, renewalDates, initialRenewalDates, deletedCard]);

  const selectedCardObjects = useMemo(() => 
    selectedCards.map(id => allCards.find(card => card.id === id)).filter(card => card !== undefined) as Card[],
    [selectedCards, allCards]
  );

  const anyRenewalDateSet = useMemo(() => {
    return Object.values(renewalDates).some(date => date !== undefined);
  }, [renewalDates]);

  const handleRemoveCard = (cardId: string) => {
    const cardToRemove = allCards.find(card => card.id === cardId);
    if (cardToRemove) {
      const renewalDate = renewalDates[cardId];
      setDeletedCard({ card: cardToRemove, renewalDate });
      
      // Store the renewal date if it exists
      if (renewalDate) {
        setRemovedCardDates(prev => ({
          ...prev,
          [cardId]: renewalDate
        }));
      }
    }
    
    setSelectedCards(prev => prev.filter(id => id !== cardId));
    setRenewalDates(prevDates => {
      const newDates = {...prevDates};
      delete newDates[cardId];
      return newDates;
    });
    
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  const handleDiscardChanges = () => {
    // Reset to initial state
    setSelectedCards(initialSelectedCards);
    setRenewalDates(initialRenewalDates);
    setDeletedCard(null);
    setRemovedCardDates({}); // Clear removed card dates
    
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleDoneAddCardModal = async (newCardIds: string[]) => {
    const updatedSelectedCards = [...selectedCards];
    const updatedRenewalDates = { ...renewalDates };
    
    newCardIds.forEach(id => {
      if (!updatedSelectedCards.includes(id)) {
        updatedSelectedCards.push(id);
        // Restore renewal date if it exists
        if (removedCardDates[id]) {
          updatedRenewalDates[id] = removedCardDates[id];
          // Remove from removedCardDates since it's restored
          const { [id]: _, ...remainingRemovedDates } = removedCardDates;
          setRemovedCardDates(remainingRemovedDates);
        }
      }
    });
    
    setSelectedCards(updatedSelectedCards);
    setRenewalDates(updatedRenewalDates);
    
    // Save changes if needed
    if (userId) {
      logger.log('🎯 [handleDoneAddCardModal] Saving cards:', {
        updatedSelectedCards,
        allCardsCount: allCards.length,
        userId
      });
      
      const updatedCards = updatedSelectedCards
        .map(id => allCards.find(c => c.id === id))
        .filter(Boolean) as Card[];
      
      logger.log('🎯 [handleDoneAddCardModal] Found cards to save:', updatedCards.length);
      
      const { error } = await saveUserCards(userId, updatedCards, updatedRenewalDates);
      if (error) {
        console.error('❌ Error saving new cards:', error);
        Alert.alert(
          "Error",
          "Failed to save new cards. Please try again.",
          [{ text: "OK" }]
        );
      } else {
        logger.log('✅ Successfully saved new cards to database');
        setInitialSelectedCards(updatedSelectedCards);
        setInitialRenewalDates(updatedRenewalDates);
      }
    }
  };

  const handleSaveChanges = async () => {
    if (!userId) {
      Alert.alert(
        "Authentication Required",
        "Please log in to save your card changes.",
        [
          { text: "Log In", onPress: () => router.push('/(auth)/login') },
          { text: "Cancel", style: "cancel" },
        ]
      );
      return;
    }
    try {
      setIsSaving(true);
      const { error } = await saveUserCards(userId, selectedCardObjects, renewalDates);
      if (error) {
        console.error('Error saving cards:', error);
        Alert.alert("Save Failed", "Could not save your changes. Please try again.");
        return; 
      }
      setInitialSelectedCards([...selectedCards]);
      setInitialRenewalDates({...renewalDates});
      setDeletedCard(null);

      // --- BEGIN: Logic to store unique perk periods ---
      try {
        const uniquePeriodsSet = new Set<number>();
        selectedCardObjects.forEach(card => {
          card.benefits.forEach(perk => {
            if (perk.periodMonths) {
              uniquePeriodsSet.add(perk.periodMonths);
              logger.log(`[useCardManagement] Adding period ${perk.periodMonths} from perk ${perk.name} in card ${card.name}`);
            }
          });
        });
        const uniquePeriodsArray = Array.from(uniquePeriodsSet).sort((a, b) => a - b);
        logger.log('[useCardManagement] Saving unique perk periods to AsyncStorage:', uniquePeriodsArray);
        logger.log('[useCardManagement] Selected cards:', selectedCardObjects.map(card => ({
          id: card.id,
          name: card.name,
          benefits: card.benefits.map(b => ({ name: b.name, periodMonths: b.periodMonths }))
        })));
        
        // Save to AsyncStorage and verify
        await AsyncStorage.setItem(UNIQUE_PERK_PERIODS_STORAGE_KEY, JSON.stringify(uniquePeriodsArray));
        const savedPeriods = await AsyncStorage.getItem(UNIQUE_PERK_PERIODS_STORAGE_KEY);
        logger.log('[useCardManagement] Verified saved periods:', savedPeriods);
        
        if (!savedPeriods || JSON.parse(savedPeriods).length !== uniquePeriodsArray.length) {
          console.error('[useCardManagement] Periods were not saved correctly. Expected:', uniquePeriodsArray, 'Got:', savedPeriods);
        }
      } catch (storageError) {
        console.error('[useCardManagement] Failed to save unique perk periods to AsyncStorage:', storageError);
        // Don't alert user for non-critical errors
      }
      // --- END: Logic to store unique perk periods ---
      
      if (Platform.OS === 'ios') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.error('Error in save handler:', error);
      // Check if the error is from saveUserCards or AsyncStorage, handle appropriately if needed
      // For now, generic alert, but could be more specific if we distinguish errors.
      Alert.alert("Save Operation Failed", "An unexpected error occurred during the save operation.");
    } finally {
      setIsSaving(false);
    }
  };

  const loadExistingCards = async () => {
    try {
      if (!userId) {
        router.replace('/(auth)/login');
        return;
      }

      // Load all cards from database first
      const allCardsFromDb = await getAllCardsData();
      setAllCards(allCardsFromDb);

      const { data: userCards, error } = await getUserCards(userId);
      if (!error && userCards) {
        const cardIds = allCardsFromDb
          .filter(card => userCards.some(uc => uc.card_name === card.name))
          .map(card => card.id);
        setSelectedCards(cardIds);
        setInitialSelectedCards(cardIds);
        const dates: Record<string, Date> = {};
        userCards.forEach(uc => {
          if (uc.renewal_date) {
            const card = allCardsFromDb.find(c => c.name === uc.card_name);
            if (card) {
              dates[card.id] = new Date(uc.renewal_date);
            }
          }
        });
        setRenewalDates(dates);
        setInitialRenewalDates(dates);
      } else {
        // If no user cards, still set allCards
        setAllCards(allCardsFromDb);
      }
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading cards:', error);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (userId) {
      loadExistingCards();
    }
  }, [userId]);

  // Auto-save renewal dates when they change (without triggering modal)
  useEffect(() => {
    if (!userId || isLoading) return;

    const selectedCardsSortedJSON = JSON.stringify([...selectedCards].sort());
    const initialSelectedCardsSortedJSON = JSON.stringify([...initialSelectedCards].sort());
    const cardSelectionChanged = selectedCardsSortedJSON !== initialSelectedCardsSortedJSON;
    
    if (!cardSelectionChanged && !deletedCard) {
      let actualRenewalDatesChanged = false;
      for (const cardId of selectedCards) {
        const currentDate = renewalDates[cardId] ? new Date(renewalDates[cardId]).toISOString() : undefined;
        const initialDate = initialRenewalDates[cardId] ? new Date(initialRenewalDates[cardId]).toISOString() : undefined;
        if (currentDate !== initialDate) {
          actualRenewalDatesChanged = true;
          break;
        }
      }

      if (actualRenewalDatesChanged) {
        const timeoutId = setTimeout(async () => {
          try {
            logger.log('[CardManagement] Auto-saving renewal dates');
            const currentSelectedObjects = selectedCards.map(id => allCards.find(card => card.id === id)).filter(Boolean) as Card[];
            const { error } = await saveUserCards(userId, currentSelectedObjects, renewalDates);
            if (!error) {
              setInitialRenewalDates({...renewalDates}); // Update initial dates after successful auto-save
              // --- BEGIN: Logic to store unique perk periods on auto-save ---
              try {
                const uniquePeriodsSet = new Set<number>();
                currentSelectedObjects.forEach(card => {
                  card.benefits.forEach(perk => {
                    if (perk.periodMonths) {
                      uniquePeriodsSet.add(perk.periodMonths);
                    }
                  });
                });
                const uniquePeriodsArray = Array.from(uniquePeriodsSet).sort((a, b) => a - b);
                logger.log('[useCardManagement] Auto-saving: Updating unique perk periods:', uniquePeriodsArray);
                await AsyncStorage.setItem(UNIQUE_PERK_PERIODS_STORAGE_KEY, JSON.stringify(uniquePeriodsArray));
              } catch (storageError) {
                console.error('[useCardManagement] Auto-saving: Failed to update unique perk periods:', storageError);
              }
              // --- END: Logic to store unique perk periods on auto-save ---
            } else {
              logger.warn('[CardManagement] Auto-save for renewal dates failed:', error);
              // Optionally notify user or revert, for now just logging
            }
          } catch (e) {
            console.error('[CardManagement] Error in auto-save renewal dates:', e);
          }
        }, 3000); // Auto-save after 3 seconds of inactivity
        return () => clearTimeout(timeoutId);
      }
    }
  }, [renewalDates, selectedCards, initialSelectedCards, userId, isLoading, deletedCard]); // Added dependencies

  return {
    selectedCards,
    setSelectedCards,
    renewalDates,
    setRenewalDates,
    isLoading,
    isSaving,
    deletedCard,
    flashingCardId,
    setFlashingCardId,
    getScaleValue,
    formatDate,
    hasChanges,
    selectedCardObjects,
    anyRenewalDateSet,
    initialSelectedCards,
    initialRenewalDates,
    handleRemoveCard,
    handleDiscardChanges,
    handleSaveChanges,
    loadExistingCards,
    handleDoneAddCardModal,
  };
}; 