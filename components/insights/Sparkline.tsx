import React from 'react';
import { View } from 'react-native';
import Svg, { Polyline } from 'react-native-svg';

interface SparklineProps {
  data: number[];
  height: number;
  width: number;
  color: string;
}

export const Sparkline: React.FC<SparklineProps> = ({ data, height, width, color }) => {
  if (!data || data.length === 0) return null;

  const points = data
    .map((val, index) => {
      const x = (index / (data.length - 1)) * width;
      const y = height - (Math.max(0, Math.min(100, val)) / 100) * height;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <View style={{ height, width, marginTop: 8 }}>
      <Svg height={height} width={width}>
        <Polyline points={points} fill="none" stroke={color} strokeWidth="2" />
      </Svg>
    </View>
  );
}; 
export default Sparkline;
