import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Svg, Circle } from 'react-native-svg';

interface ProgressDonutProps {
  progress: number; // 0 to 1
  size?: number;
  strokeWidth?: number;
  color?: string;
  backgroundColor?: string;
  value: number;
  total: number;
  label: string;
}

export default function ProgressDonut({
  progress,
  size = 120,
  strokeWidth = 10,
  color = '#007aff',
  backgroundColor = '#f2f2f7',
  value,
  total,
  label,
}: ProgressDonutProps) {
  const center = size / 2;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  // Format numbers for display
  const formattedValue = value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  const formattedTotal = total.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  return (
    <View style={styles.container}>
      <View style={styles.donutContainer}>
        <Svg width={size} height={size} style={styles.svg}>
          {/* Background circle */}
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke={backgroundColor}
            strokeWidth={strokeWidth}
            fill="none"
          />
          {/* Progress circle */}
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="none"
            origin={`${center}, ${center}`}
            rotation={-90}
          />
        </Svg>
        <View style={[styles.textContainer, { width: size, height: size }]}>
          <Text style={[styles.valueText, { color }]}>{formattedValue}</Text>
          <Text style={styles.totalText}>/ {formattedTotal}</Text>
        </View>
      </View>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  donutContainer: {
    position: 'relative',
  },
  svg: {
    transform: [{ rotate: '-90deg' }],
  },
  textContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  valueText: {
    fontSize: 20,
    fontWeight: '600',
  },
  totalText: {
    fontSize: 14,
    color: '#8e8e93',
  },
  label: {
    fontSize: 14,
    color: '#8e8e93',
    marginTop: 8,
  },
}); 