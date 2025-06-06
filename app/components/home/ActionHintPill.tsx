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
    <TouchableOpacity style={[styles.container, { borderColor: borderColor }]} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.iconContainer}>
        <Ionicons name={iconName} size={24} color={urgencyColor} />
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.titleText} numberOfLines={2}>
          Use your <Text style={[styles.valueText, { color: urgencyColor }]}>{formattedValue} {perk.name}</Text>
        </Text>
        <Text style={styles.subtitleText}>
          from {perk.cardName} • <Text style={{ color: urgencyColor, fontWeight: '500' }}>
            {daysText}
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
    paddingVertical: 8, // Reduced paddingVertical from 12 to 8
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginVertical: 12,
    borderWidth: 1.5, // Subtle border width
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 }, // Softer shadow
        shadowOpacity: 0.08, // Softer shadow
        shadowRadius: 4,    // Softer shadow
      },
      android: {
        elevation: 3,      // Softer elevation
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
    justifyContent: 'center', // Center text vertically if it wraps to two lines
  },
  titleText: {
    fontSize: 14, // Slightly smaller title
    color: Colors.light.text,
    fontWeight: '400', // Normal weight for "Use your"
    marginBottom: 3, // Space between title and subtitle
    lineHeight: 18, // Adjust for two lines if necessary
  },
  subtitleText: {
    fontSize: 12,
    color: Colors.light.icon,
    lineHeight: 16, // Adjust for two lines if necessary
  },
  chevronIcon: {
    marginLeft: 4, // Reduced space
  },
  valueText: {
    // Removed fontSize here, inherits from titleText
    fontWeight: '600', // Bold for perk name and value
  },
  actionButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8, // Added some margin to separate from text block
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
});

export default ActionHintPill; 