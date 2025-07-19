import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { CardPerk, calculatePerkExpiryDate } from '../../src/data/card-data';

interface PerkProgressRingProps {
  perk: CardPerk;
  size?: number;
  strokeWidth?: number;
}

const PerkProgressRing: React.FC<PerkProgressRingProps> = ({ 
  perk, 
  size = 28, 
  strokeWidth = 2.5 
}) => {
  // Calculate progress based on perk period
  const calculateProgress = (): { progress: number; daysRemaining: number; totalDays: number } => {
    if (!perk.periodMonths) {
      return { progress: 0, daysRemaining: 0, totalDays: 0 };
    }

    const now = new Date();
    const expiryDate = calculatePerkExpiryDate(perk.periodMonths);
    const daysRemaining = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    // Calculate the actual cycle start date for accurate progress
    let cycleStartDate: Date;
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    
    switch (perk.periodMonths) {
      case 1: // Monthly - cycle starts on 1st of current month
        cycleStartDate = new Date(currentYear, currentMonth, 1);
        break;
      case 3: // Quarterly - cycle starts on current quarter start
        const currentQuarter = Math.floor(currentMonth / 3);
        cycleStartDate = new Date(currentYear, currentQuarter * 3, 1);
        break;
      case 6: // Bi-annual - cycle starts on current half start
        const isFirstHalf = currentMonth < 6;
        cycleStartDate = new Date(currentYear, isFirstHalf ? 0 : 6, 1);
        break;
      case 12: // Annual - cycle starts on Jan 1 of current year
        cycleStartDate = new Date(currentYear, 0, 1);
        break;
      default:
        // For custom periods, start from current month
        cycleStartDate = new Date(currentYear, currentMonth, 1);
    }

    // Calculate actual cycle length in days
    const totalDays = Math.ceil((expiryDate.getTime() - cycleStartDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // Progress represents time REMAINING (not elapsed) - more intuitive
    const progress = Math.max(0, Math.min(1, daysRemaining / totalDays));
    return { progress, daysRemaining: Math.max(0, daysRemaining), totalDays };
  };

  const { progress, daysRemaining } = calculateProgress();

  // Determine colors based on urgency and status
  const getColors = () => {
    if (perk.status === 'redeemed') {
      return {
        trackColor: '#E5E5EA',
        progressColor: '#34C759', // Green for completed
        backgroundColor: '#F0F9F0'
      };
    }

    if (perk.status === 'partially_redeemed') {
      return {
        trackColor: '#E5E5EA',
        progressColor: '#FF9500', // Orange for partial
        backgroundColor: '#FFF7E6'
      };
    }

    // Available perks - color by urgency
    if (daysRemaining <= 3) {
      return {
        trackColor: '#FFE5E5',
        progressColor: '#FF3B30', // Red for urgent
        backgroundColor: '#FFEBEE'
      };
    } else if (daysRemaining <= 7) {
      return {
        trackColor: '#FFF3E0',
        progressColor: '#FF9500', // Orange for warning
        backgroundColor: '#FFF8E1'
      };
    } else {
      return {
        trackColor: '#E3F2FD',
        progressColor: '#007AFF', // Blue for normal
        backgroundColor: '#F3F8FF'
      };
    }
  };

  const colors = getColors();
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <View style={[
      styles.container, 
      { 
        width: size, 
        height: size,
        backgroundColor: colors.backgroundColor
      }
    ]}>
      <Svg width={size} height={size} style={styles.svg}>
        {/* Background circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.trackColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.progressColor}
          strokeWidth={strokeWidth}
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="none"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  svg: {
    position: 'absolute',
  },
});

export default React.memo(PerkProgressRing);