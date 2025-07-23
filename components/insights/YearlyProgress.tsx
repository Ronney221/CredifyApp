import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
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
  Easing
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';

// Performance tier definitions
interface PerformanceTier {
  name: string;
  icon: string;
  iconFamily: 'MaterialCommunityIcons' | 'Ionicons';
  colors: string[];
  animationSpeed: number;
}

const getPerformanceTier = (roi: number): PerformanceTier => {
  if (roi >= 100) {
    return {
      name: 'Profit Zone',
      icon: 'fire',
      iconFamily: 'MaterialCommunityIcons',
      colors: ['#34C759', '#FFD60A', '#FF9F0A'],
      animationSpeed: 1200
    };
  } else if (roi >= 90) {
    return {
      name: 'Fee Crusher',
      icon: 'trophy',
      iconFamily: 'MaterialCommunityIcons',
      colors: ['#5856D6', '#34C759'],
      animationSpeed: 1500
    };
  } else if (roi >= 50) {
    return {
      name: 'Making Waves',
      icon: 'trending-up',
      iconFamily: 'MaterialCommunityIcons',
      colors: ['#007AFF', '#5856D6'],
      animationSpeed: 2000
    };
  } else {
    return {
      name: 'Getting Started',
      icon: 'water-outline',
      iconFamily: 'Ionicons',
      colors: ['#007AFF', '#5AC8FA'],
      animationSpeed: 2500
    };
  }
};

// Animated Wave Component
interface WaveProgressProps {
  progress: number;
  tier: PerformanceTier;
  collapsed?: boolean;
}

const WaveProgress: React.FC<WaveProgressProps> = ({ progress, tier, collapsed = false }) => {
  const waveAnimation = useSharedValue(0);
  
  useEffect(() => {
    // Reset animation value to 0 to avoid jumps
    waveAnimation.value = 0;
    
    // Start continuous animation
    waveAnimation.value = withRepeat(
      withTiming(1, {
        duration: tier.animationSpeed,
        easing: Easing.linear,
      }),
      -1,
      false
    );
  }, [tier.animationSpeed]);

  const waveHeight = collapsed ? 15 : 60;
  const containerHeight = collapsed ? 30 : 120;
  
  // Simplified approach: Use transform instead of complex SVG path animation
  const animatedStyle = useAnimatedStyle(() => {
    // Create smooth, continuous translation that loops seamlessly
    const translateX = interpolate(waveAnimation.value, [0, 1], [0, -40]);
    return {
      transform: [{ translateX }],
    };
  });

  // Static wave paths - much simpler and performant
  const createStaticWavePath = (phase: number, amplitude: number) => {
    // Use wider SVG width to account for animation translation
    const svgWidth = 720;
    const frequency = 2;
    
    // Fix: Clamp progress to reasonable range and ensure accurate calculation
    const clampedProgress = Math.max(0, Math.min(100, progress));
    
    // Calculate fill height - this should be from bottom up
    const fillPercentage = clampedProgress / 100;
    const fillHeight = fillPercentage * containerHeight;
    
    // Wave baseline should be at the fill level (from bottom)
    const waveBaseline = containerHeight - fillHeight;
    
    // Start path from bottom left
    let path = `M 0 ${containerHeight}`;
    
    // Create wave at the fill level - use proper SVG width
    for (let x = 0; x <= svgWidth; x += 4) {
      const waveOffset = Math.sin((x / svgWidth) * Math.PI * frequency + phase) * amplitude;
      const y = Math.max(0, waveBaseline + waveOffset); // Ensure y doesn't go negative
      path += ` L ${x} ${y}`;
    }
    
    // Close the path back to bottom right and bottom left
    path += ` L ${svgWidth} ${containerHeight} L 0 ${containerHeight} Z`;
    return path;
  };

  const wavePath1 = createStaticWavePath(0, collapsed ? 2 : 4);
  const wavePath2 = createStaticWavePath(Math.PI / 2, collapsed ? 1 : 2);

  return (
    <View style={[styles.waveContainer, { height: containerHeight }]}>
      <Animated.View style={[StyleSheet.absoluteFill, animatedStyle]}>
        <Svg height={containerHeight} width={180} style={StyleSheet.absoluteFill}>
          <SvgLinearGradient
            id="waveGradient"
            x1="0%"
            y1="0%"
            x2="0%"
            y2="100%"
          >
            {tier.colors.map((color, index) => (
              <Stop
                key={index}
                offset={`${(index / (tier.colors.length - 1)) * 100}%`}
                stopColor={color}
                stopOpacity="1"
              />
            ))}
          </SvgLinearGradient>
          <Path
            d={wavePath1}
            fill="url(#waveGradient)"
            opacity={0.8}
          />
          <Path
            d={wavePath2}
            fill={tier.colors[0]}
            opacity={0.6}
          />
        </Svg>
      </Animated.View>
    </View>
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
        
        {/* Wave Progress Container */}
        <View style={styles.waveProgressContainer}>
          <WaveProgress progress={clampedRoi} tier={tier} collapsed={false} />
          
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
                <Text style={[styles.floatingRoi, { color: tier.colors[0] }]}>
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
    fontSize: 24,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: 12,
  },
  
  // Wave Progress Styles
  waveProgressContainer: {
    position: 'relative',
    height: 120,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F8F9FA',
  },
  waveContainer: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'transparent',
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
    fontSize: 28,
    fontWeight: '700',
  },
  floatingTier: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.light.icon,
  },
  floatingAmounts: {
    alignItems: 'flex-end',
  },
  floatingAmountPrimary: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.light.text,
  },
  floatingAmountSecondary: {
    fontSize: 12,
    color: Colors.light.icon,
    marginTop: 2,
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