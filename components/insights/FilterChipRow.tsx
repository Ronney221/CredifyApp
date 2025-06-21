import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { PerkStatusFilter } from '../../src/data/dummy-insights';

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

  const getFilterIcon = (status: PerkStatusFilter) => {
    switch (status) {
      case 'all':
        return 'apps-outline';
      case 'redeemed':
        return 'checkmark-circle-outline';
      case 'missed':
        return 'alert-circle-outline';
      default:
        return 'apps-outline';
    }
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
            <Ionicons
              name={getFilterIcon(status)}
              size={16}
              color={perkStatusFilter === status ? '#FFFFFF' : Colors.light.text}
              style={styles.icon}
            />
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
    paddingVertical: 12,
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
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.light.icon,
    marginRight: 10,
    backgroundColor: 'rgba(0,0,0,0.03)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  chipSelected: {
    backgroundColor: Colors.light.tint,
    borderColor: Colors.light.tint,
    shadowColor: Colors.light.tint,
    shadowOpacity: 0.2,
  },
  chipText: {
    fontSize: 14,
    color: Colors.light.text,
    fontWeight: '500',
    marginLeft: 4,
  },
  chipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  icon: {
    marginRight: 2,
  },
});

export default FilterChipRow; 