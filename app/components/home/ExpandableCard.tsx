import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Platform,
  Animated,
  Alert,
} from 'react-native';
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
  onLongPressPerk: (cardId: string, perkId: string, intendedNewStatus: 'available' | 'redeemed') => void;
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
  const [animation] = useState(new Animated.Value(0));
  const [redeemedPerkIds, setRedeemedPerkIds] = useState<Set<string>>(new Set());
  const { user } = useAuth();
  const swipeableRefs = useRef<Record<string, Swipeable | null>>({});
  
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

  // Handle position animation when sort index changes
  useEffect(() => {
    Animated.spring(animation, {
      toValue: 1,
      useNativeDriver: true,
      tension: 50,
      friction: 7,
    }).start();
    return () => animation.setValue(0);
  }, [sortIndex]);

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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // Optimistically close the swipeable row
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
      onLongPressPerk(card.id, perk.id, action);
      onPerkStatusChange?.();

      showToast(
        `${perk.name} marked as ${action}`,
        async () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          const undoAction = action === 'redeemed' ? 'available' : 'redeemed';
          if (undoAction === 'available') {
            const { error: undoError } = await deletePerkRedemption(user.id, perk.definition_id);
            if (undoError) {
                Alert.alert('Error', 'Failed to undo action.');
                return;
            }
          } else {
            const { error: undoError } = await trackPerkRedemption(user.id, card.id, perk, perk.value);
            if (undoError) {
                Alert.alert('Error', 'Failed to undo action.');
                return;
            }
          }
          await loadRedeemedPerks();
          onLongPressPerk(card.id, perk.id, undoAction);
          onPerkStatusChange?.();
          showToast(`${perk.name} marked as ${undoAction}`);
        }
      );

    } catch (error) {
      console.error(`Error executing perk action (${action}):`, error);
      Alert.alert('Error', 'An unexpected error occurred.');
    }
  };

  const translateY = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [50, 0],
  });

  const scale = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [0.95, 1],
  });

  const renderLeftActions = (progress: Animated.AnimatedInterpolation<number>, dragX: Animated.AnimatedInterpolation<number>, perk: CardPerk) => {
    return (
      <TouchableOpacity
        style={styles.leftAction}
      >
        <View style={styles.actionContentView}> 
          <Ionicons name="checkmark-circle-outline" size={24} color="#fff" />
          <Text style={styles.actionText}>Redeem</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderRightActions = (progress: Animated.AnimatedInterpolation<number>, dragX: Animated.AnimatedInterpolation<number>, perk: CardPerk) => {
    return (
      <TouchableOpacity
        style={styles.rightAction}
      >
        <View style={styles.actionContentView}> 
          <Ionicons name="refresh-circle-outline" size={24} color="#fff" />
          <Text style={styles.actionText}>Available</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderPerk = (perk: CardPerk) => {
    const isRedeemed = redeemedPerkIds.has(perk.id);
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
      <Swipeable
        key={perk.id}
        ref={(ref) => { swipeableRefs.current[perk.id] = ref; }}
        renderLeftActions={(progress, dragX) => renderLeftActions(progress, dragX, perk)}
        renderRightActions={(progress, dragX) => renderRightActions(progress, dragX, perk)}
        onSwipeableWillOpen={(direction) => {
          console.log(`[ExpandableCard] onSwipeableWillOpen: direction=${direction} for ${perk.name}`);
          Object.values(swipeableRefs.current).forEach(swipeRef => {
            if (swipeRef && swipeRef !== swipeableRefs.current[perk.id]) {
              swipeRef.close();
            }
          });
          
          if (direction === 'left') {
            console.log(`[ExpandableCard] Triggering REDEEM from swipe for ${perk.name}`);
            executePerkAction(perk, 'redeemed');
          } else if (direction === 'right') {
            console.log(`[ExpandableCard] Triggering AVAILABLE from swipe for ${perk.name}`);
            executePerkAction(perk, 'available');
          }
        }}
        friction={2}
        leftThreshold={80}
        rightThreshold={80}
        activeOffsetX={[-10, 10]}
        activeOffsetY={[-5, 5]}
      >
        <TouchableOpacity
          style={[
            styles.perkItem,
            isRedeemed && styles.redeemedPerk,
            !isRedeemed && styles.availablePerk,
          ]}
          onPress={() => handlePerkTap(perk)}
        >
          <View style={styles.perkContent}>
            <View style={styles.perkMainInfo}>
              <View style={styles.perkNameContainer}>
                <Text style={[styles.perkName, isRedeemed && styles.redeemedText]}>
                  {perk.name}
                </Text>
                {isRedeemed ? (
                  <View style={styles.redeemedBadge}>
                    <Ionicons name="checkmark-circle" size={14} color="#fff" />
                    <Text style={styles.redeemedBadgeText}>Redeemed</Text>
                  </View>
                ) : (
                  <View style={styles.availableBadge}>
                    <Ionicons name="time-outline" size={14} color="#1976d2" />
                    <Text style={styles.availableBadgeText}>Available</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.perkValue, isRedeemed && styles.redeemedText]}>
                {formattedValue}
              </Text>
            </View>
            <Text style={[styles.perkPeriod, isRedeemed && styles.redeemedText]}>
              {periodText} • {perk.resetType === 'calendar' ? 'Calendar Reset' : 'Anniversary Reset'}
            </Text>
          </View>
        </TouchableOpacity>
      </Swipeable>
    );
  };

  return (
    <Animated.View
      style={[
        styles.cardContainer,
        isFullyRedeemed && styles.fullyRedeemedCard,
        isActive && styles.activeCard,
        {
          transform: [{ translateY }, { scale }],
          zIndex: isActive ? 2 : 1,
        },
      ]}
    >
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
        <View style={styles.perksContainer}>
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
        </View>
      )}
    </Animated.View>
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
  perksContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  leftAction: {
    backgroundColor: '#34c759',
    flex: 1,
    borderRadius: 12,
    marginVertical: 4,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  rightAction: {
    backgroundColor: '#007aff',
    flex: 1,
    borderRadius: 12,
    marginVertical: 4,
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  actionText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
    marginLeft: 8,
    opacity: 0,
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
}); 