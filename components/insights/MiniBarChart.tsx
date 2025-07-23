import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, useWindowDimensions, TouchableOpacity, Animated } from 'react-native';
import { Colors } from '../../constants/Colors';
import Svg, { Path, Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { calculateRedemptionValues } from '../../utils/insights-calculations';
import { logger } from '../../utils/logger';

interface MiniBarChartProps {
  data: number[]; // Now represents dollar amounts saved
  rawData?: { redeemed: number; partial: number; potential: number; monthKey?: string }[]; // Added partial field
  height?: number;
  barColor?: string;
  barWidth?: number;
  barSpacing?: number;
  debugMode?: boolean;
}

const getAdaptiveMonthsToShow = (data: any[]) => {
  const monthsWithData = data.filter(d => d.redeemed > 0 || d.partial > 0).length;
  if (monthsWithData === 0) return 3; // Show at least 3 months for context
  if (monthsWithData <= 2) return 3;
  if (monthsWithData <= 4) return 4;
  return Math.min(monthsWithData, 6);
};

const MiniBarChart: React.FC<MiniBarChartProps> = ({
  data = [],
  rawData = [],
  height = 120,
  barColor = Colors.light.tint,
  barWidth = 20,
  barSpacing = 12,
  debugMode = false,
}) => {
  const [selectedBar, setSelectedBar] = useState<number | null>(null);
  const [debugMonthsToShow, setDebugMonthsToShow] = useState<number | null>(null);
  const { width: screenWidth } = useWindowDimensions();
  
  const actualMonthsToShow = getAdaptiveMonthsToShow(rawData);
  const monthsToShow = debugMonthsToShow || actualMonthsToShow;
  const chartWidth = screenWidth - 60; // More conservative padding
  const chartHeight = height - 60;
  const sectionWidth = chartWidth / monthsToShow;

  const getAdaptiveMonths = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const adaptiveMonths = [];
    
    // Start from (monthsToShow - 1) months ago and go forward to current month
    for (let i = monthsToShow - 1; i >= 0; i--) {
      const monthIndex = (currentMonth - i + 12) % 12;
      const yearOffset = monthIndex > currentMonth ? -1 : 0;
      const year = currentYear + yearOffset;
      const monthKey = `${year}-${(monthIndex + 1).toString().padStart(2, '0')}`;
      adaptiveMonths.push({
        label: months[monthIndex],
        key: monthKey
      });
    }
    
    return adaptiveMonths;
  };

  const monthLabels = getAdaptiveMonths();
  
  // Align data with month keys
  const alignedData = monthLabels.map(month => {
    // Find matching data point by monthKey
    const matchingData = rawData.find(d => d.monthKey === month.key);
    return matchingData || { redeemed: 0, partial: 0, potential: 0 };
  });

  // Now using the aligned data for our normalized values - include partial redemptions in saved amount
  const normalizedData = alignedData.map(d => d.redeemed + d.partial);
  const normalizedRaw = alignedData;

  // Debug logging to help verify month alignment
  logger.log('Month Labels:', monthLabels);
  logger.log('Aligned Raw Data:', alignedData.map((d, i) => ({
    month: monthLabels[i].key,
    data: d
  })));

  // Dynamically calculate maxValue to handle outliers and prevent overflow
  const sortedData = [...normalizedData].filter(v => v > 0).sort((a, b) => a - b);
  const p90 = sortedData[Math.floor(sortedData.length * 0.9)];
  const maxReasonableValue = p90 * 1.05;
  const maxValue = Math.max(...normalizedData, maxReasonableValue, 1);

  // Count months with actual data (non-zero values)
  const monthsWithData = normalizedData.filter(value => value > 0).length;
  const showSparseDataMessage = monthsWithData > 0 && monthsWithData <= 1;

  // Create animated values for each bar
  const [animatedValues] = useState(() => 
    Array.from({ length: 6 }, () => new Animated.Value(0))
  );

  // Animation effect
  useEffect(() => {
    const animations = normalizedData.map((value, index) => {
      if (animatedValues[index]) {
        return Animated.timing(animatedValues[index], {
          toValue: value,
          duration: 600 + (index * 80),
          useNativeDriver: false,
        });
      }
      return null;
    }).filter(Boolean);

    if (animations.length > 0) {
      Animated.stagger(80, animations).start();
    }
  }, [normalizedData, animatedValues]);

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
    const isRightEdge = index === normalizedData.length - 1;
    
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
      // Only add points for months with data
      if (value > 0) {
        // Center of each bar section
        const x = (sectionWidth * index) + (sectionWidth / 2);
        const y = chartHeight - (Math.max(6, (Math.min(value, maxValue) / maxValue) * chartHeight)) + 25;
        points.push({ x, y });
      }
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
    <View style={[styles.container, { width: screenWidth - 30, height: height + (showSparseDataMessage ? 80 : 40) }]}>
      {debugMode && (
        <View style={styles.debugContainer}>
          <Text style={styles.debugText}>Debug: Months to show</Text>
          <View style={styles.debugButtons}>
            {[3, 4, 5, 6].map(months => (
              <TouchableOpacity
                key={months}
                style={[
                  styles.debugButton,
                  debugMonthsToShow === months && styles.debugButtonActive
                ]}
                onPress={() => setDebugMonthsToShow(debugMonthsToShow === months ? null : months)}
              >
                <Text style={[
                  styles.debugButtonText,
                  debugMonthsToShow === months && styles.debugButtonTextActive
                ]}>{months}M</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.debugInfo}>
            Auto: {actualMonthsToShow} | Current: {monthsToShow} | Data points: {monthsWithData}
          </Text>
        </View>
      )}
      
      <View style={styles.chartContent}>
        <View style={[styles.barsContainer, { width: chartWidth }]}>
          {/* Modern gradient background - only show line if we have multiple data points */}
          {linePoints.length > 1 && (
            <View style={[StyleSheet.absoluteFill, { zIndex: 0 }]}>
              <Svg width={chartWidth} height={chartHeight + 30}>
                <Defs>
                  <LinearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <Stop offset="0%" stopColor={barColor} stopOpacity="0.4" />
                    <Stop offset="50%" stopColor={barColor} stopOpacity="0.8" />
                    <Stop offset="100%" stopColor={barColor} stopOpacity="0.4" />
                  </LinearGradient>
                </Defs>
                <Path
                  d={pathData}
                  stroke="url(#lineGradient)"
                  strokeWidth="2.5"
                  fill="none"
                  opacity={0.8}
                />
              </Svg>
            </View>
          )}

          {normalizedData.map((value, index) => {
            const barHeight = Math.max(6, (Math.min(value, maxValue) / maxValue) * chartHeight);
            const isCurrentMonth = index === normalizedData.length - 1;
            const hasData = value > 0;
            const percentage = normalizedRaw[index].potential > 0 
              ? ((normalizedRaw[index].redeemed + normalizedRaw[index].partial) / normalizedRaw[index].potential) * 100 
              : 0;

            const getBarStyle = () => {
              if (!hasData) {
                return {
                  backgroundColor: Colors.light.icon,
                  opacity: 0.1,
                };
              }
              
              if (isCurrentMonth) {
                return {
                  backgroundColor: barColor,
                  shadowColor: barColor,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  elevation: 6,
                };
              }
              
              return {
                backgroundColor: Colors.light.icon,
                opacity: 0.6,
              };
            };

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
                activeOpacity={hasData ? 0.7 : 1}
              >
                <View style={styles.valueLabelContainer}>
                  {hasData && (
                    <Text style={[
                      styles.valueLabel,
                      isCurrentMonth && styles.currentMonthLabel
                    ]}>{formatCurrency(value)}</Text>
                  )}
                </View>
                <View style={[styles.barContainer, { height: chartHeight }]}>
                  <View
                    style={[
                      styles.modernBar,
                      {
                        width: Math.max(Math.min(barWidth, sectionWidth * 0.6), 12),
                        height: barHeight,
                        ...getBarStyle(),
                      },
                    ]}
                  />
                </View>
                <Text style={[
                  styles.monthLabel,
                  !hasData && styles.emptyMonthLabel,
                  isCurrentMonth && styles.currentMonthLabel
                ]} numberOfLines={1}>{monthLabels[index].label}</Text>
                
                {selectedBar === index && hasData && (
                  <View style={getTooltipStyle(index)}>
                    <Text style={styles.tooltipTitle}>{monthLabels[index].label} Savings</Text>
                    <Text style={styles.tooltipText}>
                      💰 Saved: {formatCurrency(normalizedRaw[index].redeemed + normalizedRaw[index].partial)}
                    </Text>
                    <Text style={styles.tooltipText}>
                      🎯 Available: {formatCurrency(normalizedRaw[index].potential)}
                    </Text>
                    <Text style={styles.tooltipPercentage}>
                      {percentage.toFixed(0)}% utilization rate
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}

          {/* Modern dots overlay - only show if we have line data */}
          {linePoints.length > 1 && (
            <View style={[StyleSheet.absoluteFill, { zIndex: 3, pointerEvents: 'none' }]}>
              <Svg width={chartWidth} height={chartHeight + 30}>
                {linePoints.map((point, index) => (
                  <Circle
                    key={index}
                    cx={point.x}
                    cy={point.y}
                    r="4"
                    fill={Colors.light.background}
                    stroke={barColor}
                    strokeWidth="2"
                    opacity={0.9}
                  />
                ))}
              </Svg>
            </View>
          )}
        </View>
      </View>
      <View style={styles.legendContainer}>
        <Text style={styles.legendText}>
          {monthsWithData === 0 
            ? "Start using your perks to see your savings grow!" 
            : `${monthsWithData === 1 ? 'First month' : `${monthsWithData} months`} of perk redemption tracking`}
        </Text>
        {showSparseDataMessage && (
          <Text style={styles.encouragementText}>
            🚀 You're just getting started! Keep redeeming perks to unlock insights.
          </Text>
        )}
        {monthsWithData >= 3 && (
          <Text style={styles.trendText}>
            💡 Tip: Tap any bar to see detailed breakdown
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 15,
    backgroundColor: Colors.light.background,
  },
  chartContent: {
    flex: 1,
    alignItems: 'center',
  },
  barsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    backgroundColor: Colors.light.background,
    paddingHorizontal: 4,
  },
  barColumn: {
    justifyContent: 'flex-end',
    position: 'relative',
    flex: 1,
    alignItems: 'center',
    maxWidth: 80,
  },
  valueLabelContainer: {
    height: 18,
    justifyContent: 'center',
    marginBottom: 4,
    alignItems: 'center',
  },
  valueLabel: {
    fontSize: 10,
    color: Colors.light.icon,
    fontWeight: '600',
    textAlign: 'center',
  },
  currentMonthLabel: {
    color: Colors.light.text,
    fontWeight: '700',
  },
  monthLabel: {
    fontSize: 10,
    color: Colors.light.icon,
    marginTop: 4,
    textAlign: 'center',
    fontWeight: '600',
  },
  barContainer: {
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  modernBar: {
    borderRadius: 4,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
  },
  legendContainer: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  legendText: {
    fontSize: 11,
    color: Colors.light.icon,
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: 16,
  },
  tooltip: {
    position: 'absolute',
    bottom: '100%',
    backgroundColor: Colors.light.background,
    padding: 10,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 6,
    marginBottom: 8,
    minWidth: 130,
    zIndex: 999,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
  },
  tooltipTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: 4,
    textAlign: 'center',
  },
  tooltipText: {
    fontSize: 11,
    color: Colors.light.text,
    textAlign: 'center',
    marginBottom: 1,
    fontWeight: '500',
  },
  encouragementText: {
    fontSize: 12,
    color: Colors.light.tint,
    marginTop: 4,
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: 16,
  },
  trendText: {
    fontSize: 10,
    color: Colors.light.icon,
    marginTop: 2,
    textAlign: 'center',
    fontStyle: 'italic',
    opacity: 0.7,
  },
  emptyValueLabel: {
    opacity: 0.3,
  },
  emptyMonthLabel: {
    opacity: 0.4,
  },
  tooltipPercentage: {
    fontSize: 10,
    color: Colors.light.tint,
    textAlign: 'center',
    marginTop: 2,
    fontWeight: '600',
  },
  debugContainer: {
    backgroundColor: 'rgba(0,0,0,0.05)',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  debugText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  debugButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 8,
  },
  debugButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: Colors.light.background,
    borderWidth: 1,
    borderColor: Colors.light.icon,
  },
  debugButtonActive: {
    backgroundColor: Colors.light.tint,
    borderColor: Colors.light.tint,
  },
  debugButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.light.icon,
  },
  debugButtonTextActive: {
    color: Colors.light.background,
  },
  debugInfo: {
    fontSize: 10,
    color: Colors.light.icon,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default MiniBarChart; 