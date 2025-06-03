import React, { useState, useEffect, useMemo, useLayoutEffect, useCallback } from 'react';
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
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePickerModal from "react-native-modal-datetime-picker";
import DraggableFlatList, { RenderItemParams } from 'react-native-draggable-flatlist';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Card, allCards } from '../../src/data/card-data';
import { useRouter, useFocusEffect, useNavigation } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { getUserCards, saveUserCards } from '../../lib/database';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';

export default function Cards() {
  const router = useRouter();
  const navigation = useNavigation();
  const { user } = useAuth();
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
  const [isEditing, setIsEditing] = useState(false);

  // Notification preferences state
  const [perkExpiryRemindersEnabled, setPerkExpiryRemindersEnabled] = useState(true);
  const [renewalRemindersEnabled, setRenewalRemindersEnabled] = useState(true);
  const [perkResetConfirmationEnabled, setPerkResetConfirmationEnabled] = useState(true);
  // New state for individual reminder days
  const [remind1DayBeforeMonthly, setRemind1DayBeforeMonthly] = useState(true);
  const [remind3DaysBeforeMonthly, setRemind3DaysBeforeMonthly] = useState(true);
  const [remind7DaysBeforeMonthly, setRemind7DaysBeforeMonthly] = useState(true);

  const NOTIFICATION_PREFS_KEY = '@notification_preferences';

  // Load notification preferences
  useEffect(() => {
    const loadPrefs = async () => {
      try {
        const jsonValue = await AsyncStorage.getItem(NOTIFICATION_PREFS_KEY);
        if (jsonValue != null) {
          const prefs = JSON.parse(jsonValue);
          setPerkExpiryRemindersEnabled(prefs.perkExpiryRemindersEnabled !== undefined ? prefs.perkExpiryRemindersEnabled : true);
          setRenewalRemindersEnabled(prefs.renewalRemindersEnabled !== undefined ? prefs.renewalRemindersEnabled : true);
          setPerkResetConfirmationEnabled(prefs.perkResetConfirmationEnabled !== undefined ? prefs.perkResetConfirmationEnabled : true);
          
          // Load monthly perk reminder day preferences
          setRemind1DayBeforeMonthly(prefs.remind1DayBeforeMonthly !== undefined ? prefs.remind1DayBeforeMonthly : true);
          setRemind3DaysBeforeMonthly(prefs.remind3DaysBeforeMonthly !== undefined ? prefs.remind3DaysBeforeMonthly : true);
          setRemind7DaysBeforeMonthly(prefs.remind7DaysBeforeMonthly !== undefined ? prefs.remind7DaysBeforeMonthly : true);
        }
      } catch (e) {
        console.error("Failed to load notification prefs.", e);
      }
    };
    loadPrefs();
  }, []);

  // Save notification preferences
  const saveNotificationPreferences = async () => {
    try {
      const monthlyPerkExpiryReminderDays: number[] = [];
      if (remind1DayBeforeMonthly) monthlyPerkExpiryReminderDays.push(1);
      if (remind3DaysBeforeMonthly) monthlyPerkExpiryReminderDays.push(3);
      if (remind7DaysBeforeMonthly) monthlyPerkExpiryReminderDays.push(7);

      const prefsToSave = {
        perkExpiryRemindersEnabled,
        renewalRemindersEnabled,
        perkResetConfirmationEnabled,
        remind1DayBeforeMonthly, // Save individual toggles for UI state
        remind3DaysBeforeMonthly,
        remind7DaysBeforeMonthly,
        monthlyPerkExpiryReminderDays, // Save the constructed array for the scheduler
      };
      await AsyncStorage.setItem(NOTIFICATION_PREFS_KEY, JSON.stringify(prefsToSave));
    } catch (e) {
      console.error("Failed to save notification prefs.", e);
    }
  };

  // Update handlers to call the consolidated save function
  const handleTogglePerkExpiryReminders = (value: boolean) => {
    setPerkExpiryRemindersEnabled(value);
    // saveNotificationPreference('perkExpiryRemindersEnabled', value); // Old call
  };
  useEffect(() => { saveNotificationPreferences(); }, [perkExpiryRemindersEnabled]);

  const handleToggleRenewalReminders = (value: boolean) => {
    setRenewalRemindersEnabled(value);
    // saveNotificationPreference('renewalRemindersEnabled', value); // Old call
  };
  useEffect(() => { saveNotificationPreferences(); }, [renewalRemindersEnabled]);

  const handleTogglePerkResetConfirmation = (value: boolean) => {
    setPerkResetConfirmationEnabled(value);
    // saveNotificationPreference('perkResetConfirmationEnabled', value); // Old call
  };
  useEffect(() => { saveNotificationPreferences(); }, [perkResetConfirmationEnabled]);

  // New handlers for individual day toggles
  const handleToggleRemind1DayMonthly = (value: boolean) => {
    setRemind1DayBeforeMonthly(value);
  };
  useEffect(() => { saveNotificationPreferences(); }, [remind1DayBeforeMonthly]);

  const handleToggleRemind3DayMonthly = (value: boolean) => {
    setRemind3DaysBeforeMonthly(value);
  };
  useEffect(() => { saveNotificationPreferences(); }, [remind3DaysBeforeMonthly]);

  const handleToggleRemind7DayMonthly = (value: boolean) => {
    setRemind7DaysBeforeMonthly(value);
  };
  useEffect(() => { saveNotificationPreferences(); }, [remind7DaysBeforeMonthly]);

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
    const currentSelectedRenewalDates = Object.fromEntries(
      Object.entries(renewalDates).filter(([cardId]) => selectedCards.includes(cardId))
    );
    const initialSelectedRenewalDates = Object.fromEntries(
      Object.entries(initialRenewalDates).filter(([cardId]) => initialSelectedCards.includes(cardId))
    );
    const renewalDatesChanged = JSON.stringify(currentSelectedRenewalDates) !== JSON.stringify(initialSelectedRenewalDates);
    
    console.log('[CardsScreen] selectedCardsChanged:', selectedCardsChanged, { selected: selectedCardsSorted, initial: initialSelectedCardsSorted });
    console.log('[CardsScreen] renewalDatesChanged:', renewalDatesChanged, { current: currentSelectedRenewalDates, initial: initialSelectedRenewalDates });
    
    return selectedCardsChanged || renewalDatesChanged;
  }, [selectedCards, initialSelectedCards, renewalDates, initialRenewalDates]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity 
          onPress={() => setIsEditing(!isEditing)} 
          style={{ marginRight: 15, padding: 5 }}
        >
          <Text style={{ color: Platform.OS === 'ios' ? '#007aff' : '#000000', fontSize: 17 }}>
            {isEditing ? 'Done' : 'Edit'}
          </Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation, isEditing]);

  useEffect(() => {
    const loadExistingCards = async () => {
      try {
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
  }, [router, user]);

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
      if (!selectedCards.includes(currentEditingCardId)) {
        setSelectedCards(prev => [...prev, currentEditingCardId!]);
      }
    }
    hideDatePicker();
  };

  const toggleCardSelectionOnMainScreen = (cardId: string) => {
    if (isEditing) {
      setSelectedCards((prevSelectedCards) =>
        prevSelectedCards.filter((id) => id !== cardId)
      );
      setRenewalDates(prevDates => {
        const newDates = {...prevDates};
        delete newDates[cardId];
        return newDates;
      });
    } else {
      handleCardSettings(cardId);
    }
  };

  const formatDate = (date: Date | undefined): string => {
    if (!date) return 'Set Renewal Date';
    return date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
  };

  const selectedCardObjects = React.useMemo(() => 
    selectedCards.map(id => allCards.find(card => card.id === id)).filter(card => card !== undefined) as Card[],
    [selectedCards]
  );

  const handleSaveChanges = async () => {
    if (!user) {
      Alert.alert(
        "Authentication Required",
        "Please log in to save your card changes.",
        [
          { text: "Log In", onPress: () => router.push('/(auth)/login') },
          { text: "Cancel", style: "cancel" },
        ]
      );
      return;
    }
    try {
      setIsSaving(true);
      const { error } = await saveUserCards(user.id, selectedCardObjects, renewalDates);
      if (error) {
        console.error('Error saving cards:', error);
        return;
      }
      setInitialSelectedCards(selectedCards);
      setInitialRenewalDates(renewalDates);
      router.replace({
        pathname: '/(tabs)/01-dashboard',
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

  const handleCardSettings = (cardId: string) => {
    if (!isEditing) {
        showDatePicker(cardId);
    }
  };

  const renderCardItem = useCallback(({ item: card, drag, isActive }: RenderItemParams<Card>) => {
    if (!card) return null;
    const networkColor = getCardNetworkColor(card);
    return (
      <TouchableOpacity 
        key={card.id} 
        style={[styles.settingsRow, isActive && styles.draggingItem, isEditing && styles.editingItemContainer]}
        onPress={() => !isEditing && toggleCardSelectionOnMainScreen(card.id)}
        disabled={isEditing}
      >
        {isEditing && (
          <TouchableOpacity onPressIn={drag} style={styles.dragHandle} disabled={!isEditing}>
            <Ionicons name="reorder-three-outline" size={24} color="#c7c7cc" />
          </TouchableOpacity>
        )}
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
        {isEditing ? (
          <TouchableOpacity onPress={() => toggleCardSelectionOnMainScreen(card.id)} style={styles.removeButton}>
            <Ionicons name="remove-circle-outline" size={24} color="#ff3b30" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={() => handleCardSettings(card.id)} style={styles.settingsButton}>
             <Ionicons name="chevron-forward" size={20} color="#c7c7cc" />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  }, [isEditing, renewalDates, getCardNetworkColor, toggleCardSelectionOnMainScreen, handleCardSettings, formatDate]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007aff" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
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
              const isDisabledForAdding = isAlreadySelectedOnMain;
              const isSelectedInModalSession = tempSelectedCardIdsInModal.has(card.id);
              const networkColor = getCardNetworkColor(card);

              return (
                <TouchableOpacity 
                  key={card.id} 
                  style={[styles.modalCardRow, isDisabledForAdding && styles.modalCardRowDisabled]}
                  onPress={() => handleToggleCardInModal(card.id)}
                  disabled={isDisabledForAdding}
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

      {isEditing ? (
        <DraggableFlatList
          data={selectedCardObjects}
          renderItem={renderCardItem}
          keyExtractor={(item) => item.id}
          onDragEnd={({ data }) => {
            const newSelectedCardIds = data.map(card => card.id);
            setSelectedCards(newSelectedCardIds);
          }}
          containerStyle={styles.draggableListContainer}
        />
      ) : (
        <ScrollView style={styles.mainScrollView}>
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionHeader}>SELECTED CARDS</Text>
            {selectedCardObjects.length > 0 ? (
              selectedCardObjects.map((cardObject, index) => renderCardItem({ item: cardObject, drag: () => {}, isActive: false, getIndex: () => index }))
            ) : (
              <Text style={styles.emptySectionText}>No cards selected yet.</Text>
            )}
          </View>
  
          <TouchableOpacity style={styles.settingsRow} onPress={handleOpenAddCardModal}>
            <Ionicons name="add-circle-outline" size={24} color="#007aff" style={styles.rowIcon} />
            <Text style={[styles.rowLabel, styles.addRowLabel]}>Add Another Card</Text>
          </TouchableOpacity>
  
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionHeader}>NOTIFICATION PREFERENCES</Text>
            <View style={styles.settingsRow}>
              <Text style={styles.rowLabel}>Monthly Perk Expiry Reminders</Text>
              <Switch 
                trackColor={{ false: "#767577", true: "#81b0ff" }}
                thumbColor={perkExpiryRemindersEnabled ? "#007aff" : "#f4f3f4"}
                ios_backgroundColor="#3e3e3e"
                onValueChange={handleTogglePerkExpiryReminders}
                value={perkExpiryRemindersEnabled}
              />
            </View>
            {/* Sub-section for monthly perk reminder days - shown if main toggle is on */}
            {perkExpiryRemindersEnabled && (
              <View style={styles.subSectionContainer}>
                <View style={styles.settingsRow}>
                  <Text style={styles.subRowLabel}>Remind 1 day before expiry</Text>
                  <Switch 
                    trackColor={{ false: "#767577", true: "#81b0ff" }}
                    thumbColor={remind1DayBeforeMonthly ? "#007aff" : "#f4f3f4"}
                    ios_backgroundColor="#3e3e3e"
                    onValueChange={handleToggleRemind1DayMonthly}
                    value={remind1DayBeforeMonthly}
                  />
                </View>
                <View style={styles.settingsRow}>
                  <Text style={styles.subRowLabel}>Remind 3 days before expiry</Text>
                  <Switch 
                    trackColor={{ false: "#767577", true: "#81b0ff" }}
                    thumbColor={remind3DaysBeforeMonthly ? "#007aff" : "#f4f3f4"}
                    ios_backgroundColor="#3e3e3e"
                    onValueChange={handleToggleRemind3DayMonthly}
                    value={remind3DaysBeforeMonthly}
                  />
                </View>
                <View style={styles.settingsRow}>
                  <Text style={styles.subRowLabel}>Remind 7 days before expiry</Text>
                  <Switch 
                    trackColor={{ false: "#767577", true: "#81b0ff" }}
                    thumbColor={remind7DaysBeforeMonthly ? "#007aff" : "#f4f3f4"}
                    ios_backgroundColor="#3e3e3e"
                    onValueChange={handleToggleRemind7DayMonthly}
                    value={remind7DaysBeforeMonthly}
                  />
                </View>
              </View>
            )}
            <View style={styles.settingsRow}>
              <Text style={styles.rowLabel}>Card Renewal Reminders</Text>
              <Switch 
                trackColor={{ false: "#767577", true: "#81b0ff" }}
                thumbColor={renewalRemindersEnabled ? "#007aff" : "#f4f3f4"}
                ios_backgroundColor="#3e3e3e"
                onValueChange={handleToggleRenewalReminders}
                value={renewalRemindersEnabled}
              />
            </View>
            <View style={styles.settingsRow}>
              <Text style={styles.rowLabel}>Perk Reset Confirmations</Text>
              <Switch 
                trackColor={{ false: "#767577", true: "#81b0ff" }}
                thumbColor={perkResetConfirmationEnabled ? "#007aff" : "#f4f3f4"}
                ios_backgroundColor="#3e3e3e"
                onValueChange={handleTogglePerkResetConfirmation}
                value={perkResetConfirmationEnabled}
              />
            </View>
          </View>
        </ScrollView>
      )}
      {hasChanges && !isEditing && (
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
  draggableListContainer: {
    flex: 1,
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
  subRowLabel: {
    fontSize: 15,
    color: '#333333',
    paddingLeft: 15, // Indent sub-options
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
  removeButton: {
    paddingLeft: 16,
  },
  settingsButton: {
    paddingLeft: 16,
  },
  editingItemContainer: {
    paddingLeft: 0,
  },
  draggingItem: {
    opacity: 0.8,
    backgroundColor: '#e0e0e0',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  dragHandle: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
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
  subSectionContainer: {
    // Styles for the container of sub-switches, if needed for slight indent or different bg
    // For now, it will inherit row styles, which might be fine.
    // Add paddingLeft if direct child of sectionContainer and want to indent the whole block
  },
});