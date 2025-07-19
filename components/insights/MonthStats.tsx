import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Constants - Updated color scheme for better meaning
const SUCCESS_GREEN = '#34C759';        // Fully redeemed
const WARNING_ORANGE = '#FF9500';       // Partially redeemed (incomplete)
const AVAILABLE_BLUE = '#007AFF';       // Available to redeem
const MISSED_RED = '#FF3B30';           // Missed/expired

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
  isCurrentMonth?: boolean;
}

export const MonthStats: React.FC<MonthStatsProps> = ({ data, isCurrentMonth = false }) => {
  const { redeemedCount, redeemedValue, missedCount, missedValue, partialCount, partialValue } = data;

  const renderStatRow = (
    iconName: string,
    count: number,
    value: number,
    label: string,
    textColor: string,
    backgroundColor: string
  ) => (
    <View style={styles.statRow}>
      <View style={[styles.statusIndicator, { backgroundColor }]}>
        <Ionicons name={iconName as any} size={12} color="#FFFFFF" />
      </View>
      <View style={styles.statContent}>
        <Text style={[styles.statLabel, { color: textColor }]}>{label}</Text>
        <Text style={[styles.statValue, { color: textColor }]}>
          {count} (${value.toFixed(0)})
        </Text>
      </View>
    </View>
  );

  // Determine the label for the third stat based on current month
  const thirdStatLabel = isCurrentMonth ? 'Available' : 'Missed';
  const thirdStatColor = isCurrentMonth ? AVAILABLE_BLUE : MISSED_RED;

  return (
    <View style={styles.container}>
      {/* Redeemed Stats */}
      {renderStatRow('checkmark', redeemedCount, redeemedValue, 'Redeemed', SUCCESS_GREEN, SUCCESS_GREEN)}
      
      {/* Partial Stats - Only show if partialCount > 0 */}
      {(partialCount ?? 0) > 0 && partialValue !== undefined && (
        renderStatRow('remove', partialCount!, partialValue, 'Partial', WARNING_ORANGE, WARNING_ORANGE)
      )}
      
      {/* Missed/Available Stats */}
      {renderStatRow(
        isCurrentMonth ? 'ellipse' : 'close', 
        missedCount, 
        missedValue, 
        thirdStatLabel, 
        thirdStatColor,
        thirdStatColor
      )}
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
  statusIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
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