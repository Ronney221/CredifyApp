import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Colors } from '../../../constants/Colors';
import MiniBarChart from './MiniBarChart';
import { Ionicons } from '@expo/vector-icons';

// --- YearlyProgress Component ---
interface YearlyProgressProps {
  year: string;
  totalRedeemed: number;
  totalAnnualFees: number;
  trendData: number[];
  monthlyData?: { redeemed: number; potential: number }[];
}

const YearlyProgress: React.FC<YearlyProgressProps> = ({ year, totalRedeemed, totalAnnualFees, trendData, monthlyData }) => {
  const progress = totalAnnualFees > 0 ? (totalRedeemed / totalAnnualFees) * 100 : 0;
  const clampedProgress = Math.max(0, Math.min(100, progress));

  const amountSaved = totalRedeemed.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 });
  const totalFees = totalAnnualFees.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 });

  return (
    <View style={styles.container}>
      <View style={styles.mainContent}>
        <View style={styles.textRow}>
          <Text style={styles.yearText}>Saved so far in {year}</Text>
          <View style={styles.amountRow}>
            <Text style={styles.amountText}>{amountSaved} of {totalFees}</Text>
            <TouchableOpacity 
              style={styles.infoButton}
              onPress={() => Alert.alert(
                "Annual Fee Coverage",
                "This shows how much value you've redeemed compared to the total annual fees of your selected cards. Break-even is 100%."
              )}
            >
              <Ionicons name="information-circle-outline" size={16} color={Colors.light.icon} />
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.progressBarContainer}>
          <View style={[
            styles.progressBarFill, 
            { width: `${clampedProgress}%` },
            clampedProgress >= 100 && styles.progressBarSuccess
          ]} />
        </View>
      </View>
      
      <View style={styles.trendContainer}>
        <MiniBarChart 
          data={trendData} 
          rawData={monthlyData}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 10,
    paddingHorizontal: 15,
  },
  mainContent: {
    marginBottom: 15,
  },
  textRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  yearText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  amountText: {
    fontSize: 14,
    color: Colors.light.icon,
  },
  infoButton: {
    padding: 4,
    marginLeft: -4,
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
  trendContainer: {
    marginTop: 10,
    alignItems: 'center',
  },
});

export default YearlyProgress; 