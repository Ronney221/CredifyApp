import React, { useState } from 'react';
import { View, Text, StyleSheet, useWindowDimensions, TouchableOpacity } from 'react-native';
import { Colors } from '../../../constants/Colors';
import Svg, { Path, Circle } from 'react-native-svg';

interface MiniBarChartProps {
  data: number[]; // Now represents dollar amounts saved
  rawData?: { redeemed: number; potential: number }[]; // Optional raw data for detailed view
  height?: number;
  barColor?: string;
  barWidth?: number;
  barSpacing?: number;
}

/** Pads the front of `arr` with `fillValue` so the result length == size.
 *  Result is *right-aligned* (latest item is last in the array). */
function rightPad<T>(arr: T[] = [], size = 6, fillValue: T) {
  const res = new Array(size).fill(fillValue);
  const slice = arr.slice(-size);          // take the newest ≤ size items
  const offset = size - slice.length;      // how many we must pad on the left
  slice.forEach((v, i) => (res[offset + i] = v));
  return res;
}

const MiniBarChart: React.FC<MiniBarChartProps> = ({
  data = [],
  rawData = [],
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
  const sectionWidth = chartWidth / 6; // Always 6 sections

  // Get last 6 months abbreviated names
  const getLastSixMonths = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const today = new Date();
    const currentMonth = today.getMonth();
    const lastSixMonths = [];
    
    // Start from 5 months ago and go forward to current month
    for (let i = 5; i >= 0; i--) {
      const monthIndex = (currentMonth - i + 12) % 12;
      lastSixMonths.push(months[monthIndex]);
    }
    
    return lastSixMonths;
  };

  const monthLabels = getLastSixMonths();

  // --- values -----------------------------------------------------------
  // Now using the redeemed amount from rawData as our primary data
  const normalizedData = rightPad(rawData.map(d => d.redeemed), 6, 0);
  const normalizedRaw = rightPad(rawData, 6, { redeemed: 0, potential: 0 });
  
  // Count months with actual data (non-zero values)
  const monthsWithData = normalizedData.filter(value => value > 0).length;
  const showSparseDataMessage = monthsWithData > 0 && monthsWithData <= 2;

  // Debug logging to help verify month alignment
  console.log('Month Labels:', monthLabels);
  console.log('Data Values:', data);

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

  // Calculate points for the line chart using normalized data
  const getLinePoints = () => {
    const points: { x: number, y: number }[] = [];
    
    normalizedData.forEach((value, index) => {
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

          {normalizedData.map((value, index) => {
            const barHeight = Math.max(4, (value / maxValue) * chartHeight);
            const isLastBar = index === normalizedData.length - 1;
            const hasData = value > 0;
            const percentage = normalizedRaw[index].potential > 0 
              ? (normalizedRaw[index].redeemed / normalizedRaw[index].potential) * 100 
              : 0;

            return (
              <TouchableOpacity
                key={index}
                onPress={() => hasData ? setSelectedBar(selectedBar === index ? null : index) : null}
                style={[
                  styles.barColumn,
                  {
                    width: sectionWidth,
                    alignItems: 'center',
                    zIndex: 2,
                  }
                ]}
              >
                <View style={styles.valueLabelContainer}>
                  <Text style={[
                    styles.valueLabel,
                    !hasData && styles.emptyValueLabel
                  ]}>{formatCurrency(value)}</Text>
                </View>
                <View
                  style={[
                    styles.bar,
                    {
                      width: barWidth,
                      height: barHeight,
                      backgroundColor: isLastBar ? barColor : Colors.light.icon,
                      opacity: hasData ? (isLastBar ? 1 : 0.3) : 0.1,
                    },
                  ]}
                />
                <Text style={[
                  styles.monthLabel,
                  !hasData && styles.emptyMonthLabel
                ]} numberOfLines={1}>{monthLabels[index]}</Text>
                
                {selectedBar === index && hasData && (
                  <View style={getTooltipStyle(index)}>
                    <Text style={styles.tooltipTitle}>{monthLabels[index]} Details</Text>
                    <Text style={styles.tooltipText}>
                      Saved: {formatCurrency(normalizedRaw[index].redeemed)}
                    </Text>
                    <Text style={styles.tooltipText}>
                      Available: {formatCurrency(normalizedRaw[index].potential)}
                    </Text>
                    <Text style={styles.tooltipPercentage}>
                      {percentage.toFixed(0)}% of monthly perks redeemed
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
        <Text style={styles.legendText}>Monthly savings from redeemed perks</Text>
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
  emptyValueLabel: {
    opacity: 0.3,
  },
  emptyMonthLabel: {
    opacity: 0.3,
  },
  tooltipPercentage: {
    fontSize: 11,
    color: Colors.light.icon,
    textAlign: 'center',
    marginTop: 4,
    fontStyle: 'italic',
  },
});

export default MiniBarChart; 