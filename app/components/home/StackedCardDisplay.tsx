import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Card, CardPerk } from '../../../src/data/card-data'; // Adjusted path
import ExpandableCard from './ExpandableCard'; // Assuming ExpandableCard is in the same directory
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../constants/Colors'; // Adjusted path

interface StackedCardDisplayProps {
  sortedCards: { card: Card; perks: CardPerk[] }[];
  cumulativeValueSavedPerCard: Record<string, number>;
  activeCardId: string | null;
  onTapPerk: (cardId: string, perkId: string, perk: CardPerk) => Promise<void>;
  onLongPressPerk: (cardId: string, perkId: string, intendedNewStatus: 'available' | 'redeemed') => void;
  onExpandChange: (cardId: string, isExpanded: boolean) => void;
  onPerkStatusChange: () => void; 
}

const StackedCardDisplay: React.FC<StackedCardDisplayProps> = ({
  sortedCards,
  cumulativeValueSavedPerCard,
  activeCardId,
  onTapPerk,
  onLongPressPerk,
  onExpandChange,
  onPerkStatusChange,
}) => {
  const [isStackExpanded, setIsStackExpanded] = useState(false);

  const cardsToShow = isStackExpanded ? sortedCards : sortedCards.slice(0, 2);
  const remainingCardsCount = sortedCards.length - cardsToShow.length;

  if (sortedCards.length === 0) {
    // This case should ideally be handled by the parent (Dashboard) with its own empty state.
    // However, including a fallback here just in case.
    return null; 
  }

  return (
    <View style={styles.container}>
      {cardsToShow.map(({ card, perks }, index) => (
        <ExpandableCard
          key={card.id}
          card={card}
          perks={perks}
          cumulativeSavedValue={cumulativeValueSavedPerCard[card.id] || 0}
          onTapPerk={onTapPerk}
          onLongPressPerk={onLongPressPerk}
          onExpandChange={onExpandChange}
          onPerkStatusChange={onPerkStatusChange}
          isActive={card.id === activeCardId}
          sortIndex={index} // Or pass the original index if needed for other logic
        />
      ))}
      {!isStackExpanded && sortedCards.length > 2 && (
        <TouchableOpacity style={styles.expanderButton} onPress={() => setIsStackExpanded(true)}>
          <Ionicons name="ellipsis-horizontal-circle-outline" size={22} color={Colors.light.tint} />
          <Text style={styles.expanderText}>+ {sortedCards.length - 2} more cards</Text>
        </TouchableOpacity>
      )}
      {isStackExpanded && sortedCards.length > 2 && (
        <TouchableOpacity style={styles.expanderButton} onPress={() => setIsStackExpanded(false)}>
          <Ionicons name="remove-circle-outline" size={22} color={Colors.light.text} />
          <Text style={styles.expanderText}>Show fewer cards</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    // Add any overall container styling if needed
  },
  expanderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: Colors.light.background, // Match dashboard background
    borderRadius: 8,
    marginHorizontal: 16, // Match card section padding
    marginTop: 8, // Space from the last card
    borderWidth: 1,
    borderColor: Colors.light.icon, // Subtle border
  },
  expanderText: {
    marginLeft: 8,
    fontSize: 15,
    fontWeight: '500',
    color: Colors.light.tint,
  },
});

export default StackedCardDisplay; 