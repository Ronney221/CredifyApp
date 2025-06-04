import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, CardPerk } from '../../../src/data/card-data'; // Adjusted path
import ExpandableCard from './ExpandableCard'; // Assuming ExpandableCard is in the same directory
import CardExpanderFooter from './CardExpanderFooter';

interface StackedCardDisplayProps {
  sortedCards: { card: Card; perks: CardPerk[] }[];
  cumulativeValueSavedPerCard: Record<string, number>;
  activeCardId: string | null;
  onTapPerk: (cardId: string, perkId: string, perk: CardPerk) => Promise<void>;
  onExpandChange: (cardId: string, isExpanded: boolean) => void;
  onPerkStatusChange: () => void; 
}

const StackedCardDisplay: React.FC<StackedCardDisplayProps> = ({
  sortedCards,
  cumulativeValueSavedPerCard,
  activeCardId,
  onTapPerk,
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
          onExpandChange={onExpandChange}
          onPerkStatusChange={onPerkStatusChange}
          isActive={card.id === activeCardId}
          sortIndex={index} // Or pass the original index if needed for other logic
        />
      ))}
      
      {/* Apple Wallet-style Card Expander Footer */}
      {sortedCards.length > 2 && (
        <CardExpanderFooter
          hiddenCardsCount={remainingCardsCount}
          isExpanded={isStackExpanded}
          onToggleExpanded={() => setIsStackExpanded(!isStackExpanded)}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    // Add any overall container styling if needed
  },
});

export default StackedCardDisplay; 