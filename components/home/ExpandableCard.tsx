//expandable-card.tsx
import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
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
  PlatformColor,
} from 'react-native';
import Reanimated, { Layout, FadeIn, FadeOut, useAnimatedStyle, withTiming, SharedValue, useSharedValue, withRepeat, withSequence, withDelay, Easing, cancelAnimation, interpolate } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-root-toast';
import { Swipeable } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { Card, CardPerk, openPerkTarget, calculatePerkExpiryDate } from '../../src/data/card-data';
import { useAuth } from '../../hooks/useAuth';
import { useAutoRedemptions } from '../../hooks/useAutoRedemptions';
import { trackPerkRedemption, getCurrentMonthRedemptions, deletePerkRedemption, supabase, setAutoRedemption, debugAutoRedemptions } from '../../lib/database';
import { useRouter , useNavigation } from 'expo-router';

import PerkRow from './expandable-card/PerkRow';
import CardHeader from './expandable-card/CardHeader';
import { useOnboardingContext, useOnboarding } from '../../app/(onboarding)/_context/OnboardingContext';
import OnboardingOverlay from './OnboardingOverlay';

// Add showToast function
const showToast = (message: string, onUndo?: () => void) => {
  // For swipe actions, we don't want to show the undo functionality
  const isSwipeAction = message.includes('marked as redeemed') || message.includes('marked as available');
  const toastMessage = !isSwipeAction && onUndo ? `${message}\nTap to undo` : message;
  const toast = Toast.show(toastMessage, {
    duration: !isSwipeAction && onUndo ? 4000 : 2000,
    position: Toast.positions.BOTTOM,
    shadow: true,
    animation: true,
    hideOnPress: true,
    delay: 0,
    opacity: 1,
    containerStyle: { 
      borderRadius: 12, 
      paddingHorizontal: 16, 
      paddingVertical: 12, 
      marginBottom: Platform.OS === 'ios' ? 64 : 48, 
      backgroundColor: '#1c1c1e',
      width: '90%',
      maxWidth: 400,
      alignSelf: 'center',
    },
    textStyle: { 
      fontSize: 14, 
      fontWeight: '500', 
      textAlign: 'center', 
      lineHeight: 20,
      color: '#FFFFFF',
    },
    onShow: () => {
      console.log('Toast shown:', toastMessage);
    },
    onHidden: () => {
      console.log('Toast hidden:', toastMessage);
    },
    onPress: () => { 
      if (!isSwipeAction && onUndo) { 
        Toast.hide(toast);
        onUndo(); 
      }
    },
  });
  
  return toast;
};

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
  setPendingToast: (toast: { message: string; onUndo?: (() => void) | null } | null) => void;
  renewalDate?: Date | null;
  onRenewalDatePress?: () => void;
  onOpenLoggingModal?: (perk: CardPerk) => void;
}

