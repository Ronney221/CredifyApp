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
  const [showTrend, setShowTrend] = useState(true);
  
  const monthsToShow = 6;
  const chartWidth = screenWidth - 32; // Account for padding
  const chartHeight = height - 100;
  
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

  const maxValue = Math.max(...alignedData.map(d => d.value), totalAnnualFees / 12, 100);
  const monthlyTarget = totalAnnualFees / 12;
  
  // Calculate performance metrics
  const totalSaved = alignedData.reduce((sum, d) => sum + d.value, 0);
  const monthsWithData = alignedData.filter(d => d.value > 0).length;
  const averageMonthly = monthsWithData > 0 ? totalSaved / monthsWithData : 0;
  const isOnTrack = averageMonthly >= monthlyTarget * 0.8;

  // Animation values for bars
  const barAnimations = alignedData.map(() => useSharedValue(0));
  
  useEffect(() => {
    barAnimations.forEach((animation, index) => {
      animation.value = withDelay(
        index * 100,
        withSpring(alignedData[index].value / maxValue, {
          damping: 15,
          stiffness: 150,
        })
      );
    });
  }, [alignedData, maxValue]);

  // Generate trend line path
  const trendPath = useMemo(() => {
    const dataPoints = alignedData.filter(d => d.value > 0);
    if (dataPoints.length < 2) return '';

    const barWidth = chartWidth / monthsToShow;
    const points = dataPoints.map((d, index) => {
      const originalIndex = alignedData.indexOf(d);
      const x = barWidth * (originalIndex + 0.5);
      const y = chartHeight - (d.value / maxValue) * chartHeight;
      return { x, y };
    });

    if (points.length < 2) return '';

    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const prevPoint = points[i - 1];
      const currPoint = points[i];
      const midX = (prevPoint.x + currPoint.x) / 2;
      path += ` Q ${midX} ${prevPoint.y} ${currPoint.x} ${currPoint.y}`;
    }

    return path;
  }, [alignedData, chartWidth, chartHeight, maxValue, monthsToShow]);

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

        <TouchableOpacity
          style={styles.trendToggle}
          onPress={() => setShowTrend(!showTrend)}
          activeOpacity={0.7}
        >
          <Ionicons 
            name={showTrend ? 'analytics' : 'analytics-outline'} 
            size={20} 
            color={showTrend ? '#007AFF' : '#8E8E93'} 
          />
        </TouchableOpacity>
      </View>

      {/* Chart */}
      <View style={[styles.chartContainer, { height: chartHeight + 40 }]}>
        {/* Trend line */}
        {showTrend && trendPath && (
          <View style={StyleSheet.absoluteFill}>
            <Svg width={chartWidth} height={chartHeight + 40}>
              <Defs>
                <SvgLinearGradient id="trendGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <Stop offset="0%" stopColor="#007AFF" stopOpacity="0.3" />
                  <Stop offset="50%" stopColor="#007AFF" stopOpacity="0.8" />
                  <Stop offset="100%" stopColor="#007AFF" stopOpacity="0.3" />
                </SvgLinearGradient>
              </Defs>
              <Path
                d={trendPath}
                stroke="url(#trendGradient)"
                strokeWidth="3"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </View>
        )}

        {/* Target line */}
        {monthlyTarget > 0 && (
          <View style={[
            styles.targetLine,
            { bottom: (monthlyTarget / maxValue) * chartHeight }
          ]}>
            <View style={styles.targetLineDash} />
            <Text style={styles.targetLineLabel}>
              Target {formatCurrency(monthlyTarget)}
            </Text>
          </View>
        )}

        {/* Bars */}
        <View style={styles.barsContainer}>
          {alignedData.map((monthData, index) => {
            const animatedStyle = useAnimatedStyle(() => {
              const barHeight = barAnimations[index].value * chartHeight;
              return {
                height: barHeight,
              };
            });

            const isSelected = selectedBar === index;
            const hasValue = monthData.value > 0;
            const isCurrentMonth = monthData.isCurrent;

            return (
              <TouchableOpacity
                key={monthData.key}
                style={styles.barColumn}
                onPress={() => hasValue && handleBarPress(index)}
                activeOpacity={hasValue ? 0.7 : 1}
              >
                {/* Value label */}
                <View style={styles.valueLabelContainer}>
                  {hasValue && (
                    <Animated.Text 
                      entering={FadeIn.delay(index * 100 + 300)}
                      style={[
                        styles.valueLabel,
                        isCurrentMonth && styles.currentValueLabel
                      ]}
                    >
                      {formatCurrency(monthData.value)}
                    </Animated.Text>
                  )}
                </View>

                {/* Bar */}
                <View style={styles.barContainer}>
                  <Animated.View style={[styles.barWrapper, animatedStyle]}>
                    <LinearGradient
                      colors={
                        isCurrentMonth ? ['#007AFF', '#0056CC'] :
                        hasValue ? ['#34C759', '#32D74B'] :
                        ['#F2F2F7', '#E5E5EA']
                      }
                      start={{ x: 0, y: 0 }}
                      end={{ x: 0, y: 1 }}
                      style={[
                        styles.bar,
                        isSelected && styles.selectedBar,
                        isCurrentMonth && styles.currentBar,
                      ]}
                    />
                  </Animated.View>
                </View>

                {/* Month label */}
                <Text style={[
                  styles.monthLabel,
                  isCurrentMonth && styles.currentMonthLabel,
                  !hasValue && styles.emptyMonthLabel
                ]}>
                  {monthData.label}
                </Text>

                {/* Tooltip */}
                {isSelected && hasValue && (
                  <Animated.View 
                    entering={FadeIn.duration(200)}
                    style={[
                      styles.tooltip,
                      index === 0 && styles.tooltipLeft,
                      index === alignedData.length - 1 && styles.tooltipRight,
                    ]}
                  >
                    <Text style={styles.tooltipTitle}>{monthData.label} Summary</Text>
                    <View style={styles.tooltipRow}>
                      <Text style={styles.tooltipLabel}>Redeemed:</Text>
                      <Text style={styles.tooltipValue}>
                        {formatCurrency(monthData.raw.redeemed)}
                      </Text>
                    </View>
                    {monthData.raw.partial > 0 && (
                      <View style={styles.tooltipRow}>
                        <Text style={styles.tooltipLabel}>Partial:</Text>
                        <Text style={styles.tooltipValue}>
                          {formatCurrency(monthData.raw.partial)}
                        </Text>
                      </View>
                    )}
                    <View style={styles.tooltipRow}>
                      <Text style={styles.tooltipLabel}>vs Target:</Text>
                      <Text style={[
                        styles.tooltipValue,
                        { color: monthData.value >= monthlyTarget ? '#34C759' : '#FF9500' }
                      ]}>
                        {Math.round((monthData.value / monthlyTarget) * 100)}%
                      </Text>
                    </View>
                  </Animated.View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
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
  trendToggle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chartContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  targetLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 1,
  },
  targetLineDash: {
    flex: 1,
    height: 1,
    backgroundColor: '#34C759',
    opacity: 0.6,
  },
  targetLineLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: '#34C759',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 4,
    marginLeft: 8,
  },
  barsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: '100%',
    paddingTop: 20,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
    position: 'relative',
  },
  valueLabelContainer: {
    height: 16,
    justifyContent: 'center',
    marginBottom: 4,
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
  tooltip: {
    position: 'absolute',
    bottom: '110%',
    backgroundColor: '#1C1C1E',
    borderRadius: 8,
    padding: 10,
    minWidth: 120,
    left: '50%',
    marginLeft: -60,
    zIndex: 10,
  },
  tooltipLeft: {
    left: 0,
    marginLeft: 0,
  },
  tooltipRight: {
    right: 0,
    left: 'auto',
    marginLeft: 0,
  },
  tooltipTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 6,
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
    justifyContent: 'space-around',
  },
  metric: {
    alignItems: 'center',
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