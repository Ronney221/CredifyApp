import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, CardPerk } from '../../src/data/card-data';
import ExpandableCard from './ExpandableCard';
import { Colors } from '../../constants/Colors';

interface UserCardItemProps {
  card: Card;
  perks: CardPerk[];
  cumulativeSavedValue: number;
  onTapPerk: (cardId: string, perkId: string, perk: CardPerk) => Promise<void>;
  cardDetailItemStyle?: object;
  userHasSeenSwipeHint: boolean;
  onHintDismissed: () => void;
}

const UserCardItem: React.FC<UserCardItemProps> = ({
  card,
  perks,
  cumulativeSavedValue,
  onTapPerk,
  cardDetailItemStyle,
  userHasSeenSwipeHint,
  onHintDismissed,
}) => {
  return (
    <View style={[styles.cardDetailItem, cardDetailItemStyle]}>
      <ExpandableCard
        card={card}
        perks={perks}
        cumulativeSavedValue={cumulativeSavedValue}
        onTapPerk={onTapPerk}
        sortIndex={0}
        userHasSeenSwipeHint={userHasSeenSwipeHint}
        onHintDismissed={onHintDismissed}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  cardDetailItem: {
    backgroundColor: Colors.light.background,
    borderRadius: 10,
    marginBottom: 15,
  },
});

export default UserCardItem; 