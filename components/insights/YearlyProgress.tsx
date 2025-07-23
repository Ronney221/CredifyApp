import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions } from 'react-native';
import { Colors } from '../../constants/Colors';
import MiniBarChart from './MiniBarChart';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import Animated, { 
  useAnimatedStyle, 
  interpolate, 
  Extrapolate,
  useSharedValue,
  withRepeat,
  withTiming,
  withSpring,
  withSequence,
  withDelay,
  Easing,
  runOnJS
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, LinearGradient as SvgLinearGradient, Stop, Circle, Defs, RadialGradient } from 'react-native-svg';

const { width: screenWidth } = Dimensions.get('window');

// Performance tier definitions
interface PerformanceTier {
  name: string;
  icon: string;
  iconFamily: 'MaterialCommunityIcons' | 'Ionicons';
  colors: string[];
  animationSpeed: number;
}

const getPerformanceTier = (roi: number): PerformanceTier => {
  if (roi >= 200) {
    return {
      name: 'Legendary Master',
      icon: 'crown',
      iconFamily: 'MaterialCommunityIcons',
      colors: ['#FFD700', '#FFA500', '#FF6B35'],
      animationSpeed: 800
    };
  } else if (roi >= 150) {
    return {
      name: 'Elite Optimizer',
      icon: 'diamond',
      iconFamily: 'MaterialCommunityIcons',
      colors: ['#9D4EDD', '#FFD60A', '#FF6B6B'],
      animationSpeed: 900
    };
  } else if (roi >= 120) {
    return {
      name: 'Profit Wizard',
      icon: 'magic-staff',
      iconFamily: 'MaterialCommunityIcons',
      colors: ['#06FFA5', '#FFD60A', '#FF9F0A'],
      animationSpeed: 1000
    };
  } else if (roi >= 100) {
    return {
      name: 'ROI Champion',
      icon: 'trophy-award',
      iconFamily: 'MaterialCommunityIcons',
      colors: ['#34C759', '#FFD60A', '#FF9F0A'],
      animationSpeed: 1100
    };
  } else if (roi >= 80) {
    return {
      name: 'Fee Destroyer',
      icon: 'target',
      iconFamily: 'MaterialCommunityIcons',
      colors: ['#5856D6', '#34C759', '#30D158'],
      animationSpeed: 1300
    };
  } else if (roi >= 60) {
    return {
      name: 'Smart Spender',
      icon: 'brain',
      iconFamily: 'MaterialCommunityIcons',
      colors: ['#007AFF', '#5856D6', '#AF52DE'],
      animationSpeed: 1500
    };
  } else if (roi >= 40) {
    return {
      name: 'Rising Star',
      icon: 'star-shooting',
      iconFamily: 'MaterialCommunityIcons',
      colors: ['#007AFF', '#5AC8FA', '#64D2FF'],
      animationSpeed: 1800
    };
  } else if (roi >= 25) {
    return {
      name: 'Building Momentum',
      icon: 'trending-up',
      iconFamily: 'MaterialCommunityIcons',
      colors: ['#007AFF', '#5AC8FA'],
      animationSpeed: 2100
    };
  } else if (roi >= 10) {
    return {
      name: 'Getting Started',
      icon: 'rocket-launch',
      iconFamily: 'MaterialCommunityIcons',
      colors: ['#007AFF', '#48CAE4'],
      animationSpeed: 2400
    };
  } else {
    return {
      name: 'First Steps',
      icon: 'compass-outline',
      iconFamily: 'MaterialCommunityIcons',
      colors: ['#8E8E93', '#007AFF'],
      animationSpeed: 2700
    };
  }
};

// Animated Wave Component
interface WaveProgressProps {
  progress: number;
  tier: PerformanceTier;
  collapsed?: boolean;
}

