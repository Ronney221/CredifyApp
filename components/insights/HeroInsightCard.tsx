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
  monthsWithData: number; // Number of months user has been active
  onPress?: () => void;
  scrollProgress?: Animated.SharedValue<number>;
}

const { width: screenWidth } = Dimensions.get('window');

export default function HeroInsightCard({
  totalEarned,
  totalAnnualFees,
  monthsWithData,
  onPress,
  scrollProgress,
}: HeroInsightCardProps) {
  const scale = useSharedValue(0.95);
  const shimmer = useSharedValue(0);
  const pulseScale = useSharedValue(1);
  
  const roi = totalAnnualFees > 0 ? Math.round((totalEarned / totalAnnualFees) * 100) : 0;
  const netGain = totalEarned - totalAnnualFees;
  const isPositiveROI = roi >= 100;
  
  // Calculate monthly average based on actual months with data
  const monthlyAverage = monthsWithData > 0 ? totalEarned / monthsWithData : 0;
  const monthlyTarget = totalAnnualFees / 12;
  const isOnTrack = monthlyAverage >= monthlyTarget * 0.8; // 80% threshold for being "on track"
  
  // Calculate break-even and remaining metrics
  const remainingToBreakEven = Math.max(0, totalAnnualFees - totalEarned);
  const surplusAmount = totalEarned > totalAnnualFees ? totalEarned - totalAnnualFees : 0;
  const progressToBreakEven = totalAnnualFees > 0 ? Math.min(1, totalEarned / totalAnnualFees) : 0;
  
  // Calculate time context (months remaining in year)
  const now = new Date();
  const monthsElapsed = now.getMonth() + 1; // January = 1
  const monthsRemaining = 12 - monthsElapsed;
  const monthlyPaceNeeded = monthsRemaining > 0 ? remainingToBreakEven / monthsRemaining : 0;
  
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

  // Determine track status for display
  const getTrackStatus = () => {
    if (isPositiveROI) {
      return { text: 'Excellent ROI', color: '#34C759', icon: 'trending-up' };
    } else if (isOnTrack) {
      return { text: 'On Track', color: '#007AFF', icon: 'checkmark-circle' };
    } else {
      return { text: 'Below Target', color: '#FF9500', icon: 'time' };
    }
  };
  
  const trackStatus = getTrackStatus();

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
              
              <View style={[
                styles.trackIndicator,
                { backgroundColor: trackStatus.color + '15' }
              ]}>
                <Ionicons 
                  name={trackStatus.icon as any} 
                  size={14} 
                  color={trackStatus.color} 
                />
                <Text style={[styles.trackText, { color: trackStatus.color }]}>
                  {trackStatus.text}
                </Text>
              </View>
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

              {/* Break-even status */}
              <View style={styles.netGainContainer}>
                {isPositiveROI ? (
                  <>
                    <Text style={[styles.netGainValue, { color: '#34C759' }]}>
                      +{formatCurrency(surplusAmount)}
                    </Text>
                    <Text style={styles.netGainLabel}>Above Fees</Text>
                  </>
                ) : (
                  <>
                    <Text style={[styles.netGainValue, { color: '#FF9500' }]}>
                      {formatCurrency(remainingToBreakEven)}
                    </Text>
                    <Text style={styles.netGainLabel}>
                      Needed to Break Even
                    </Text>
                  </>
                )}
              </View>
            </Animated.View>

            {/* Progress toward break-even */}
            {totalAnnualFees > 0 && (
              <Animated.View 
                entering={FadeIn.delay(300).duration(500)}
                style={styles.progressSection}
              >
                <View style={styles.progressHeader}>
                  <Text style={styles.progressLabel}>
                    Progress to Break Even ({formatCurrency(totalAnnualFees)})
                  </Text>
                  <Text style={styles.progressPercentage}>
                    {Math.round(progressToBreakEven * 100)}%
                  </Text>
                </View>
                <View style={styles.progressTrack}>
                  <Animated.View 
                    style={[
                      styles.progressFill,
                      { 
                        width: `${progressToBreakEven * 100}%`,
                        backgroundColor: isPositiveROI ? '#34C759' : '#007AFF'
                      }
                    ]}
                    entering={FadeIn.delay(400).duration(800)}
                  />
                </View>
                {!isPositiveROI && monthsRemaining > 0 && (
                  <Text style={styles.paceHint}>
                    Need {formatCurrency(monthlyPaceNeeded)}/month for remaining {monthsRemaining} months
                  </Text>
                )}
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


const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 6,
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
    borderRadius: 20,
    padding: 20,
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
    marginBottom: 12,
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
  trackIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  trackText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: -0.08,
  },
  totalEarnedLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666666',
    marginBottom: 4,
    letterSpacing: -0.24,
  },
  totalEarnedValue: {
    fontSize: 42,
    fontWeight: '800',
    color: '#1C1C1E',
    letterSpacing: -1.5,
    marginBottom: 16,
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
  progressSection: {
    marginTop: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666666',
    letterSpacing: -0.14,
  },
  progressPercentage: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1C1C1E',
    letterSpacing: -0.14,
  },
  progressTrack: {
    height: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  paceHint: {
    fontSize: 11,
    color: '#8E8E93',
    marginTop: 6,
    textAlign: 'center',
    fontWeight: '500',
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