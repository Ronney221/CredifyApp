import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CardPerk } from '../../../src/data/card-data'; // Adjust path as needed
import { Colors } from '../../../constants/Colors'; // Adjust path as needed
import { format, endOfMonth, differenceInDays } from 'date-fns';

interface ActionHintPillProps {
  perk: CardPerk & { cardId: string; cardName: string };
  daysRemaining: number;
  onPress: () => void;
}

const ActionHintPill: React.FC<ActionHintPillProps> = ({ perk, daysRemaining, onPress }) => {
  const expiryDate = endOfMonth(new Date());
  const formattedValue = perk.value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  // Determine urgency based on days remaining
  let urgencyColor = Colors.light.tint; // Default blue
  let iconName: keyof typeof Ionicons.glyphMap = 'information-circle-outline';

  if (daysRemaining <= 3) {
    urgencyColor = '#f57c00'; // Orange for urgent
    iconName = 'flame-outline';
  } else if (daysRemaining <= 7) {
    urgencyColor = '#ffab00'; // Amber for soon
    iconName = 'time-outline';
  }

  return (
    <TouchableOpacity style={[styles.container, { borderColor: urgencyColor }]} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.iconContainer}>
        <Ionicons name={iconName} size={26} color={urgencyColor} />
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.titleText}>
          Use your <Text style={{ fontWeight: 'bold' }}>{formattedValue} {perk.name}</Text>
        </Text>
        <Text style={styles.subtitleText}>
          from {perk.cardName} by {format(expiryDate, 'M/d')}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={Colors.light.icon} style={styles.chevronIcon} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginVertical: 10,
    borderWidth: 1.5,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  iconContainer: {
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
  },
  titleText: {
    fontSize: 15,
    color: Colors.light.text,
    fontWeight: '500',
    marginBottom: 2,
  },
  subtitleText: {
    fontSize: 13,
    color: Colors.light.icon,
  },
  chevronIcon: {
    marginLeft: 8,
  },
});

export default ActionHintPill; 