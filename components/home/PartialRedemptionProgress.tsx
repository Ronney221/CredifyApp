import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CardPerk } from '../../src/data/card-data';

interface PartialRedemptionProgressProps {
  perk: CardPerk;
  height?: number;
}

const PartialRedemptionProgress: React.FC<PartialRedemptionProgressProps> = ({ 
  perk, 
  height = 3 
}) => {
  if (perk.status !== 'partially_redeemed' || !perk.remaining_value) {
    return null;
  }

  const totalValue = perk.value;
  const remainingValue = perk.remaining_value;
  const usedValue = totalValue - remainingValue;
  const progressPercentage = (usedValue / totalValue) * 100;

  const formattedUsed = usedValue.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
  });

  const formattedTotal = totalValue.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
  });

  return (
    <View style={styles.container}>
      <View style={styles.progressContainer}>
        <View style={[styles.progressTrack, { height }]}>
          <View 
            style={[
              styles.progressFill, 
              { 
                width: `${progressPercentage}%`, 
                height 
              }
            ]} 
          />
        </View>
        <Text style={styles.progressText}>
          {formattedUsed} of {formattedTotal} used
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 6,
  },
  progressContainer: {
    gap: 4,
  },
  progressTrack: {
    backgroundColor: '#FFF3E0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    backgroundColor: '#FF9500',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 11,
    color: '#FF9500',
    fontWeight: '500',
  },
});

export default React.memo(PartialRedemptionProgress);