import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { Card } from '../../src/data/card-data';
import { Colors } from '../../constants/Colors';
import { MotiView } from 'moti';

interface CardPerksProps {
  card: Card;
  index: number;
}

export function CardPerks({ card, index }: CardPerksProps) {
  return (
    <MotiView
      from={{ opacity: 0, translateY: 20 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 400, delay: index * 100 }}
      style={styles.container}
    >
      <View style={styles.cardHeader}>
        <Image source={card.image} style={styles.cardImage} resizeMode="contain" />
        <View style={styles.cardInfo}>
          <Text style={styles.cardName}>{card.name}</Text>
          {card.annualFee && (
            <Text style={styles.annualFee}>${card.annualFee} Annual Fee</Text>
          )}
        </View>
      </View>

      <View style={styles.benefitsList}>
        {card.benefits.map((benefit, idx) => (
          <View 
            key={benefit.id} 
            style={[
              styles.benefitItem,
              idx === card.benefits.length - 1 && styles.lastBenefitItem
            ]}
          >
            <Text style={styles.benefitName}>{benefit.name}</Text>
            <Text style={styles.benefitValue}>
              ${(benefit.value * (12 / benefit.periodMonths)).toFixed(0)}/yr
            </Text>
          </View>
        ))}
        <View style={styles.subtotalContainer}>
          <Text style={styles.subtotalLabel}>Total Perks</Text>
          <Text style={styles.subtotalValue}>
            ${card.benefits.reduce((total, benefit) => 
              total + (benefit.value * (12 / benefit.periodMonths)), 0
            ).toFixed(0)}/yr
          </Text>
        </View>
      </View>
    </MotiView>
  );
}


export default CardPerks;

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardImage: {
    width: 80,
    height: 50,
    borderRadius: 8,
    marginRight: 12,
  },
  cardInfo: {
    flex: 1,
  },
  cardName: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 4,
  },
  annualFee: {
    fontSize: 14,
    color: Colors.light.secondaryLabel,
  },
  benefitsList: {
    gap: 12,
  },
  benefitItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  lastBenefitItem: {
    borderBottomWidth: 0,
  },
  benefitName: {
    fontSize: 15,
    color: Colors.light.text,
    flex: 1,
  },
  benefitValue: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.light.tint,
  },
  subtotalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  subtotalLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.light.text,
  },
  subtotalValue: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.light.tint,
  },
}); 