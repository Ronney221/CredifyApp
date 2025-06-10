import React from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { Colors } from '../../../constants/Colors';

interface MiniBarChartProps {
  data: number[]; // Expects an array of 6 numbers (percentages)
  height?: number;
  barColor?: string;
  barWidth?: number;
  barSpacing?: number;
}

const MiniBarChart: React.FC<MiniBarChartProps> = ({
  data,
  height = 100,
  barColor = Colors.light.tint,
  barWidth = 16,
  barSpacing = 16,
}) => {
  const { width: screenWidth } = useWindowDimensions();
  const chartWidth = screenWidth - 30; // Adjusted to account for parent's padding
  const maxValue = Math.max(...data, 1); // Avoid division by zero, ensure at least 1
  const chartHeight = height - 30; // Reserve space for labels
  
  // Get last 6 months abbreviated names
  const getLastSixMonths = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const today = new Date();
    const currentMonth = today.getMonth();
    const lastSixMonths = [];
    
    for (let i = 5; i >= 0; i--) {
      const monthIndex = (currentMonth - i + 12) % 12;
      lastSixMonths.push(months[monthIndex]);
    }
    
    return lastSixMonths;
  };

  const monthLabels = getLastSixMonths();

  return (
    <View style={[styles.container, { width: chartWidth, height }]}>
      <View style={styles.barsContainer}>
        {data.map((value, index) => {
          const barHeight = Math.max(4, (value / maxValue) * chartHeight); // Ensure a minimum height
          const isLastBar = index === data.length - 1;
          return (
            <View key={index} style={styles.barColumn}>
              <Text style={styles.valueLabel}>{value.toFixed(0)}%</Text>
              <View
                style={[
                  styles.bar,
                  {
                    width: barWidth,
                    height: barHeight,
                    backgroundColor: isLastBar ? barColor : Colors.light.icon,
                    opacity: isLastBar ? 1 : 0.3,
                    marginLeft: index > 0 ? barSpacing : 0,
                  },
                ]}
              />
              <Text style={styles.monthLabel}>{monthLabels[index]}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: 15, // Space for value labels
    paddingBottom: 5,
  },
  barsContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between', // Changed from center to space-between
  },
  barColumn: {
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  valueLabel: {
    fontSize: 10,
    color: Colors.light.icon,
    marginBottom: 4,
  },
  monthLabel: {
    fontSize: 10,
    color: Colors.light.icon,
    marginTop: 4,
  },
  bar: {
    backgroundColor: Colors.light.icon,
    borderRadius: 3,
  },
});

export default MiniBarChart; 