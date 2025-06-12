import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Colors } from '../../../constants/Colors';
import { PerkStatusFilter } from '../../../src/data/dummy-insights';

interface FilterChipRowProps {
  perkStatusFilter: PerkStatusFilter;
  setPerkStatusFilter: (status: PerkStatusFilter) => void;
}

const FilterChipRow: React.FC<FilterChipRowProps> = ({
  perkStatusFilter,
  setPerkStatusFilter,
}) => {
  const handleFilterChange = (status: PerkStatusFilter) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPerkStatusFilter(status);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContainer}
      >
        {/* Perk Status Filters */}
        {(['all', 'redeemed', 'missed'] as PerkStatusFilter[]).map(status => (
          <TouchableOpacity
            key={status}
            style={[styles.chip, perkStatusFilter === status && styles.chipSelected]}
            onPress={() => handleFilterChange(status)}
          >
            <Text style={[styles.chipText, perkStatusFilter === status && styles.chipTextSelected]}>
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    backgroundColor: Colors.light.background,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  scrollContainer: {
    paddingHorizontal: 15,
    alignItems: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.light.icon,
    marginRight: 8,
  },
  chipSelected: {
    backgroundColor: Colors.light.tint,
    borderColor: Colors.light.tint,
  },
  chipText: {
    fontSize: 14,
    color: Colors.light.text,
  },
  chipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});

export default FilterChipRow; 