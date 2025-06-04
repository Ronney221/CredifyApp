import React from 'react';
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

interface AddCardModalProps {
  visible: boolean;
  onClose: () => void;
  availableCards: Card[];
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
  availableCards,
  selectedCardIds,
  tempSelectedCardIds,
  searchQuery,
  onSearchChange,
  onCardPress,
  getScaleValue,
}) => {
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
          {availableCards.map((card) => {
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
          })}
          {availableCards.length === 0 && searchQuery !== '' && (
            <Text style={styles.emptySearchText}>
              No cards found matching &quot;{searchQuery}&quot;.
            </Text>
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
}); 