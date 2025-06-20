//expandable-card.tsx
import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Platform,
  Alert,
  ActionSheetIOS,
  AlertButton,
  LayoutAnimation,
} from 'react-native';
import Reanimated, { Layout, FadeIn, FadeOut, useAnimatedStyle, withTiming, SharedValue, useSharedValue, withRepeat, withSequence, withDelay, Easing, cancelAnimation, interpolate } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-root-toast';
import { Swipeable } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { Card, CardPerk, openPerkTarget, calculatePerkExpiryDate } from '../../../src/data/card-data';
import { useAuth } from '../../hooks/useAuth';
import { useAutoRedemptions } from '../../hooks/useAutoRedemptions';
import { trackPerkRedemption, getCurrentMonthRedemptions, deletePerkRedemption, supabase, setAutoRedemption, debugAutoRedemptions } from '../../../lib/database';
import { useRouter } from 'expo-router';
import PerkRow from './expandable-card/PerkRow';
import CardHeader from './expandable-card/CardHeader';
import OnboardingSheet from './OnboardingSheet';
import { useOnboardingContext } from '../../../app/(onboarding)/_context/OnboardingContext';

export interface ExpandableCardProps {
  card: Card;
  perks: CardPerk[];
  cumulativeSavedValue: number;
  onTapPerk: (cardId: string, perkId: string, perk: CardPerk) => Promise<void>;
  onExpandChange?: (cardId: string, isExpanded: boolean, index: number) => void;
  onPerkStatusChange?: () => void;
  setPerkStatus?: (cardId: string, perkId: string, status: 'available' | 'redeemed' | 'partially_redeemed', remainingValue?: number) => void;
  isActive?: boolean;
  sortIndex: number;
  userHasSeenSwipeHint: boolean;
  onHintDismissed: () => void;
}

