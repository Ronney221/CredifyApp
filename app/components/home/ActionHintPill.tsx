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
  let urgencyColor = '#20B2AA'; // Brand teal instead of default blue
  let iconName: keyof typeof Ionicons.glyphMap = 'information-circle-outline';

  if (daysRemaining <= 3) {
    urgencyColor = '#f57c00'; // Orange for urgent
    iconName = 'flame-outline';
  } else if (daysRemaining <= 7) {
    urgencyColor = '#ffab00'; // Amber for soon
    iconName = 'time-outline';
  }

  return (
    <TouchableOpacity style={[styles.container, { borderColor: urgencyColor, backgroundColor: '#ffffff' }]} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.iconContainer}>
        <Ionicons name={iconName} size={32} color={urgencyColor} />
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.titleText}>
          <Text style={styles.actionText}>Use your </Text>
          <Text style={[styles.valueText, { color: urgencyColor }]}>{formattedValue} {perk.name}</Text>
        </Text>
        <Text style={styles.subtitleText}>
          from {perk.cardName} • <Text style={[styles.urgencyText, { color: urgencyColor }]}>
            {daysRemaining <= 3 ? 'Expires soon!' : `${daysRemaining} days left`}
          </Text>
        </Text>
      </View>
      <View style={styles.actionButtonContainer}>
        <Text style={[styles.actionButtonText, { color: urgencyColor }]}>Use Now</Text>
        <Ionicons name="chevron-forward" size={18} color={urgencyColor} style={styles.chevronIcon} />
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
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginHorizontal: 16,
    marginVertical: 12,
    borderWidth: 2,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
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
  actionText: {
    fontSize: 15,
    color: Colors.light.text,
    fontWeight: '500',
  },
  valueText: {
    fontSize: 15,
    color: Colors.light.text,
    fontWeight: 'bold',
  },
  urgencyText: {
    fontSize: 13,
    color: Colors.light.icon,
  },
  actionButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 15,
    color: Colors.light.text,
    fontWeight: 'bold',
  },
});

export default ActionHintPill; 