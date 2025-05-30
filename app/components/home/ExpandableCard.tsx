import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
import { Card, CardPerk, openPerkTarget } from '../../../src/data/card-data';
import { useAuth } from '../../hooks/useAuth';
import { trackPerkRedemption, getCurrentMonthRedemptions, deletePerkRedemption, supabase } from '../../../lib/database';
import { Colors } from '../../constants/Colors';

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

interface CardHeaderProps {
  card: Card;
  perks: CardPerk[];
  cumulativeSavedValue: number;
  isExpanded: boolean;
  onPress: () => void;
}

const CardHeader: React.FC<CardHeaderProps> = ({ card, perks, cumulativeSavedValue, isExpanded, onPress }) => {
  const rotateAnim = useRef(new Animated.Value(isExpanded ? 1 : 0)).current;

  React.useEffect(() => {
    Animated.spring(rotateAnim, {
      toValue: isExpanded ? 1 : 0,
      useNativeDriver: true,
    }).start();
  }, [isExpanded]);

  const chevronRotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  // Only count monthly perks for the status
  const monthlyPerks = perks.filter(p => p.periodMonths === 1);
  const availableMonthlyPerks = monthlyPerks.filter(p => p.status === 'available').length;
  
  const statusText = [];
  if (availableMonthlyPerks > 0) {
    statusText.push(`${availableMonthlyPerks} ${availableMonthlyPerks === 1 ? 'perk' : 'perks'} left`);
  }
  if (cumulativeSavedValue > 0) {
    statusText.push(`$${cumulativeSavedValue.toFixed(2)} saved`);
  }

  return (
    <TouchableOpacity 
      style={styles.headerContainer}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.cardInfo}>
        <Image source={card.image} style={styles.cardImage} />
        <View style={styles.cardTextContainer}>
          <Text style={styles.cardName}>{card.name}</Text>
          {statusText.length > 0 && (
            <Text style={styles.cardStatus}>
              {statusText.join(' • ')}
            </Text>
          )}
        </View>
      </View>
      <Animated.View style={[styles.chevron, { transform: [{ rotate: chevronRotation }] }]}>
        <Ionicons 
          name="chevron-down" 
          size={20} 
          color={Colors.light.text} 
          style={styles.chevronIcon}
        />
      </Animated.View>
    </TouchableOpacity>
  );
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
  const { user } = useAuth();

  // Group perks by status and period
  const groupedPerks = useMemo(() => {
    const monthlyPerks = perks.filter(p => p.periodMonths === 1);
    const otherPerks = perks.filter(p => p.periodMonths !== 1);

    return {
      available: {
        monthly: monthlyPerks.filter(p => p.status === 'available'),
        other: otherPerks.filter(p => p.status === 'available')
      },
      redeemed: {
        monthly: monthlyPerks.filter(p => p.status === 'redeemed'),
        other: otherPerks.filter(p => p.status === 'redeemed')
      }
    };
  }, [perks]);

  const hasUnredeemedPerks = groupedPerks.available.monthly.length > 0;
  const isFullyRedeemed = perks.filter(p => p.periodMonths === 1).length > 0 && !hasUnredeemedPerks;

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
          if (typeof error === 'object' && error !== null && 'message' in error && error.message === 'Perk already redeemed this period') {
            Alert.alert('Already Redeemed', 'This perk has already been redeemed this month.');
          } else {
            console.error('Error tracking redemption:', error);
            Alert.alert('Error', 'Failed to mark perk as redeemed. Please try again.');
          }
        } else {
          // Update local state
          await onTapPerk(card.id, perk.id, perk);
          onPerkStatusChange?.(); // Trigger donut refresh

          // Show toast with undo option
          showToast(
            `${perk.name} marked as redeemed`,
            async () => {
              // Handle undo
              const { error: undoError } = await deletePerkRedemption(user.id, perk.name);
              if (!undoError) {
                await onPerkStatusChange?.();
                showToast(`${perk.name} marked as available`);
              }
            }
          );
        }
      }
    } catch (error) {
      console.error('Error handling perk press:', error);
    }
  };

  const handlePerkLongPress = async (perk: CardPerk) => {
    if (!user) return;

    const isCurrentlyRedeemed = groupedPerks.redeemed.monthly.includes(perk) || groupedPerks.redeemed.other.includes(perk);
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
                  return;
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
              await onPerkStatusChange?.(); // Trigger donut refresh

              // Show toast notification
              showToast(
                `${perk.name} ${isCurrentlyRedeemed ? 'marked as available' : 'marked as redeemed'}`,
                !isCurrentlyRedeemed ? async () => {
                  // Only show undo for redemptions
                  const { error: undoError } = await deletePerkRedemption(user.id, perk.name);
                  if (!undoError) {
                    await onPerkStatusChange?.();
                    showToast(`${perk.name} marked as available`);
                  }
                } : undefined
              );
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
    const isRedeemed = groupedPerks.redeemed.monthly.includes(perk) || groupedPerks.redeemed.other.includes(perk);
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
      <CardHeader
        card={card}
        perks={perks}
        cumulativeSavedValue={cumulativeSavedValue}
        isExpanded={isExpanded}
        onPress={handleExpand}
      />

      {isExpanded && (
        <View style={styles.perksContainer}>
          {groupedPerks.available.monthly.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>Available Monthly Perks</Text>
              {groupedPerks.available.monthly.map(renderPerk)}
            </>
          )}
          {groupedPerks.available.other.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>Available Other Perks</Text>
              {groupedPerks.available.other.map(renderPerk)}
            </>
          )}
          {(groupedPerks.redeemed.monthly.length > 0 || groupedPerks.redeemed.other.length > 0) && (
            <>
              <Text style={styles.sectionLabel}>Redeemed Perks</Text>
              {[...groupedPerks.redeemed.monthly, ...groupedPerks.redeemed.other].map(renderPerk)}
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
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: Colors.light.background,
    borderRadius: 16,
  },
  cardInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardImage: {
    width: 56,
    height: 36,
    resizeMode: 'contain',
    marginRight: 12,
  },
  cardTextContainer: {
    flex: 1,
    marginRight: 12,
  },
  cardName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 4,
  },
  cardStatus: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    fontWeight: '500',
  },
  chevron: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 16,
  },
  chevronIcon: {
    marginTop: 2,
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