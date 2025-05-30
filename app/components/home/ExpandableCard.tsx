import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../../../src/data/card-data';
import { CardPerk } from '../../../app/types';

interface ExpandableCardProps {
  card: Card;
  perks: CardPerk[];
  cumulativeSavedValue: number;
  onTapPerk: (cardId: string, perkId: string, perk: CardPerk) => void;
  onLongPressPerk: (cardId: string, perkId: string, perk: CardPerk) => void;
}

export default function ExpandableCard({
  card,
  perks,
  cumulativeSavedValue,
  onTapPerk,
  onLongPressPerk,
}: ExpandableCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const renderPerk = (perk: CardPerk) => {
    const isRedeemed = perk.status === 'redeemed';

    return (
      <TouchableOpacity
        key={perk.id}
        style={[
          styles.perkItem,
          isRedeemed && styles.redeemedPerk,
        ]}
        onPress={() => onTapPerk(card.id, perk.id, perk)}
        onLongPress={() => onLongPressPerk(card.id, perk.id, perk)}
      >
        <View style={styles.perkContent}>
          <View style={styles.perkMainInfo}>
            <Text style={[
              styles.perkName,
              isRedeemed && styles.redeemedText
            ]}>
              {perk.name}
            </Text>
            <Text style={[
              styles.perkValue,
              isRedeemed && styles.redeemedText
            ]}>
              ${perk.value}
            </Text>
          </View>
          <View style={styles.perkDetails}>
            <Text style={[
              styles.perkPeriod,
              isRedeemed && styles.redeemedText
            ]}>
              {perk.period}
            </Text>
            {isRedeemed && (
              <View style={styles.redeemedBadge}>
                <Ionicons name="checkmark-circle" size={16} color="#fff" />
                <Text style={styles.redeemedBadgeText}>Redeemed</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.cardContainer}>
      <TouchableOpacity
        style={styles.cardHeader}
        onPress={() => setIsExpanded(!isExpanded)}
      >
        <View style={styles.cardInfo}>
          <Image source={card.image} style={styles.cardImage} />
          <View style={styles.cardTextContainer}>
            <Text style={styles.cardName}>{card.name}</Text>
            {cumulativeSavedValue > 0 && (
              <Text style={styles.savedValue}>
                ${cumulativeSavedValue} saved
              </Text>
            )}
          </View>
        </View>
        <Ionicons
          name={isExpanded ? 'chevron-up' : 'chevron-down'}
          size={24}
          color="#8e8e93"
        />
      </TouchableOpacity>

      {isExpanded && (
        <View style={styles.perksContainer}>
          {perks.map(renderPerk)}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 8,
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
  cardName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1c1c1e',
  },
  savedValue: {
    fontSize: 14,
    color: '#34c759',
    marginTop: 4,
  },
  perksContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  perkItem: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    marginVertical: 4,
    padding: 12,
  },
  redeemedPerk: {
    backgroundColor: '#e8f5e9',
    borderColor: '#34c759',
    borderWidth: 1,
  },
  perkContent: {
    flex: 1,
  },
  perkMainInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  perkName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1c1c1e',
    flex: 1,
    marginRight: 8,
  },
  perkValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1c1c1e',
  },
  perkDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  perkPeriod: {
    fontSize: 13,
    color: '#8e8e93',
    textTransform: 'capitalize',
  },
  redeemedText: {
    color: '#34c759',
  },
  redeemedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#34c759',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  redeemedBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
}); 