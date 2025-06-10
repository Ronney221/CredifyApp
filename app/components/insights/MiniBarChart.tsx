import React, { useState } from 'react';
import { View, Text, StyleSheet, useWindowDimensions, TouchableOpacity, Modal } from 'react-native';
import { Colors } from '../../../constants/Colors';

interface MiniBarChartProps {
  data: number[]; // Expects an array of 6 numbers (percentages)
  rawData?: { redeemed: number; potential: number }[]; // Optional raw data for detailed view
  height?: number;
  barColor?: string;
  barWidth?: number;
  barSpacing?: number;
}

const MiniBarChart: React.FC<MiniBarChartProps> = ({
  data,
  rawData,
  height = 100,
  barColor = Colors.light.tint,
  barWidth = 16,
  barSpacing = 16,
}) => {
  const [selectedBar, setSelectedBar] = useState<number | null>(null);
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

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
  };

  return (
    <View style={[styles.container, { width: chartWidth, height }]}>
      <View style={styles.legendContainer}>
        <Text style={styles.legendText}>% of available credits used per month</Text>
      </View>
      
      <View style={styles.barsContainer}>
        {data.map((value, index) => {
          const barHeight = Math.max(4, (value / maxValue) * chartHeight); // Ensure a minimum height
          const isLastBar = index === data.length - 1;
          return (
            <TouchableOpacity
              key={index}
              onPress={() => setSelectedBar(selectedBar === index ? null : index)}
              style={styles.barColumn}
            >
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
              
              {selectedBar === index && rawData && rawData[index] && (
                <View style={styles.tooltip}>
                  <Text style={styles.tooltipTitle}>{monthLabels[index]} Details</Text>
                  <Text style={styles.tooltipText}>
                    Used: {formatCurrency(rawData[index].redeemed)}
                  </Text>
                  <Text style={styles.tooltipText}>
                    Available: {formatCurrency(rawData[index].potential)}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
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
  legendContainer: {
    alignItems: 'center',
    marginBottom: 8,
  },
  legendText: {
    fontSize: 11,
    color: Colors.light.icon,
    fontStyle: 'italic',
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
    position: 'relative',
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
  tooltip: {
    position: 'absolute',
    bottom: '100%',
    left: -50,
    right: -50,
    backgroundColor: Colors.light.background,
    padding: 8,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    marginBottom: 8,
  },
  tooltipTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 4,
    textAlign: 'center',
  },
  tooltipText: {
    fontSize: 11,
    color: Colors.light.text,
    textAlign: 'center',
  },
});

export default MiniBarChart; 