import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../constants/Colors';
import MiniBarChart from './MiniBarChart';
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
  emoji: string;
  colors: string[];
  animationSpeed: number;
}

const getPerformanceTier = (roi: number): PerformanceTier => {
  if (roi >= 100) {
    return {
      name: 'Profit Zone',
      emoji: '🔥',
      colors: ['#34C759', '#FFD60A', '#FF9F0A'],
      animationSpeed: 1200
    };
  } else if (roi >= 90) {
    return {
      name: 'Fee Crusher',
      emoji: '🏆',
      colors: ['#5856D6', '#34C759'],
      animationSpeed: 1500
    };
  } else if (roi >= 50) {
    return {
      name: 'Making Waves',
      emoji: '💫',
      colors: ['#007AFF', '#5856D6'],
      animationSpeed: 2000
    };
  } else {
    return {
      name: 'Getting Started',
      emoji: '🌊',
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
    waveAnimation.value = withRepeat(
      withTiming(1, {
        duration: tier.animationSpeed,
        easing: Easing.inOut(Easing.sin),
      }),
      -1,
      false
    );
  }, [tier.animationSpeed]);

  const waveHeight = collapsed ? 15 : 60;
  const containerHeight = collapsed ? 30 : 120;
  
  const createWavePath = (phase: number, amplitude: number) => {
    const width = 300;
    const frequency = 2;
    const waveY = containerHeight - (progress / 100) * waveHeight;
    
    let path = `M 0 ${containerHeight}`;
    
    for (let x = 0; x <= width; x += 2) {
      const y = waveY + Math.sin((x / width) * Math.PI * frequency + phase) * amplitude;
      path += ` L ${x} ${y}`;
    }
    
    path += ` L ${width} ${containerHeight} Z`;
    return path;
  };

  const animatedWaveStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: interpolate(waveAnimation.value, [0, 1], [0, -20]) }],
    };
  });

  return (
    <View style={[styles.waveContainer, { height: containerHeight }]}>
      <Animated.View style={[StyleSheet.absoluteFill, animatedWaveStyle]}>
        <Svg height={containerHeight} width={320} style={StyleSheet.absoluteFill}>
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
            d={createWavePath(0, collapsed ? 2 : 4)}
            fill="url(#waveGradient)"
            opacity={0.8}
          />
          <Path
            d={createWavePath(Math.PI / 2, collapsed ? 1 : 2)}
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
              <Text style={[styles.floatingRoi, { color: tier.colors[0] }]}>
                {tier.emoji} {Math.round(roi)}%
              </Text>
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
          <Text style={styles.collapsedTitle}>
            {tier.emoji} {year} ROI: {Math.round(roi)}%
          </Text>
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
  floatingRoi: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 2,
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
  collapsedTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 4,
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