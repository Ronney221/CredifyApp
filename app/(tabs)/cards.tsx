import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Image,
  TouchableOpacity,
  Platform,
  StatusBar,
  ActivityIndicator,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { Card, allCards } from '../../src/data/card-data';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { getUserCards, saveUserCards } from '../../lib/database';
import { Ionicons } from '@expo/vector-icons';

export default function Cards() {
  const router = useRouter();
  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  const [initialSelectedCards, setInitialSelectedCards] = useState<string[]>([]);
  const [renewalDates, setRenewalDates] = useState<Record<string, Date>>({});
  const [initialRenewalDates, setInitialRenewalDates] = useState<Record<string, Date>>({});
  const [isDatePickerVisible, setDatePickerVisibility] = useState(false);
  const [currentEditingCardId, setCurrentEditingCardId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [addCardModalVisible, setAddCardModalVisible] = useState(false);
  const [modalSearchQuery, setModalSearchQuery] = useState('');
  const [tempSelectedCardIdsInModal, setTempSelectedCardIdsInModal] = useState<Set<string>>(new Set());

  const getCardNetworkColor = (card: Card) => {
    switch (card.network?.toLowerCase()) {
      case 'amex':
      case 'american express':
        if (card.name?.toLowerCase().includes('platinum')) return '#E5E4E2';
        if (card.name?.toLowerCase().includes('gold')) return '#B08D57';
        return '#007bc1';
      case 'chase':
        return '#124A8D';
      default:
        return '#F0F0F0';
    }
  };

  const hasChanges = React.useMemo(() => {
    console.log('[CardsScreen] Checking hasChanges...');
    const selectedCardsSorted = [...selectedCards].sort();
    const initialSelectedCardsSorted = [...initialSelectedCards].sort();
    
    const selectedCardsChanged = JSON.stringify(selectedCardsSorted) !== JSON.stringify(initialSelectedCardsSorted);
    const renewalDatesChanged = JSON.stringify(renewalDates) !== JSON.stringify(initialRenewalDates);
    
    console.log('[CardsScreen] selectedCardsChanged:', selectedCardsChanged, { selected: selectedCardsSorted, initial: initialSelectedCardsSorted });
    console.log('[CardsScreen] renewalDatesChanged:', renewalDatesChanged, { current: renewalDates, initial: initialRenewalDates });
    
    return selectedCardsChanged || renewalDatesChanged;
  }, [selectedCards, initialSelectedCards, renewalDates, initialRenewalDates]);

  useEffect(() => {
    const loadExistingCards = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.replace('/(auth)/login');
          return;
        }
        const { data: userCards, error } = await getUserCards(user.id);
        if (!error && userCards) {
          const cardIds = allCards
            .filter(card => userCards.some(uc => uc.card_name === card.name))
            .map(card => card.id);
          setSelectedCards(cardIds);
          setInitialSelectedCards(cardIds);
          const dates: Record<string, Date> = {};
          userCards.forEach(uc => {
            if (uc.renewal_date) {
              const card = allCards.find(c => c.name === uc.card_name);
              if (card) {
                dates[card.id] = new Date(uc.renewal_date);
              }
            }
          });
          setRenewalDates(dates);
          setInitialRenewalDates(dates);
        }
        setIsLoading(false);
      } catch (error) {
        console.error('Error loading cards:', error);
        setIsLoading(false);
      }
    };
    loadExistingCards();
  }, [router]);

  useFocusEffect(
    React.useCallback(() => {
      StatusBar.setBarStyle('dark-content');
      if (Platform.OS === 'android') {
        StatusBar.setBackgroundColor('transparent');
        StatusBar.setTranslucent(true);
      }
      return () => {};
    }, [])
  );

  const showDatePicker = (cardId: string) => {
    setCurrentEditingCardId(cardId);
    setDatePickerVisibility(true);
  };

  const hideDatePicker = () => {
    setDatePickerVisibility(false);
    setCurrentEditingCardId(null);
  };

  const handleConfirmDate = (date: Date) => {
    if (currentEditingCardId) {
      setRenewalDates((prevDates) => ({
        ...prevDates,
        [currentEditingCardId]: date,
      }));
    }
    hideDatePicker();
  };

  const toggleCardSelectionOnMainScreen = (cardId: string) => {
    setSelectedCards((prevSelectedCards) =>
      prevSelectedCards.includes(cardId)
        ? prevSelectedCards.filter((id) => id !== cardId)
        : [...prevSelectedCards, cardId]
    );
    if (selectedCards.includes(cardId)) {
      setRenewalDates(prevDates => {
        const newDates = {...prevDates};
        delete newDates[cardId];
        return newDates;
      });
    }
  };

  const formatDate = (date: Date | undefined): string => {
    if (!date) return 'Set Renewal Date';
    return date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
  };

  const selectedCardObjects = React.useMemo(() => 
    allCards.filter(card => selectedCards.includes(card.id)),
    [selectedCards]
  );

  const handleSaveChanges = async () => {
    try {
      setIsSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/(auth)/login');
        return;
      }
      const { error } = await saveUserCards(user.id, selectedCardObjects, renewalDates);
      if (error) {
        console.error('Error saving cards:', error);
        return;
      }
      setInitialSelectedCards(selectedCards);
      setInitialRenewalDates(renewalDates);
      router.replace({
        pathname: '/(tabs)/dashboard',
        params: { refresh: Date.now().toString() }
      });
    } catch (error) {
      console.error('Error in save handler:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenAddCardModal = () => {
    setModalSearchQuery('');
    setTempSelectedCardIdsInModal(new Set());
    setAddCardModalVisible(true);
  };

  const handleToggleCardInModal = (cardId: string) => {
    if (selectedCards.includes(cardId)) return;

    setTempSelectedCardIdsInModal(prev => {
      const newSet = new Set(prev);
      if (newSet.has(cardId)) {
        newSet.delete(cardId);
      } else {
        newSet.add(cardId);
      }
      return newSet;
    });
  };

  const handleDoneAddCardModal = () => {
    setSelectedCards(prev => {
      const combined = new Set([...prev, ...tempSelectedCardIdsInModal]);
      const newSelectedCards = Array.from(combined);
      console.log('[CardsScreen] handleDoneAddCardModal - newSelectedCards:', newSelectedCards, 'tempSelections:', Array.from(tempSelectedCardIdsInModal));
      return newSelectedCards;
    });
    setAddCardModalVisible(false);
  };

  const filteredAvailableCardsForModal = React.useMemo(() => {
    return allCards.filter(card => 
      card.name.toLowerCase().includes(modalSearchQuery.toLowerCase())
    );
  }, [modalSearchQuery]);

  const handleGlobalReminders = () => {
    console.log("Placeholder: Open global reminders settings sheet");
  };

  const handleCardSettings = (cardId: string) => {
    console.log(`Placeholder: Open card settings sheet for ${cardId}`);
    showDatePicker(cardId);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007aff" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent={true} />
      
      <Modal
        animationType="slide"
        transparent={false}
        visible={addCardModalVisible}
        onRequestClose={handleDoneAddCardModal}
      >
        <SafeAreaView style={styles.modalContainer} edges={['top', 'left', 'right', 'bottom']}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add a Card</Text>
            <TouchableOpacity onPress={handleDoneAddCardModal} style={styles.modalDoneButton}>
              <Text style={styles.modalDoneButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.modalSearchContainer}>
            <Ionicons name="search" size={18} color="#8e8e93" style={styles.modalSearchIcon} />
            <TextInput
              style={styles.modalSearchInput}
              placeholder="Search for a card..."
              placeholderTextColor="#8e8e93"
              value={modalSearchQuery}
              onChangeText={setModalSearchQuery}
            />
          </View>
          <ScrollView style={styles.modalScrollView}>
            {filteredAvailableCardsForModal.map((card) => {
              const isAlreadySelectedOnMain = selectedCards.includes(card.id);
              const isSelectedInModalSession = tempSelectedCardIdsInModal.has(card.id);
              const networkColor = getCardNetworkColor(card);

              return (
                <TouchableOpacity 
                  key={card.id} 
                  style={[styles.modalCardRow, isAlreadySelectedOnMain && styles.modalCardRowDisabled]}
                  onPress={() => handleToggleCardInModal(card.id)}
                  disabled={isAlreadySelectedOnMain}
                >
                  <View style={[styles.rowCardImageWrapper, { backgroundColor: networkColor }]}>
                    <Image source={card.image} style={styles.rowCardImage} />
                  </View>
                  <View style={styles.cardRowContent}>
                    <Text style={styles.rowLabel}>{card.name}</Text>
                  </View>
                  {isAlreadySelectedOnMain ? (
                    <Ionicons name="checkmark-circle" size={24} color="#34c759" />
                  ) : isSelectedInModalSession ? (
                    <Ionicons name="checkmark-circle-outline" size={24} color="#007aff" />
                  ) : (
                    <Ionicons name="add-circle-outline" size={24} color="#007aff" />
                  )}
                </TouchableOpacity>
              );
            })}
            {filteredAvailableCardsForModal.length === 0 && modalSearchQuery !== '' && (
              <Text style={styles.emptySectionText}>No cards found matching "{modalSearchQuery}".</Text>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <ScrollView style={styles.mainScrollView}>
        <Text style={styles.title}>Manage Your Cards</Text>
        
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionHeader}>SELECTED CARDS</Text>
          {selectedCardObjects.length > 0 ? (
            selectedCardObjects.map((card) => {
              const networkColor = getCardNetworkColor(card);
              return (
                <TouchableOpacity 
                  key={card.id} 
                  style={styles.settingsRow}
                  onPress={() => handleCardSettings(card.id)}
                >
                  <View style={[styles.rowCardImageWrapper, { backgroundColor: networkColor }]}>
                    <Image source={card.image} style={styles.rowCardImage} />
                  </View>
                  <View style={styles.cardRowContent}>
                    <Text style={styles.rowLabel}>{card.name}</Text>
                    <Text style={[
                        styles.rowSubLabel,
                        !renewalDates[card.id] && styles.rowSubLabelPlaceholder
                    ]}>
                        {formatDate(renewalDates[card.id])}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => toggleCardSelectionOnMainScreen(card.id)} style={styles.moreOptionsButton}>
                    <Ionicons name="remove-circle-outline" size={24} color="#ff3b30" />
                  </TouchableOpacity>
                </TouchableOpacity>
              );
            })
          ) : (
            <Text style={styles.emptySectionText}>No cards selected yet.</Text>
          )}
        </View>

        <TouchableOpacity style={styles.settingsRow} onPress={handleOpenAddCardModal}>
          <Ionicons name="add-circle-outline" size={24} color="#007aff" style={styles.rowIcon} />
          <Text style={[styles.rowLabel, styles.addRowLabel]}>Add Another Card</Text>
        </TouchableOpacity>

        <View style={styles.sectionContainer}>
          <Text style={styles.sectionHeader}>NOTIFICATIONS</Text>
          <TouchableOpacity style={styles.settingsRow} onPress={handleGlobalReminders}>
            <Text style={styles.rowLabel}>Global Reminders</Text>
            <Ionicons name="chevron-forward" size={20} color="#c7c7cc" />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {hasChanges && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
            onPress={handleSaveChanges}
            disabled={isSaving}
            activeOpacity={0.8}
          >
            {isSaving ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.saveButtonText}>Save Changes</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {currentEditingCardId && (
        <DateTimePickerModal
          isVisible={isDatePickerVisible}
          mode="date"
          onConfirm={handleConfirmDate}
          onCancel={hideDatePicker}
          date={renewalDates[currentEditingCardId] || new Date()}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f2f2f7',
  },
  mainScrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f2f2f7',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666666',
  },
  title: {
    fontSize: 34,
    fontWeight: 'bold',
    marginTop: Platform.OS === 'android' ? 20 : 10,
    marginBottom: 10, 
    paddingHorizontal: 16,
    color: '#1c1c1e',
  },
  sectionContainer: {
    marginTop: 20, 
    backgroundColor: '#ffffff',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#c7c7cc',
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '400',
    color: '#6d6d72',
    textTransform: 'uppercase',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 6,
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#c7c7cc',
  },
  rowIcon: {
    marginRight: 16,
  },
  rowCardImageWrapper: {
    width: 40,
    height: 25,
    borderRadius: 3,
    marginRight: 16,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  rowCardImage: {
    width: '90%',
    height: '90%',
    resizeMode: 'contain',
  },
  cardRowContent: {
    flex: 1,
  },
  rowLabel: {
    fontSize: 17,
    color: '#000000',
  },
  addRowLabel: {
    color: '#007aff',
  },
  rowSubLabel: {
    fontSize: 15,
    color: '#8e8e93',
    marginTop: 2,
  },
  rowSubLabelPlaceholder: {
    fontWeight: '600',
    color: '#007aff',
  },
  moreOptionsButton: {
    paddingLeft: 16,
  },
  emptySectionText: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#6d6d72',
    fontSize: 15,
    textAlign: 'center',
  },
  footer: {
    padding: 16, 
    backgroundColor: '#f2f2f7',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#c7c7cc',
  },
  saveButton: {
    backgroundColor: '#007aff',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#c7c7cc',
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f2f2f7',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 25,
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
  },
  modalCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#c7c7cc',
  },
  modalCardRowDisabled: {
    opacity: 0.5,
  },
});