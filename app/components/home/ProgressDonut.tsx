import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Svg, Circle } from 'react-native-svg';
import Animated, { 
  useAnimatedProps, 
  withTiming, 
  Easing,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

interface ProgressDonutProps {
  progress: number; // 0 to 1
  size?: number;
  strokeWidth?: number;
  color?: string;
  backgroundColor?: string;
  amount: string;
  label: string;
  detail: string;
  perksCount?: string;
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export default function ProgressDonut({
  progress,
  size = 120,
  strokeWidth = 6,
  color = Platform.OS === 'ios' ? '#007AFF' : 'dodgerblue',
  backgroundColor = '#ECECEC',
  amount,
  label,
  detail,
  perksCount,
}: ProgressDonutProps) {
  const center = size / 2;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  
  // Use shared value for animation
  const progressValue = useSharedValue(progress);
  
  // Update progress value when prop changes
  React.useEffect(() => {
    progressValue.value = withTiming(progress, {
      duration: 600,
      easing: Easing.bezier(0.4, 0, 0.2, 1), // ease-in-out cubic
    });
  }, [progress]);

  const animatedProps = useAnimatedProps(() => {
    // Calculate the offset - note that we subtract from circumference
    // because we want the filled part to start from the top
    const strokeDashoffset = circumference * (1 - progressValue.value);
    return {
      strokeDashoffset,
    };
  });

  return (
    <View style={styles.container}>
      <Text style={styles.amount}>{amount}</Text>
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
        
        {perksCount && (
          <View style={styles.centerTextContainer}>
            <Text style={styles.centerText}>{perksCount}</Text>
          </View>
        )}
      </View>
      
      <Text style={styles.detail}>{detail}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 20,
  },
  amount: {
    fontSize: 34,
    fontWeight: '700',
    color: '#000',
    textAlign: 'center',
    letterSpacing: 0.41,
  },
  label: {
    fontSize: 17,
    fontWeight: '600',
    color: '#3C3C4399',
    marginTop: 4,
    marginBottom: 20,
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
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
  },
  centerText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#3C3C4399',
    textAlign: 'center',
  },
  detail: {
    fontSize: 15,
    fontWeight: '500',
    color: '#3C3C4399',
    marginTop: 16,
    textAlign: 'center',
    letterSpacing: -0.24,
  },
}); 