const showToast = (message: string, onUndo?: () => void) => {
  const toastMessage = onUndo 
    ? `${message}\nTap to undo`
    : message;

  const toast = Toast.show(toastMessage, {
    duration: onUndo ? 4000 : 2000,
    position: Toast.positions.BOTTOM - 80,
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

// Add sorting function
const sortPerks = (perks: CardPerk[]): CardPerk[] => {
  return [...perks].sort((a, b) => {
    // Get expiry dates
    const aExpiry = calculatePerkExpiryDate(a.periodMonths || 0);
    const bExpiry = calculatePerkExpiryDate(b.periodMonths || 0);
    
    // First sort by expiry date
    const expiryDiff = aExpiry.getTime() - bExpiry.getTime();
    if (expiryDiff !== 0) return expiryDiff;
    
    // If same expiry date, sort by value (lower first)
    return a.value - b.value;
  });
};

const ExpandableCardComponent = ({
  card,
  perks,
  cumulativeSavedValue,
  onTapPerk,
  onExpandChange,
  onPerkStatusChange,
  setPerkStatus,
  isActive,
  sortIndex,
  userHasSeenSwipeHint,
  onHintDismissed,
}: ExpandableCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isRedeemedExpanded, setIsRedeemedExpanded] = useState(false);
  const [showSwipeHint, setShowSwipeHint] = useState(false);
  const [showUndoHint, setShowUndoHint] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [interactedPerkIdsThisSession, setInteractedPerkIdsThisSession] = useState<Set<string>>(new Set());
  const [autoRedeemUpdateKey, setAutoRedeemUpdateKey] = useState(0);
  const { user } = useAuth();
  const { getAutoRedemptionByPerkName, refreshAutoRedemptions } = useAutoRedemptions();
  const swipeableRefs = useRef<Record<string, Swipeable | null>>({});
  const router = useRouter();
  const { hasRedeemedFirstPerk, markFirstPerkRedeemed } = useOnboardingContext();
  
  // Ref to track if the card had redeemed perks in the previous render
  const hadRedeemedPerks = useRef(perks.some(p => p.status === 'redeemed'));
  
  // When card becomes active (e.g. from action hint pill), ensure it expands
  React.useEffect(() => {
    if (isActive && !isExpanded) {
      setIsExpanded(true);
      onExpandChange?.(card.id, true, sortIndex);
    }
  }, [isActive, isExpanded, card.id, onExpandChange, sortIndex]);

  const cardNetworkColor = useMemo(() => {
    switch (card.network?.toLowerCase()) {
      case 'amex':
      case 'american express':
        if (card.name?.toLowerCase().includes('platinum')) return '#E5E4E2'; // Silver/Plat
        if (card.name?.toLowerCase().includes('gold')) return '#B08D57'; // Gold
        return '#007bc1'; // Default Amex Blue if not Plat/Gold
      case 'chase':
        return '#124A8D'; // Chase Blue
      // Add other networks if needed
      default:
        return '#F0F0F0'; // Neutral default
    }
  }, [card.network, card.name]);

  // Calculate perk categories and stats
  const { monthlyPerks, otherPerks } = useMemo<{ monthlyPerks: CardPerk[], otherPerks: CardPerk[] }>(() => {
    const monthly: CardPerk[] = [];
    const other: CardPerk[] = [];
    perks.forEach((p: CardPerk) => {
      if (p.periodMonths === 1) {
        monthly.push(p);
      } else {
        other.push(p);
      }
    });
    return { monthlyPerks: monthly, otherPerks: other };
  }, [perks]);

  const monthlyPerkStats = useMemo(() => {
    const total = monthlyPerks.length;
    const redeemed = monthlyPerks.filter((p: CardPerk) => p.status === 'redeemed').length;
    return { total, redeemed };
  }, [monthlyPerks]);

  const otherPerksAvailableCount = useMemo(() => {
    return otherPerks.filter((p: CardPerk) => p.status !== 'redeemed').length;
  }, [otherPerks]);

  const isFullyRedeemed = useMemo(() => {
    return perks.every((p: CardPerk) => p.status === 'redeemed');
  }, [perks]);
  
  const hasUnredeemedPerks = useMemo(() => {
    return perks.some((p: CardPerk) => p.status !== 'redeemed');
  }, [perks]);

  // Calculate total saved value including partial redemptions
  const totalSavedValue = useMemo(() => {
    return perks.reduce((total, perk) => {
      if (perk.status === 'redeemed') {
        return total + perk.value;
      } else if (perk.status === 'partially_redeemed' && perk.value && perk.remaining_value) {
        return total + (perk.value - perk.remaining_value);
      }
      return total;
    }, 0);
  }, [perks]);

  useEffect(() => {
    if (totalSavedValue !== cumulativeSavedValue) {
      onPerkStatusChange?.();
    }
  }, [totalSavedValue, cumulativeSavedValue, onPerkStatusChange]);

  const nudgeAnimation = useSharedValue(0);
  const undoNudgeAnimation = useSharedValue(0);
  const redeemHintOpacity = useSharedValue(0);
  const undoHintOpacity = useSharedValue(0);

  useEffect(() => {
    // This effect creates a three-time haptic/visual nudge for the redeem hint.
    if (showSwipeHint) {
      // Trigger haptic feedback when the hint is about to animate
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      // Three nudge animations with 1.5s between each
      nudgeAnimation.value = withSequence(
        // First nudge after 1s
        withDelay(1000, withTiming(10, { duration: 250, easing: Easing.inOut(Easing.ease) })),
        withTiming(0, { duration: 250, easing: Easing.inOut(Easing.ease) }),
        // Second nudge after 1.5s
        withDelay(2500, withTiming(10, { duration: 250, easing: Easing.inOut(Easing.ease) })),
        withTiming(0, { duration: 250, easing: Easing.inOut(Easing.ease) }),
        // Third nudge after 1.5s
        withDelay(2500, withTiming(10, { duration: 250, easing: Easing.inOut(Easing.ease) })),
        withTiming(0, { duration: 250, easing: Easing.inOut(Easing.ease) })
      );

      // Appear instantly, then fade out after 10s
      redeemHintOpacity.value = withSequence(
        withTiming(1, { duration: 0 }), // Appear
        withDelay(10000, withTiming(0, { duration: 1000 })) // 10s display + 1s fade
      );
    } else {
      // Stop any pending animations when the hint is hidden (e.g., on collapse)
      cancelAnimation(nudgeAnimation);
      cancelAnimation(redeemHintOpacity);
      nudgeAnimation.value = 0;
      redeemHintOpacity.value = 0;
    }
  }, [showSwipeHint, nudgeAnimation, redeemHintOpacity]);

  useEffect(() => {
    // This effect creates a three-time haptic/visual nudge for the undo hint.
    if (showUndoHint) {
      // Trigger haptic feedback when the hint is about to animate
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // Three nudge left animations with 1.5s between each
      undoNudgeAnimation.value = withSequence(
        // First nudge after 1s
        withDelay(1000, withTiming(-10, { duration: 250, easing: Easing.inOut(Easing.ease) })),
        withTiming(0, { duration: 250, easing: Easing.inOut(Easing.ease) }),
        // Second nudge after 1.5s
        withDelay(2500, withTiming(-10, { duration: 250, easing: Easing.inOut(Easing.ease) })),
        withTiming(0, { duration: 250, easing: Easing.inOut(Easing.ease) }),
        // Third nudge after 1.5s
        withDelay(2500, withTiming(-10, { duration: 250, easing: Easing.inOut(Easing.ease) })),
        withTiming(0, { duration: 250, easing: Easing.inOut(Easing.ease) })
      );

      // Appear instantly, then fade out after 10s
      undoHintOpacity.value = withSequence(
        withTiming(1, { duration: 0 }), // Appear
        withDelay(10000, withTiming(0, { duration: 1000 })) // 10s display + 1s fade
      );
    } else {
      // Stop any pending animations when the hint is hidden
      cancelAnimation(undoNudgeAnimation);
      cancelAnimation(undoHintOpacity);
      undoNudgeAnimation.value = 0;
      undoHintOpacity.value = 0;
    }
  }, [showUndoHint, undoNudgeAnimation, undoHintOpacity]);

  // This effect watches for the first perk to be marked as 'redeemed' while the card is open
  useEffect(() => {
    const nowHasRedeemedPerks = perks.some(p => p.status === 'redeemed');

    // If the card is expanded and we just transitioned from 0 redeemed perks to 1+
    if (isExpanded && nowHasRedeemedPerks && !hadRedeemedPerks.current) {
      // Automatically expand the redeemed section to show the user where the perk went
      // and to reveal the "swipe to undo" hint.
      setIsRedeemedExpanded(true);

      // Show the undo hint, unless the main onboarding popup is about to appear.
      if (!showOnboarding) {
        setShowUndoHint(true);
      }
    }
    
    // Update the ref for the next render
    hadRedeemedPerks.current = nowHasRedeemedPerks;
  }, [perks, isExpanded, showOnboarding]);

  const animatedNudgeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: nudgeAnimation.value }],
    opacity: redeemHintOpacity.value,
    height: interpolate(redeemHintOpacity.value, [0, 1], [0, 28]),
    marginTop: interpolate(redeemHintOpacity.value, [0, 1], [0, 8]),
  }));

  const animatedUndoNudgeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: undoNudgeAnimation.value }],
    opacity: undoHintOpacity.value,
    height: interpolate(undoHintOpacity.value, [0, 1], [0, 28]),
    marginTop: interpolate(undoHintOpacity.value, [0, 1], [0, 8]),
  }));

  const firstAvailablePerkId = useMemo(() => {
    const availablePerks = perks.filter(p => p.status === 'available' || p.status === 'partially_redeemed');
    const sortedAvailablePerks = sortPerks(availablePerks);
    return sortedAvailablePerks[0]?.id;
  }, [perks]);

  const firstRedeemedPerkId = useMemo(() => {
    return perks.find(p => p.status === 'redeemed')?.id;
  }, [perks]);

  const handleExpand = () => {
    const newExpandedState = !isExpanded;
    setIsExpanded(newExpandedState);
    onExpandChange?.(card.id, newExpandedState, sortIndex);
    Object.values(swipeableRefs.current).forEach(ref => ref?.close());

    // Show redeem hint if there are perks to swipe (remains visible for testing)
    if (newExpandedState && perks.some(p => p.status !== 'redeemed')) {
      setShowSwipeHint(true);
    } else if (!newExpandedState) {
      setShowSwipeHint(false); // Hide hint on collapse
      setIsRedeemedExpanded(false); // Also collapse the redeemed perks section
    }

    // Show undo hint if there are redeemed perks (remains visible for testing)
    const hasRedeemedPerks = perks.some(p => p.status === 'redeemed');
    if (newExpandedState && hasRedeemedPerks) {
      setShowUndoHint(true);
    } else if (!newExpandedState) {
      setShowUndoHint(false);
    }
  };

  const executePerkAction = async (perk: CardPerk, action: 'redeemed' | 'available') => {
    if (!user) return;

    const isPartiallyRedeemed = perk.status === 'partially_redeemed';
    const previousStatus = perk.status;
    const previousValue = perk.remaining_value;
    const partiallyRedeemedAmount = isPartiallyRedeemed && previousValue !== undefined ? 
      perk.value - previousValue : 0;

    try {
      if (action === 'redeemed') {
        // For partially redeemed perks, we need to delete the existing partial redemption first
        if (isPartiallyRedeemed) {
          // First delete the partial redemption
          const { error: deleteError } = await deletePerkRedemption(user.id, perk.definition_id);
          if (deleteError) {
            console.error('Error deleting partial redemption:', deleteError);
            Alert.alert('Error', 'Failed to update perk redemption.');
            return;
          }
        }

        // Now track the full redemption, making the UI update atomic
        setPerkStatus?.(card.id, perk.id, 'redeemed');
        const result = await trackPerkRedemption(
          user.id, 
          card.id, 
          perk, 
          perk.value,
          perk.parent_redemption_id
        );

        if (result.error) {
          console.error('Error tracking redemption:', result.error);
          setPerkStatus?.(card.id, perk.id, previousStatus, previousValue);
          if (isPartiallyRedeemed) {
            // Re-track the partial redemption if we failed
            await trackPerkRedemption(
              user.id, 
              card.id, 
              { ...perk, status: previousStatus }, 
              partiallyRedeemedAmount
            );
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

        // Check if this is the first perk redemption
        if (!hasRedeemedFirstPerk) {
          await markFirstPerkRedeemed();
          setShowOnboarding(true);
        }

        showToast(
          `${perk.name} marked as redeemed`,
          async () => {
            try {
              // On undo, restore the previous state exactly
              setPerkStatus?.(card.id, perk.id, previousStatus, previousValue);
              
              // First delete the full redemption
              const { error: undoError } = await deletePerkRedemption(user.id, perk.definition_id);
              if (undoError) {
                setPerkStatus?.(card.id, perk.id, 'redeemed');
                onPerkStatusChange?.();
                console.error('Error undoing redemption:', undoError);
                showToast('Error undoing redemption');
                return;
              }

              // If it was partially redeemed before, restore that state
              if (previousStatus === 'partially_redeemed' && previousValue !== undefined) {
                const partialResult = await trackPerkRedemption(
                  user.id, 
                  card.id, 
                  { ...perk, status: previousStatus }, 
                  partiallyRedeemedAmount
                );
                if (partialResult.error) {
                  setPerkStatus?.(card.id, perk.id, 'redeemed');
                  onPerkStatusChange?.();
                  showToast('Error restoring partial redemption');
                  return;
                }
              }
              
              onPerkStatusChange?.();
            } catch (error) {
              setPerkStatus?.(card.id, perk.id, 'redeemed');
              onPerkStatusChange?.();
              console.error('Error undoing redemption:', error);
              showToast('Error undoing redemption');
            }
          }
        );
      } else { // For 'available' action
        console.log(`[ExpandableCard] Setting perk ${perk.name} to fully available`);
        const previousStatus = perk.status;
        const previousValue = perk.remaining_value;
        const previousRedeemedAmount = previousStatus === 'partially_redeemed' && previousValue !== undefined 
          ? perk.value - previousValue 
          : perk.value;

        // Set status to available first (optimistic update)
        setPerkStatus?.(card.id, perk.id, 'available');

        // Delete the redemption record
        const { error: deleteError } = await deletePerkRedemption(user.id, perk.definition_id);
        if (deleteError) {
          console.error('Error deleting redemption:', deleteError);
          setPerkStatus?.(card.id, perk.id, previousStatus, previousValue);
          onPerkStatusChange?.();
          Alert.alert('Error', 'Failed to mark perk as available.');
          return;
        }

        // After successful operation, refresh all data
        await Promise.all([
          onPerkStatusChange?.(),
          refreshAutoRedemptions?.()
        ]);

        showToast(
          `${perk.name} marked as available`,
          async () => {
            try {
              // Restore previous state
              setPerkStatus?.(card.id, perk.id, previousStatus, previousValue);
              
              // Re-track the redemption
              const result = await trackPerkRedemption(
                user.id,
                card.id,
                { ...perk, status: previousStatus },
                previousRedeemedAmount
              );
              
              if (result.error) {
                setPerkStatus?.(card.id, perk.id, 'available');
                onPerkStatusChange?.();
                showToast('Error restoring previous state');
                return;
              }
              
              onPerkStatusChange?.();
            } catch (error) {
              setPerkStatus?.(card.id, perk.id, 'available');
              onPerkStatusChange?.();
              console.error('Error undoing available:', error);
              showToast('Error restoring previous state');
            }
          }
        );
      }
    } catch (error) {
      console.error('Error in perk action:', error);
      setPerkStatus?.(card.id, perk.id, previousStatus, previousValue);
      onPerkStatusChange?.();
      Alert.alert('Error', 'An unexpected error occurred.');
    }
  };

  const handleLongPressPerk = async (cardId: string, perk: CardPerk) => {
    if (!user) {
      Alert.alert(
        "Authentication Required",
        "Please log in to track perks.",
        [
          { text: "Log In", onPress: () => router.push('/(auth)/login') },
          { text: "Cancel", style: "cancel" },
        ]
      );
      return;
    }

    // Only show auto-redemption options for monthly perks
    if (perk.periodMonths !== 1) {
      return; // Don't show any options for non-monthly perks
    }

    const options = [];
    const actions: (() => void)[] = [];

    try {
      // Check if perk is already set for auto-redemption using the hook
      const autoRedemption = getAutoRedemptionByPerkName(perk.name);
      const isAutoRedemption = !!autoRedemption;
      
      if (isAutoRedemption) {
        options.push('Cancel Monthly Auto-Redemption');
        actions.push(async () => {
          try {
            console.log(`[ExpandableCard] Attempting to cancel auto-redemption for ${perk.name}`);
            
            // Perform both DB operations: turn off auto-redeem AND delete current redemption
            const [autoResult, deleteResult] = await Promise.all([
              setAutoRedemption(user.id, cardId, perk, false),
              deletePerkRedemption(user.id, perk.definition_id)
            ]);
            
            const error = autoResult.error || deleteResult.error;

            if (error) {
              console.error(`[ExpandableCard] Failed to disable auto-redemption for ${perk.name}:`, error);
              Alert.alert('Error', `Failed to disable auto-redemption: ${error instanceof Error ? error.message : 'Unknown error'}`);
            } else {
              console.log(`[ExpandableCard] Successfully cancelled auto-redemption for ${perk.name}`);
              
              // Optimistically update UI to mark as available
              setPerkStatus?.(card.id, perk.id, 'available');

              await refreshAutoRedemptions(); // Refresh the hook data
              onPerkStatusChange?.(); // Refresh dashboard
              Alert.alert('Success', `Auto-redemption cancelled for "${perk.name}".`);
            }
          } catch (err) {
            console.error(`[ExpandableCard] Unexpected error cancelling auto-redemption for ${perk.name}:`, err);
            Alert.alert('Error', `Failed to disable auto-redemption: ${err instanceof Error ? err.message : 'Unknown error'}`);
          }
        });
      } else {
        options.push('Set to Auto-Redeem Monthly');
        actions.push(async () => {
          Alert.alert(
            'Auto-Redemption',
            `Enable auto-redemption for "${perk.name}"?\n\nThis perk will be automatically marked as redeemed each month so you don't have to track it manually. Perfect for perks that get used automatically (like streaming credits).\n\nThis will also mark the perk as redeemed for this month.`,
            [
              {
                text: 'Enable',
                onPress: async () => {
                  try {
                    // Always set the auto-redemption setting first.
                    const { error: autoError } = await setAutoRedemption(user.id, cardId, perk, true);
                    if (autoError) {
                      Alert.alert('Error', 'Failed to enable auto-redemption.');
                      return;
                    }

                    // If the perk was NOT already redeemed, we need to redeem it now.
                    if (perk.status !== 'redeemed') {
                      // Optimistically update UI
                      setPerkStatus?.(card.id, perk.id, 'redeemed');
                      
                      // Mark as redeemed in DB
                      const { error: redeemError } = await trackPerkRedemption(user.id, cardId, perk, perk.value);
                      if (redeemError) {
                        console.log('Note: Auto-redemption set but current month redemption may already exist', redeemError);
                      }
                    }

                    // Refresh all relevant data
                    await refreshAutoRedemptions();

                    // If we just enabled auto-redeem on an already-redeemed perk, its status prop didn't change,
                    // so a re-render isn't guaranteed if the parent is memoized.
                    // The hook's context has updated, but we need to ensure this component re-renders 
                    // to see the change in its child (PerkRow). Forcing a local state update achieves this.
                    if (perk.status === 'redeemed') {
                      setAutoRedeemUpdateKey(k => k + 1);
                    }
                    
                    onPerkStatusChange?.();
                    
                    Alert.alert('Success', `Auto-redemption enabled for "${perk.name}"!\n\nIt has been marked as redeemed for this month and will be automatically redeemed each month going forward.`);
                  } catch (err) {
                    Alert.alert('Error', 'Failed to enable auto-redemption.');
                  }
                }
              },
              { text: 'Cancel', style: 'cancel' }
            ]
          );
        });
      }
    } catch (err) {
      console.error('Error in auto-redemption check:', err);
      // Fallback to show the option anyway
      options.push('Set to Auto-Redeem Monthly');
      actions.push(async () => {
        Alert.alert('Feature Coming Soon', 'Auto-redemption is being implemented.');
      });
    }

    if (options.length === 0) {
      return; // No options to show
    }

    options.push('Cancel');
    const cancelButtonIndex = options.length - 1;

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: options,
          cancelButtonIndex: cancelButtonIndex,
          title: perk.name,
          message: perk.description, 
        },
        (buttonIndex) => {
          if (buttonIndex !== cancelButtonIndex && actions[buttonIndex]) {
            actions[buttonIndex]();
          }
        }
      );
    } else {
      // Basic Alert fallback for Android or other platforms
      const alertButtons: AlertButton[] = options.slice(0, -1).map((opt, index) => ({
        text: opt,
        onPress: actions[index],
      }));
      alertButtons.push({
        text: 'Cancel',
        style: 'cancel',
      });
      Alert.alert(perk.name, perk.description, alertButtons);
    }
  };

  const renderLeftActions = (perk: CardPerk) => {
    // Left side action = revealed when swiping RIGHT = GREEN "Redeem" action
    return (
      <TouchableOpacity
        style={styles.leftAction}
        onPress={() => executePerkAction(perk, 'redeemed')}
      >
        <Ionicons name="checkmark-circle-outline" size={24} color="#fff" />
        <Text style={styles.actionText}>Redeem</Text>
      </TouchableOpacity>
    );
  };

  const renderRightActions = (perk: CardPerk) => {
    // Right side action = revealed when swiping LEFT = BLUE "Available" action
    return (
      <TouchableOpacity
        style={styles.rightAction}
        onPress={() => executePerkAction(perk, 'available')}
      >
        <Ionicons name="refresh-circle-outline" size={24} color="#fff" />
        <Text style={styles.actionText}>Available</Text>
      </TouchableOpacity>
    );
  };

  const renderPerkRow = (perk: CardPerk, isAvailable: boolean) => {
    const isAutoRedeemed = perk.periodMonths === 1 && !!getAutoRedemptionByPerkName(perk.name);
    return (
    <PerkRow
      key={perk.id}
      perk={perk}
      isAutoRedeemed={isAutoRedeemed}
      isFirstAvailablePerk={isAvailable && perk.id === firstAvailablePerkId}
      showSwipeHint={isAvailable && showSwipeHint}
      isFirstRedeemedPerk={!isAvailable && perk.id === firstRedeemedPerkId}
      showUndoHint={!isAvailable && showUndoHint}
      animatedNudgeStyle={animatedNudgeStyle}
      animatedUndoNudgeStyle={animatedUndoNudgeStyle}
      onTapPerk={() => onTapPerk(card.id, perk.id, perk)}
      onLongPressPerk={() => handleLongPressPerk(card.id, perk)}
      setSwipeableRef={(ref: Swipeable | null) => { swipeableRefs.current[perk.id] = ref; }}
      onSwipeableWillOpen={(direction) => {
        if (direction === 'left') { // Right-swipe reveals the left-side action ("Redeem")
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        } else if (direction === 'right') { // Left-swipe reveals the right-side action ("Available")
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      }}
      onSwipeableOpen={(direction) => {
        Object.entries(swipeableRefs.current).forEach(([id, swipeableRef]) => {
          if (id !== perk.id && swipeableRef) {
            swipeableRef.close();
          }
        });
        if (direction === 'left') { // Left panel was revealed by a right-swipe
          executePerkAction(perk, 'redeemed');
        } else { // Right panel was revealed by a left-swipe
          executePerkAction(perk, 'available');
        }
      }}
      renderLeftActions={isAvailable ? () => renderLeftActions(perk) : undefined}
      renderRightActions={!isAvailable ? () => renderRightActions(perk) : undefined}
    />
    );
  };

  return (
    <>
      <Reanimated.View 
        style={[styles.cardContainer, isActive && styles.activeCard]} 
        layout={Layout.springify().duration(300)}
        onLayout={(event) => {
          const { height } = event.nativeEvent.layout;
        }}
      >
        <CardHeader
          card={card}
          isExpanded={isExpanded}
          isActive={!!isActive}
          isFullyRedeemed={isFullyRedeemed}
          cumulativeSavedValue={cumulativeSavedValue}
          monthlyPerkStats={monthlyPerkStats}
          otherPerksAvailableCount={otherPerksAvailableCount}
          onPress={handleExpand}
        />

        {isExpanded && (
          <Reanimated.View 
            style={styles.perksListContainer} 
            layout={Layout.springify().duration(300)}
          >
            <View style={styles.perksGroupContainer}>
              {perks.filter(p => p.status === 'available' || p.status === 'partially_redeemed').length > 0 && (
                <>
                  <Text style={styles.sectionLabel}>Available Perks</Text>
                  {sortPerks(perks.filter(p => p.status === 'available' || p.status === 'partially_redeemed')).map(p => renderPerkRow(p, true))}
                </>
              )}
              {(() => {
                const redeemedPerks = perks.filter(p => p.status === 'redeemed');
                if (redeemedPerks.length === 0) return null;

                return (
                  <>
                    <TouchableOpacity
                      style={styles.sectionHeader}
                      onPress={() => setIsRedeemedExpanded(prev => !prev)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.sectionLabel}>Redeemed ({redeemedPerks.length})</Text>
                      <Ionicons
                        name={isRedeemedExpanded ? 'chevron-up' : 'chevron-down'}
                        size={20}
                        color="#666"
                      />
                    </TouchableOpacity>
                    {isRedeemedExpanded && (
                      <Reanimated.View
                        layout={Layout.springify()}
                        entering={FadeIn.duration(200)}
                        exiting={FadeOut.duration(200)}
                      >
                        {redeemedPerks.map(p => renderPerkRow(p, false))}
                      </Reanimated.View>
                    )}
                  </>
                );
              })()}
            </View>
          </Reanimated.View>
        )}
      </Reanimated.View>

      <OnboardingSheet
        visible={showOnboarding}
        onDismiss={() => setShowOnboarding(false)}
      />
    </>
  );
};

