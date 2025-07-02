import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import Toast from 'react-native-root-toast';
import { CardPerk } from '../src/data/card-data';
import { supabase } from '../lib/database';

// Helper to show toast with undo functionality
const showToast = (message: string, onUndo?: () => void) => {
  const toastMessage = onUndo ? `${message}\nTap to undo` : message;
  const toast = Toast.show(toastMessage, {
    duration: onUndo ? 4000 : 2000,
    position: Toast.positions.BOTTOM,
    shadow: true,
    animation: true,
    hideOnPress: true,
    delay: 0,
    containerStyle: {
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      marginBottom: 64,
      backgroundColor: '#1c1c1e',
    },
    textStyle: {
      fontSize: 14,
      fontWeight: '500',
      textAlign: 'center',
      lineHeight: 20,
    },
    onPress: () => {
      if (onUndo) {
        Toast.hide(toast);
        onUndo();
      }
    },
  });
};

interface UsePerkRedemptionProps {
  userId: string;
  setPerkStatus: (cardId: string, perkId: string, status: 'available' | 'redeemed' | 'partially_redeemed', remainingValue?: number) => void;
  onPerkStatusChange?: () => void;
  refreshAutoRedemptions?: () => Promise<void>;
}

export function usePerkRedemption({
  userId,
  setPerkStatus,
  onPerkStatusChange,
  refreshAutoRedemptions,
}: UsePerkRedemptionProps) {
  const [pendingToast, setPendingToast] = useState<{ message: string; onUndo: () => void; } | null>(null);

  const handleMarkRedeemed = useCallback(async (
    cardId: string,
    perk: CardPerk,
    partialAmount?: number
  ) => {
    const originalStatus = perk.status;
    const isPartiallyRedeemed = originalStatus === 'partially_redeemed';
    const previousValue = perk.remaining_value;
    const partiallyRedeemedAmount = isPartiallyRedeemed && previousValue !== undefined ? 
      perk.value - previousValue : 0;

    try {
      // For partially redeemed perks, delete the existing partial redemption first
      if (isPartiallyRedeemed) {
        const { error: deleteError } = await supabase.from('perk_redemptions').delete().eq('user_id', userId).eq('perk_id', perk.id);
        if (deleteError) {
          console.error('Error deleting partial redemption:', deleteError);
          Alert.alert('Error', 'Failed to update perk redemption.');
          return;
        }
        
        // Update UI to reflect deletion of partial redemption
        setPerkStatus(cardId, perk.id, 'available');
        await onPerkStatusChange?.();
      }

      // Determine the redemption amount and status
      const amountToRedeem = partialAmount ?? perk.value;
      const newStatus = partialAmount && partialAmount < perk.value ? 'partially_redeemed' : 'redeemed';
      const remainingValue = partialAmount && partialAmount < perk.value ? perk.value - partialAmount : undefined;

      // Optimistic update
      setPerkStatus(cardId, perk.id, newStatus, remainingValue);

      // Track the redemption in the database
      const result = await supabase.from('perk_redemptions').insert([
        {
          user_id: userId,
          card_id: cardId,
          perk_id: perk.id,
          amount: amountToRedeem,
          status: newStatus,
          remaining_value: remainingValue,
          parent_redemption_id: perk.parent_redemption_id,
        },
      ]).select().single();

      if (result.error) {
        console.error('Error tracking redemption:', result.error);
        setPerkStatus(cardId, perk.id, originalStatus, previousValue);
        if (isPartiallyRedeemed) {
          // Re-track the partial redemption if we failed
          await supabase.from('perk_redemptions').insert([
            {
              user_id: userId,
              card_id: cardId,
              perk_id: perk.id,
              amount: partiallyRedeemedAmount,
              status: originalStatus,
              remaining_value: remainingValue,
              parent_redemption_id: perk.parent_redemption_id,
            },
          ]).select().single();
        }
        onPerkStatusChange?.();
        Alert.alert('Error', 'Failed to track perk redemption.');
        return;
      }

      // After successful redemption, refresh all data
      await Promise.all([
        onPerkStatusChange?.(),
        refreshAutoRedemptions?.()
      ]);

      // Show toast with undo functionality
      const toastMessage = partialAmount 
        ? `${perk.name} partially redeemed: $${partialAmount.toFixed(2)}`
        : `${perk.name} marked as redeemed`;

      showToast(toastMessage, async () => {
        try {
          // On undo, restore the previous state exactly
          setPerkStatus(cardId, perk.id, originalStatus, previousValue);
          
          // First delete the new redemption
          const { error: undoError } = await supabase.from('perk_redemptions').delete().eq('user_id', userId).eq('perk_id', perk.id);
          if (undoError) {
            setPerkStatus(cardId, perk.id, newStatus, remainingValue);
            onPerkStatusChange?.();
            console.error('Error undoing redemption:', undoError);
            showToast('Error undoing redemption');
            return;
          }

          // If it was partially redeemed before, restore that state
          if (originalStatus === 'partially_redeemed' && previousValue !== undefined) {
            await supabase.from('perk_redemptions').insert([
              {
                user_id: userId,
                card_id: cardId,
                perk_id: perk.id,
                amount: partiallyRedeemedAmount,
                status: originalStatus,
                remaining_value: remainingValue,
                parent_redemption_id: perk.parent_redemption_id,
              },
            ]).select().single();
          }
          
          onPerkStatusChange?.();
        } catch (error) {
          setPerkStatus(cardId, perk.id, newStatus, remainingValue);
          onPerkStatusChange?.();
          console.error('Error undoing redemption:', error);
          showToast('Error undoing redemption');
        }
      });

    } catch (error) {
      console.error('Unexpected error marking perk as redeemed:', error);
      setPerkStatus(cardId, perk.id, originalStatus, previousValue);
      Alert.alert('Error', 'An unexpected error occurred while marking perk as redeemed.');
    }
  }, [userId, setPerkStatus, onPerkStatusChange, refreshAutoRedemptions]);

  const handleMarkAvailable = useCallback(async (
    cardId: string,
    perk: CardPerk
  ) => {
    const originalStatus = perk.status;
    const previousValue = perk.remaining_value;
    const previousRedeemedAmount = originalStatus === 'partially_redeemed' && previousValue !== undefined 
      ? perk.value - previousValue 
      : perk.value;

    try {
      // Set status to available first (optimistic update)
      setPerkStatus(cardId, perk.id, 'available', perk.value);

      // Delete all redemption records for this perk and user
      const { error: deleteError } = await supabase
        .from('perk_redemptions')
        .delete()
        .eq('user_id', userId)
        .eq('perk_id', perk.id);

      if (deleteError) {
        console.error('Error deleting redemption records:', deleteError);
        setPerkStatus(cardId, perk.id, originalStatus, previousValue); // Revert optimistic update
        onPerkStatusChange?.();
        Alert.alert('Error', 'Failed to mark perk as available.');
        return;
      }

      // After successful operation, refresh all data
      await onPerkStatusChange?.();
      await refreshAutoRedemptions?.();


      // Show toast with undo functionality
      showToast(`${perk.name} marked as available`, async () => {
        try {
          // On undo, restore the previous state exactly
          setPerkStatus(cardId, perk.id, originalStatus, previousValue);
          
          // Track the redemption again
          await supabase.from('perk_redemptions').insert([
            {
              user_id: userId,
              card_id: cardId,
              perk_id: perk.id,
              amount: previousRedeemedAmount,
              status: originalStatus,
              remaining_value: previousValue,
              parent_redemption_id: perk.parent_redemption_id,
            },
          ]).select().single();

          onPerkStatusChange?.();
        } catch (error) {
          setPerkStatus(cardId, perk.id, 'available', perk.value);
          onPerkStatusChange?.();
          console.error('Error undoing mark as available:', error);
          showToast('Error undoing mark as available');
        }
      });

    } catch (error) {
      console.error('Unexpected error marking perk as available:', error);
      setPerkStatus(cardId, perk.id, originalStatus, previousValue);
      Alert.alert('Error', 'An unexpected error occurred while marking perk as available.');
    }
  }, [userId, setPerkStatus, onPerkStatusChange, refreshAutoRedemptions]);

  return {
    handleMarkRedeemed,
    handleMarkAvailable,
    pendingToast,
    setPendingToast,
  };
} 