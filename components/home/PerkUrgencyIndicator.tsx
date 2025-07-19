import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CardPerk, calculatePerkExpiryDate } from '../../src/data/card-data';
import { Spacing, BorderRadius } from '../../constants/Spacing';

interface PerkUrgencyIndicatorProps {
  perk: CardPerk;
  size?: 'small' | 'medium';
}

const PerkUrgencyIndicator: React.FC<PerkUrgencyIndicatorProps> = ({ 
  perk, 
  size = 'medium' 
}) => {
  const calculateUrgency = () => {
    if (perk.status === 'redeemed') {
      return { level: 'redeemed', text: 'Used', icon: 'checkmark-circle', daysLeft: 0 };
    }

    if (!perk.periodMonths) {
      return { level: 'no-expiry', text: 'No expiry', icon: 'infinite', daysLeft: Infinity };
    }

    const now = new Date();
    const expiryDate = calculatePerkExpiryDate(perk.periodMonths);
    const daysLeft = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysLeft <= 0) {
      return { level: 'expired', text: 'Expired', icon: 'alert-circle', daysLeft: 0 };
    } else if (daysLeft <= 3) {
      return { level: 'urgent', text: `${daysLeft}d left`, icon: 'flame', daysLeft };
    } else if (daysLeft <= 7) {
      return { level: 'warning', text: `${daysLeft}d left`, icon: 'warning', daysLeft };
    } else if (daysLeft <= 30) {
      return { level: 'normal', text: `${daysLeft}d left`, icon: 'calendar', daysLeft };
    } else if (perk.periodMonths === 1) {
      return { level: 'monthly', text: 'Monthly', icon: 'refresh', daysLeft };
    } else {
      const monthsLeft = Math.floor(daysLeft / 30);
      return { level: 'normal', text: `${monthsLeft}mo left`, icon: 'calendar', daysLeft };
    }
  };

  const { level, text, icon } = calculateUrgency();

  const getStyles = () => {
    const isSmall = size === 'small';
    
    switch (level) {
      case 'redeemed':
        return {
          container: { backgroundColor: '#E5F5E5', borderColor: '#34C759' },
          text: { color: '#34C759', fontSize: isSmall ? 10 : 11 },
          icon: { color: '#34C759', size: isSmall ? 12 : 14 }
        };
      case 'expired':
        return {
          container: { backgroundColor: '#FFE5E5', borderColor: '#FF3B30' },
          text: { color: '#FF3B30', fontSize: isSmall ? 10 : 11 },
          icon: { color: '#FF3B30', size: isSmall ? 12 : 14 }
        };
      case 'urgent':
        return {
          container: { backgroundColor: '#FFE5E5', borderColor: '#FF3B30' },
          text: { color: '#FF3B30', fontSize: isSmall ? 10 : 11 },
          icon: { color: '#FF3B30', size: isSmall ? 12 : 14 }
        };
      case 'warning':
        return {
          container: { backgroundColor: '#FFF3E0', borderColor: '#FF9500' },
          text: { color: '#FF9500', fontSize: isSmall ? 10 : 11 },
          icon: { color: '#FF9500', size: isSmall ? 12 : 14 }
        };
      case 'monthly':
        return {
          container: { backgroundColor: '#E3F2FD', borderColor: '#007AFF' },
          text: { color: '#007AFF', fontSize: isSmall ? 10 : 11 },
          icon: { color: '#007AFF', size: isSmall ? 12 : 14 }
        };
      case 'no-expiry':
        return {
          container: { backgroundColor: '#F5F5F5', borderColor: '#8E8E93' },
          text: { color: '#8E8E93', fontSize: isSmall ? 10 : 11 },
          icon: { color: '#8E8E93', size: isSmall ? 12 : 14 }
        };
      default: // normal
        return {
          container: { backgroundColor: '#F0F9F0', borderColor: '#34C759' },
          text: { color: '#34C759', fontSize: isSmall ? 10 : 11 },
          icon: { color: '#34C759', size: isSmall ? 12 : 14 }
        };
    }
  };

  const styles = getStyles();

  return (
    <View style={[
      indicatorStyles.container,
      styles.container,
      size === 'small' && indicatorStyles.containerSmall
    ]}>
      <Ionicons 
        name={icon as any} 
        size={styles.icon.size} 
        color={styles.icon.color} 
      />
      <Text style={[indicatorStyles.text, styles.text]}>
        {text}
      </Text>
    </View>
  );
};

const indicatorStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm, // 8pt
    paddingVertical: Spacing.xs, // 4pt
    borderRadius: BorderRadius.lg, // 12pt
    borderWidth: 1,
    gap: Spacing.xs, // 4pt
  },
  containerSmall: {
    paddingHorizontal: 6, // Keep as 6pt for small variant
    paddingVertical: 3, // Keep as 3pt for small variant
    borderRadius: 10, // Keep as 10pt for small variant visual balance
    gap: 3, // Keep as 3pt for small variant
  },
  text: {
    fontWeight: '600',
  },
});

export default React.memo(PerkUrgencyIndicator);