const areEqual = (prevProps: ExpandableCardProps, nextProps: ExpandableCardProps): boolean => {
  if (prevProps.card.id !== nextProps.card.id ||
      prevProps.card.name !== nextProps.card.name ||
      prevProps.card.network !== nextProps.card.network) {
    return false;
  }

  if (prevProps.cumulativeSavedValue !== nextProps.cumulativeSavedValue ||
      prevProps.isActive !== nextProps.isActive ||
      prevProps.sortIndex !== nextProps.sortIndex) {
    return false;
  }

  if (prevProps.onTapPerk !== nextProps.onTapPerk ||
      prevProps.onExpandChange !== nextProps.onExpandChange ||
      prevProps.onPerkStatusChange !== nextProps.onPerkStatusChange ||
      prevProps.setPerkStatus !== nextProps.setPerkStatus) {
    return false;
  }

  if (prevProps.perks.length !== nextProps.perks.length) {
    return false;
  }

  for (let i = 0; i < prevProps.perks.length; i++) {
    const prevPerk = prevProps.perks[i];
    const nextPerk = nextProps.perks[i];
    if (prevPerk.id !== nextPerk.id ||
        prevPerk.status !== nextPerk.status ||
        prevPerk.definition_id !== nextPerk.definition_id ||
        prevPerk.value !== nextPerk.value // Added perk value comparison
        ) {
      return false;
    }
  }

  return true;
};

