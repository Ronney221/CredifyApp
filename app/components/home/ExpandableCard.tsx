import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Platform,
  Alert,
} from 'react-native';
import Reanimated, { Layout, FadeIn, FadeOut, useAnimatedStyle, withTiming, SharedValue } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-root-toast';
import { Swipeable } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { Card, CardPerk, openPerkTarget } from '../../../src/data/card-data';
import { useAuth } from '../../hooks/useAuth';
import { trackPerkRedemption, getCurrentMonthRedemptions, deletePerkRedemption, supabase } from '../../../lib/database';

export interface ExpandableCardProps {
  card: Card;
  perks: CardPerk[];
  cumulativeSavedValue: number;
  onTapPerk: (cardId: string, perkId: string, perk: CardPerk) => Promise<void>;
  onLongPressPerk: (cardId: string, perk: CardPerk) => void;
  onExpandChange?: (cardId: string, isExpanded: boolean) => void;
  onPerkStatusChange?: () => void;
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
  onLongPressPerk,
  onExpandChange,
  onPerkStatusChange,
  isActive,
  sortIndex,
}: ExpandableCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [redeemedPerkIds, setRedeemedPerkIds] = useState<Set<string>>(new Set());
  const [interactedPerkIdsThisSession, setInteractedPerkIdsThisSession] = useState<Set<string>>(new Set());
  const { user } = useAuth();
  const swipeableRefs = useRef<Record<string, Swipeable | null>>({});
  
  // When card becomes active (e.g. from action hint pill), ensure it expands
  useEffect(() => {
    if (isActive && !isExpanded) {
      setIsExpanded(true);
      onExpandChange?.(card.id, true);
    }
    // We don't want to collapse it if isActive becomes false, 
    // as it might be active but user manually collapsed it, or another card became active.
    // Expansion is user-driven or driven by becoming the single active card.
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
    const redeemed = monthlyPerks.filter(p => redeemedPerkIds.has(p.id)).length;
    return { total, redeemed };
  }, [perks, redeemedPerkIds]);

  console.log(`========= ExpandableCard ${card.name} - Props & State =========`);
  console.log('Props:', {
    cardId: card.id,
    cumulativeSavedValue,
    numberOfPerks: perks.length,
    isActive,
    sortIndex
  });
  
  const loadRedeemedPerks = async () => {
    if (!user) return;
    
    try {
      console.log(`\nLoading redeemed perks for ${card.name}...`);
      
      // First get perk definitions to map names to IDs
      const { data: perkDefs } = await supabase
        .from('perk_definitions')
        .select('id, name, value');

      if (!perkDefs) {
        console.log('No perk definitions found');
        return;
      }

      console.log('Perk definitions loaded:', {
        count: perkDefs.length,
        perks: perkDefs.map(p => ({ name: p.name, value: p.value }))
      });

      // Create a map of perk names to their database IDs and values
      const perkNameToDetails = new Map(
        perkDefs.map((p: { name: string; id: string; value: number }) => [
          p.name, 
          { id: p.id, value: p.value }
        ])
      );
      
      // Get current month's redemptions
      const { data: monthlyData, error } = await getCurrentMonthRedemptions(user.id);
      if (error) {
        console.error('Error fetching redemptions:', error);
        return;
      }

      console.log('Monthly redemptions loaded:', {
        total: monthlyData?.length || 0,
        redemptions: monthlyData?.map(r => ({
          perkId: r.perk_id,
          value: r.value_redeemed
        }))
      });

      // Create a set of redeemed perk IDs
      const redeemedIds = new Set(monthlyData?.map(redemption => redemption.perk_id) || []);
      
      // Map our local perk IDs to database IDs and check if they're redeemed
      const redeemedLocalIds = new Set(
        perks
          .filter(perk => {
            const dbPerkDetails = perkNameToDetails.get(perk.name);
            return dbPerkDetails && redeemedIds.has(dbPerkDetails.id);
          })
          .map(perk => perk.id)
      );

      console.log(`${card.name} redemption status:`, {
        redeemedLocalIds: Array.from(redeemedLocalIds),
        redeemedPerks: perks
          .filter(p => redeemedLocalIds.has(p.id))
          .map(p => ({ id: p.id, name: p.name, value: p.value }))
      });

      setRedeemedPerkIds(redeemedLocalIds);
    } catch (error) {
      console.error('Error loading redeemed perks:', error);
    }
  };
  
  // Load redeemed perks from database
  useEffect(() => {
    console.log(`${card.name} useEffect triggered - Loading redeemed perks`);
    loadRedeemedPerks();
  }, [user, card.id]);

  // Only count monthly perks for the unredeemed count
  const unredeemedPerks = perks.filter(p => {
    const isMonthly = p.periodMonths === 1;
    const isRedeemed = redeemedPerkIds.has(p.id);
    return isMonthly && !isRedeemed;
  });

  console.log(`${card.name} status:`, {
    unredeemedPerks: unredeemedPerks.length,
    totalPerks: perks.length,
    redeemedPerkIds: Array.from(redeemedPerkIds),
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

  const handlePerkTap = async (perk: CardPerk) => {
    if (!user) return;
    Object.values(swipeableRefs.current).forEach(ref => {
      if (swipeableRefs.current[perk.id] !== ref) {
        ref?.close();
      }
    });
    try {
      await openPerkTarget(perk);
    } catch (error) {
      console.error('Error opening perk target:', error);
      Alert.alert('Error', 'Could not open the link for this perk.');
    }
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

    const isCurrentlyRedeemedInState = redeemedPerkIds.has(perk.id);

    if ((action === 'redeemed' && isCurrentlyRedeemedInState) || (action === 'available' && !isCurrentlyRedeemedInState)) {
        console.log(`[ExpandableCard] Perk ${perk.name} is already in the desired state of '${action}' according to local UI.`);
    }

    console.log(`[ExpandableCard] Proceeding with ${action} for ${perk.name}`);

    try {
      if (action === 'redeemed') {
        console.log(`[ExpandableCard] Attempting to trackPerkRedemption for ${perk.name}`);
        const { error } = await trackPerkRedemption(user.id, card.id, perk, perk.value);
        console.log(`[ExpandableCard] trackPerkRedemption result for ${perk.name}:`, error ? error : 'success');
        if (error) {
          if (typeof error === 'object' && error !== null && 'message' in error && (error as any).message === 'Perk already redeemed this period') {
            Alert.alert('Already Redeemed', 'This perk has already been redeemed this month.');
          } else {
            console.error('Error tracking redemption:', error);
            Alert.alert('Error', 'Failed to mark perk as redeemed.');
          }
          return;
        }
      } else {
        console.log(`[ExpandableCard] Attempting to deletePerkRedemption for ${perk.name}`);
        const { error } = await deletePerkRedemption(user.id, perk.definition_id);
        console.log(`[ExpandableCard] deletePerkRedemption result for ${perk.name}:`, error ? error : 'success');
        if (error) {
          console.error('Error deleting redemption:', error);
          Alert.alert('Error', 'Failed to mark perk as available.');
          return;
        }
      }

      await loadRedeemedPerks();
      onPerkStatusChange?.();

      showToast(
        `${perk.name} marked as ${action}`,
        async () => {
          console.log(`[ExpandableCard] Undoing action for ${perk.name}. New action: ${action === 'redeemed' ? 'available' : 'redeemed'}`);
          const undoAction = action === 'redeemed' ? 'available' : 'redeemed';
          
          // Revert optimistic update for undo
          setRedeemedPerkIds(prev => {
            const newSet = new Set(prev);
            if (undoAction === 'redeemed') newSet.add(perk.id);
            else newSet.delete(perk.id);
            return newSet;
          });

          let undoDbError = null;
          if (undoAction === 'redeemed') {
            const { error } = await trackPerkRedemption(user.id, card.id, perk, perk.value);
            undoDbError = error;
          } else {
            const { error } = await deletePerkRedemption(user.id, perk.definition_id);
            undoDbError = error;
          }

          if (undoDbError) {
            console.error(`[ExpandableCard] Error undoing ${action} for ${perk.name}:`, undoDbError);
             setRedeemedPerkIds(prev => {
              const newSet = new Set(prev);
              if (undoAction === 'redeemed') newSet.delete(perk.id); 
              else newSet.add(perk.id); 
              return newSet;
            });
            showToast(`Error undoing action for ${perk.name}.`);
          } else {
            // Correct: onLongPressPerk should NOT be here.
          }
          await loadRedeemedPerks();
          onPerkStatusChange?.(); 
        }
      );

    } catch (error) {
      console.error(`Error executing perk action (${action}):`, error);
      Alert.alert('Error', 'An unexpected error occurred.');
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
    const isRedeemed = redeemedPerkIds.has(perk.id);
    const showSwipeHint = perk.periodMonths === 1 && !interactedPerkIdsThisSession.has(perk.id);
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
            onPress={() => handlePerkTap(perk)}
            onLongPress={() => onLongPressPerk(card.id, perk)}
          >
            <View style={[styles.perkContainer, isRedeemed && styles.perkContainerRedeemed]}>
              {showSwipeHint && (
                <View style={styles.swipeHintContainer}>
                  <Ionicons name="chevron-back-outline" size={16} color="#888888" />
                  <Text style={styles.swipeHintText}>Swipe</Text>
                </View>
              )}
              <View style={styles.perkIconContainer}>
                <Ionicons 
                  name={isRedeemed ? 'checkmark-circle-outline' : 'pricetag-outline'}
                  size={26} 
                  color={isRedeemed ? '#8E8E93' : '#007AFF'}
                />
              </View>
              <View style={styles.perkTextContainer}>
                <Text style={[styles.perkName, isRedeemed && styles.perkNameRedeemed]}>
                  {perk.name}
                </Text>
                <Text style={[styles.perkDescription, isRedeemed && styles.perkDescriptionRedeemed]}>
                  {isRedeemed ? 'Used this month' : perk.description}
                </Text>
              </View>
              <View style={styles.perkValueContainer}>
                <Text style={[styles.perkValue, isRedeemed && styles.perkValueRedeemed]}>
                  {formattedValue}
                </Text>
              </View>
              <Ionicons 
                name="chevron-forward" 
                size={20} 
                color={isRedeemed ? '#C7C7CC' : '#B0B0B0'} 
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
          {perks.filter(p => !redeemedPerkIds.has(p.id)).length > 0 && (
            <>
              <Text style={styles.sectionLabel}>Available Perks</Text>
              {perks.filter(p => !redeemedPerkIds.has(p.id)).map(renderPerk)}
            </>
          )}
          {Array.from(redeemedPerkIds).length > 0 && (
            <>
              <Text style={styles.sectionLabel}>Redeemed Perks</Text>
              {perks.filter(p => redeemedPerkIds.has(p.id)).map(renderPerk)}
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
}); 