import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface CardExpanderFooterProps {
  hiddenCardsCount: number;
  isExpanded: boolean;
  onToggleExpanded: () => void;
}

const CardExpanderFooter: React.FC<CardExpanderFooterProps> = ({ 
  hiddenCardsCount, 
  isExpanded, 
  onToggleExpanded 
}) => {
  // Don't show the footer if there are no hidden cards
  if (hiddenCardsCount <= 0) {
    return null;
  }

  return (
    <TouchableOpacity
      style={styles.cardContainer}
      onPress={onToggleExpanded}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardInfo}>
          <View style={styles.ghostCardImageWrapper}>
            <Ionicons 
              name={isExpanded ? "remove-circle-outline" : "ellipsis-horizontal-circle-outline"} 
              size={24} 
              color="#C7C7CC" 
            />
          </View>
          <View style={styles.cardTextContainer}>
            <Text style={styles.cardName}>
              {isExpanded 
                ? "Show fewer cards" 
                : `+ ${hiddenCardsCount} more card${hiddenCardsCount === 1 ? '' : 's'}`
              }
            </Text>
            <Text style={styles.cardSubtitle}>
              {isExpanded ? "Collapse to see less" : "Expand to see all your cards"}
            </Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <Ionicons
            name={isExpanded ? "chevron-up" : "chevron-down"}
            size={20}
            color="#C7C7CC"
          />
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#FAFAFA',
    borderRadius: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#F0F0F0',
    borderStyle: 'dashed',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: 'transparent',
  },
  cardInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  ghostCardImageWrapper: {
    width: 48,
    height: 32,
    borderRadius: 4,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed',
  },
  cardTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  cardName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8E8E93',
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#C7C7CC',
    fontWeight: '500',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
    paddingLeft: 8,
    flexShrink: 0,
  },
});

export default CardExpanderFooter; 