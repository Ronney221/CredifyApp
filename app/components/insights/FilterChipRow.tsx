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
}

const FilterChipRow: React.FC<FilterChipRowProps> = ({
  perkStatusFilter,
  setPerkStatusFilter,
  selectedCardIds,
  availableCards,
  onManageFilters,
}) => {
  const selectedCards = availableCards.filter(card => selectedCardIds.includes(card.id));

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContainer}>
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

        <View style={styles.divider} />

        {/* Selected Card Filters */}
        {selectedCards.map(card => (
          <TouchableOpacity
            key={card.id}
            style={[styles.chip, styles.chipSelected]} // Always selected style for cards
            onPress={onManageFilters} // Tapping a card opens the filter manager
          >
            {/* Add card logo/avatar here in the future */}
            <Text style={[styles.chipText, styles.chipTextSelected]}>{card.name}</Text>
          </TouchableOpacity>
        ))}
        
        {/* Manage Filters Button */}
        <TouchableOpacity style={styles.manageButton} onPress={onManageFilters}>
          <Ionicons name="options-outline" size={16} color={Colors.light.tint} />
          <Text style={styles.manageButtonText}>Manage</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 10,
    backgroundColor: Colors.light.background,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
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
  manageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  manageButtonText: {
    fontSize: 14,
    color: Colors.light.tint,
    marginLeft: 5,
    fontWeight: '600',
  },
});

export default FilterChipRow; 