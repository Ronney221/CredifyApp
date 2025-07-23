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
  totalAnnualFees?: number; // Add annual fees for calculating monthly target
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
  totalAnnualFees = 0,
}) => {
  const [selectedBar, setSelectedBar] = useState<number | null>(null);
  const [debugMonthsToShow, setDebugMonthsToShow] = useState<number | null>(null);
  const { width: screenWidth } = useWindowDimensions();
  
  const actualMonthsToShow = getAdaptiveMonthsToShow(rawData);
  const monthsToShow = debugMonthsToShow || actualMonthsToShow;
  const chartWidth = screenWidth - 70; // Account for card margins + internal padding
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
  
  // Calculate user's performance metrics for dynamic messaging
  const totalSaved = normalizedData.reduce((sum, value) => sum + value, 0);
  const monthlyBreakEvenTarget = Math.round(totalAnnualFees / 12);
  const averageMonthlySavings = monthsWithData > 0 ? totalSaved / monthsWithData : 0;
  const isOnTrack = averageMonthlySavings >= monthlyBreakEvenTarget * 0.8; // 80% threshold

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

  // Dynamic messaging system based on user journey stage
  const getSmartMessaging = () => {
    // Stage 1: Complete beginner (0 months)
    if (monthsWithData === 0) {
      return {
        title: "Ready to maximize your cards?",
        description: "Track your perk redemptions to see how much you can save each month!",
        cta: "🚀 Start redeeming perks",
        hint: `Your monthly target: ${formatCurrency(monthlyBreakEvenTarget)} to break even on fees`,
        stage: "beginner"
      };
    }

    // Stage 2: Getting started (1 month)
    if (monthsWithData === 1) {
      const currentSavings = normalizedData.find(d => d > 0) || 0;
      const progressPercent = Math.round((currentSavings / monthlyBreakEvenTarget) * 100);
      
      return {
        title: "Great start!",
        description: `You've saved ${formatCurrency(currentSavings)} in your first tracked month`,
        cta: progressPercent >= 100 
          ? "🎉 You're crushing it! Keep it up" 
          : "💪 Keep tracking to build momentum",
        hint: progressPercent >= 80 
          ? "You're on track to beat your annual fees!" 
          : `${formatCurrency(monthlyBreakEvenTarget - currentSavings)} more to hit monthly target`,
        stage: "starter"
      };
    }

    // Stage 3: Building habits (2-3 months)
    if (monthsWithData >= 2 && monthsWithData <= 3) {
      const progressPercent = Math.round((averageMonthlySavings / monthlyBreakEvenTarget) * 100);
      
      return {
        title: "Building your streak",
        description: `Averaging ${formatCurrency(averageMonthlySavings)}/month across ${monthsWithData} months`,
        cta: isOnTrack 
          ? "🔥 Excellent pace! Stay consistent" 
          : "📈 Time to optimize your strategy",
        hint: isOnTrack 
          ? "You're beating your break-even target!" 
          : "Focus on high-value perks to catch up",
        stage: "building"
      };
    }

    // Stage 4: Experienced user (4-5 months)
    if (monthsWithData >= 4 && monthsWithData <= 5) {
      const trendDirection = normalizedData.slice(-2).every((val, i, arr) => i === 0 || val >= arr[i-1]);
      const progressPercent = Math.round((averageMonthlySavings / monthlyBreakEvenTarget) * 100);
      
      return {
        title: "You're getting the hang of this",
        description: `${monthsWithData} months tracked • ${formatCurrency(totalSaved)} total saved`,
        cta: trendDirection 
          ? "📊 Analyze your patterns for insights" 
          : "🎯 Fine-tune your perk strategy",
        hint: progressPercent >= 100 
          ? `You're ${progressPercent - 100}% ahead of break-even!` 
          : "Consider which perks drive the most value",
        stage: "experienced"
      };
    }

    // Stage 5: Power user (6+ months)
    const yearlyProjection = averageMonthlySavings * 12;
    const roiPercent = Math.round((yearlyProjection / totalAnnualFees) * 100);
    
    return {
      title: "Perk optimization master",
      description: `${monthsWithData} months of data • Projected ${roiPercent}% annual ROI`,
      cta: roiPercent >= 120 
        ? "🏆 Share your success story" 
        : "⚡ Discover advanced optimization tips",
      hint: `On pace for ${formatCurrency(yearlyProjection)} annually vs ${formatCurrency(totalAnnualFees)} in fees`,
      stage: "master"
    };
  };

  const smartMessage = getSmartMessaging();

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
    
    // Account for the container padding and margins
    const containerPadding = 15; // paddingHorizontal from barsContainer
    const containerMargin = 5;   // marginHorizontal from barsContainer
    const availableWidth = chartWidth - (containerPadding * 2);
    
    normalizedData.forEach((value, index) => {
      // Only add points for months with data
      if (value > 0) {
        // Calculate bar center using same logic as flex layout
        // Each bar gets equal space, centered within that space
        const barSpaceWidth = availableWidth / monthsToShow;
        const barCenterX = containerPadding + (barSpaceWidth * index) + (barSpaceWidth / 2);
        
        const barHeight = Math.max(6, (Math.min(value, maxValue) / maxValue) * chartHeight);
        const pointY = chartHeight - barHeight + 25;
        points.push({ x: barCenterX, y: pointY });
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
    <View style={[styles.container, { width: '100%' }]}>
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
            
            // Calculate monthly break-even target (annual fees ÷ 12)
            const monthlyBreakEvenTarget = Math.round(totalAnnualFees / 12);
            const utilizationRate = monthlyBreakEvenTarget > 0 
              ? ((normalizedRaw[index].redeemed + normalizedRaw[index].partial) / monthlyBreakEvenTarget) * 100 
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
                    <Text style={styles.tooltipTitle}>{monthLabels[index].label} Performance</Text>
                    <Text style={styles.tooltipText}>
                      💰 Saved: {formatCurrency(normalizedRaw[index].redeemed + normalizedRaw[index].partial)}
                    </Text>
                    <Text style={styles.tooltipText}>
                      📊 Break-even target: {formatCurrency(monthlyBreakEvenTarget)}
                    </Text>
                    <Text style={styles.tooltipPercentage}>
                      {utilizationRate.toFixed(0)}% of monthly target achieved
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
      <View style={styles.compactMessageContainer}>
        <View style={styles.messageRow}>
          <Text style={styles.compactTitle}>{smartMessage.title}</Text>
          <View style={[
            styles.compactCta,
            { backgroundColor: 
              smartMessage.stage === 'beginner' ? 'rgba(0, 122, 255, 0.15)' :
              smartMessage.stage === 'starter' ? 'rgba(52, 199, 89, 0.15)' :
              smartMessage.stage === 'building' ? 'rgba(255, 149, 0, 0.15)' :
              smartMessage.stage === 'experienced' ? 'rgba(88, 86, 214, 0.15)' :
              'rgba(255, 45, 85, 0.15)'
            }
          ]}>
            <Text style={[
              styles.compactCtaText,
              { color:
                smartMessage.stage === 'beginner' ? '#007AFF' :
                smartMessage.stage === 'starter' ? '#34C759' :
                smartMessage.stage === 'building' ? '#FF9500' :
                smartMessage.stage === 'experienced' ? '#5856D6' :
                '#FF2D55'
              }
            ]}>{smartMessage.cta}</Text>
          </View>
        </View>
        
        <Text style={styles.compactDescription}>{smartMessage.description}</Text>
        <Text style={styles.compactHint}>{smartMessage.hint}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 0,
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
    paddingHorizontal: 15,
    marginHorizontal: 5,
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
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  currentMonthLabel: {
    color: Colors.light.text,
    fontWeight: '800',
  },
  monthLabel: {
    fontSize: 10,
    color: Colors.light.icon,
    marginTop: 5,
    textAlign: 'center',
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  barContainer: {
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  modernBar: {
    borderRadius: 3,
    borderTopLeftRadius: 5,
    borderTopRightRadius: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
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
    backgroundColor: 'rgba(0,0,0,0.04)',
    padding: 8,
    borderRadius: 6,
    marginBottom: 8,
    marginHorizontal: 15,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
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
  compactMessageContainer: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    backgroundColor: Colors.light.background,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  messageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 7,
  },
  compactTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.light.text,
    flex: 1,
    letterSpacing: -0.2,
  },
  compactCta: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    marginLeft: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  compactCtaText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  compactDescription: {
    fontSize: 12,
    color: Colors.light.text,
    lineHeight: 17,
    marginBottom: 4,
    letterSpacing: -0.1,
    fontWeight: '500',
    opacity: 0.8,
  },
  compactHint: {
    fontSize: 11,
    color: Colors.light.tint,
    fontStyle: 'italic',
    opacity: 0.85,
    letterSpacing: -0.1,
    fontWeight: '500',
  },
});

export default MiniBarChart; 