const PremiumProgressBar: React.FC<WaveProgressProps> = ({ progress, tier, collapsed = false }) => {
  const progressAnimation = useSharedValue(0);
  const glowAnimation = useSharedValue(0);
  const pressScale = useSharedValue(1);
  const particleAnimation = useSharedValue(0);
  const shimmerAnimation = useSharedValue(0);
  const pulseAnimation = useSharedValue(1);
  
  useEffect(() => {
    // Sophisticated staggered entrance animation
    progressAnimation.value = withDelay(
      300,
      withSpring(progress, {
        damping: 20,
        stiffness: 100,
        mass: 1,
      })
    );

    // Premium shimmer effect
    shimmerAnimation.value = withRepeat(
      withTiming(1, {
        duration: 2500,
        easing: Easing.bezier(0.4, 0, 0.6, 1),
      }),
      -1,
      false
    );

    // Tier-specific animation effects
    if (progress >= 120) {
      // Elite tier: Intense glow + particles
      glowAnimation.value = withRepeat(
        withTiming(1, {
          duration: tier.animationSpeed,
          easing: Easing.bezier(0.4, 0, 0.2, 1),
        }),
        -1,
        true
      );

      particleAnimation.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 1500 }),
          withTiming(0, { duration: 800 })
        ),
        -1,
        false
      );
    } else if (progress >= 80) {
      // High performance: Strong glow
      glowAnimation.value = withRepeat(
        withTiming(1, {
          duration: tier.animationSpeed,
          easing: Easing.bezier(0.4, 0, 0.2, 1),
        }),
        -1,
        true
      );

      particleAnimation.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 2500 }),
          withTiming(0, { duration: 1200 })
        ),
        -1,
        false
      );
    } else if (progress >= 40) {
      // Mid-tier: Subtle pulse
      pulseAnimation.value = withRepeat(
        withTiming(1.015, {
          duration: tier.animationSpeed * 1.5,
          easing: Easing.inOut(Easing.sin),
        }),
        -1,
        true
      );
    } else if (progress >= 10) {
      // Beginner: Very gentle pulse
      pulseAnimation.value = withRepeat(
        withTiming(1.008, {
          duration: tier.animationSpeed * 2,
          easing: Easing.inOut(Easing.quad),
        }),
        -1,
        true
      );
    }
  }, [progress]);

  const containerHeight = collapsed ? 30 : 120;
  
  const progressStyle = useAnimatedStyle(() => {
    const width = interpolate(
      progressAnimation.value,
      [0, 100],
      [0, 100],
      Extrapolate.CLAMP
    );
    
    const scale = interpolate(
      pulseAnimation.value,
      [1, 1.02],
      [1, 1.008]
    );
    
    return {
      width: `${width}%`,
      transform: [{ scale: scale * pressScale.value }],
    };
  });

  const glowStyle = useAnimatedStyle(() => {
    if (progress < 80) return { opacity: 0, transform: [{ scale: 0 }] };
    
    // More intense glow for higher tiers
    const baseOpacity = progress >= 120 ? [0.3, 0.8] : [0.2, 0.6];
    const baseScale = progress >= 120 ? [0.96, 1.06] : [0.98, 1.04];
    
    const opacity = interpolate(
      glowAnimation.value,
      [0, 1],
      baseOpacity
    );
    
    const scale = interpolate(
      glowAnimation.value,
      [0, 1],
      baseScale
    );
    
    return {
      opacity,
      transform: [{ scale }],
    };
  });

  const shimmerStyle = useAnimatedStyle(() => {
    const translateX = interpolate(
      shimmerAnimation.value,
      [0, 1],
      [-screenWidth, screenWidth]
    );
    
    const opacity = interpolate(
      shimmerAnimation.value,
      [0, 0.3, 0.7, 1],
      [0, 0.8, 0.8, 0]
    );
    
    return {
      transform: [{ translateX }],
      opacity: progress > 20 ? opacity : 0,
    };
  });

  const particleStyle = useAnimatedStyle(() => {
    if (progress < 80) return { opacity: 0 };
    
    // More dynamic particles for elite tiers
    const translateRange = progress >= 120 ? [0, -60] : [0, -45];
    const scaleRange = progress >= 120 ? [0.3, 1.2, 0.2] : [0.5, 1, 0.3];
    
    const translateY = interpolate(
      particleAnimation.value,
      [0, 1],
      translateRange
    );
    
    const opacity = interpolate(
      particleAnimation.value,
      [0, 0.3, 0.7, 1],
      [0, 1, 1, 0]
    );
    
    const scale = interpolate(
      particleAnimation.value,
      [0, 0.5, 1],
      scaleRange
    );
    
    return {
      transform: [{ translateY }, { scale }],
      opacity,
    };
  });

  const handlePressIn = () => {
    pressScale.value = withSpring(0.98, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    pressScale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  return (
    <Pressable 
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[styles.progressContainer, { height: containerHeight }]}
    >
      {/* Enhanced background with subtle gradient */}
      <LinearGradient
        colors={['rgba(0,0,0,0.02)', 'rgba(0,0,0,0.08)', 'rgba(0,0,0,0.02)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.progressTrack}
      />
      
      {/* Premium glow effect for top performers */}
      <Animated.View style={[
        styles.progressGlow,
        progressStyle,
        glowStyle,
        {
          backgroundColor: tier.colors[0],
        }
      ]}>
        <LinearGradient
          colors={[tier.colors[0], tier.colors[tier.colors.length - 1] || tier.colors[0]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
      
      {/* Main progress fill with sophisticated gradient */}
      <Animated.View style={[
        styles.progressFill,
        progressStyle,
      ]}>
        <LinearGradient
          colors={[
            tier.colors[0],
            tier.colors[tier.colors.length - 1] || tier.colors[0]
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
        
        {/* Premium shimmer effect */}
        <Animated.View style={[styles.shimmerOverlay, shimmerStyle]}>
          <LinearGradient
            colors={[
              'transparent',
              'rgba(255,255,255,0.3)',
              'rgba(255,255,255,0.6)',
              'rgba(255,255,255,0.3)',
              'transparent'
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      </Animated.View>

      {/* Celebration particles for high performance */}
      {progress >= 80 && (
        <Animated.View style={[styles.particleContainer, particleStyle]}>
          <Svg height={40} width={40} style={styles.particleSvg}>
            <Defs>
              <RadialGradient id="particle" cx="50%" cy="50%" r="50%">
                <Stop offset="0%" stopColor={tier.colors[0]} stopOpacity="0.8" />
                <Stop offset="100%" stopColor={tier.colors[0]} stopOpacity="0" />
              </RadialGradient>
            </Defs>
            <Circle cx="20" cy="20" r="8" fill="url(#particle)" />
            <Circle cx="12" cy="12" r="4" fill="url(#particle)" />
            <Circle cx="28" cy="15" r="3" fill="url(#particle)" />
          </Svg>
        </Animated.View>
      )}
    </Pressable>
  );
};

// --- YearlyProgress Component ---
interface YearlyProgressProps {
  year: string;
  totalRedeemed: number;
  totalAnnualFees: number;
  trendData: number[];
  monthlyData?: { redeemed: number; partial: number; potential: number }[];
  scrollProgress?: Animated.SharedValue<number>; // 0 = expanded, 1 = collapsed
  isSticky?: boolean;
}

const YearlyProgress: React.FC<YearlyProgressProps> = ({ 
  year, 
  totalRedeemed, 
  totalAnnualFees, 
  trendData, 
  monthlyData,
  scrollProgress = { value: 0 }, // Default to expanded state
  isSticky = false
}) => {
  const roi = totalAnnualFees > 0 ? (totalRedeemed / totalAnnualFees) * 100 : 0;
  const clampedRoi = Math.max(0, Math.min(100, roi));
  const tier = getPerformanceTier(roi);

  const amountSaved = totalRedeemed.toLocaleString('en-US', { 
    style: 'currency', 
    currency: 'USD', 
    minimumFractionDigits: 0, 
    maximumFractionDigits: 0 
  });
  const totalFees = totalAnnualFees.toLocaleString('en-US', { 
    style: 'currency', 
    currency: 'USD', 
    minimumFractionDigits: 0, 
    maximumFractionDigits: 0 
  });

  // Animated styles for collapsible header
  const containerStyle = useAnimatedStyle(() => {
    const height = interpolate(
      scrollProgress.value,
      [0, 1],
      [160, 60], // Reduced from 200 to 160
      Extrapolate.CLAMP
    );

    const paddingVertical = interpolate(
      scrollProgress.value,
      [0, 1],
      [12, 8], // Reduced from 20,10 to 12,8
      Extrapolate.CLAMP
    );

    return {
      height,
      paddingVertical,
    };
  });

  const mainContentStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollProgress.value,
      [0, 0.5],
      [1, 0],
      Extrapolate.CLAMP
    );

    return {
      opacity,
      display: scrollProgress.value > 0.5 ? 'none' : 'flex',
    };
  });

  const collapsedContentStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollProgress.value,
      [0.5, 1],
      [0, 1],
      Extrapolate.CLAMP
    );

    return {
      opacity,
      display: scrollProgress.value < 0.5 ? 'none' : 'flex',
    };
  });

  return (
    <Animated.View style={[
      styles.container,
      containerStyle,
      isSticky && styles.stickyContainer
    ]}>
      {/* Expanded State */}
      <Animated.View style={[styles.mainContent, mainContentStyle]}>
        <Text style={styles.yearTitle}>{year} Return on Investment</Text>
        
        {/* Premium Progress Bar Container */}
        <View style={styles.progressBarContainer}>
          <PremiumProgressBar progress={clampedRoi} tier={tier} collapsed={false} />
          
          {/* Floating Metrics */}
          <View style={styles.floatingMetrics}>
            <View style={styles.floatingMetricsContent}>
              <View style={styles.floatingRoiContainer}>
                {tier.iconFamily === 'MaterialCommunityIcons' ? (
                  <MaterialCommunityIcons 
                    name={tier.icon as any} 
                    size={20} 
                    color={tier.colors[0]} 
                    style={styles.floatingIcon}
                  />
                ) : (
                  <Ionicons 
                    name={tier.icon as any} 
                    size={20} 
                    color={tier.colors[0]} 
                    style={styles.floatingIcon}
                  />
                )}
                <Text style={styles.floatingRoi}>
                  {Math.round(roi)}%
                </Text>
              </View>
              <Text style={styles.floatingTier}>{tier.name}</Text>
            </View>
            <View style={styles.floatingAmounts}>
              <Text style={styles.floatingAmountPrimary}>{amountSaved}</Text>
              <Text style={styles.floatingAmountSecondary}>of {totalFees} fees</Text>
            </View>
          </View>
        </View>
      </Animated.View>

      {/* Collapsed/Sticky State */}
      <Animated.View style={[styles.collapsedContent, collapsedContentStyle]}>
        <View style={styles.collapsedLeft}>
          <View style={styles.collapsedTitleContainer}>
            {tier.iconFamily === 'MaterialCommunityIcons' ? (
              <MaterialCommunityIcons 
                name={tier.icon as any} 
                size={16} 
                color={tier.colors[0]} 
                style={styles.collapsedIcon}
              />
            ) : (
              <Ionicons 
                name={tier.icon as any} 
                size={16} 
                color={tier.colors[0]} 
                style={styles.collapsedIcon}
              />
            )}
            <Text style={styles.collapsedTitle}>
              {year} ROI: {Math.round(roi)}%
            </Text>
          </View>
          <View style={styles.collapsedProgressPill}>
            <View style={[
              styles.collapsedProgressFill,
              { width: `${Math.min(clampedRoi, 100)}%`, backgroundColor: tier.colors[0] }
            ]} />
          </View>
        </View>
        <View style={styles.collapsedRight}>
          <Text style={styles.collapsedAmount}>{amountSaved}</Text>
          <Text style={styles.collapsedLabel}>saved</Text>
        </View>
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.light.background,
    paddingHorizontal: 15,
  },
  stickyContainer: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  mainContent: {
    flex: 1,
  },
  yearTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.light.text,
    marginBottom: 16,
    letterSpacing: -0.5,
    lineHeight: 34,
  },
  
  // Progress Bar Styles
  progressBarContainer: {
    position: 'relative',
    height: 120,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#F2F2F7',
  },
  progressContainer: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  progressTrack: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0,0,0,0.06)',
    borderRadius: 16,
  },
  progressFill: {
    height: '100%',
    borderRadius: 16,
    position: 'relative',
  },
  progressGlow: {
    position: 'absolute',
    height: '100%',
    borderRadius: 16,
    shadowColor: '#FFD60A',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  shimmerOverlay: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 16,
  },
  particleContainer: {
    position: 'absolute',
    top: -20,
    right: 20,
    width: 40,
    height: 40,
  },
  particleSvg: {
    position: 'absolute',
  },
  
  // Floating Metrics Styles
  floatingMetrics: {
    position: 'absolute',
    top: 15,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
  },
  floatingMetricsContent: {
    alignItems: 'flex-start',
  },
  floatingRoiContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  floatingIcon: {
    marginRight: 6,
  },
  floatingRoi: {
    fontSize: 32,
    fontWeight: '900',
    color: Colors.light.text,
    letterSpacing: -1,
    textShadowColor: 'rgba(0,0,0,0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  floatingTier: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.light.icon,
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  floatingAmounts: {
    alignItems: 'flex-end',
  },
  floatingAmountPrimary: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.light.text,
    letterSpacing: -0.3,
  },
  floatingAmountSecondary: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.light.icon,
    marginTop: 3,
    letterSpacing: 0.1,
  },
  
  // Enhanced Collapsed State Styles
  collapsedContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 60,
    paddingHorizontal: 15,
  },
  collapsedLeft: {
    flex: 1,
  },
  collapsedTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  collapsedIcon: {
    marginRight: 6,
  },
  collapsedTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
  },
  collapsedProgressPill: {
    height: 6,
    backgroundColor: '#E5E5EA',
    borderRadius: 3,
    overflow: 'hidden',
    width: '80%',
  },
  collapsedProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  collapsedRight: {
    alignItems: 'flex-end',
  },
  collapsedAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
  },
  collapsedLabel: {
    fontSize: 12,
    color: Colors.light.icon,
    marginTop: 2,
  },
});

export default YearlyProgress; 