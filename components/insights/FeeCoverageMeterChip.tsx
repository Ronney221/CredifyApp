import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface MeterChipProps {
  value: number;
  displayTextType: 'full' | 'percentage_only';
}

export const FeeCoverageMeterChip: React.FC<MeterChipProps> = ({ value, displayTextType }) => {
  let chipStyle = styles.meterChipGreen;
  let textStyle = styles.meterChipTextGreen;
  let iconName: keyof typeof Ionicons.glyphMap = 'checkmark-circle-outline';

  if (value < 50) {
    chipStyle = styles.meterChipGray;
    textStyle = styles.meterChipTextGray;
    iconName = 'alert-circle-outline';
  } else if (value < 90) {
    chipStyle = styles.meterChipYellow;
    textStyle = styles.meterChipTextYellow;
    iconName = 'arrow-up-circle-outline';
  }

  const chipText = displayTextType === 'full' ? `${value.toFixed(0)}% of credits utilized` : `${value.toFixed(0)}%`;

  return (
    <View style={[styles.meterChipBase, chipStyle]}>
      <Ionicons name={iconName} size={14} color={textStyle.color} style={styles.meterChipIcon} />
      <Text style={[styles.meterChipTextBase, textStyle]}>{chipText}</Text>
    </View>
  );
};

const SUCCESS_GREEN = '#34C759';
const SUCCESS_GREEN_BACKGROUND = 'rgba(52, 199, 89, 0.1)';
const WARNING_YELLOW = '#FFCC00';
const WARNING_YELLOW_BACKGROUND = 'rgba(255, 204, 0, 0.15)';
const NEUTRAL_GRAY_COLOR = '#8A8A8E';
const NEUTRAL_GRAY_BACKGROUND = 'rgba(142, 142, 147, 0.1)';


export default FeeCoverageMeterChip;

const styles = StyleSheet.create({
  meterChipBase: {
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderRadius: 16,
    alignSelf: 'flex-end',
    marginBottom: 8,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  meterChipIcon: {
    marginRight: 4,
  },
  meterChipTextBase: {
    fontSize: 12,
    fontWeight: '500',
  },
  meterChipGreen: {
    backgroundColor: SUCCESS_GREEN_BACKGROUND,
    borderColor: SUCCESS_GREEN,
  },
  meterChipTextGreen: {
    color: SUCCESS_GREEN,
  },
  meterChipYellow: {
    backgroundColor: WARNING_YELLOW_BACKGROUND,
    borderColor: WARNING_YELLOW,
  },
  meterChipTextYellow: {
    color: '#1c1c1e',
  },
  meterChipGray: {
    backgroundColor: NEUTRAL_GRAY_BACKGROUND,
    borderColor: NEUTRAL_GRAY_COLOR,
  },
  meterChipTextGray: {
    color: NEUTRAL_GRAY_COLOR,
  },
}); 