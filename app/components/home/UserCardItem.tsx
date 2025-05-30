import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card, CardPerk } from '../../../src/data/card-data';
import PerkItem from './PerkItem';
import { Colors } from '../../constants/Colors';

interface UserCardItemProps {
  card: Card;
  perks: CardPerk[];
  cumulativeSavedValue: number;
  onTapPerk: (cardId: string, perkId: string, perk: CardPerk) => void;
  onLongPressPerk: (cardId: string, perkId: string, perk: CardPerk) => void;
  cardDetailItemStyle?: object;
  cardHeaderContainerStyle?: object;
  cardNameStyle?: object;
  valueSavedTextStyle?: object;
}

const UserCardItem: React.FC<UserCardItemProps> = ({
  card,
  perks,
  cumulativeSavedValue,
  onTapPerk,
  onLongPressPerk,
  cardDetailItemStyle,
  cardHeaderContainerStyle,
  cardNameStyle,
  valueSavedTextStyle,
}) => {
  return (
    <View style={[styles.cardDetailItem, cardDetailItemStyle]}>
      <View style={[styles.cardHeaderContainer, cardHeaderContainerStyle]}>
        <Text style={[styles.cardName, cardNameStyle]}>{card.name}</Text>
        <Text style={[styles.valueSavedText, valueSavedTextStyle]}>
          Value Saved: {cumulativeSavedValue.toLocaleString('en-US', {
            style: 'currency',
            currency: 'USD',
          })}
        </Text>
      </View>
      {perks.map((perk) => (
        <PerkItem
          key={perk.id}
          perk={perk}
          cardId={card.id}
          onTapPerk={onTapPerk}
          onLongPressPerk={onLongPressPerk}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  cardDetailItem: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    shadowColor: Colors.light.text,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  cardHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.light.text,
    flexShrink: 1,
    marginRight: 8,
  },
  valueSavedText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.accent,
  },
});

export default UserCardItem; 