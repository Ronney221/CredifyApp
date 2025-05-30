import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface SavingsBadgeProps {
  value: number;
}

export default function SavingsBadge({ value }: SavingsBadgeProps) {
  const formattedValue = value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  const isZero = value === 0;

  return (
    <View style={[styles.badge, isZero ? styles.badgeZero : styles.badgeActive]}>
      <Text style={[styles.text, isZero ? styles.textZero : styles.textActive]}>
        {isZero ? 'No savings yet' : `${formattedValue} saved`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  badgeZero: {
    backgroundColor: '#f2f2f7',
  },
  badgeActive: {
    backgroundColor: '#e1f2ff',
  },
  text: {
    fontSize: 12,
    fontWeight: '500',
  },
  textZero: {
    color: '#8e8e93',
  },
  textActive: {
    color: '#007aff',
  },
}); 