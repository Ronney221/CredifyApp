import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Colors } from '../../constants/Colors';
import MiniBarChart from './MiniBarChart';
import { Ionicons } from '@expo/vector-icons';
import Animated, { 
  useAnimatedStyle, 
  interpolate, 
  Extrapolate 
} from 'react-native-reanimated';

// --- YearlyProgress Component ---
interface YearlyProgressProps {
  year: string;
  totalRedeemed: number;
  totalAnnualFees: number;
  trendData: number[];
  monthlyData?: { redeemed: number; potential: number }[];
  scrollProgress?: Animated.SharedValue<number>; // 0 = expanded, 1 = collapsed
  isSticky?: boolean;
}

const YearlyProgress: React.FC<YearlyProgressProps> = ({ 
  year, 
  totalRedeemed, 
  totalAnnualFees, 
  trendData, 
  monthlyData,
  scrollProgress = { value: 0 }, // Default to expanded state
  isSticky = false
}) => {
  const roi = totalAnnualFees > 0 ? (totalRedeemed / totalAnnualFees) * 100 : 0;
  const clampedRoi = Math.max(0, Math.min(100, roi));

  const amountSaved = totalRedeemed.toLocaleString('en-US', { 
    style: 'currency', 
    currency: 'USD', 
    minimumFractionDigits: 0, 
    maximumFractionDigits: 0 
  });
  const totalFees = totalAnnualFees.toLocaleString('en-US', { 
    style: 'currency', 
    currency: 'USD', 
    minimumFractionDigits: 0, 
    maximumFractionDigits: 0 
  });

  // Animated styles for collapsible header
  const containerStyle = useAnimatedStyle(() => {
    const height = interpolate(
      scrollProgress.value,
      [0, 1],
      [160, 60], // Reduced from 200 to 160
      Extrapolate.CLAMP
    );

    const paddingVertical = interpolate(
      scrollProgress.value,
      [0, 1],
      [12, 8], // Reduced from 20,10 to 12,8
      Extrapolate.CLAMP
    );

    return {
      height,
      paddingVertical,
    };
  });

  const mainContentStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollProgress.value,
      [0, 0.5],
      [1, 0],
      Extrapolate.CLAMP
    );

    return {
      opacity,
      display: scrollProgress.value > 0.5 ? 'none' : 'flex',
    };
  });

  const collapsedContentStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollProgress.value,
      [0.5, 1],
      [0, 1],
      Extrapolate.CLAMP
    );

    return {
      opacity,
      display: scrollProgress.value < 0.5 ? 'none' : 'flex',
    };
  });

  return (
    <Animated.View style={[
      styles.container,
      containerStyle,
      isSticky && styles.stickyContainer
    ]}>
      {/* Expanded State */}
      <Animated.View style={[styles.mainContent, mainContentStyle]}>
        <Text style={styles.yearTitle}>{year} Return on Investment</Text>
        <View style={styles.roiContainer}>
          <Text style={styles.roiText}>
            <Text style={styles.roiPercentage}>{Math.round(roi)}% ROI</Text>
          </Text>
          <TouchableOpacity 
            style={styles.infoButton}
            onPress={() => Alert.alert(
              "Return on Investment (ROI)",
              "This shows how much value you've redeemed compared to your total annual fees. An ROI of 100% means you've broken even on your annual fees."
            )}
          >
            <Ionicons name="information-circle-outline" size={16} color={Colors.light.icon} />
          </TouchableOpacity>
        </View>
        <Text style={styles.savingsText}>
          {amountSaved} saved of {totalFees} in total fees
        </Text>
        <View style={styles.progressBarContainer}>
          <View style={[
            styles.progressBarFill, 
            { width: `${clampedRoi}%` },
            clampedRoi >= 100 && styles.progressBarSuccess
          ]} />
        </View>
      </Animated.View>

      {/* Collapsed/Sticky State */}
      <Animated.View style={[styles.collapsedContent, collapsedContentStyle]}>
        <Text style={styles.collapsedTitle}>{year} ROI: {Math.round(roi)}%</Text>
        <Text style={styles.collapsedSubtitle}>
          {amountSaved} / {totalFees}
        </Text>
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.light.background,
    paddingHorizontal: 15,
  },
  stickyContainer: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  mainContent: {
    flex: 1,
  },
  yearTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: 8, // Reduced from 12
  },
  roiContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2, // Reduced from 4
  },
  roiText: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.light.text,
  },
  roiPercentage: {
    color: Colors.light.tint,
  },
  infoButton: {
    padding: 8,
    marginLeft: 4,
  },
  savingsText: {
    fontSize: 16,
    color: Colors.light.icon,
    marginBottom: 8, // Reduced from 12
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#E5E5EA',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.light.tint,
    borderRadius: 4,
  },
  progressBarSuccess: {
    backgroundColor: '#34C759',
  },
  collapsedContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 60,
    paddingHorizontal: 15,
  },
  collapsedTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
  },
  collapsedSubtitle: {
    fontSize: 14,
    color: Colors.light.icon,
  },
});

export default YearlyProgress; 