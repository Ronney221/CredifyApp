import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CardPerk, calculatePerkExpiryDate } from '../../src/data/card-data';

interface PerkProgressBarProps {
  perk: CardPerk;
  showDaysText?: boolean;
  height?: number;
  showBackground?: boolean;
}

const PerkProgressBar: React.FC<PerkProgressBarProps> = ({ 
  perk, 
  showDaysText = true, 
  height = 4,
  showBackground = true 
}) => {
  // Calculate progress based on perk period
  const calculateProgress = (): { progress: number; daysRemaining: number; totalDays: number; periodText: string } => {
    if (!perk.periodMonths) {
      return { progress: 0, daysRemaining: 0, totalDays: 0, periodText: '' };
    }

    const now = new Date();
    const expiryDate = calculatePerkExpiryDate(perk.periodMonths);
    const daysRemaining = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    // Calculate the actual cycle start date and total days for accurate progress
    let cycleStartDate: Date;
    let periodText: string;
    
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    
    switch (perk.periodMonths) {
      case 1: // Monthly - cycle starts on 1st of current month
        cycleStartDate = new Date(currentYear, currentMonth, 1);
        periodText = 'Monthly';
        break;
      case 3: // Quarterly - cycle starts on current quarter start
        const currentQuarter = Math.floor(currentMonth / 3);
        cycleStartDate = new Date(currentYear, currentQuarter * 3, 1);
        periodText = 'Quarterly';
        break;
      case 6: // Bi-annual - cycle starts on current half start
        const isFirstHalf = currentMonth < 6;
        cycleStartDate = new Date(currentYear, isFirstHalf ? 0 : 6, 1);
        periodText = 'Bi-annual';
        break;
      case 12: // Annual - cycle starts on Jan 1 of current year
        cycleStartDate = new Date(currentYear, 0, 1);
        periodText = 'Annual';
        break;
      default:
        // For custom periods, start from current month
        cycleStartDate = new Date(currentYear, currentMonth, 1);
        periodText = `${perk.periodMonths}mo`;
    }

    // Calculate actual cycle length in days
    const totalDays = Math.ceil((expiryDate.getTime() - cycleStartDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // Progress represents time REMAINING (not elapsed) - more intuitive
    const progress = Math.max(0, Math.min(1, daysRemaining / totalDays));
    return { progress, daysRemaining: Math.max(0, daysRemaining), totalDays, periodText };
  };

  const { progress, daysRemaining, periodText } = calculateProgress();

  // Determine colors based on urgency and status
  const getProgressColor = () => {
    if (perk.status === 'redeemed') {
      return '#34C759'; // Green
    }

    if (perk.status === 'partially_redeemed') {
      return '#FF9500'; // Orange
    }

    // Available perks - color shows urgency (less time = more urgent color)
    if (daysRemaining <= 3) {
      return '#FF3B30'; // Red for urgent (little time left)
    } else if (daysRemaining <= 7) {
      return '#FF9500'; // Orange for warning
    } else {
      return '#34C759'; // Green for plenty of time
    }
  };

  const getBackgroundColor = () => {
    if (perk.status === 'redeemed') {
      return '#E5F5E5';
    }

    if (perk.status === 'partially_redeemed') {
      return '#FFF3E0';
    }

    if (daysRemaining <= 3) {
      return '#FFE5E5'; // Red background for urgent
    } else if (daysRemaining <= 7) {
      return '#FFF3E0'; // Orange background for warning
    } else {
      return '#E5F5E5'; // Green background for plenty of time
    }
  };

  const getDaysText = () => {
    if (perk.status === 'redeemed') {
      return 'Redeemed';
    }

    if (daysRemaining <= 0) {
      return 'Expired';
    }

    if (daysRemaining === 1) {
      return '1 day left';
    }

    if (daysRemaining <= 7) {
      return `${daysRemaining} days left`;
    }

    if (daysRemaining <= 30) {
      return `${daysRemaining}d left`;
    }

    const weeksLeft = Math.floor(daysRemaining / 7);
    if (weeksLeft < 8) {
      return `${weeksLeft}w left`;
    }

    const monthsLeft = Math.floor(daysRemaining / 30);
    return `${monthsLeft}mo left`;
  };

  const progressColor = getProgressColor();
  const backgroundColor = getBackgroundColor();

  return (
    <View style={styles.container}>
      {showBackground && (
        <View style={[
          styles.progressTrack, 
          { height, backgroundColor: showBackground ? backgroundColor : '#E5E5EA' }
        ]}>
          <View 
            style={[
              styles.progressFill, 
              { 
                width: `${progress * 100}%`, 
                height, 
                backgroundColor: progressColor 
              }
            ]} 
          />
        </View>
      )}
      {showDaysText && (
        <View style={styles.textContainer}>
          <Text style={[styles.periodText, { color: progressColor }]}>
            {periodText}
          </Text>
          <Text style={[styles.daysText, { color: progressColor }]}>
            {getDaysText()}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    minWidth: 60,
  },
  progressTrack: {
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressFill: {
    borderRadius: 2,
  },
  textContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  periodText: {
    fontSize: 10,
    fontWeight: '600',
    opacity: 0.8,
  },
  daysText: {
    fontSize: 10,
    fontWeight: '500',
  },
});

export default React.memo(PerkProgressBar);