import React, { useState } from 'react';
import { View, Text, StyleSheet, useWindowDimensions, TouchableOpacity } from 'react-native';
import { Colors } from '../../../constants/Colors';
import Svg, { Path, Circle } from 'react-native-svg';

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
  const chartHeight = height - 40;

  // Calculate the width each bar section takes up
  const sectionWidth = chartWidth / (data.length);

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

  // Count months with actual data (non-zero values)
  const monthsWithData = data.filter(value => value > 0).length;
  const showSparseDataMessage = monthsWithData > 0 && monthsWithData <= 2;

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

  // Calculate points for the line chart
  const getLinePoints = () => {
    const points: { x: number, y: number }[] = [];
    
    data.forEach((value, index) => {
      // Center of each bar section
      const x = (sectionWidth * index) + (sectionWidth / 2);
      const y = chartHeight - (Math.max(4, (value / maxValue) * chartHeight)) + 20;
      points.push({ x, y });
    });
    
    return points;
  };

  // Generate the SVG path
  const generatePath = (points: { x: number, y: number }[]) => {
    if (points.length < 2) return '';
    
    const line = points.map((point, index) => {
      if (index === 0) {
        return `M ${point.x} ${point.y}`;
      }
      // Use curve commands for smooth line
      const prevPoint = points[index - 1];
      const midX = (prevPoint.x + point.x) / 2;
      return `Q ${midX} ${prevPoint.y} ${point.x} ${point.y}`;
    }).join(' ');
    
    return line;
  };

  const linePoints = getLinePoints();
  const pathData = generatePath(linePoints);

  return (
    <View style={[styles.container, { width: screenWidth - 30, height: height + (showSparseDataMessage ? 60 : 20) }]}>
      <View style={styles.chartContent}>
        <View style={[styles.barsContainer, { width: chartWidth }]}>
          {/* Line chart overlay - Moved BEHIND bars */}
          <View style={[StyleSheet.absoluteFill, { zIndex: 1 }]}>
            <Svg width={chartWidth} height={chartHeight + 20}>
              <Path
                d={pathData}
                stroke={Colors.light.tint}
                strokeWidth="2"
                fill="none"
                opacity={0.8}
              />
            </Svg>
          </View>

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
                    width: sectionWidth,
                    alignItems: 'center',
                    zIndex: 2, // Ensure bars are above the line
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
                <Text style={styles.monthLabel} numberOfLines={1}>{monthLabels[index]}</Text>
                
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

          {/* Dots overlay - Moved to TOP layer */}
          <View style={[StyleSheet.absoluteFill, { zIndex: 3, pointerEvents: 'none' }]}>
            <Svg width={chartWidth} height={chartHeight + 20}>
              {linePoints.map((point, index) => (
                <Circle
                  key={index}
                  cx={point.x}
                  cy={point.y}
                  r="3"
                  fill={Colors.light.background}
                  stroke={Colors.light.tint}
                  strokeWidth="1.5"
                />
              ))}
            </Svg>
          </View>
        </View>
      </View>
      <View style={styles.legendContainer}>
        <Text style={styles.legendText}>% of available credits used per month</Text>
        {showSparseDataMessage && (
          <Text style={styles.encouragementText}>
            Keep tracking your perks to see your progress over time!
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 15,
  },
  chartContent: {
    flex: 1,
    alignItems: 'center',
  },
  barsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    backgroundColor: Colors.light.background, // Ensure white background
  },
  barColumn: {
    justifyContent: 'flex-end',
    position: 'relative',
    minWidth: 32,
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
    width: '100%',
  },
  bar: {
    backgroundColor: Colors.light.icon,
    borderRadius: 3,
  },
  legendContainer: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  legendText: {
    fontSize: 11,
    color: Colors.light.icon,
    fontStyle: 'italic',
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
  encouragementText: {
    fontSize: 12,
    color: Colors.light.tint,
    fontStyle: 'italic',
    marginTop: 8,
    textAlign: 'center',
  },
});

export default MiniBarChart; 