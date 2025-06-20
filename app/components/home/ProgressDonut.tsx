import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Svg, Circle } from 'react-native-svg';
import Animated, { 
  useAnimatedProps, 
  withTiming, 
  Easing,
  useSharedValue,
  withSpring,
  useAnimatedStyle,
  runOnJS,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Colors } from '../../constants/Colors';

interface ProgressDonutProps {
  progress: number; // 0 to 1
  size?: number;
  strokeWidth?: number;
  color?: string;
  backgroundColor?: string;
  amount: string;
  label: string;
  combinedStatsText: string; // New prop for combined stats
  progressPercentageText?: string; // e.g., "37% Used"
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedText = Animated.createAnimatedComponent(Text);

export default function ProgressDonut({
  progress,
  size = 170,
  strokeWidth = 16,
  color = Colors.light.tint,
  backgroundColor = Colors.light.separator,
  amount,
  label,
  combinedStatsText,
  progressPercentageText,
}: ProgressDonutProps) {
  // Log all incoming text-related props at the beginning of the function
  console.log("DEBUG_ProgressDonut_PROPS:", { amount, label, combinedStatsText, progressPercentageText });

  const center = size / 2;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  
  // Use shared value for animation
  const progressValue = useSharedValue(progress);
  
  // Shared value for amount text animation
  const amountScale = useSharedValue(1);
  const previousAmount = React.useRef<string>(amount);

  // Trigger haptic feedback
  const triggerHapticFeedback = () => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
    }
  };
  
  // Update progress value when prop changes
  React.useEffect(() => {
    progressValue.value = withTiming(progress, {
      duration: 600,
      easing: Easing.bezier(0.4, 0, 0.2, 1), // ease-in-out cubic
    });
  }, [progress]);

  // Animate amount text when it changes
  React.useEffect(() => {
    if (previousAmount.current !== amount) {
      // Spring animation: scale 1 → 1.06 → 1
      amountScale.value = withSpring(1.06, {
        dampingRatio: 0.6,
      }, () => {
        // Trigger haptic feedback on animation start
        runOnJS(triggerHapticFeedback)();
        
        amountScale.value = withSpring(1, {
          dampingRatio: 0.8,
        });
      });
      
      previousAmount.current = amount;
    }
  }, [amount]);

  const animatedProps = useAnimatedProps(() => {
    // Calculate the offset - note that we subtract from circumference
    // because we want the filled part to start from the top
    const strokeDashoffset = circumference * (1 - progressValue.value);
    return {
      strokeDashoffset,
    };
  });

  const animatedAmountStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: amountScale.value }],
    };
  });

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.donutContainer}>
        <Svg width={size} height={size}>
          {/* Background circle */}
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke={backgroundColor}
            strokeWidth={strokeWidth}
            fill="none"
          />
          {/* Animated progress circle */}
          <AnimatedCircle
            cx={center}
            cy={center}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={0}
            animatedProps={animatedProps}
            strokeLinecap="round"
            fill="none"
            transform={`rotate(-90 ${center} ${center})`}
          />
        </Svg>
        {/* Dollar amount in the center of the donut */}
        <View style={styles.centerTextContainer} pointerEvents="none">
          <AnimatedText style={[styles.amount, animatedAmountStyle]}>{amount}</AnimatedText>
        </View>
      </View>
      <Text style={styles.combinedStatsText}>{combinedStatsText}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginBottom: 12,
  },
  amount: {
    fontSize: 36,
    fontWeight: '800',
    color: Colors.light.text,
    textAlign: 'center',
    letterSpacing: 0.41,
  },
  label: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.textSecondary,
    marginTop: 4,
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: -0.41,
  },
  donutContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerTextContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
  },
  progressPercentageText: {
    fontSize: 18,
    fontWeight: '400',
    color: Colors.light.textSecondary,
    textAlign: 'center',
    marginBottom: 2,
  },
  combinedStatsText: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.light.textSecondary,
    textAlign: 'center',
    letterSpacing: -0.24,
    marginTop: 12,
  },
}); 