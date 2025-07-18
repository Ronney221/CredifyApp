import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface MonthStatsData {
  redeemedCount: number;
  redeemedValue: number;
  missedCount: number;
  missedValue: number;
  partialCount?: number;
  partialValue?: number;
}

interface MonthStatsProps {
  data: MonthStatsData;
}

export const MonthStats: React.FC<MonthStatsProps> = ({ data }) => {
  const { redeemedCount, redeemedValue, missedCount, missedValue, partialCount, partialValue } = data;

  const renderStatRow = (
    icon: string,
    count: number,
    value: number,
    label: string,
    textColor: string
  ) => (
    <View style={styles.statRow}>
      <Text style={styles.statIcon}>{icon}</Text>
      <View style={styles.statContent}>
        <Text style={[styles.statLabel, { color: textColor }]}>{label}</Text>
        <Text style={[styles.statValue, { color: textColor }]}>
          {count} (${value.toFixed(0)})
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Redeemed Stats */}
      {renderStatRow('✅', redeemedCount, redeemedValue, 'Redeemed', '#34C759')}
      
      {/* Partial Stats - Only show if partialCount > 0 */}
      {(partialCount ?? 0) > 0 && partialValue !== undefined && (
        renderStatRow('🌀', partialCount!, partialValue, 'Partial', '#4CAF50')
      )}
      
      {/* Missed Stats */}
      {renderStatRow('🕐', missedCount, missedValue, 'Missed', '#8A8A8E')}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
    gap: 8,
    paddingVertical: 4,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 24,
  },
  statIcon: {
    fontSize: 16,
    width: 24,
    textAlign: 'center',
    marginRight: 8,
  },
  statContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flex: 1,
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  statValue: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'right',
  },
});

export default MonthStats;