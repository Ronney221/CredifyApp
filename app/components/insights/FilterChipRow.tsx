import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../constants/Colors';
import { PerkStatusFilter } from '../../../src/data/dummy-insights';

interface CardInfo {
  id: string;
  name: string;
}

interface FilterChipRowProps {
  perkStatusFilter: PerkStatusFilter;
  setPerkStatusFilter: (status: PerkStatusFilter) => void;
  selectedCardIds: string[];
  availableCards: CardInfo[];
  onManageFilters: () => void;
  activeFilterCount: number;
}

const ICON_WIDTH = 50;

const FilterChipRow: React.FC<FilterChipRowProps> = ({
  perkStatusFilter,
  setPerkStatusFilter,
  selectedCardIds,
  availableCards,
  onManageFilters,
  activeFilterCount,
}) => {
  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContainer,
          { paddingRight: ICON_WIDTH },
        ]}
      >
        {/* Perk Status Filters */}
        {(['all', 'redeemed', 'missed'] as PerkStatusFilter[]).map(status => (
          <TouchableOpacity
            key={status}
            style={[styles.chip, perkStatusFilter === status && styles.chipSelected]}
            onPress={() => setPerkStatusFilter(status)}
          >
            <Text style={[styles.chipText, perkStatusFilter === status && styles.chipTextSelected]}>
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Absolutely-positioned Manage icon */}
      <TouchableOpacity style={styles.manageBtn} onPress={onManageFilters}>
        <Ionicons name="options-outline" size={24} color={Colors.light.tint} />
        {activeFilterCount > 0 && (
          <View style={styles.badgeContainer}>
            <Text style={styles.badgeText}>{activeFilterCount}</Text>
          </View>
        )}
      </TouchableOpacity>
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
  divider: {
    height: '60%',
    width: 1,
    backgroundColor: '#D1D1D6',
    marginHorizontal: 8,
  },
  manageBtn: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: ICON_WIDTH,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: `${Colors.light.background}F2`, // Add slight transparency to blend edges
  },
  badgeContainer: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: Colors.light.tint,
    borderRadius: 9,
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.light.background,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
});

export default FilterChipRow; 