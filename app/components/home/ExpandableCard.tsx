import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card, CardPerk } from '../../types';
import SavingsBadge from './SavingsBadge';

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
  const [expanded, setExpanded] = useState(false);
  const [rotateAnim] = useState(new Animated.Value(0));

  const toggleExpanded = () => {
    setExpanded(!expanded);
    Animated.spring(rotateAnim, {
      toValue: expanded ? 0 : 1,
      useNativeDriver: true,
    }).start();
  };

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={toggleExpanded} style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.cardName}>{card.name}</Text>
          <SavingsBadge value={cumulativeSavedValue} />
        </View>
        <Animated.View style={{ transform: [{ rotate: spin }] }}>
          <Ionicons name="chevron-down" size={20} color="#8e8e93" />
        </Animated.View>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.perksContainer}>
          {perks.map((perk) => (
            <TouchableOpacity
              key={perk.id}
              style={styles.perkRow}
              onPress={() => onTapPerk(card.id, perk.id, perk)}
              onLongPress={() => onLongPressPerk(card.id, perk.id, perk)}
            >
              <View style={styles.perkInfo}>
                <Text style={styles.perkName}>{perk.name}</Text>
                <Text style={styles.perkValue}>
                  ${perk.value} /{perk.period}
                </Text>
              </View>
              <View style={styles.perkStatus}>
                {perk.status === 'redeemed' ? (
                  <Ionicons name="checkmark-circle" size={24} color="#34c759" />
                ) : perk.status === 'pending' ? (
                  <Ionicons name="time" size={24} color="#ff9500" />
                ) : (
                  <Ionicons name="arrow-forward-circle" size={24} color="#007aff" />
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cardName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1c1c1e',
  },
  perksContainer: {
    borderTopWidth: 1,
    borderTopColor: '#f2f2f7',
  },
  perkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f2f2f7',
  },
  perkInfo: {
    flex: 1,
  },
  perkName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1c1c1e',
    marginBottom: 2,
  },
  perkValue: {
    fontSize: 13,
    color: '#8e8e93',
  },
  perkStatus: {
    marginLeft: 12,
  },
}); 