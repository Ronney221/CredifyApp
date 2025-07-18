import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MonthStats } from './MonthStats';

// Example usage of the MonthStats component
export const MonthStatsExample: React.FC = () => {
  // Example data with partial redemptions
  const dataWithPartial = {
    redeemedCount: 5,
    redeemedValue: 250,
    missedCount: 2,
    missedValue: 80,
    partialCount: 1,
    partialValue: 45,
  };

  // Example data without partial redemptions
  const dataWithoutPartial = {
    redeemedCount: 8,
    redeemedValue: 432,
    missedCount: 1,
    missedValue: 25,
    // partialCount and partialValue are omitted
  };

  return (
    <View style={styles.container}>
      <View style={styles.monthCard}>
        <Text style={styles.monthTitle}>June 2024</Text>
        <MonthStats data={dataWithPartial} />
      </View>

      <View style={styles.monthCard}>
        <Text style={styles.monthTitle}>May 2024</Text>
        <MonthStats data={dataWithoutPartial} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 16,
  },
  monthCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    color: '#1D1D1F',
  },
});

export default MonthStatsExample;