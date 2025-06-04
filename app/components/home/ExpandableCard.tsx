import React, { useState, useRef, useMemo } from 'react';
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
} from 'react-native';
import Reanimated, { Layout, FadeIn, FadeOut, useAnimatedStyle, withTiming, SharedValue } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-root-toast';
import { Swipeable } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { Card, CardPerk, openPerkTarget } from '../../../src/data/card-data';
import { useAuth } from '../../hooks/useAuth';
import { useAutoRedemptions } from '../../hooks/useAutoRedemptions';
import { trackPerkRedemption, getCurrentMonthRedemptions, deletePerkRedemption, supabase, setAutoRedemption, debugAutoRedemptions } from '../../../lib/database';
import { useRouter } from 'expo-router';

export interface ExpandableCardProps {
  card: Card;
  perks: CardPerk[];
  cumulativeSavedValue: number;
  onTapPerk: (cardId: string, perkId: string, perk: CardPerk) => Promise<void>;
  onExpandChange?: (cardId: string, isExpanded: boolean) => void;
  onPerkStatusChange?: () => void;
  setPerkStatus?: (cardId: string, perkId: string, status: 'available' | 'redeemed') => void;
  isActive?: boolean;
  sortIndex: number;
}

const showToast = (message: string, onUndo?: () => void) => {
  const toastMessage = onUndo 
    ? `${message}\nTap to undo`
    : message;

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

export default function ExpandableCard({
  card,
  perks,
  cumulativeSavedValue,
  onTapPerk,
  onExpandChange,
  onPerkStatusChange,
  setPerkStatus,
  isActive,
  sortIndex,
}: ExpandableCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [interactedPerkIdsThisSession, setInteractedPerkIdsThisSession] = useState<Set<string>>(new Set());
  const { user } = useAuth();
  const { getAutoRedemptionByPerkName, refreshAutoRedemptions } = useAutoRedemptions();
  const swipeableRefs = useRef<Record<string, Swipeable | null>>({});
  const router = useRouter();
  
  // Log incoming perks prop
  console.log(`[ExpandableCard] Received props for ${card.name} (${card.id}):`, {
    isActiveProp: isActive,
    perks: perks.map(p => ({ name: p.name, id: p.id, status: p.status, periodMonths: p.periodMonths, definition_id: p.definition_id }))
  });
  
  // When card becomes active (e.g. from action hint pill), ensure it expands
  React.useEffect(() => {
    if (isActive && !isExpanded) {
      setIsExpanded(true);
      onExpandChange?.(card.id, true);
    }
  }, [isActive, isExpanded, card.id, onExpandChange]);

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

  // Calculate monthly perk progress for this card
  const monthlyPerkStats = useMemo(() => {
    const monthlyPerks = perks.filter(p => p.periodMonths === 1);
    const total = monthlyPerks.length;
    const redeemed = monthlyPerks.filter(p => p.status === 'redeemed').length;
    return { total, redeemed };
  }, [perks]);

  console.log(`========= ExpandableCard ${card.name} - Props & State =========`);
  console.log('Props:', {
    cardId: card.id,
    cumulativeSavedValue,
    numberOfPerks: perks.length,
    isActive,
    sortIndex
  });
  
  // Corrected: Count all types of unredeemed perks
  const unredeemedPerks = perks.filter(p => p.status === 'available');

  console.log(`${card.name} status (LOG POINT EC-1):`, {
    unredeemedPerksCount: unredeemedPerks.length,
    totalPerksCount: perks.length,
    perksDetails: perks.map(p => ({ id: p.id, name: p.name, status: p.status, periodMonths: p.periodMonths })),
    cumulativeSavedValue
  });
  
  const hasUnredeemedPerks = unredeemedPerks.length > 0;
  const isFullyRedeemed = !hasUnredeemedPerks;

  const handleExpand = () => {
    const newExpandedState = !isExpanded;
    setIsExpanded(newExpandedState);
    onExpandChange?.(card.id, newExpandedState);
    Object.values(swipeableRefs.current).forEach(ref => ref?.close());
  };

  const executePerkAction = async (perk: CardPerk, action: 'redeemed' | 'available') => {
    console.log(`[ExpandableCard] executePerkAction called for ${perk.name}, action: ${action}`);
    if (!user) {
      console.log('[ExpandableCard] executePerkAction: No user, returning.');
      return;
    }
    setInteractedPerkIdsThisSession(prev => new Set(prev).add(perk.id));

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    swipeableRefs.current[perk.id]?.close();

    const isCurrentlyRedeemed = perk.status === 'redeemed';

    console.log(`[ExpandableCard] Perk status check:`, {
      perkName: perk.name,
      currentStatus: perk.status,
      isCurrentlyRedeemed,
      requestedAction: action,
      shouldProceed: !((action === 'redeemed' && isCurrentlyRedeemed) || (action === 'available' && !isCurrentlyRedeemed))
    });

    if ((action === 'redeemed' && isCurrentlyRedeemed) || (action === 'available' && !isCurrentlyRedeemed)) {
        console.log(`[ExpandableCard] Perk ${perk.name} is already in the desired state of '${action}' according to global state.`);
        return;
    }

    // Optimistic UI update - immediate feedback
    console.log(`[ExpandableCard] Calling setPerkStatus with:`, { cardId: card.id, perkId: perk.id, action });
    setPerkStatus?.(card.id, perk.id, action);
    onPerkStatusChange?.();

    if (action === 'redeemed') {
      console.log(`[ExpandableCard] Proceeding with redeemed for ${perk.name}`);
      try {
        const result = await trackPerkRedemption(user.id, card.id, perk, perk.value);
        console.log(`[ExpandableCard] trackPerkRedemption result for ${perk.name}:`, result.error ? result.error : 'success');
        
        if (result.error) {
          // Revert optimistic update on error
          setPerkStatus?.(card.id, perk.id, 'available');
          onPerkStatusChange?.();
          
          if (typeof result.error === 'object' && result.error !== null && 'message' in result.error && (result.error as any).message === 'Perk already redeemed this period') {
            Alert.alert('Already Redeemed', 'This perk has already been redeemed this month.');
          } else {
            Alert.alert('Error', 'Failed to track perk redemption.');
          }
          return;
        }
        
        showToast(
          `${perk.name} marked as redeemed`,
          async () => {
            try {
              // Optimistic undo
              setPerkStatus?.(card.id, perk.id, 'available');
              onPerkStatusChange?.();
              
              const { error: undoError } = await deletePerkRedemption(user.id, perk.definition_id);
              if (undoError) {
                // Revert undo if database fails
                setPerkStatus?.(card.id, perk.id, 'redeemed');
                onPerkStatusChange?.();
                console.error('Error undoing redemption:', undoError);
                showToast('Error undoing redemption');
              }
            } catch (error) {
              // Revert undo if unexpected error
              setPerkStatus?.(card.id, perk.id, 'redeemed');
              onPerkStatusChange?.();
              console.error('Error undoing redemption:', error);
              showToast('Error undoing redemption');
            }
          }
        );
      } catch (error) {
        // Revert optimistic update on error
        setPerkStatus?.(card.id, perk.id, 'available');
        onPerkStatusChange?.();
        console.error('Error tracking redemption:', error);
        Alert.alert('Error', 'Failed to track perk redemption.');
      }
    } else {
      console.log(`[ExpandableCard] Proceeding with available for ${perk.name}`);
      console.log(`[ExpandableCard] Perk details for available action:`, {
        perkId: perk.id,
        perkName: perk.name,
        definition_id: perk.definition_id,
        userId: user.id,
        cardId: card.id
      });
      
      try {
        console.log(`[ExpandableCard] Calling deletePerkRedemption with userId: ${user.id}, definition_id: ${perk.definition_id}`);
        const { error } = await deletePerkRedemption(user.id, perk.definition_id);
        console.log(`[ExpandableCard] deletePerkRedemption result:`, error ? { error } : 'success');
        
        if (error) {
          // Revert optimistic update on error
          console.error(`[ExpandableCard] Error deleting redemption for ${perk.name}:`, error);
          setPerkStatus?.(card.id, perk.id, 'redeemed');
          onPerkStatusChange?.();
          Alert.alert('Error', 'Failed to undo perk redemption.');
          return;
        }
        
        console.log(`[ExpandableCard] Successfully marked ${perk.name} as available`);
        showToast(`${perk.name} marked as available`);
      } catch (error) {
        // Revert optimistic update on error
        console.error(`[ExpandableCard] Unexpected error deleting redemption for ${perk.name}:`, error);
        setPerkStatus?.(card.id, perk.id, 'redeemed');
        onPerkStatusChange?.();
        Alert.alert('Error', 'Failed to undo perk redemption.');
      }
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
            
            const { error } = await setAutoRedemption(user.id, cardId, perk, false);
            if (error) {
              console.error(`[ExpandableCard] Failed to disable auto-redemption for ${perk.name}:`, error);
              Alert.alert('Error', `Failed to disable auto-redemption: ${error instanceof Error ? error.message : 'Unknown error'}`);
            } else {
              console.log(`[ExpandableCard] Successfully cancelled auto-redemption for ${perk.name}`);
              
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
                    // First set auto-redemption
                    const { error: autoError } = await setAutoRedemption(user.id, cardId, perk, true);
                    if (autoError) {
                      Alert.alert('Error', 'Failed to enable auto-redemption.');
                      return;
                    }

                    // Then mark as redeemed for current month
                    const { error: redeemError } = await trackPerkRedemption(user.id, cardId, perk, perk.value);
                    if (redeemError) {
                      console.log('Note: Auto-redemption set but current month redemption may already exist');
                    }

                    // Refresh all relevant data
                    await refreshAutoRedemptions();
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

  const renderLeftActions = (progress: SharedValue<number>, dragX: SharedValue<number>, perk: CardPerk) => {
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

  const renderRightActions = (progress: SharedValue<number>, dragX: SharedValue<number>, perk: CardPerk) => {
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

  const renderPerk = (perk: CardPerk) => {
    const isRedeemed = perk.status === 'redeemed';
    const isAutoRedeemed = perk.periodMonths === 1 && getAutoRedemptionByPerkName(perk.name);
    const showSwipeHint = perk.periodMonths === 1 && !interactedPerkIdsThisSession.has(perk.id) && !isAutoRedeemed;
    const formattedValue = perk.value.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
    });

    // Format period text
    let periodText = '';
    switch (perk.periodMonths) {
      case 1:
        periodText = 'Monthly';
        break;
      case 3:
        periodText = 'Quarterly';
        break;
      case 6:
        periodText = 'Semi-Annual';
        break;
      case 12:
        periodText = 'Annual';
        break;
      default:
        periodText = `Every ${perk.periodMonths} months`;
    }

    // Determine container style based on status
    let containerStyle: any = styles.perkContainer;
    if (isRedeemed && isAutoRedeemed) {
      containerStyle = [styles.perkContainer, styles.perkContainerAutoRedeemed];
    } else if (isRedeemed) {
      containerStyle = [styles.perkContainer, styles.perkContainerRedeemed];
    }

    return (
      <Reanimated.View
        key={perk.id}
        style={styles.perkContainerOuter}
        layout={Layout.springify()}
        entering={FadeIn.duration(200)}
        exiting={FadeOut.duration(100)}
      >
        <Swipeable
          ref={instance => { swipeableRefs.current[perk.id] = instance; }}
          renderLeftActions={(progress, dragX) => renderLeftActions(progress as any, dragX as any, perk)}
          renderRightActions={(progress, dragX) => renderRightActions(progress as any, dragX as any, perk)}
          leftThreshold={40}
          rightThreshold={40}
          onSwipeableOpen={(direction) => {
            Object.entries(swipeableRefs.current).forEach(([id, swipeableRef]) => {
              if (id !== perk.id && swipeableRef) {
                swipeableRef.close();
              }
            });
          }}
          onSwipeableLeftOpen={() => {
            // Left open = swipe right completed = Mark as Redeemed
            executePerkAction(perk, 'redeemed');
          }}
          onSwipeableRightOpen={() => {
            // Right open = swipe left completed = Mark as Available  
            executePerkAction(perk, 'available');
          }}
          onSwipeableWillOpen={(direction) => {
            if (direction === 'left') {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
             else if (direction === 'right') {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            }
          }}
          friction={1.5}
          overshootFriction={8}
        >
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => onTapPerk(card.id, perk.id, perk)}
            onLongPress={() => handleLongPressPerk(card.id, perk)}
          >
            <View style={containerStyle}>
              {showSwipeHint && (
                <View style={styles.swipeHintContainer}>
                  <Ionicons name="chevron-back-outline" size={16} color="#888888" />
                  <Text style={styles.swipeHintText}>Swipe</Text>
                </View>
              )}
              <View style={styles.perkIconContainer}>
                <Ionicons 
                  name={isRedeemed ? (isAutoRedeemed ? 'sync-circle' : 'checkmark-circle-outline') : isAutoRedeemed ? 'sync-circle-outline' : 'pricetag-outline'}
                  size={26} 
                  color={isRedeemed ? (isAutoRedeemed ? '#FF9500' : '#8E8E93') : isAutoRedeemed ? '#FF9500' : '#007AFF'}
                />
              </View>
              <View style={styles.perkTextContainer}>
                <Text style={[
                  styles.perkName, 
                  isRedeemed && !isAutoRedeemed && styles.perkNameRedeemed,
                  isRedeemed && isAutoRedeemed && styles.perkNameAutoRedeemed
                ]}>
                  {perk.name}
                </Text>
                <Text style={[
                  styles.perkDescription, 
                  isRedeemed && !isAutoRedeemed && styles.perkDescriptionRedeemed,
                  isRedeemed && isAutoRedeemed && styles.perkDescriptionAutoRedeemed
                ]}>
                  {isRedeemed ? (isAutoRedeemed ? 'Auto-redeemed monthly' : 'Used this month') : isAutoRedeemed ? 'Auto-redeemed monthly' : perk.description}
                </Text>
              </View>
              <View style={styles.perkValueContainer}>
                <Text style={[
                  styles.perkValue, 
                  isRedeemed && !isAutoRedeemed && styles.perkValueRedeemed,
                  isRedeemed && isAutoRedeemed && styles.perkValueAutoRedeemed
                ]}>
                  {formattedValue}
                </Text>
              </View>
              <Ionicons 
                name="chevron-forward" 
                size={20} 
                color={isRedeemed ? (isAutoRedeemed ? '#CC7A00' : '#C7C7CC') : '#B0B0B0'} 
                style={styles.perkChevron}
              />
            </View>
          </TouchableOpacity>
        </Swipeable>
      </Reanimated.View>
    );
  };

  return (
    <Reanimated.View style={[styles.cardContainer, isActive && styles.activeCard]} layout={Layout.springify().duration(300)}>
      <TouchableOpacity
        style={[styles.cardHeader, isActive && styles.activeCardHeader]}
        onPress={handleExpand}
        activeOpacity={0.7}
      >
        <View style={styles.cardInfo}>
          <View style={[styles.cardImageWrapper, { backgroundColor: cardNetworkColor }]}>
            <Image source={card.image} style={styles.cardImage} />
          </View>
          <View style={styles.cardTextContainer}>
            <Text style={styles.cardName}>{card.name}</Text>
            <View style={styles.cardSubtitle}>
              {isFullyRedeemed ? (
                <Text style={styles.subtitleText}>
                  <Ionicons name="checkmark-circle" size={14} color="#34c759" /> All perks redeemed
                  {cumulativeSavedValue > 0 && (
                    <Text style={styles.subtitleDivider}> • </Text>
                  )}
                  {cumulativeSavedValue > 0 && (
                    <Text style={[styles.subtitleText, styles.savedValueText]}>
                      {cumulativeSavedValue.toLocaleString('en-US', {
                        style: 'currency',
                        currency: 'USD',
                      })} saved
                    </Text>
                  )}
                </Text>
              ) : (
                // Display unredeemed count or saved value first
                <> 
                  {hasUnredeemedPerks && (
                    <Text style={styles.subtitleText}>
                      {unredeemedPerks.length} {unredeemedPerks.length === 1 ? 'perk' : 'perks'} left
                    </Text>
                  )}
                  {cumulativeSavedValue > 0 && hasUnredeemedPerks && (
                     <Text style={styles.subtitleDivider}> • </Text>
                  )}
                  {cumulativeSavedValue > 0 && (
                    <Text style={[styles.subtitleText, styles.savedValueText]}>
                      {cumulativeSavedValue.toLocaleString('en-US', {
                        style: 'currency',
                        currency: 'USD',
                      })} saved
                    </Text>
                  )}
                </>
              )}
            </View>
            {/* Monthly Perk Progress Chip - Placed below subtitle */} 
            {monthlyPerkStats.total > 0 && (
              <View style={styles.progressChipContainer}>
                {[...Array(monthlyPerkStats.total)].map((_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.progressDot,
                      i < monthlyPerkStats.redeemed ? styles.progressDotRedeemed : styles.progressDotAvailable,
                    ]}
                  />
                ))}
                <Text style={styles.progressChipText}>
                  ({monthlyPerkStats.redeemed} of {monthlyPerkStats.total} monthly redeemed)
                </Text>
              </View>
            )}
          </View>
        </View>
        <View style={styles.headerRight}>
          <Ionicons
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={24}
            color="#8e8e93"
          />
        </View>
      </TouchableOpacity>

      {isExpanded && (
        <Reanimated.View 
          style={styles.perksListContainer} 
          layout={Layout.springify().duration(300)}
        >
          {perks.filter(p => p.status === 'available').length > 0 && (
            <>
              <Text style={styles.sectionLabel}>Available Perks</Text>
              {perks.filter(p => p.status === 'available').map(renderPerk)}
            </>
          )}
          {perks.filter(p => p.status === 'redeemed').length > 0 && (
            <>
              <Text style={styles.sectionLabel}>Redeemed Perks</Text>
              {perks.filter(p => p.status === 'redeemed').map(renderPerk)}
            </>
          )}
        </Reanimated.View>
      )}
    </Reanimated.View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: 'rgba(248, 248, 248, 0.7)',
  },
  cardInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cardImageWrapper: {
    width: 48,
    height: 32,
    borderRadius: 4,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  cardImage: {
    width: '90%',
    height: '90%',
    resizeMode: 'contain',
  },
  cardTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  cardName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1c1c1e',
    marginBottom: 2,
  },
  cardSubtitle: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  subtitleText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
    flexShrink: 1,
    marginRight: 4,
  },
  subtitleDivider: {
    color: '#666',
    fontWeight: '400',
  },
  savedValueText: {
    color: '#34c759',
    fontSize: 22,
    fontWeight: '400',
  },
  perkItem: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginVertical: 4,
    padding: 12,
  },
  redeemedPerk: {
    backgroundColor: '#f8faf8',
    borderColor: '#c8e6c9',
  },
  availablePerk: {
    borderColor: '#bbdefb',
    backgroundColor: '#f8fafe',
  },
  perkContent: {
    flex: 1,
  },
  perkMainInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  perkNameContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginRight: 8,
  },
  perkName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1c1c1e',
  },
  perkValue: {
    fontSize: 22,
    fontWeight: '400',
    color: '#1c1c1e',
  },
  redeemedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#34c759',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  redeemedBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '500',
  },
  availableBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  availableBadgeText: {
    color: '#1976d2',
    fontSize: 12,
    fontWeight: '500',
  },
  perkPeriod: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },
  redeemedText: {
    color: '#34c759',
  },
  sectionLabel: {
    fontSize: 17,
    fontWeight: '600',
    color: '#666',
    marginVertical: 8,
    paddingHorizontal: 4,
  },
  fullyRedeemedCard: {
    opacity: 0.9,
  },
  activeCard: {
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  activeCardHeader: {
    backgroundColor: '#f8f9fa',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
    paddingLeft: 8,
    flexShrink: 0,
  },
  perksListContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  leftAction: {
    backgroundColor: '#34c759',
    flex: 1,
    borderRadius: 12,
    marginVertical: 4,
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  rightAction: {
    backgroundColor: '#007aff',
    flex: 1,
    borderRadius: 12,
    marginVertical: 4,
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
    // Existing styles if any, or add new ones if needed
    // backgroundColor: '#FFF', // Example if each perk needs its own bg for swipe animation visibility
  },
  perkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16, // Ensure horizontal padding for hint space if needed
    backgroundColor: '#FFFFFF', // Default background for perk row
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
    position: 'relative', // For absolute positioning of hint if chosen
  },
  perkContainerRedeemed: {
    backgroundColor: '#F7F7F7',
  },
  swipeHintContainer: {
    position: 'absolute',
    right: 12, // Adjust as needed for alignment with chevron-forward or overall padding
    top: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    opacity: 0.7, // As per request
    zIndex: -1, // Ensure it's behind perk content if perk content has its own bg
                 // Or adjust perkContainer padding and place hint inline
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
  perkTextContainer: {
    flex: 1,
    marginRight: 8,
  },
  perkNameRedeemed: {
    color: '#8E8E93',
    textDecorationLine: 'line-through',
  },
  perkDescription: {
    fontSize: 13,
    color: '#6C6C70',
    marginTop: 2,
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
}); 