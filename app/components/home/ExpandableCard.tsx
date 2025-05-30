import React, { useState, useEffect } from 'react';
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
import { Card, CardPerk, openPerkTarget } from '../../../src/data/card-data';
import { useAuth } from '../../hooks/useAuth';
import { trackPerkRedemption, getCurrentMonthRedemptions, deletePerkRedemption, supabase } from '../../../lib/database';

export interface ExpandableCardProps {
  card: Card;
  perks: CardPerk[];
  cumulativeSavedValue: number;
  onTapPerk: (cardId: string, perkId: string, perk: CardPerk) => Promise<void>;
  onLongPressPerk: (cardId: string, perkId: string, perk: CardPerk) => void;
  onExpandChange?: (cardId: string, isExpanded: boolean) => void;
  onPerkStatusChange?: () => void;
  isActive?: boolean;
  sortIndex: number;
}

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
  
  const loadRedeemedPerks = async () => {
    if (!user) return;
    
    try {
      // First get perk definitions to map names to IDs
      const { data: perkDefs } = await supabase
        .from('perk_definitions')
        .select('id, name');

      if (!perkDefs) return;

      // Create a map of perk names to their database IDs
      const perkNameToId = new Map(perkDefs.map((p: { name: string; id: string }) => [p.name, p.id]));
      
      // Get current month's redemptions
      const { data: monthlyData, error } = await getCurrentMonthRedemptions(user.id);
      if (error) {
        console.error('Error fetching redemptions:', error);
        return;
      }

      // Create a set of redeemed perk IDs
      const redeemedIds = new Set(monthlyData?.map(redemption => redemption.perk_id) || []);
      
      // Map our local perk IDs to database IDs and check if they're redeemed
      const redeemedLocalIds = new Set(
        perks
          .filter(perk => {
            const dbPerkId = perkNameToId.get(perk.name);
            return dbPerkId && redeemedIds.has(dbPerkId);
          })
          .map(perk => perk.id)
      );

      console.log('Redeemed perks for card:', card.name, Array.from(redeemedLocalIds));
      setRedeemedPerkIds(redeemedLocalIds);
    } catch (error) {
      console.error('Error loading redeemed perks:', error);
    }
  };
  
  // Load redeemed perks from database
  useEffect(() => {
    loadRedeemedPerks();
  }, [user, card.id]);

  // Only count monthly perks for the unredeemed count
  const unredeemedPerks = perks.filter(p => {
    const isMonthly = p.periodMonths === 1;
    const isRedeemed = redeemedPerkIds.has(p.id);
    return isMonthly && !isRedeemed;
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
  };

  const handlePerkPress = async (perk: CardPerk) => {
    if (!user) return;

    try {
      // First try to open the target app/website
      const opened = await openPerkTarget(perk);
      
      if (opened) {
        // Track the redemption in the database
        const { error } = await trackPerkRedemption(
          user.id,
          card.id,
          perk,
          perk.value
        );

        if (error) {
          console.error('Error tracking redemption:', error);
        } else {
          // Update local state
          await loadRedeemedPerks(); // Refresh redemption state
          await onTapPerk(card.id, perk.id, perk);
          onPerkStatusChange?.(); // Trigger donut refresh
        }
      }
    } catch (error) {
      console.error('Error handling perk press:', error);
    }
  };

  const handlePerkLongPress = async (perk: CardPerk) => {
    if (!user) return;

    const isCurrentlyRedeemed = redeemedPerkIds.has(perk.id);
    const actionText = isCurrentlyRedeemed ? 'mark as available' : 'mark as redeemed';
    const confirmText = isCurrentlyRedeemed 
      ? `Are you sure you want to mark "${perk.name}" as available?`
      : `Are you sure you want to mark "${perk.name}" as redeemed?`;

    Alert.alert(
      `Confirm ${actionText}`,
      confirmText,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              if (!isCurrentlyRedeemed) {
                // If changing to redeemed, track in database
                const { error } = await trackPerkRedemption(
                  user.id,
                  card.id,
                  perk,
                  perk.value
                );

                if (typeof error === 'object' && error !== null && 'message' in error && error.message === 'Perk already redeemed this period') {
                  Alert.alert('Already Redeemed', 'This perk has already been redeemed this month.');
                } else if (error) {
                  console.error('Error tracking redemption:', error);
                  Alert.alert('Error', 'Failed to mark perk as redeemed. Please try again.');
                  return;
                }
              } else {
                // If changing to available, delete from database
                const { error } = await deletePerkRedemption(user.id, perk.name);
                if (error) {
                  console.error('Error deleting redemption:', error);
                  Alert.alert('Error', 'Failed to mark perk as available. Please try again.');
                  return;
                }
              }

              // Update local state
              await loadRedeemedPerks(); // Refresh redemption state
              await onLongPressPerk(card.id, perk.id, perk);
              onPerkStatusChange?.(); // Trigger donut refresh
            } catch (error) {
              console.error('Error handling perk long press:', error);
              Alert.alert('Error', 'An unexpected error occurred. Please try again.');
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const translateY = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [50, 0],
  });

  const scale = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [0.95, 1],
  });

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
      <TouchableOpacity
        key={perk.id}
        style={[
          styles.perkItem,
          isRedeemed && styles.redeemedPerk,
          !isRedeemed && styles.availablePerk,
        ]}
        onPress={() => handlePerkPress(perk)}
        onLongPress={() => handlePerkLongPress(perk)}
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
          <Image source={card.image} style={styles.cardImage} />
          <View style={styles.cardTextContainer}>
            <View style={styles.cardNameContainer}>
              <Text style={styles.cardName}>{card.name}</Text>
              {isFullyRedeemed ? (
                <View style={styles.completedBadge}>
                  <Ionicons name="checkmark-circle" size={14} color="#34c759" />
                  <Text style={styles.completedText}>All Set</Text>
                </View>
              ) : hasUnredeemedPerks && (
                <View style={styles.pendingBadge}>
                  <Text style={styles.pendingText}>
                    {unredeemedPerks.length} pending
                  </Text>
                </View>
              )}
            </View>
            {cumulativeSavedValue > 0 && (
              <Text style={styles.savedValue}>
                {cumulativeSavedValue.toLocaleString('en-US', {
                  style: 'currency',
                  currency: 'USD',
                })} saved
              </Text>
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
  },
  cardInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cardImage: {
    width: 40,
    height: 25,
    resizeMode: 'contain',
    marginRight: 12,
  },
  cardTextContainer: {
    flex: 1,
  },
  cardNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  cardName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1c1c1e',
  },
  savedValue: {
    fontSize: 14,
    color: '#34c759',
    fontWeight: '500',
    marginTop: 4,
  },
  pendingBadge: {
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  pendingText: {
    fontSize: 12,
    color: '#1976d2',
    fontWeight: '500',
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f5e9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  completedText: {
    fontSize: 12,
    color: '#34c759',
    fontWeight: '500',
  },
  perkItem: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginVertical: 4,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
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
    fontSize: 15,
    fontWeight: '600',
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
    fontSize: 13,
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
  },
  perksContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
}); 