import React, { useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Svg, Polyline } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  Extrapolate,
  FadeIn,
  withRepeat,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';

interface HeroInsightCardProps {
  totalEarned: number;
  totalAnnualFees: number;
  monthlyTrend: number[]; // Last 6 months percentage data
  onPress?: () => void;
  scrollProgress?: Animated.SharedValue<number>;
}

const { width: screenWidth } = Dimensions.get('window');

export default function HeroInsightCard({
  totalEarned,
  totalAnnualFees,
  monthlyTrend = [],
  onPress,
  scrollProgress,
}: HeroInsightCardProps) {
  const scale = useSharedValue(0.95);
  const shimmer = useSharedValue(0);
  const pulseScale = useSharedValue(1);
  
  const roi = totalAnnualFees > 0 ? Math.round((totalEarned / totalAnnualFees) * 100) : 0;
  const netGain = totalEarned - totalAnnualFees;
  const isPositiveROI = roi >= 100;
  
  // Format currency with proper styling
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Determine gradient colors based on ROI
  const gradientColors = useMemo(() => {
    if (isPositiveROI) {
      return ['#34C759', '#32D74B', '#30E158']; // Green gradient for positive ROI
    } else {
      return ['#FF9500', '#FF8A00', '#FF7F00']; // Orange gradient for negative ROI
    }
  }, [isPositiveROI]);

  // Background gradient with subtle animation
  const backgroundColors = useMemo(() => {
    if (isPositiveROI) {
      return ['#F0FFF4', '#E6FFED', '#FFFFFF'];
    } else {
      return ['#FFF8F0', '#FFF3E6', '#FFFFFF'];
    }
  }, [isPositiveROI]);

  useEffect(() => {
    // Entrance animation
    scale.value = withSpring(1, {
      damping: 15,
      stiffness: 150,
    });

    // Shimmer effect
    shimmer.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 2000, easing: Easing.inOut(Easing.ease) })
      ),
      -1
    );

    // Subtle pulse for the ROI badge
    if (isPositiveROI) {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.05, { duration: 1500 }),
          withTiming(1, { duration: 1500 })
        ),
        -1
      );
    }
  }, [scale, shimmer, pulseScale, isPositiveROI]);

  const animatedCardStyle = useAnimatedStyle(() => {
    const scaleWithScroll = scrollProgress
      ? interpolate(
          scrollProgress.value,
          [0, 100],
          [1, 0.95],
          Extrapolate.CLAMP
        )
      : 1;

    return {
      transform: [
        { scale: scale.value * scaleWithScroll },
      ],
    };
  });

  const animatedShimmerStyle = useAnimatedStyle(() => {
    return {
      opacity: shimmer.value * 0.3,
    };
  });

  const animatedBadgeStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: pulseScale.value }],
    };
  });

  const handlePress = async () => {
    if (Platform.OS === 'ios') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    scale.value = withSequence(
      withSpring(0.98, { damping: 20, stiffness: 400 }),
      withSpring(1, { damping: 15, stiffness: 300 })
    );
    
    onPress?.();
  };

  // Calculate trend direction
  const trendDirection = useMemo(() => {
    if (monthlyTrend.length < 2) return 'neutral';
    const recent = monthlyTrend[monthlyTrend.length - 1];
    const previous = monthlyTrend[monthlyTrend.length - 2];
    return recent > previous ? 'up' : recent < previous ? 'down' : 'neutral';
  }, [monthlyTrend]);

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPress={handlePress}
      style={styles.container}
    >
      <Animated.View style={[styles.cardWrapper, animatedCardStyle]}>
        <LinearGradient
          colors={backgroundColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.card}
        >
          {/* Shimmer overlay */}
          <Animated.View style={[styles.shimmerOverlay, animatedShimmerStyle]}>
            <LinearGradient
              colors={['transparent', 'rgba(255,255,255,0.4)', 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>

          {/* Main content */}
          <View style={styles.content}>
            {/* Header with year label */}
            <View style={styles.header}>
              <View style={styles.yearBadge}>
                <Text style={styles.yearText}>
                  {new Date().getFullYear()} YTD
                </Text>
              </View>
              
              {trendDirection !== 'neutral' && (
                <View style={[
                  styles.trendIndicator,
                  trendDirection === 'up' ? styles.trendUp : styles.trendDown
                ]}>
                  <Ionicons 
                    name={trendDirection === 'up' ? 'trending-up' : 'trending-down'} 
                    size={16} 
                    color={trendDirection === 'up' ? '#34C759' : '#FF3B30'} 
                  />
                </View>
              )}
            </View>

            {/* Primary metric */}
            <Animated.View entering={FadeIn.delay(100).duration(500)}>
              <Text style={styles.totalEarnedLabel}>Total Earned</Text>
              <Text style={styles.totalEarnedValue}>
                {formatCurrency(totalEarned)}
              </Text>
            </Animated.View>

            {/* Secondary metrics row */}
            <Animated.View 
              entering={FadeIn.delay(200).duration(500)}
              style={styles.metricsRow}
            >
              {/* ROI Badge */}
              <Animated.View style={[styles.roiBadge, animatedBadgeStyle]}>
                <LinearGradient
                  colors={gradientColors}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.roiGradient}
                >
                  <Text style={styles.roiValue}>{roi}%</Text>
                  <Text style={styles.roiLabel}>ROI</Text>
                </LinearGradient>
              </Animated.View>

              {/* Net gain/loss */}
              <View style={styles.netGainContainer}>
                <Text style={[
                  styles.netGainValue,
                  { color: netGain >= 0 ? '#34C759' : '#FF3B30' }
                ]}>
                  {netGain >= 0 ? '+' : ''}{formatCurrency(Math.abs(netGain))}
                </Text>
                <Text style={styles.netGainLabel}>
                  {netGain >= 0 ? 'Above Fees' : 'Below Fees'}
                </Text>
              </View>
            </Animated.View>

            {/* Mini sparkline */}
            {monthlyTrend.length > 0 && (
              <Animated.View 
                entering={FadeIn.delay(300).duration(500)}
                style={styles.sparklineContainer}
              >
                <MiniSparkline data={monthlyTrend} color={isPositiveROI ? '#34C759' : '#FF9500'} />
              </Animated.View>
            )}
          </View>

          {/* Decorative elements */}
          <View style={styles.decoration}>
            <View style={[
              styles.decorationCircle,
              { backgroundColor: gradientColors[0] + '10' }
            ]} />
            <View style={[
              styles.decorationCircleSmall,
              { backgroundColor: gradientColors[1] + '08' }
            ]} />
          </View>
        </LinearGradient>
      </Animated.View>
    </TouchableOpacity>
  );
}

