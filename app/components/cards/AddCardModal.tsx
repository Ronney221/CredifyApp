import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../../../src/data/card-data';
import { CardRow } from '../manage/CardRow';
import { Colors } from '../../../constants/Colors';
import { Animated } from 'react-native';
import { useGroupedCards } from './hooks/useGroupedCards';
import { allCards } from '../../../src/data/card-data';

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

export const AddCardModal: React.FC<AddCardModalProps> = ({
  visible,
  onClose,
  selectedCardIds,
  tempSelectedCardIds,
  searchQuery,
  onSearchChange,
  onCardPress,
  getScaleValue,
}) => {
  const { frequentlyOwned, allCardsByIssuer } = useGroupedCards();

  const filteredCards = useMemo(() => {
    if (!searchQuery) {
      return { frequentlyOwned, allCardsByIssuer };
    }

    const lowercasedQuery = searchQuery.toLowerCase();
    const filterFn = (card: Card) => card.name.toLowerCase().includes(lowercasedQuery);

    const filteredFrequentlyOwned = frequentlyOwned.filter(filterFn);
    
    const filteredAllCardsByIssuer = Object.entries(allCardsByIssuer)
      .reduce((acc, [issuer, cards]) => {
        const filtered = cards.filter(filterFn);
        if (filtered.length > 0) {
          acc[issuer] = filtered;
        }
        return acc;
      }, {} as { [key: string]: Card[] });
      
    const searchResultsFromAll = allCards.filter(filterFn);

    return { frequentlyOwned: filteredFrequentlyOwned, allCardsByIssuer: filteredAllCardsByIssuer, searchResults: searchResultsFromAll };
  }, [searchQuery, frequentlyOwned, allCardsByIssuer]);

  const {
    frequentlyOwned: displayFrequentlyOwned,
    allCardsByIssuer: displayAllByIssuer,
    searchResults
  } = filteredCards as {
    frequentlyOwned: Card[];
    allCardsByIssuer: { [key: string]: Card[] };
    searchResults?: Card[];
  };
  
  const isSearching = searchQuery.length > 0;
  
  const renderCardList = (cards: Card[]) => {
    return cards.map((card) => {
      const isAlreadySelected = selectedCardIds.includes(card.id);
      const isSelectedInModal = tempSelectedCardIds.has(card.id);

      return (
        <CardRow
          key={card.id}
          card={card}
          isSelected={isSelectedInModal}
          onPress={onCardPress}
          mode="onboard"
          disabled={isAlreadySelected}
          cardScaleAnim={getScaleValue(card.id)}
        />
      );
    });
  };

  return (
    <Modal
      animationType="slide"
      transparent={false}
      visible={visible}
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.modalContainer} edges={['top', 'left', 'right', 'bottom']}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Add a Card</Text>
          <TouchableOpacity onPress={onClose} style={styles.modalDoneButton}>
            <Text style={styles.modalDoneButtonText}>Done</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.modalSearchContainer}>
          <Ionicons name="search" size={18} color="#8e8e93" style={styles.modalSearchIcon} />
          <TextInput
            style={styles.modalSearchInput}
            placeholder="Search for a card..."
            placeholderTextColor="#8e8e93"
            value={searchQuery}
            onChangeText={onSearchChange}
          />
        </View>
        
        <ScrollView style={styles.modalScrollView}>
          {isSearching ? (
            <>
              {searchResults && searchResults.length > 0 ? (
                renderCardList(searchResults)
              ) : (
                <Text style={styles.emptySearchText}>
                  No cards found matching &quot;{searchQuery}&quot;.
                </Text>
              )}
            </>
          ) : (
            <>
              {displayFrequentlyOwned.length > 0 && (
                <View style={styles.issuerGroup}>
                  <Text style={styles.issuerName}>Frequently Owned</Text>
                  {renderCardList(displayFrequentlyOwned)}
                </View>
              )}
              <View style={styles.issuerGroup}>
                <Text style={styles.issuerName}>All Cards by Issuer</Text>
                {Object.entries(displayAllByIssuer).map(([issuerName, cards]) => (
                  <View key={issuerName} style={styles.subIssuerGroup}>
                    <Text style={styles.subIssuerName}>{issuerName}</Text>
                    {renderCardList(cards)}
                  </View>
                ))}
              </View>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: '#f2f2f7',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 45,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#c7c7cc',
    backgroundColor: '#ffffff',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
  },
  modalDoneButton: {
    paddingVertical: 8,
    paddingHorizontal: 8, 
  },
  modalDoneButtonText: {
    fontSize: 17,
    color: '#007aff',
    fontWeight: '600',
  },
  modalSearchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#ffffff', 
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#c7c7cc',
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  modalSearchIcon: {
    position: 'absolute',
    left: 28,
    zIndex: 1,
  },
  modalSearchInput: {
    height: 36,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingLeft: 32,
    backgroundColor: '#efeff4',
    fontSize: 17,
    flex: 1,
    color: '#000000',
  },
  modalScrollView: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  emptySearchText: {
    padding: 20,
    textAlign: 'center',
    color: Colors.light.icon,
    fontSize: 16,
  },
  issuerGroup: {
    marginBottom: 16,
  },
  issuerName: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 12,
  },
  subIssuerGroup: {
    marginBottom: 16,
  },
  subIssuerName: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.light.text,
    paddingHorizontal: 20,
    paddingBottom: 8,
    paddingTop: 8,
    backgroundColor: '#f2f2f7'
  },
}); 