import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../../constants/Colors';

interface MiniBarChartProps {
  data: number[]; // Expects an array of 6 numbers (percentages)
  width?: number;
  height?: number;
  barColor?: string;
  barWidth?: number;
  barSpacing?: number;
}

const MiniBarChart: React.FC<MiniBarChartProps> = ({
  data,
  width = 60,
  height = 20,
  barColor = Colors.light.tint,
  barWidth = 4,
  barSpacing = 3,
}) => {
  const maxValue = Math.max(...data, 1); // Avoid division by zero, ensure at least 1

  return (
    <View style={[styles.container, { width, height }]}>
      {data.map((value, index) => {
        const barHeight = Math.max(2, (value / maxValue) * height); // Ensure a minimum height
        const isLastBar = index === data.length - 1;
        return (
          <View
            key={index}
            style={[
              styles.bar,
              {
                width: barWidth,
                height: barHeight,
                backgroundColor: isLastBar ? barColor : '#E5E5EA',
                marginLeft: index > 0 ? barSpacing : 0,
              },
            ]}
          />
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