export default React.memo(ExpandableCardComponent, areEqual);

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginHorizontal: 16,
    marginVertical: 6,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  sectionLabel: {
    fontSize: 17,
    fontWeight: '600',
    color: '#666',
    marginVertical: 8,
    paddingHorizontal: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingRight: 4,
  },
  activeCard: {
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  perksListContainer: {
    paddingHorizontal: 0,
    paddingBottom: 8,
  },
  perksGroupContainer: {
    backgroundColor: '#F7F7F7',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    padding: 12,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(0,0,0,0.1)',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 1,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  leftAction: {
    backgroundColor: '#34c759',
    flex: 1,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  rightAction: {
    backgroundColor: '#007aff',
    flex: 1,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  actionText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
    marginLeft: 8,
    opacity: 1,
  },
  actionContentView: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    flexGrow: 1,
  },
  progressChipContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    alignSelf: 'flex-start',
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 1.5,
  },
  progressDotRedeemed: {
    backgroundColor: '#34c759',
  },
  progressDotAvailable: {
    backgroundColor: '#cccccc',
  },
  progressChipText: {
    fontSize: 11,
    color: '#555',
    marginLeft: 5,
    fontWeight: '500',
  },
  perkItemContainer: {
    marginBottom: 8,
  },
  perkContainerOuter: {
  },
  perkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
    position: 'relative',
    borderRadius: 16,
  },
  perkContainerRedeemed: {
    backgroundColor: '#F7F7F7',
  },
  swipeHintContainer: {
    position: 'absolute',
    right: 12,
    top: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    opacity: 0.7,
    zIndex: -1,
  },
  swipeHintText: {
    fontSize: 12,
    color: '#888888',
    marginLeft: 2,
  },
  perkIconContainer: {
    marginRight: 12,
    width: 30,
    alignItems: 'center',
  },
  perkDescription: { 
    fontSize: 13,
    color: '#6C6C70',
    lineHeight: 18,
  },
  perkDescriptionRedeemed: { 
    color: '#AEAEB2',
  },
  perkValueContainer: {
    marginLeft: 'auto',
    paddingLeft: 8,
    alignItems: 'flex-end',
  },
  perkValueRedeemed: { 
    color: '#8E8E93',
    textDecorationLine: 'line-through',
  },
  perkChevron: {
    marginLeft: 8,
  },
  perkContainerAutoRedeemed: {
    backgroundColor: '#FFF8E1',
  },
  perkNameAutoRedeemed: { 
    color: '#FF9500',
  },
  perkDescriptionAutoRedeemed: { 
    color: '#FF9500',
  },
  perkValueAutoRedeemed: { 
    color: '#FF9500',
  },
  ghostPerkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 122, 255, 0.04)', // Very subtle tint
    borderRadius: 12,
    paddingVertical: 12, // Reduced padding for a ~48pt height
    paddingHorizontal: 16,
    marginVertical: 4,
  },
  ghostPerkText: {
    color: '#007AFF',
    fontSize: 15, // Matches system .body text size
    fontWeight: '500',
    marginHorizontal: 8,
  },
  inlineHintContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 122, 255, 0.05)',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  inlineHintText: {
    color: '#007AFF',
    fontSize: 13,
    fontWeight: '500',
    marginLeft: 6,
  },
}); 