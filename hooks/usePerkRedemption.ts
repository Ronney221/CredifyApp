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
    partialAmount?: number,
    isSwipeAction: boolean = false
  ) => {
    const originalStatus = perk.status;
    const isPartiallyRedeemed = originalStatus === 'partially_redeemed';
    const previousValue = perk.remaining_value;
    const partiallyRedeemedAmount = isPartiallyRedeemed && previousValue !== undefined ? 
      perk.value - previousValue : 0;

    try {
      // Calculate the total amount that would be redeemed (existing + new)
      const newPartialAmount = partialAmount ?? perk.value;
      let totalRedeemedAmount = newPartialAmount;
      
      // If perk is already partially redeemed, add to existing amount
      if (isPartiallyRedeemed && perk.remaining_value !== undefined) {
        const alreadyRedeemedAmount = perk.value - perk.remaining_value;
        totalRedeemedAmount = alreadyRedeemedAmount + newPartialAmount;
      }

      // Determine the final status and remaining value
      const newStatus = totalRedeemedAmount >= perk.value ? 'redeemed' : 'partially_redeemed';
      const remainingValue = totalRedeemedAmount >= perk.value ? undefined : perk.value - totalRedeemedAmount;

      // For partially redeemed perks, delete existing redemptions first to replace with accumulated total
      if (isPartiallyRedeemed) {
        const { error: deleteError } = await supabase.from('perk_redemptions').delete().eq('user_id', userId).eq('perk_id', perk.definition_id);
        if (deleteError) {
          console.error('Error deleting partial redemption:', deleteError);
          Alert.alert('Error', 'Failed to update perk redemption.');
          return;
        }
      }

      // Optimistic update
      setPerkStatus(cardId, perk.id, newStatus, remainingValue);

      // Track the redemption with the total accumulated amount
      const { error } = await supabase.from('perk_redemptions').insert([
        {
          user_id: userId,
          perk_id: perk.definition_id,
          value_redeemed: totalRedeemedAmount,
          total_value: perk.value,
          status: newStatus,
          remaining_value: remainingValue || 0,
          parent_redemption_id: perk.parent_redemption_id,
          redemption_date: new Date().toISOString(),
          reset_date: new Date(new Date().getFullYear() + 1, 0, 1).toISOString(), // Default to next year
        },
      ]).select().single();

      if (error) {
        // Revert optimistic update on error
        setPerkStatus(cardId, perk.id, originalStatus, previousValue);
        onPerkStatusChange?.();
        console.error('Error tracking redemption:', error);
        Alert.alert('Error', 'Failed to track redemption.');
        return;
      }

      // Refresh auto-redemptions in case this affects any
      await refreshAutoRedemptions?.();
      await onPerkStatusChange?.();

      const toastMessage = partialAmount !== undefined && partialAmount < perk.value
        ? `${perk.name} partially redeemed ($${partialAmount.toFixed(2)})`
        : `${perk.name} marked as redeemed`;

      // Only show undo functionality if it's not a swipe action
      if (!isSwipeAction) {
        showToast(toastMessage, async () => {
          try {
            // On undo, restore the previous state exactly
            setPerkStatus(cardId, perk.id, originalStatus, previousValue);
            
            // First delete the new redemption
            const { error: undoError } = await supabase.from('perk_redemptions').delete().eq('user_id', userId).eq('perk_id', perk.definition_id);
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
                  perk_id: perk.definition_id,
                  value_redeemed: partiallyRedeemedAmount,
                  total_value: perk.value,
                  status: originalStatus,
                  remaining_value: previousValue,
                  parent_redemption_id: perk.parent_redemption_id,
                  redemption_date: new Date().toISOString(),
                  reset_date: new Date(new Date().getFullYear() + 1, 0, 1).toISOString(),
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
      } else {
        // For swipe actions, just show a simple toast without undo
        showToast(toastMessage);
      }

    } catch (error) {
      console.error('Unexpected error marking perk as redeemed:', error);
      setPerkStatus(cardId, perk.id, originalStatus, previousValue);
      Alert.alert('Error', 'An unexpected error occurred while marking perk as redeemed.');
    }
  }, [userId, setPerkStatus, onPerkStatusChange, refreshAutoRedemptions]);

  const handleMarkAvailable = useCallback(async (
    cardId: string,
    perk: CardPerk,
    isSwipeAction: boolean = false
  ) => {
    const originalStatus = perk.status;
    const previousValue = perk.remaining_value;
    const previousRedeemedAmount = perk.value - (previousValue ?? 0);

    try {
      // Optimistic update
      setPerkStatus(cardId, perk.id, 'available', perk.value);

      // Delete the redemption
      const { error } = await supabase.from('perk_redemptions').delete().eq('user_id', userId).eq('perk_id', perk.definition_id);

      if (error) {
        // Revert optimistic update on error
        setPerkStatus(cardId, perk.id, originalStatus, previousValue);
        onPerkStatusChange?.();
        console.error('Error marking as available:', error);
        Alert.alert('Error', 'Failed to mark perk as available.');
        return;
      }

      // Refresh auto-redemptions in case this affects any
      await refreshAutoRedemptions?.();
      await onPerkStatusChange?.();

      // Only show undo functionality if it's not a swipe action
      if (!isSwipeAction) {
        showToast(`${perk.name} marked as available`, async () => {
          try {
            // On undo, restore the previous state exactly
            setPerkStatus(cardId, perk.id, originalStatus, previousValue);
            
            // Track the redemption again
            await supabase.from('perk_redemptions').insert([
              {
                user_id: userId,
                perk_id: perk.definition_id,
                value_redeemed: previousRedeemedAmount,
                total_value: perk.value,
                status: originalStatus,
                remaining_value: previousValue,
                parent_redemption_id: perk.parent_redemption_id,
                redemption_date: new Date().toISOString(),
                reset_date: new Date(new Date().getFullYear() + 1, 0, 1).toISOString(),
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
      } else {
        // For swipe actions, just show a simple toast without undo
        showToast(`${perk.name} marked as available`);
      }

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