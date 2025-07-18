import { Modal, View, Text, StyleSheet, TouchableOpacity, TextInput, FlatList, Platform , Animated, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../../src/data/card-data';
import { getAllCardsData } from '../../lib/database';
import { CardRow } from '../manage/CardRow';
import { Colors } from '../../constants/Colors';


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
  const [allCards, setAllCards] = useState<Card[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadCards = async () => {
      try {
        const cards = await getAllCardsData();
        setAllCards(cards);
      } catch (error) {
        console.error('Error loading cards for AddCardModal:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (visible) {
      loadCards();
    }
  }, [visible]);

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

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.light.tint} />
            <Text style={styles.loadingText}>Loading cards...</Text>
          </View>
        ) : (
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
        )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: Colors.light.secondaryLabel,
  },
}); 