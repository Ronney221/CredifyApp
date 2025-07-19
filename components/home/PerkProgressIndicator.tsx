import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CardPerk, calculatePerkExpiryDate } from '../../src/data/card-data';

interface PerkProgressIndicatorProps {
  perk: CardPerk;
  size?: 'small' | 'medium' | 'large';
  showDaysText?: boolean;
}

const PerkProgressIndicator: React.FC<PerkProgressIndicatorProps> = ({ 
  perk, 
  size = 'medium',
  showDaysText = false 
}) => {
  // Calculate progress based on perk period
  const calculateProgress = (): { progress: number; daysRemaining: number; urgencyLevel: 'normal' | 'warning' | 'urgent' | 'expired' | 'redeemed' } => {
    if (perk.status === 'redeemed') {
      return { progress: 1, daysRemaining: 0, urgencyLevel: 'redeemed' };
    }

    if (!perk.periodMonths) {
      return { progress: 0, daysRemaining: 0, urgencyLevel: 'normal' };
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
    
    let urgencyLevel: 'normal' | 'warning' | 'urgent' | 'expired' | 'redeemed';
    if (daysRemaining <= 0) {
      urgencyLevel = 'expired';
    } else if (daysRemaining <= 3) {
      urgencyLevel = 'urgent';
    } else if (daysRemaining <= 7) {
      urgencyLevel = 'warning';
    } else {
      urgencyLevel = 'normal';
    }

    return { progress, daysRemaining: Math.max(0, daysRemaining), urgencyLevel };
  };

  const { progress, daysRemaining, urgencyLevel } = calculateProgress();

  const getStylesForSize = () => {
    switch (size) {
      case 'small':
        return {
          container: { width: 20, height: 20 },
          text: { fontSize: 8 }
        };
      case 'large':
        return {
          container: { width: 32, height: 32 },
          text: { fontSize: 10 }
        };
      default:
        return {
          container: { width: 24, height: 24 },
          text: { fontSize: 9 }
        };
    }
  };

  const getColors = () => {
    switch (urgencyLevel) {
      case 'redeemed':
        return {
          background: '#E5F5E5',
          progress: '#34C759',
          text: '#34C759'
        };
      case 'expired':
        return {
          background: '#FFE5E5',
          progress: '#FF3B30',
          text: '#FF3B30'
        };
      case 'urgent':
        return {
          background: '#FFE5E5',
          progress: '#FF3B30',
          text: '#FF3B30'
        };
      case 'warning':
        return {
          background: '#FFF3E0',
          progress: '#FF9500',
          text: '#FF9500'
        };
      default: // Normal - plenty of time remaining
        return {
          background: '#E5F5E5',
          progress: '#34C759',
          text: '#34C759'
        };
    }
  };

  const getDaysDisplay = () => {
    if (perk.status === 'redeemed') return '✓';
    if (daysRemaining <= 0) return '!';
    if (daysRemaining <= 9) return daysRemaining.toString();
    if (daysRemaining <= 30) return `${Math.floor(daysRemaining / 7)}w`;
    return `${Math.floor(daysRemaining / 30)}m`;
  };

  const sizeStyles = getStylesForSize();
  const colors = getColors();

  return (
    <View style={styles.container}>
      <View style={[
        styles.progressCircle,
        sizeStyles.container,
        { backgroundColor: colors.background }
      ]}>
        {/* Progress arc using border technique */}
        <View style={[
          styles.progressArc,
          sizeStyles.container,
          {
            borderColor: colors.progress,
            transform: [{ rotate: `${progress * 360}deg` }]
          }
        ]} />
        
        {/* Center content */}
        <View style={styles.centerContent}>
          <Text style={[
            styles.progressText,
            sizeStyles.text,
            { color: colors.text }
          ]}>
            {getDaysDisplay()}
          </Text>
        </View>
      </View>
      
      {showDaysText && (
        <Text style={[styles.daysText, { color: colors.text }]}>
          {daysRemaining <= 0 ? 'Expired' : `${daysRemaining}d`}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  progressCircle: {
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  progressArc: {
    position: 'absolute',
    borderRadius: 12,
    borderWidth: 2,
    borderTopColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  centerContent: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressText: {
    fontWeight: '700',
    textAlign: 'center',
  },
  daysText: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 2,
  },
});

export default React.memo(PerkProgressIndicator);