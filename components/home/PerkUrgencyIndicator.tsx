import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CardPerk, calculatePerkExpiryDate } from '../../src/data/card-data';
import { Spacing, BorderRadius } from '../../constants/Spacing';
import { PerkDesign } from '../../constants/DesignSystem';

interface PerkUrgencyIndicatorProps {
  perk: CardPerk;
  size?: 'small' | 'medium';
  showResetCountdown?: boolean;
}

const PerkUrgencyIndicator: React.FC<PerkUrgencyIndicatorProps> = ({ 
  perk, 
  size = 'medium',
  showResetCountdown = false
}) => {
  const calculateUrgency = () => {
    if (perk.status === 'redeemed') {
      // Show reset countdown for all perks when requested
      if (showResetCountdown && perk.periodMonths) {
        // Use the same logic as calculatePerkExpiryDate to get the correct reset date
        const resetDate = calculatePerkExpiryDate(perk.periodMonths);
        const now = new Date();
        const daysUntilReset = Math.ceil((resetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysUntilReset <= 0) {
          // Should have reset already, something might be off
          return { level: 'reset-countdown', text: 'Should reset soon', icon: 'refresh-circle', daysLeft: 0 };
        } else if (daysUntilReset <= 7) {
          // Show days for week or less
          return { level: 'reset-countdown', text: `${daysUntilReset}d until reset`, icon: 'refresh-circle', daysLeft: daysUntilReset };
        } else if (daysUntilReset <= 45) {
          // Show days for 45 days or less
          return { level: 'reset-countdown', text: `${daysUntilReset}d until reset`, icon: 'refresh-circle', daysLeft: daysUntilReset };
        } else {
          // Show months for longer periods
          const monthsUntilReset = Math.ceil(daysUntilReset / 30);
          return { level: 'reset-countdown', text: `${monthsUntilReset}mo until reset`, icon: 'refresh-circle', daysLeft: daysUntilReset };
        }
      }
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
          container: { backgroundColor: PerkDesign.urgency.normal.background, borderColor: PerkDesign.urgency.normal.border },
          text: { color: PerkDesign.urgency.normal.text, fontSize: isSmall ? 10 : 11 },
          icon: { color: PerkDesign.urgency.normal.icon, size: isSmall ? 12 : 14 }
        };
      case 'reset-countdown':
        return {
          container: { backgroundColor: '#E3F2FD', borderColor: '#90CAF9' },
          text: { color: '#1565C0', fontSize: isSmall ? 10 : 11 },
          icon: { color: '#1565C0', size: isSmall ? 12 : 14 }
        };
      case 'expired':
        return {
          container: { backgroundColor: PerkDesign.urgency.urgent.background, borderColor: PerkDesign.urgency.urgent.border },
          text: { color: PerkDesign.urgency.urgent.text, fontSize: isSmall ? 10 : 11 },
          icon: { color: PerkDesign.urgency.urgent.icon, size: isSmall ? 12 : 14 }
        };
      case 'urgent':
        return {
          container: { backgroundColor: PerkDesign.urgency.urgent.background, borderColor: PerkDesign.urgency.urgent.border },
          text: { color: PerkDesign.urgency.urgent.text, fontSize: isSmall ? 10 : 11 },
          icon: { color: PerkDesign.urgency.urgent.icon, size: isSmall ? 12 : 14 }
        };
      case 'warning':
        return {
          container: { backgroundColor: PerkDesign.urgency.warning.background, borderColor: PerkDesign.urgency.warning.border },
          text: { color: PerkDesign.urgency.warning.text, fontSize: isSmall ? 10 : 11 },
          icon: { color: PerkDesign.urgency.warning.icon, size: isSmall ? 12 : 14 }
        };
      case 'monthly':
        return {
          container: { backgroundColor: PerkDesign.urgency.monthly.background, borderColor: PerkDesign.urgency.monthly.border },
          text: { color: PerkDesign.urgency.monthly.text, fontSize: isSmall ? 10 : 11 },
          icon: { color: PerkDesign.urgency.monthly.icon, size: isSmall ? 12 : 14 }
        };
      case 'no-expiry':
        return {
          container: { backgroundColor: '#F5F5F5', borderColor: '#8E8E93' },
          text: { color: '#8E8E93', fontSize: isSmall ? 10 : 11 },
          icon: { color: '#8E8E93', size: isSmall ? 12 : 14 }
        };
      default: // normal
        return {
          container: { backgroundColor: PerkDesign.urgency.normal.background, borderColor: PerkDesign.urgency.normal.border },
          text: { color: PerkDesign.urgency.normal.text, fontSize: isSmall ? 10 : 11 },
          icon: { color: PerkDesign.urgency.normal.icon, size: isSmall ? 12 : 14 }
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