// Use our design system's success green - more professional than iOS systemGreen
const systemGreen = '#34C759'; // iOS system green but less bright

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
  setPendingToast,
  renewalDate,
  onRenewalDatePress,
  onOpenLoggingModal,
}: ExpandableCardProps) => {
  console.log('[ExpandableCard] Rendering card:', {
    cardName: card.name,
    renewalDate: renewalDate,
    cardRenewalDate: card.renewalDate,
    hasHandler: !!onRenewalDatePress
  });
  const validPerks = perks ? perks.filter(Boolean) : [];
  const [isExpanded, setIsExpanded] = useState(false);
  const [isRedeemedExpanded, setIsRedeemedExpanded] = useState(false);
  const [showSwipeHint, setShowSwipeHint] = useState(false);
  const [showUndoHint, setShowUndoHint] = useState(false);
  const [interactedPerkIdsThisSession, setInteractedPerkIdsThisSession] = useState<Set<string>>(new Set());
  const [autoRedeemUpdateKey, setAutoRedeemUpdateKey] = useState(0);
  const { user } = useAuth();
  const { getAutoRedemptionByPerkName, refreshAutoRedemptions } = useAutoRedemptions();
  const swipeableRefs = useRef<Record<string, Swipeable | null>>({});
  const { hasSeenTapOnboarding, hasSeenSwipeOnboarding, markTapOnboardingAsSeen, markSwipeOnboardingAsSeen, isOnboardingFlagsReady } = useOnboarding();
  const [firstPerkLayout, setFirstPerkLayout] = useState<{x: number; y: number; width: number; height: number} | null>(null);
  
  // Callback for receiving layout information from the first perk
  const handleFirstPerkLayout = useCallback((layout: {x: number; y: number; width: number; height: number}) => {
    setFirstPerkLayout(layout);
  }, []);
  
  // Callback to dismiss the tap onboarding
  const handleDismissTapOnboarding = useCallback(() => {
    markTapOnboardingAsSeen();
    setFirstPerkLayout(null);
    
    // Show swipe hints after tap onboarding is dismissed
    const hasAvailablePerks = validPerks.some(p => p.status === 'available');
    if (isExpanded && !hasSeenSwipeOnboarding && hasAvailablePerks) {
      setShowSwipeHint(true);
    }
  }, [markTapOnboardingAsSeen, validPerks, isExpanded, hasSeenSwipeOnboarding]);
  const router = useRouter();
  const { hasRedeemedFirstPerk, markFirstPerkRedeemed } = useOnboardingContext();
  
  // Ref to track if the card had redeemed perks in the previous render
  const hadRedeemedPerks = useRef(validPerks.some(p => p.status === 'redeemed'));
  
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
    validPerks.forEach((p: CardPerk) => {
      if (p.periodMonths === 1) {
        monthly.push(p);
      } else {
        other.push(p);
      }
    });
    return { monthlyPerks: monthly, otherPerks: other };
  }, [validPerks]);

  const monthlyPerkStats = useMemo(() => {
    const total = monthlyPerks.length;
    const redeemed = monthlyPerks.filter((p: CardPerk) => p.status === 'redeemed').length;
    return { total, redeemed };
  }, [monthlyPerks]);

  const otherPerksAvailableCount = useMemo(() => {
    return otherPerks.filter((p: CardPerk) => p.status !== 'redeemed').length;
  }, [otherPerks]);

  const isFullyRedeemed = useMemo(() => {
    return validPerks.every((p: CardPerk) => p.status === 'redeemed');
  }, [validPerks]);
  
  const hasUnredeemedPerks = useMemo(() => {
    return validPerks.some((p: CardPerk) => p.status !== 'redeemed');
  }, [validPerks]);

  // Calculate total saved value including partial redemptions
  const totalSavedValue = useMemo(() => {
    return validPerks.reduce((total, perk) => {
      if (perk.status === 'redeemed') {
        return total + perk.value;
      } else if (perk.status === 'partially_redeemed' && perk.value && perk.remaining_value) {
        return total + (perk.value - perk.remaining_value);
      }
      return total;
    }, 0);
  }, [validPerks]);

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

      // Mark swipe onboarding as seen after the hint has been shown for 10 seconds
      setTimeout(() => {
        markSwipeOnboardingAsSeen();
      }, 10000);
    } else {
      // Stop any pending animations when the hint is hidden (e.g., on collapse)
      cancelAnimation(nudgeAnimation);
      cancelAnimation(redeemHintOpacity);
      nudgeAnimation.value = 0;
      redeemHintOpacity.value = 0;
    }
  }, [showSwipeHint, nudgeAnimation, redeemHintOpacity, markSwipeOnboardingAsSeen]);

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
    const nowHasRedeemedPerks = validPerks.some(p => p.status === 'redeemed');

    // If the card is expanded and we just transitioned from 0 redeemed perks to 1+
    if (isExpanded && nowHasRedeemedPerks && !hadRedeemedPerks.current) {
      // Automatically expand the redeemed section to show the user where the perk went
      // and to reveal the "swipe to undo" hint.
      setIsRedeemedExpanded(true);

      // Show the undo hint
      setShowUndoHint(true);
    }
    
    // Update the ref for the next render
    hadRedeemedPerks.current = nowHasRedeemedPerks;
  }, [validPerks, isExpanded]);

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
    const availablePerks = validPerks.filter(p => p.status === 'available' || p.status === 'partially_redeemed');
    const sortedAvailablePerks = sortPerks(availablePerks);
    return sortedAvailablePerks[0]?.id;
  }, [validPerks]);

  const firstRedeemedPerkId = useMemo(() => {
    return validPerks.find(p => p.status === 'redeemed')?.id;
  }, [validPerks]);

  const handleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const newExpandedState = !isExpanded;
    setIsExpanded(newExpandedState);
    onExpandChange?.(card.id, newExpandedState, sortIndex);

    // Also collapse the redeemed section when the main card collapses
    if (!newExpandedState) {
      setIsRedeemedExpanded(false);
    }
    
    // Show swipe hint only if there are available perks and user has seen tap onboarding
    const hasAvailablePerks = validPerks.some(p => p.status === 'available');
    if (newExpandedState && hasSeenTapOnboarding && !hasSeenSwipeOnboarding && hasAvailablePerks) {
      setShowSwipeHint(true);
    } else {
      setShowSwipeHint(false);
    }
    
    const hasRedeemedPerks = validPerks.some(p => p.status === 'redeemed');
    const nowHasRedeemedPerks = validPerks.some(p => p.status === 'redeemed');
    if (nowHasRedeemedPerks && !hadRedeemedPerks.current) {
        setShowUndoHint(true);
    }
    hadRedeemedPerks.current = nowHasRedeemedPerks;
  };

  const executePerkAction = async (perk: CardPerk, action: 'redeemed' | 'available') => {
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

    try {
      const previousStatus = perk.status;
      const previousValue = perk.remaining_value;

      if (action === 'redeemed') {
        // Optimistic UI update
        setPerkStatus?.(card.id, perk.id, 'redeemed');

        // Track redemption in database
        const { error: redeemError } = await trackPerkRedemption(user.id, card.id, perk, perk.value);
        
        if (redeemError) {
          console.error('Error tracking redemption in DB:', redeemError);
          // Revert optimistic update on error
          if (previousStatus === 'partially_redeemed' && previousValue !== undefined) {
            setPerkStatus?.(card.id, perk.id, 'partially_redeemed', previousValue);
          } else {
            setPerkStatus?.(card.id, perk.id, 'available');
          }
          showToast('Error marking perk as redeemed');
          return;
        }

        // Show toast without undo functionality for swipe actions
        showToast(`${perk.name} marked as redeemed`);
      } else {
        // Optimistic UI update
        setPerkStatus?.(card.id, perk.id, 'available');

        // Delete redemption from database
        const { error: deleteError } = await deletePerkRedemption(user.id, perk.definition_id);
        
        if (deleteError) {
          console.error('Error deleting redemption from DB:', deleteError);
          // Revert optimistic update on error
          if (previousStatus === 'partially_redeemed' && previousValue !== undefined) {
            setPerkStatus?.(card.id, perk.id, 'partially_redeemed', previousValue);
          } else {
            setPerkStatus?.(card.id, perk.id, 'redeemed');
          }
          showToast('Error marking perk as available');
          return;
        }

        // Show toast without undo functionality for swipe actions
        showToast(`${perk.name} marked as available`);
      }

      // Trigger any necessary UI updates
      onPerkStatusChange?.();
    } catch (error) {
      console.error('Error executing perk action:', error);
      showToast('Error updating perk status');
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
    // Left side action = revealed when swiping RIGHT = "Log Usage" action
    return (
      <TouchableOpacity
        style={styles.leftAction}
        onPress={() => {
          // Enhanced haptic feedback for action press
          if (Platform.OS === 'ios') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          }
          // Close the swipeable first
          swipeableRefs.current[perk.id]?.close();
          // Open the logging modal
          onOpenLoggingModal?.(perk);
        }}
        onPressIn={() => {
          // Light haptic feedback on press start
          if (Platform.OS === 'ios') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
        }}
        activeOpacity={0.85} // Subtle press feedback
      >
        <Ionicons name="add-circle-outline" size={24} color="#fff" />
        <Text style={styles.actionText}>Log Usage</Text>
      </TouchableOpacity>
    );
  };

  const renderRightActions = (perk: CardPerk) => {
    // Right side action = revealed when swiping LEFT = BLUE "Available" action
    return (
      <TouchableOpacity
        style={styles.rightAction}
        onPress={() => {
          // Enhanced haptic feedback for undo action
          if (Platform.OS === 'ios') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          }
          executePerkAction(perk, 'available');
        }}
        onPressIn={() => {
          // Light haptic feedback on press start
          if (Platform.OS === 'ios') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
        }}
        activeOpacity={0.85} // Subtle press feedback
      >
        <Ionicons name="refresh-circle-outline" size={24} color="#fff" />
        <Text style={styles.actionText}>Available</Text>
      </TouchableOpacity>
    );
  };

  const renderPerkRow = (perk: CardPerk, isAvailable: boolean, isFirstPerk: boolean = false) => {
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
      onSwipeableWillOpen={(direction: 'left' | 'right') => {
        if (direction === 'left') { // Right-swipe reveals the left-side action ("Redeem")
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        } else if (direction === 'right') { // Left-swipe reveals the right-side action ("Available")
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      }}
      onSwipeableOpen={(direction: 'left' | 'right') => {
        Object.entries(swipeableRefs.current).forEach(([id, swipeableRef]) => {
          if (id !== perk.id && swipeableRef) {
            swipeableRef.close();
          }
        });
        
        // Mark swipe onboarding as seen when user performs first swipe action
        if (!hasSeenSwipeOnboarding) {
          markSwipeOnboardingAsSeen();
        }
        
        // Note: We no longer execute actions immediately on swipe open
        // Actions are now handled by button presses in the revealed panels
      }}
      renderLeftActions={isAvailable ? () => renderLeftActions(perk) : undefined}
      renderRightActions={!isAvailable ? () => renderRightActions(perk) : undefined}
      onLayout={isFirstPerk ? handleFirstPerkLayout : undefined}
    />
    );
  };

  const handleRedeemedExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsRedeemedExpanded(!isRedeemedExpanded);
  };

  const availablePerks = sortPerks(validPerks.filter(p => p.status === 'available' || p.status === 'partially_redeemed'));
  const redeemedPerks = validPerks.filter(p => p.status === 'redeemed');
  const allPerksRedeemed = availablePerks.length === 0 && redeemedPerks.length > 0;

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
          renewalDate={card.renewalDate || renewalDate}
          onRenewalDatePress={onRenewalDatePress}
        />

        {isExpanded && (
          <Reanimated.View 
            style={styles.perksListContainer} 
            layout={Layout.springify().duration(300)}
          >
            <View style={styles.perksGroupContainer}>
              {availablePerks.length > 0 && (
                <>
                  <Text style={styles.sectionLabel}>Available Perks</Text>
                  {availablePerks.map((p, index) => renderPerkRow(p, true, index === 0))}
                </>
              )}
              {redeemedPerks.length > 0 && (
                <>
                  {allPerksRedeemed && (
                    <View style={styles.allRedeemedInfo}>
                      <Ionicons name="checkmark-circle" size={20} color="#34C759" />
                      <Text style={styles.allRedeemedText}>
                        You&apos;ve redeemed all available perks for this card.
                      </Text>
                    </View>
                  )}
                  <View style={styles.redeemedSection}>
                    {allPerksRedeemed ? (
                      // When all perks are redeemed, show without accordion
                      <>
                        <Text style={styles.sectionLabel}>Redeemed ({redeemedPerks.length})</Text>
                        {redeemedPerks.map(p => renderPerkRow(p, false))}
                      </>
                    ) : (
                      // When there are both available and redeemed perks, keep the accordion
                      <>
                        <TouchableOpacity
                          style={styles.sectionHeader}
                          onPress={handleRedeemedExpand}
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
                    )}
                  </View>
                </>
              )}
            </View>
          </Reanimated.View>
        )}
      </Reanimated.View>

      {/* Tap Onboarding Overlay */}
      <OnboardingOverlay
        visible={isExpanded && isOnboardingFlagsReady && !hasSeenTapOnboarding && !!firstPerkLayout}
        onDismiss={handleDismissTapOnboarding}
        highlightedElementLayout={firstPerkLayout || undefined}
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
      prevProps.sortIndex !== nextProps.sortIndex ||
      prevProps.onRenewalDatePress !== nextProps.onRenewalDatePress ||
      String(prevProps.renewalDate) !== String(nextProps.renewalDate)) {
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
    marginVertical: 8,
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.06)',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1C1C1E',
    marginTop: 8,
    marginBottom: 12,
    paddingHorizontal: 4,
    letterSpacing: -0.2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingRight: 4,
  },
  activeCard: {
    transform: [{ scale: 1.005 }],
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  perksListContainer: {
    paddingHorizontal: 0,
    paddingBottom: 12,
    backgroundColor: '#FAFAFA',
  },
  perksGroupContainer: {
    backgroundColor: '#FAFAFA',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    padding: 16,
    overflow: 'hidden',
  },
  leftAction: {
    backgroundColor: systemGreen,
    width: 120, // Fixed width to match swipe limit
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    // Match PerkRow minHeight (72px) + margins (8px) = 80px minimum
    minHeight: 80, // Flexible height to match PerkRow content + margins
    marginVertical: 0, // No additional margins - align with PerkRow's outer container
    marginRight: 0, // No overlap - perfect edge alignment
    // iOS Messages style: only round the exposed LEFT edge
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
    // RIGHT edge completely square for seamless connection
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
    // Layer behind the PerkRow with enhanced shadows
    zIndex: 1,
    ...Platform.select({
      ios: {
        shadowColor: systemGreen,
        shadowOffset: { width: -2, height: 0 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  rightAction: {
    backgroundColor: '#007aff', // Keep iOS blue for consistency
    width: 120, // Fixed width to match swipe limit
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    // Match PerkRow minHeight (72px) + margins (8px) = 80px minimum
    minHeight: 80, // Flexible height to match PerkRow content + margins
    marginVertical: 0, // No additional margins - align with PerkRow's outer container
    marginLeft: 0, // No overlap - perfect edge alignment
    // iOS Messages style: only round the exposed RIGHT edge
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
    // LEFT edge completely square for seamless connection
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
    // Layer behind the PerkRow with enhanced shadows
    zIndex: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#007aff',
        shadowOffset: { width: 2, height: 0 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  actionText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
    marginLeft: 6, // Reduced margin for centered layout
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
    backgroundColor: '#F7F7F7',
    borderBottomWidth: 0,
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
  allRedeemedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(52, 199, 89, 0.08)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(52, 199, 89, 0.15)',
  },
  allRedeemedText: {
    fontSize: 14,
    color: '#1C1C1E',
    marginLeft: 10,
    flex: 1,
    fontWeight: '500',
    letterSpacing: -0.1,
  },
  redeemedSection: {
    marginTop: 8,
  },
}); 