// Mini sparkline component
const MiniSparkline: React.FC<{ data: number[], color: string }> = ({ data, color }) => {
  const width = 80;
  const height = 30;
  const padding = 2;
  
  const points = useMemo(() => {
    if (data.length === 0) return '';
    
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;
    
    return data.map((value, index) => {
      const x = padding + (index / (data.length - 1)) * (width - padding * 2);
      const y = padding + (1 - (value - min) / range) * (height - padding * 2);
      return `${x},${y}`;
    }).join(' ');
  }, [data, width, height]);

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height}>
        <Polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  cardWrapper: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
  card: {
    borderRadius: 24,
    padding: 24,
    overflow: 'hidden',
    position: 'relative',
  },
  shimmerOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  content: {
    zIndex: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  yearBadge: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  yearText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666666',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  trendIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trendUp: {
    backgroundColor: 'rgba(52, 199, 89, 0.1)',
  },
  trendDown: {
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
  },
  totalEarnedLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666666',
    marginBottom: 4,
    letterSpacing: -0.24,
  },
  totalEarnedValue: {
    fontSize: 48,
    fontWeight: '800',
    color: '#1C1C1E',
    letterSpacing: -2,
    marginBottom: 20,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  roiBadge: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  roiGradient: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  roiValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.8,
  },
  roiLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    opacity: 0.9,
  },
  netGainContainer: {
    flex: 1,
  },
  netGainValue: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginBottom: 2,
  },
  netGainLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#8E8E93',
    letterSpacing: -0.08,
  },
  sparklineContainer: {
    marginTop: 20,
    alignItems: 'flex-end',
  },
  decoration: {
    position: 'absolute',
    top: -40,
    right: -40,
    zIndex: 1,
  },
  decorationCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    position: 'absolute',
  },
  decorationCircleSmall: {
    width: 80,
    height: 80,
    borderRadius: 40,
    top: 60,
    right: 60,
  },
});