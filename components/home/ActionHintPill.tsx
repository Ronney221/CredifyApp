import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CardPerk } from '../../src/data/card-data';
import { Colors } from '../../constants/Colors';

interface ActionHintPillProps {
  perk: CardPerk & { cardId: string; cardName: string };
  daysRemaining: number;
  onPress: () => void;
}

export const ActionHintPill: React.FC<ActionHintPillProps> = ({ perk, daysRemaining, onPress }) => {
  const formattedValue = perk.value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  // Add 1 day to maintain consistency with the rest of the app
  const adjustedDaysRemaining = daysRemaining + 1;

  let urgencyColor = Colors.light.tint;
  let daysText = `${adjustedDaysRemaining} days left`;
  let iconName: keyof typeof Ionicons.glyphMap = 'arrow-forward-circle';

  if (adjustedDaysRemaining <= 0) {
    urgencyColor = '#f57c00'; // Orange for urgent (expired or today)
    daysText = 'Expires today!';
    if (adjustedDaysRemaining < 0) daysText = 'Expired';
    iconName = 'alert-circle';
  } else if (adjustedDaysRemaining <= 3) {
    urgencyColor = '#f57c00'; // Orange for urgent
    daysText = 'Expires soon!';
    iconName = 'time-outline';
  }

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.textContainer}>
        <Text style={styles.titleText} numberOfLines={2}>
          <Text style={{ fontWeight: '700' }}>{formattedValue} {perk.name}</Text> credit
        </Text>
        <Text style={styles.subtitleText}>
          From your {perk.cardName.replace('American Express', 'Amex')}
        </Text>
      </View>
      <View style={[styles.actionButtonContainer, { backgroundColor: urgencyColor }]}>
        <Text style={styles.daysLeftText}>{daysText}</Text>
        <Ionicons name={iconName} size={16} color="#FFFFFF" style={{ marginLeft: 6 }}/>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 12,
    marginHorizontal: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
    marginRight: 12,
  },
  titleText: {
    fontSize: 16,
    color: '#000000',
    fontWeight: '500',
    marginBottom: 4,
  },
  subtitleText: {
    fontSize: 14,
    color: '#6e6e73',
  },
  actionButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 100, // Pill shape
  },
  daysLeftText: {
    fontSize: 13,
    color: '#ffffff',
    fontWeight: '600',
  },
});

export default ActionHintPill; 