import { useState, useEffect, useRef, useMemo } from 'react';
import { Animated, Easing, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Alert } from 'react-native';
import { Card, allCards } from '../../../../src/data/card-data';
import { getUserCards, saveUserCards } from '../../../../lib/database';
import * as Haptics from 'expo-haptics';

export const useCardManagement = (userId: string | undefined) => {
  const router = useRouter();
  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  const [initialSelectedCards, setInitialSelectedCards] = useState<string[]>([]);
  const [renewalDates, setRenewalDates] = useState<Record<string, Date>>({});
  const [initialRenewalDates, setInitialRenewalDates] = useState<Record<string, Date>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deletedCard, setDeletedCard] = useState<{card: Card, renewalDate?: Date} | null>(null);
  const [showUndoSnackbar, setShowUndoSnackbar] = useState(false);
  const [flashingCardId, setFlashingCardId] = useState<string | null>(null);
  const scaleValues = useRef(new Map<string, Animated.Value>()).current;

  const getScaleValue = (cardId: string) => {
    if (!scaleValues.has(cardId)) {
      scaleValues.set(cardId, new Animated.Value(1));
    }
    return scaleValues.get(cardId)!;
  };

  const formatDate = (date: Date | undefined): string => {
    if (!date) return 'Set renewal date ›';
    
    const now = new Date();
    // Ensure date is a Date object
    const renewalDateObj = typeof date === 'string' ? new Date(date) : date;
    const currentYear = now.getFullYear();
    const renewalMonth = renewalDateObj.getMonth();
    const renewalDay = renewalDateObj.getDate();
    
    // Create next renewal date (could be this year or next year)
    let nextRenewal = new Date(currentYear, renewalMonth, renewalDay);
    
    // If the renewal date has passed this year, set it to next year
    if (nextRenewal < now) {
      nextRenewal = new Date(currentYear + 1, renewalMonth, renewalDay);
    }
    
    const diffTime = nextRenewal.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 30) {
      return `Renews in ${diffDays} day${diffDays !== 1 ? 's' : ''}`;
    } else {
      return `Renews ${nextRenewal.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    }
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
    [selectedCards]
  );

  const anyRenewalDateSet = useMemo(() => {
    return Object.values(renewalDates).some(date => date !== undefined);
  }, [renewalDates]);

  const handleRemoveCard = (cardId: string) => {
    const cardToRemove = allCards.find(card => card.id === cardId);
    if (cardToRemove) {
      const renewalDate = renewalDates[cardId];
      setDeletedCard({ card: cardToRemove, renewalDate });
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

  const handleUndoDelete = () => {
    if (deletedCard) {
      setSelectedCards(prev => [...prev, deletedCard.card.id]);
      if (deletedCard.renewalDate) {
        setRenewalDates(prev => ({
          ...prev,
          [deletedCard.card.id]: deletedCard.renewalDate!
        }));
      }
      setShowUndoSnackbar(false);
      setDeletedCard(null);
      
      if (Platform.OS === 'ios') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    }
  };

  const handleDiscardChanges = () => {
    // Reset to initial state
    setSelectedCards(initialSelectedCards);
    setRenewalDates(initialRenewalDates);
    setDeletedCard(null);
    setShowUndoSnackbar(false);
    
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
        // Do NOT update initial states if save failed, so 'hasChanges' remains true
        return; 
      }
      setInitialSelectedCards([...selectedCards]); // Create new references
      setInitialRenewalDates({...renewalDates}); // Create new reference
      setDeletedCard(null); // Clear deleted card after successful save
      setShowUndoSnackbar(false);
      
      if (Platform.OS === 'ios') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (error) {
      console.error('Error in save handler:', error);
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
      const { data: userCards, error } = await getUserCards(userId);
      if (!error && userCards) {
        const cardIds = allCards
          .filter(card => userCards.some(uc => uc.card_name === card.name))
          .map(card => card.id);
        setSelectedCards(cardIds);
        setInitialSelectedCards(cardIds);
        const dates: Record<string, Date> = {};
        userCards.forEach(uc => {
          if (uc.renewal_date) {
            const card = allCards.find(c => c.name === uc.card_name);
            if (card) {
              dates[card.id] = new Date(uc.renewal_date);
            }
          }
        });
        setRenewalDates(dates);
        setInitialRenewalDates(dates);
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
    if (!userId || isLoading) return; // Prevent auto-save during initial load or if no user

    const selectedCardsSortedJSON = JSON.stringify([...selectedCards].sort());
    const initialSelectedCardsSortedJSON = JSON.stringify([...initialSelectedCards].sort());
    const cardSelectionChanged = selectedCardsSortedJSON !== initialSelectedCardsSortedJSON;
    
    if (!cardSelectionChanged && !deletedCard) {
      let actualRenewalDatesChanged = false;
      // Check only renewal dates for cards that are in selectedCards (which is same as initialSelectedCards here)
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
            console.log('[CardManagement] Auto-saving renewal dates');
            // selectedCardObjects is memoized and will use the current selectedCards
            const { error } = await saveUserCards(userId, selectedCardObjects, renewalDates);
            if (!error) {
              setInitialRenewalDates({...renewalDates}); // Update initial state on successful auto-save
            } else {
              console.error('Error auto-saving renewal dates:', error);
              // Optionally show a subtle error to the user or log
            }
          } catch (error) {
            console.error('Error auto-saving renewal dates:', error);
          }
        }, 1000); // Save after 1 second of no changes
        
        return () => clearTimeout(timeoutId);
      }
    }
  }, [renewalDates, selectedCards, initialSelectedCards, initialRenewalDates, userId, isLoading, deletedCard, selectedCardObjects]); // Added dependencies

  return {
    selectedCards,
    setSelectedCards,
    renewalDates,
    setRenewalDates,
    isLoading,
    isSaving,
    deletedCard,
    showUndoSnackbar,
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
    handleUndoDelete,
    handleDiscardChanges,
    handleSaveChanges,
  };
}; 