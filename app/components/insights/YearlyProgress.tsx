import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../../constants/Colors';
import MiniBarChart from './MiniBarChart';

// --- YearlyProgress Component ---
interface YearlyProgressProps {
  year: string;
  totalRedeemed: number;
  totalPotential: number;
  trendData: number[];
  monthlyData?: { redeemed: number; potential: number }[];
}

const YearlyProgress: React.FC<YearlyProgressProps> = ({ year, totalRedeemed, totalPotential, trendData, monthlyData }) => {
  const progress = totalPotential > 0 ? (totalRedeemed / totalPotential) * 100 : 0;
  const clampedProgress = Math.max(0, Math.min(100, progress));

  const amountSaved = totalRedeemed.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 });
  const potentialSavings = totalPotential.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 });

  return (
    <View style={styles.container}>
      <View style={styles.mainContent}>
        <View style={styles.textRow}>
          <Text style={styles.yearText}>Saved so far in {year}</Text>
          <Text style={styles.amountText}>{amountSaved} of {potentialSavings}</Text>
        </View>
        <View style={styles.progressBarContainer}>
          <View style={[styles.progressBarFill, { width: `${clampedProgress}%` }]} />
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
  amountText: {
    fontSize: 14,
    color: Colors.light.icon,
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
  trendContainer: {
    marginTop: 10,
    alignItems: 'center',
  },
});

export default YearlyProgress; 