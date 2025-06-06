import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../../constants/Colors';

interface MiniBarChartProps {
  data: number[]; // Expects an array of 6 numbers (percentages)
}

const MiniBarChart: React.FC<MiniBarChartProps> = ({ data }) => {
  const maxValue = Math.max(...data, 1); // Avoid division by zero

  return (
    <View style={styles.container}>
      {data.map((value, index) => {
        const barHeight = (value / maxValue) * 100;
        return (
          <View key={index} style={styles.barWrapper}>
            <View style={[styles.bar, { height: `${barHeight}%` }]} />
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    height: 30,
    width: 100,
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  barWrapper: {
    width: 8,
    height: '100%',
    backgroundColor: '#E5E5EA',
    borderRadius: 4,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  bar: {
    width: '100%',
    backgroundColor: Colors.light.icon,
    opacity: 0.6,
  },
});

export default MiniBarChart; 