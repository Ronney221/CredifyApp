import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../constants/Colors';

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
    backgroundColor: Colors.light.softMint,
    borderColor: Colors.light.success,
  },
  meterChipTextGreen: {
    color: Colors.light.success,
  },
  meterChipYellow: {
    backgroundColor: 'rgba(255, 149, 0, 0.1)',
    borderColor: Colors.light.warning,
  },
  meterChipTextYellow: {
    color: Colors.light.warning,
  },
  meterChipGray: {
    backgroundColor: 'rgba(142, 142, 147, 0.1)',
    borderColor: Colors.light.slateGrey,
  },
  meterChipTextGray: {
    color: Colors.light.slateGrey,
  },
}); 