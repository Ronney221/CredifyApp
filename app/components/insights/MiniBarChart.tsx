import React, { useState } from 'react';
import { View, Text, StyleSheet, useWindowDimensions, TouchableOpacity } from 'react-native';
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
  const chartWidth = screenWidth - 60;
  const maxValue = Math.max(...data, 1);
  const chartHeight = height - 45; // Reduced height to accommodate legend
  
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

  // Calculate tooltip position based on bar index
  const getTooltipStyle = (index: number) => {
    const isLeftEdge = index === 0;
    const isRightEdge = index === data.length - 1;
    
    let horizontalPosition = {};
    
    if (isLeftEdge) {
      horizontalPosition = {
        left: 0,
        right: 'auto',
      };
    } else if (isRightEdge) {
      horizontalPosition = {
        left: 'auto',
        right: 0,
      };
    } else {
      horizontalPosition = {
        left: -50,
        right: -50,
      };
    }

    return {
      ...styles.tooltip,
      ...horizontalPosition,
      zIndex: 999,
    };
  };

  return (
    <View style={[styles.container, { width: screenWidth - 30, height: height + 20 }]}>
      
      
      <View style={styles.chartContent}>
        <View style={[styles.barsContainer, { width: chartWidth }]}>
          {data.map((value, index) => {
            const barHeight = Math.max(4, (value / maxValue) * chartHeight);
            const isLastBar = index === data.length - 1;
            return (
              <TouchableOpacity
                key={index}
                onPress={() => setSelectedBar(selectedBar === index ? null : index)}
                style={[
                  styles.barColumn,
                  {
                    width: barWidth + (index > 0 ? barSpacing : 0),
                    alignItems: index === 0 ? 'flex-start' : 'center',
                    paddingLeft: index === 0 ? 0 : barSpacing / 2,
                  }
                ]}
              >
                <View style={styles.valueLabelContainer}>
                  <Text style={styles.valueLabel}>{value.toFixed(0)}%</Text>
                </View>
                <View
                  style={[
                    styles.bar,
                    {
                      width: barWidth,
                      height: barHeight,
                      backgroundColor: isLastBar ? barColor : Colors.light.icon,
                      opacity: isLastBar ? 1 : 0.3,
                    },
                  ]}
                />
                <Text style={styles.monthLabel}>{monthLabels[index]}</Text>
                
                {selectedBar === index && rawData && rawData[index] && (
                  <View style={getTooltipStyle(index)}>
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
      <View style={styles.legendContainer}>
        <Text style={styles.legendText}>% of available credits used per month</Text>
      </View>
    </View>
    
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 15,
  },
  legendContainer: {
    alignItems: 'center',
    paddingTop: 0,
    paddingBottom: 8,
  },
  legendText: {
    fontSize: 11,
    color: Colors.light.icon,
    fontStyle: 'italic',
  },
  chartContent: {
    flex: 1,
    alignItems: 'center',
  },
  barsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  barColumn: {
    justifyContent: 'flex-end',
    position: 'relative',
  },
  valueLabelContainer: {
    height: 16,
    justifyContent: 'center',
    marginBottom: 4,
    alignItems: 'center',
  },
  valueLabel: {
    fontSize: 10,
    color: Colors.light.icon,
  },
  monthLabel: {
    fontSize: 10,
    color: Colors.light.icon,
    marginTop: 4,
    textAlign: 'center',
  },
  bar: {
    backgroundColor: Colors.light.icon,
    borderRadius: 3,
  },
  tooltip: {
    position: 'absolute',
    bottom: '100%',
    backgroundColor: Colors.light.background,
    padding: 8,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    marginBottom: 8,
    minWidth: 120,
    zIndex: 999,
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