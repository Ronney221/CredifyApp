//card-header.tsx
import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../../../../src/data/card-data';

interface CardHeaderProps {
  card: Card;
  isExpanded: boolean;
  isActive: boolean;
  isFullyRedeemed: boolean;
  unredeemedPerksCount: number;
  cumulativeSavedValue: number;
  monthlyPerkStats: { total: number; redeemed: number };
  onPress: () => void;
}

const CardHeader: React.FC<CardHeaderProps> = ({
  card,
  isExpanded,
  isActive,
  isFullyRedeemed,
  unredeemedPerksCount,
  cumulativeSavedValue,
  monthlyPerkStats,
  onPress,
}) => {
  const cardNetworkColor = React.useMemo(() => {
    switch (card.network?.toLowerCase()) {
      case 'amex':
      case 'american express':
        if (card.name?.toLowerCase().includes('platinum')) return '#E5E4E2';
        if (card.name?.toLowerCase().includes('gold')) return '#B08D57';
        return '#007bc1';
      case 'chase':
        return '#124A8D';
      default:
        return '#F0F0F0';
    }
  }, [card.network, card.name]);

  // Calculate progress percentage
  const progressPercentage = monthlyPerkStats.total > 0 
    ? (monthlyPerkStats.redeemed / monthlyPerkStats.total) * 100 
    : 0;

  return (
    <TouchableOpacity
      style={[styles.cardHeader, isActive && styles.activeCardHeader]}
      onPress={onPress}
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
                <Ionicons name="checkmark-circle" size={14} color="#34c759" />
                <Text> All perks redeemed</Text>
                {cumulativeSavedValue > 0 && <Text style={styles.subtitleDivider}> • </Text>}
                {cumulativeSavedValue > 0 && (
                  <Text style={[styles.subtitleText, styles.savedValueText]}>
                    {cumulativeSavedValue.toLocaleString('en-US', { style: 'currency', currency: 'USD' })} saved
                  </Text>
                )}
              </Text>
            ) : (
              <>
                {unredeemedPerksCount > 0 && (
                  <Text style={styles.subtitleText}>
                    {unredeemedPerksCount} {unredeemedPerksCount === 1 ? 'perk' : 'perks'} left
                  </Text>
                )}
                {cumulativeSavedValue > 0 && unredeemedPerksCount > 0 && <Text style={styles.subtitleDivider}> • </Text>}
                {cumulativeSavedValue > 0 && (
                  <Text style={[styles.subtitleText, styles.savedValueText]}>
                    {cumulativeSavedValue.toLocaleString('en-US', { style: 'currency', currency: 'USD' })} saved
                  </Text>
                )}
              </>
            )}
          </View>
          
          <View style={styles.progressContainer}>
            <View style={styles.progressBarContainer}>
              <View 
                style={[
                  styles.progressBarFill,
                  { width: `${progressPercentage}%` },
                  progressPercentage >= 100 && styles.progressBarSuccess
                ]} 
              />
            </View>
            <Text style={styles.progressText}>
              {monthlyPerkStats.redeemed} of {monthlyPerkStats.total} monthly perks redeemed
            </Text>
          </View>
        </View>
      </View>
      <View style={styles.headerRight}>
        <Ionicons
          name={isExpanded ? 'chevron-down' : 'chevron-forward'}
          size={24}
          color="#20B2AA"
        />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 8,
    backgroundColor: 'rgba(248, 248, 248, 0.7)',
  },
  activeCardHeader: {
    backgroundColor: '#f8f9fa',
  },
  cardInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cardImageWrapper: {
    width: 60,
    height: 40,
    borderRadius: 6,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  cardImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  cardTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  cardName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  cardSubtitle: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  subtitleText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
    flexShrink: 1,
    marginRight: 4,
  },
  subtitleDivider: {
    color: '#6B7280',
    fontWeight: '400',
  },
  savedValueText: {
    color: '#34c759',
    fontSize: 14, 
    fontWeight: '500',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
    paddingLeft: 8,
    flexShrink: 0,
  },
  progressContainer: {
    marginTop: 8,
  },
  progressBarContainer: {
    height: 4,
    backgroundColor: '#E5E5EA',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#20B2AA',
    borderRadius: 2,
  },
  progressBarSuccess: {
    backgroundColor: '#34C759',
  },
  progressText: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
  },
});

export default React.memo(CardHeader); 