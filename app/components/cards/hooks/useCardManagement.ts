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
  const [isEditing, setIsEditing] = useState(false);
  const [deletedCard, setDeletedCard] = useState<{card: Card, renewalDate?: Date} | null>(null);
  const [showUndoSnackbar, setShowUndoSnackbar] = useState(false);
  const [flashingCardId, setFlashingCardId] = useState<string | null>(null);
  const scaleValues = useRef(new Map<string, Animated.Value>()).current;
  const editTimeoutRef = useRef<number | null>(null);

  // Auto-exit edit mode after 10 seconds of inactivity
  useEffect(() => {
    if (isEditing) {
      if (editTimeoutRef.current) clearTimeout(editTimeoutRef.current);
      editTimeoutRef.current = setTimeout(() => {
        setIsEditing(false);
      }, 10000);
    } else {
      if (editTimeoutRef.current) {
        clearTimeout(editTimeoutRef.current);
        editTimeoutRef.current = null;
      }
    }

    return () => {
      if (editTimeoutRef.current) clearTimeout(editTimeoutRef.current);
    };
  }, [isEditing]);

  const getScaleValue = (cardId: string) => {
    if (!scaleValues.has(cardId)) {
      scaleValues.set(cardId, new Animated.Value(1));
    }
    return scaleValues.get(cardId)!;
  };

  const formatDate = (date: Date | undefined): string => {
    if (!date) return 'Set renewal date ›';
    
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return `Renewed ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    } else if (diffDays <= 30) {
      return `Renews in ${diffDays} day${diffDays !== 1 ? 's' : ''}`;
    } else {
      return `Renews ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    }
  };

  const hasChanges = useMemo(() => {
    const selectedCardsSorted = [...selectedCards].sort();
    const initialSelectedCardsSorted = [...initialSelectedCards].sort();
    
    const selectedCardsChanged = JSON.stringify(selectedCardsSorted) !== JSON.stringify(initialSelectedCardsSorted);
    const currentSelectedRenewalDates = Object.fromEntries(
      Object.entries(renewalDates).filter(([cardId]) => selectedCards.includes(cardId))
    );
    const initialSelectedRenewalDates = Object.fromEntries(
      Object.entries(initialRenewalDates).filter(([cardId]) => initialSelectedCards.includes(cardId))
    );
    const renewalDatesChanged = JSON.stringify(currentSelectedRenewalDates) !== JSON.stringify(initialSelectedRenewalDates);
    
    return selectedCardsChanged || renewalDatesChanged;
  }, [selectedCards, initialSelectedCards, renewalDates, initialRenewalDates]);

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
      setShowUndoSnackbar(true);
      
      // Hide snackbar after 5 seconds
      setTimeout(() => {
        setShowUndoSnackbar(false);
        setDeletedCard(null);
      }, 5000);
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
        return;
      }
      setInitialSelectedCards(selectedCards);
      setInitialRenewalDates(renewalDates);
      router.replace({
        pathname: '/(tabs)/01-dashboard',
        params: { refresh: Date.now().toString() }
      });
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

  return {
    selectedCards,
    setSelectedCards,
    renewalDates,
    setRenewalDates,
    isLoading,
    isSaving,
    isEditing,
    setIsEditing,
    deletedCard,
    showUndoSnackbar,
    flashingCardId,
    setFlashingCardId,
    getScaleValue,
    formatDate,
    hasChanges,
    selectedCardObjects,
    anyRenewalDateSet,
    handleRemoveCard,
    handleUndoDelete,
    handleSaveChanges,
  };
}; 