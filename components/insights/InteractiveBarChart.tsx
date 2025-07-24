import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  FadeIn,
  Layout,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import { Svg, Path, Circle, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import * as Haptics from 'expo-haptics';

interface InteractiveBarChartProps {
  data: number[];
  rawData?: { redeemed: number; partial: number; potential: number; monthKey?: string }[];
  totalAnnualFees?: number;
  height?: number;
}

const { width: screenWidth } = Dimensions.get('window');

// Format currency with proper styling
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// Get adaptive months based on current date
const getAdaptiveMonths = (monthsToShow: number) => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  const adaptiveMonths = [];
  
  for (let i = monthsToShow - 1; i >= 0; i--) {
    const monthIndex = (currentMonth - i + 12) % 12;
    const yearOffset = monthIndex > currentMonth ? -1 : 0;
    const year = currentYear + yearOffset;
    const monthKey = `${year}-${(monthIndex + 1).toString().padStart(2, '0')}`;
    adaptiveMonths.push({
      label: months[monthIndex],
      key: monthKey,
      isCurrent: i === 0
    });
  }
  
  return adaptiveMonths;
};

export default function InteractiveBarChart({
  data = [],
  rawData = [],
  totalAnnualFees = 0,
  height = 200,
}: InteractiveBarChartProps) {
  const [selectedBar, setSelectedBar] = useState<number | null>(null);
  
  const monthsToShow = 6;
  const chartWidth = screenWidth - 32; // Account for padding
  const chartHeight = height - 80; // Reduced padding for tighter layout
  
  // Get months and align data
  const months = useMemo(() => getAdaptiveMonths(monthsToShow), [monthsToShow]);
  
  const alignedData = useMemo(() => {
    return months.map(month => {
      const matchingData = rawData.find(d => d.monthKey === month.key);
      return {
        ...month,
        value: matchingData ? matchingData.redeemed + matchingData.partial : 0,
        raw: matchingData || { redeemed: 0, partial: 0, potential: 0 }
      };
    });
  }, [months, rawData]);

  // Calculate maxValue with consistent height capping
  const dataMaxValue = Math.max(...alignedData.map(d => d.value), 1);
  const monthlyTarget = totalAnnualFees / 12;
  
  // Determine the reasonable maximum value for display
  // Cap at 3x target or $500, whichever is higher, but must include the target
  const displayCap = Math.max(monthlyTarget * 3, 500);
  const cappedDataMax = Math.min(dataMaxValue, displayCap);
  
  // Final maxValue for chart scaling - must accommodate target line and data, with padding
  // Ensure minimum value to prevent division by zero
  const maxValue = Math.max(cappedDataMax, monthlyTarget, 100) * 1.1 || 110; // Reduced padding from 1.2 to 1.1
  
  // Calculate performance metrics
  const totalSaved = alignedData.reduce((sum, d) => sum + d.value, 0);
  const monthsWithData = alignedData.filter(d => d.value > 0).length;
  const averageMonthly = monthsWithData > 0 ? totalSaved / monthsWithData : 0;
  const isOnTrack = averageMonthly >= monthlyTarget * 0.8;

  // Animation values for bars
  const barAnimations = alignedData.map(() => useSharedValue(0));
  
  useEffect(() => {
    barAnimations.forEach((animation, index) => {
      // Use display cap for consistent height calculation
      const cappedValue = Math.min(alignedData[index].value, displayCap);
      animation.value = withDelay(
        index * 100,
        withSpring(cappedValue / maxValue, {
          damping: 15,
          stiffness: 150,
        })
      );
    });
  }, [alignedData, maxValue, displayCap]);


  const handleBarPress = async (index: number) => {
    if (Platform.OS === 'ios') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setSelectedBar(selectedBar === index ? null : index);
  };

  const getPerformanceMessage = () => {
    if (monthsWithData === 0) {
      return {
        title: 'Start your journey',
        description: 'Begin tracking perks to see your monthly performance',
        status: 'start' as const,
      };
    }

    if (isOnTrack) {
      return {
        title: 'Excellent progress!',
        description: `Averaging ${formatCurrency(averageMonthly)}/month • On track to beat fees`,
        status: 'success' as const,
      };
    } else {
      return {
        title: 'Building momentum',
        description: `${formatCurrency(monthlyTarget - averageMonthly)} more per month to reach target`,
        status: 'building' as const,
      };
    }
  };

  const performanceMessage = getPerformanceMessage();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>Monthly Performance</Text>
          <View style={[
            styles.statusBadge,
            performanceMessage.status === 'success' && styles.statusSuccess,
            performanceMessage.status === 'building' && styles.statusBuilding,
            performanceMessage.status === 'start' && styles.statusStart,
          ]}>
            <Ionicons 
              name={
                performanceMessage.status === 'success' ? 'trending-up' :
                performanceMessage.status === 'building' ? 'analytics' :
                'play-circle'
              }
              size={12}
              color={
                performanceMessage.status === 'success' ? '#34C759' :
                performanceMessage.status === 'building' ? '#FF9500' :
                '#007AFF'
              }
            />
            <Text style={[
              styles.statusText,
              performanceMessage.status === 'success' && styles.statusTextSuccess,
              performanceMessage.status === 'building' && styles.statusTextBuilding,
              performanceMessage.status === 'start' && styles.statusTextStart,
            ]}>
              {performanceMessage.title}
            </Text>
          </View>
        </View>

      </View>

      {/* Chart */}
      <View style={[styles.chartContainer, { height: chartHeight + 20 }]}>

        {/* Target line */}
        {monthlyTarget > 0 && (
          <View style={[
            styles.targetLine,
            { 
              bottom: 40 + (monthlyTarget / maxValue) * (chartHeight - 40)
            }
          ]}>
            <Svg width="100%" height={2} style={styles.targetLineSvg}>
              <Defs>
                <SvgLinearGradient id="dashGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <Stop offset="0%" stopColor="#34C759" stopOpacity="0.8" />
                  <Stop offset="50%" stopColor="#34C759" stopOpacity="1" />
                  <Stop offset="100%" stopColor="#34C759" stopOpacity="0.8" />
                </SvgLinearGradient>
              </Defs>
              <Path
                d={`M 0 1 L ${chartWidth} 1`}
                stroke="url(#dashGradient)"
                strokeWidth="2"
                strokeDasharray="6 4"
                strokeLinecap="round"
              />
            </Svg>
          </View>
        )}

        {/* Bars */}
        <View style={[styles.barsContainer, { height: chartHeight }]}>
          {alignedData.map((monthData, index) => {
            const isSelected = selectedBar === index;
            const hasValue = monthData.value > 0;
            const isCurrentMonth = monthData.isCurrent;

            const animatedStyle = useAnimatedStyle(() => {
              const normalizedValue = Math.min(barAnimations[index].value, 1); // Ensure value doesn't exceed 1
              const availableHeight = chartHeight - 20; // Increased buffer for labels
              const barHeight = Math.max(normalizedValue * availableHeight, hasValue ? 4 : 2); // Minimum height for visibility
              return {
                height: Math.min(barHeight, availableHeight), // Constrain to available height
              };
            });

            return (
              <TouchableOpacity
                key={monthData.key}
                style={[
                  styles.barColumn, 
                  styles.clickableArea,
                  isSelected && styles.selectedBarColumn
                ]}
                onPress={() => handleBarPress(index)}
                activeOpacity={0.7}
              >
                {/* Value label */}
                {hasValue && (
                  <Animated.View 
                    entering={FadeIn.delay(index * 100 + 300)}
                    style={[
                      styles.dynamicValueLabel,
                      {
                        // Position labels above bars with increased clearance
                        bottom: Math.min(
                          (Math.min(monthData.value, displayCap) / maxValue) * (chartHeight - 20) + 35,
                          chartHeight - 5
                        )
                      }
                    ]}
                  >
                    <Text style={[
                      styles.valueLabel,
                      isCurrentMonth && styles.currentValueLabel
                    ]}>
                      {formatCurrency(monthData.value)}
                      {monthData.value > displayCap && (
                        <Text style={styles.cappedIndicator}>+</Text>
                      )}
                    </Text>
                  </Animated.View>
                )}

                {/* Stacked Bar */}
                <View style={styles.barContainer}>
                  <Animated.View style={[styles.barWrapper, animatedStyle]}>
                    {hasValue ? (
                      <View style={styles.stackContainer}>
                        {/* Redeemed portion (bottom) */}
                        {monthData.raw.redeemed > 0 && (
                          <LinearGradient
                            colors={
                              isCurrentMonth ? ['#007AFF', '#0056CC'] : ['#34C759', '#2D7D42']
                            }
                            start={{ x: 0, y: 0 }}
                            end={{ x: 0, y: 1 }}
                            style={[
                              styles.stackedBarSegment,
                              {
                                flex: monthData.raw.redeemed,
                                borderBottomLeftRadius: 4,
                                borderBottomRightRadius: 4,
                                borderTopLeftRadius: monthData.raw.partial > 0 ? 0 : 6,
                                borderTopRightRadius: monthData.raw.partial > 0 ? 0 : 6,
                              },
                              isSelected && styles.selectedBar,
                              isCurrentMonth && styles.currentBar,
                            ]}
                          />
                        )}
                        {/* Partial portion (top) */}
                        {monthData.raw.partial > 0 && (
                          <LinearGradient
                            colors={
                              isCurrentMonth ? ['#5AC8FA', '#4A90E2'] : ['#85E085', '#4CD964']
                            }
                            start={{ x: 0, y: 0 }}
                            end={{ x: 0, y: 1 }}
                            style={[
                              styles.stackedBarSegment,
                              {
                                flex: monthData.raw.partial,
                                borderTopLeftRadius: 6,
                                borderTopRightRadius: 6,
                                borderBottomLeftRadius: monthData.raw.redeemed > 0 ? 0 : 4,
                                borderBottomRightRadius: monthData.raw.redeemed > 0 ? 0 : 4,
                              },
                              isSelected && styles.selectedBar,
                              isCurrentMonth && styles.currentBar,
                            ]}
                          />
                        )}
                      </View>
                    ) : (
                      <LinearGradient
                        colors={['#F2F2F7', '#E5E5EA']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 0, y: 1 }}
                        style={[styles.bar]}
                      />
                    )}
                  </Animated.View>
                </View>

                {/* Month label */}
                <Text style={[
                  styles.monthLabel,
                  isCurrentMonth && styles.currentMonthLabel,
                  !hasValue && styles.emptyMonthLabel
                ]}>
                  {monthData.label}
                  {isCurrentMonth && (
                    <Text style={styles.currentMonthIndicator}> •</Text>
                  )}
                </Text>

              </TouchableOpacity>
            );
          })}
        </View>

        {/* Dynamic Tooltip */}
        {selectedBar !== null && (
          <Animated.View 
            entering={FadeIn.duration(200)}
            style={[
              styles.tooltip,
              {
                left: selectedBar <= 1 ? 10 : 
                      selectedBar >= alignedData.length - 2 ? chartWidth - 140 :
                      (selectedBar / (alignedData.length - 1)) * chartWidth - 65,
              }
            ]}
          >
            <View style={styles.tooltipHeader}>
              <Text style={styles.tooltipTitle}>{alignedData[selectedBar].label} Summary</Text>
              <TouchableOpacity 
                style={styles.helpIcon}
                onPress={() => {
                  // Could implement help modal here
                }}
              >
                <Ionicons name="help-circle-outline" size={14} color="rgba(255,255,255,0.7)" />
              </TouchableOpacity>
            </View>
            {alignedData[selectedBar].value > 0 ? (
              <>
                <View style={styles.tooltipRow}>
                  <Text style={styles.tooltipLabel}>Fully Used:</Text>
                  <Text style={styles.tooltipValue}>
                    {formatCurrency(alignedData[selectedBar].raw.redeemed)}
                  </Text>
                </View>
                {alignedData[selectedBar].raw.partial > 0 && (
                  <View style={styles.tooltipRow}>
                    <Text style={styles.tooltipLabel}>Partially Used:</Text>
                    <Text style={styles.tooltipValue}>
                      {formatCurrency(alignedData[selectedBar].raw.partial)}
                    </Text>
                  </View>
                )}
                <View style={styles.tooltipDivider} />
                <View style={styles.tooltipRow}>
                  <Text style={styles.tooltipLabel}>vs Target:</Text>
                  <Text style={[
                    styles.tooltipValue,
                    { color: alignedData[selectedBar].value >= monthlyTarget ? '#34C759' : '#FF9500' }
                  ]}>
                    {Math.round((alignedData[selectedBar].value / monthlyTarget) * 100)}%
                  </Text>
                </View>
              </>
            ) : (
              <View style={styles.tooltipRow}>
                <Text style={styles.tooltipLabel}>No activity this month</Text>
              </View>
            )}
          </Animated.View>
        )}
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: '#34C759' }]} />
          <Text style={styles.legendText}>Redeemed</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: '#85E085' }]} />
          <Text style={styles.legendText}>Partial</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: '#007AFF' }]} />
          <Text style={styles.legendText}>Current Month</Text>
        </View>
        {monthlyTarget > 0 && (
          <View style={styles.legendItem}>
            <View style={[styles.legendDash]} />
            <Text style={styles.legendText}>{formatCurrency(monthlyTarget)} Target</Text>
          </View>
        )}
      </View>

      {/* Performance summary */}
      <View style={styles.summary}>
        <Text style={styles.summaryDescription}>
          {performanceMessage.description}
        </Text>
        
        {monthsWithData > 0 && (
          <View style={styles.metricsRow}>
            <View style={styles.metric}>
              <Text style={styles.metricValue}>{formatCurrency(totalSaved)}</Text>
              <Text style={styles.metricLabel}>Total Saved</Text>
            </View>
            <View style={styles.metric}>
              <Text style={styles.metricValue}>{monthsWithData}</Text>
              <Text style={styles.metricLabel}>Active Months</Text>
            </View>
            <View style={styles.metric}>
              <Text style={[
                styles.metricValue,
                { color: isOnTrack ? '#34C759' : '#FF9500' }
              ]}>
                {Math.round((averageMonthly / monthlyTarget) * 100)}%
              </Text>
              <Text style={styles.metricLabel}>Target Progress</Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    margin: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'visible',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  headerLeft: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 8,
    letterSpacing: -0.41,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#F2F2F7',
    gap: 4,
    alignSelf: 'flex-start',
  },
  statusSuccess: {
    backgroundColor: 'rgba(52, 199, 89, 0.1)',
  },
  statusBuilding: {
    backgroundColor: 'rgba(255, 149, 0, 0.1)',
  },
  statusStart: {
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
  },
  statusTextSuccess: {
    color: '#34C759',
  },
  statusTextBuilding: {
    color: '#FF9500',
  },
  statusTextStart: {
    color: '#007AFF',
  },
  chartContainer: {
    position: 'relative',
    marginBottom: 16,
    overflow: 'visible',
  },
  targetLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 1,
  },
  targetLineSvg: {
    width: '100%',
  },
  barsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    flex: 1,
    paddingTop: 20,
    overflow: 'visible',
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
    position: 'relative',
  },
  clickableArea: {
    paddingVertical: 10,
    paddingHorizontal: 8,
    minHeight: 80,
  },
  selectedBarColumn: {
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    borderRadius: 8,
  },
  dynamicValueLabel: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  valueLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#8E8E93',
    textAlign: 'center',
  },
  currentValueLabel: {
    color: '#007AFF',
    fontWeight: '700',
  },
  cappedIndicator: {
    color: '#FF9500',
    fontWeight: '700',
  },
  barContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    width: '100%',
  },
  barWrapper: {
    width: 24,
    borderRadius: 4,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    minHeight: 4,
  },
  bar: {
    width: '100%',
    height: '100%',
    borderRadius: 4,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
  },
  stackContainer: {
    width: '100%',
    height: '100%',
    flexDirection: 'column-reverse',
  },
  stackedBarSegment: {
    width: '100%',
  },
  selectedBar: {
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  currentBar: {
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  monthLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#8E8E93',
    marginTop: 8,
    textAlign: 'center',
  },
  currentMonthLabel: {
    color: '#007AFF',
    fontWeight: '700',
  },
  emptyMonthLabel: {
    opacity: 0.5,
  },
  currentMonthIndicator: {
    color: '#007AFF',
    fontWeight: '700',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexWrap: 'wrap',
    gap: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 2,
    paddingVertical: 1,
  },
  legendColor: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendDash: {
    width: 12,
    height: 2,
    backgroundColor: '#34C759',
    borderRadius: 1,
  },
  legendText: {
    fontSize: 10,
    fontWeight: '500',
    color: '#8E8E93',
  },
  tooltip: {
    position: 'absolute',
    bottom: 110,
    backgroundColor: '#1C1C1E',
    borderRadius: 8,
    padding: 12,
    minWidth: 130,
    maxWidth: 160,
    zIndex: 20000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 8,
  },
  tooltipHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  tooltipTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
  },
  helpIcon: {
    padding: 2,
  },
  tooltipDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginVertical: 6,
  },
  tooltipRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  tooltipLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  tooltipValue: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  summary: {
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E5EA',
  },
  summaryDescription: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 12,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  metric: {
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.02)',
    marginHorizontal: 4,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 2,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#8E8E93',
    textAlign: 'center',
  },
});