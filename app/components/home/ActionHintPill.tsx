import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CardPerk } from '../../../src/data/card-data'; // Adjust path as needed
import { Colors } from '../../../constants/Colors'; // Adjust path as needed

interface ActionHintPillProps {
  perk: CardPerk & { cardId: string; cardName: string };
  daysRemaining: number;
  onPress: () => void;
}

const ActionHintPill: React.FC<ActionHintPillProps> = ({ perk, daysRemaining, onPress }) => {
  const formattedValue = perk.value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  let urgencyColor = '#007A7F'; // Teal as default for text/icon
  let borderColor = '#007A7F66'; // Default border color with 40% opacity
  let iconName: keyof typeof Ionicons.glyphMap = 'information-circle-outline'; // Default icon
  let daysText = `${daysRemaining} days left`;

  if (daysRemaining <= 0) {
    urgencyColor = '#f57c00'; // Orange for urgent (expired or today)
    borderColor = '#f57c0066'; // Orange with 40% opacity for border
    iconName = 'flame-outline';
    daysText = 'Expires today!';
    if (daysRemaining < 0) daysText = 'Expired';
  } else if (daysRemaining <= 3) {
    urgencyColor = '#f57c00'; // Orange for urgent
    borderColor = '#f57c0066'; // Orange with 40% opacity for border
    iconName = 'flame-outline';
    daysText = 'Expires soon!';
  } else if (daysRemaining <= 7) {
    urgencyColor = '#ffab00'; // Amber for soon
    borderColor = '#ffab0066'; // Amber with 40% opacity for border
    iconName = 'time-outline';
  }

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.textContainer}>
        <Text style={styles.titleText} numberOfLines={2}>
          Use your <Text style={styles.valueText}>{formattedValue} {perk.name}</Text>
        </Text>
        <Text style={styles.subtitleText}>
          from {perk.cardName} • <Text style={styles.daysLeftText}>{daysText}</Text>
        </Text>
      </View>
      <View style={styles.actionButtonContainer}>
        <Ionicons name="arrow-forward-circle" size={24} color="#FFFFFF" />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0066FF', // Vibrant cobalt blue
    borderRadius: 12,
    paddingVertical: 12,
    paddingLeft: 20, // More padding on the left for text
    paddingRight: 12, // Less padding on the right for the icon
    marginHorizontal: 16,
    marginVertical: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 6,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  titleText: {
    fontSize: 15,
    color: '#FFFFFF', // White text
    fontWeight: '400',
    marginBottom: 2,
    lineHeight: 20,
  },
  subtitleText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)', // Slightly transparent white
    lineHeight: 18,
  },
  daysLeftText: {
    fontWeight: '700',
    color: '#FFFFFF',
  },
  valueText: {
    fontWeight: '700', // Bold for perk name and value
  },
  actionButtonContainer: {
    marginLeft: 12,
  },
});

export default ActionHintPill; 