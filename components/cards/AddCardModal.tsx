import { Modal, View, Text, StyleSheet, TouchableOpacity, TextInput, FlatList, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Card, allCards } from '../../../src/data/card-data';
import { CardRow } from '../manage/CardRow';
import { Colors } from '../../../constants/Colors';
import { Animated } from 'react-native';

interface AddCardModalProps {
  visible: boolean;
  onClose: () => void;
  selectedCardIds: string[];
  tempSelectedCardIds: Set<string>;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onCardPress: (cardId: string) => void;
  getScaleValue: (cardId: string) => Animated.Value;
}

export function AddCardModal({
  visible,
  onClose,
  selectedCardIds,
  tempSelectedCardIds,
  searchQuery,
  onSearchChange,
  onCardPress,
  getScaleValue,
}: AddCardModalProps) {
  const filteredCards = allCards.filter(card => 
    !selectedCardIds.includes(card.id) || tempSelectedCardIds.has(card.id)
  ).filter(card =>
    card.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.doneButtonText}>Done</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Add Cards</Text>
          <View style={styles.rightPlaceholder} />
        </View>

        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Ionicons name="search" size={20} color={Colors.light.secondaryLabel} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search cards"
              value={searchQuery}
              onChangeText={onSearchChange}
              autoCapitalize="none"
              autoCorrect={false}
              clearButtonMode="while-editing"
              returnKeyType="search"
            />
          </View>
        </View>

        <FlatList
          data={filteredCards}
          keyExtractor={(card) => card.id}
          renderItem={({ item: card }) => (
            <CardRow
              key={card.id}
              card={card}
              isSelected={tempSelectedCardIds.has(card.id)}
              onPress={onCardPress}
              mode="onboard"
              cardScaleAnim={getScaleValue(card.id)}
            />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.systemGroupedBackground,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.light.systemGroupedBackground,
    borderBottomWidth: 0,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.light.text,
  },
  closeButton: {
    padding: 8,
    marginLeft: -8, // Offset the padding to align with the edge
  },
  doneButtonText: {
    color: Colors.light.tint,
    fontSize: 17,
    fontWeight: '600',
  },
  rightPlaceholder: {
    width: 60,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.light.systemGroupedBackground,
    borderBottomColor: Colors.light.separator,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.background,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 36,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 17,
    color: Colors.light.text,
    height: '100%',
  },
  listContent: {
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
}); 