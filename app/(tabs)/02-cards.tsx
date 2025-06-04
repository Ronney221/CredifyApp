import React, { useState, useEffect, useMemo, useLayoutEffect, useCallback, useRef } from 'react';
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
  Animated,
  Easing,
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
import { Colors } from '../../constants/Colors';
import { MotiView } from 'moti';
import * as Haptics from 'expo-haptics';
import { CardRow } from '../components/manage/CardRow';
import { ReminderToggleGroup } from '../components/manage/ReminderToggleGroup';
import { ManageCardsContainer } from '../components/manage/ManageCardsContainer';

const NOTIFICATION_PREFS_KEY = '@notification_preferences';

interface ToggleProps {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
}

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
  const scaleValues = useRef(new Map<string, Animated.Value>()).current;

  // Notification preferences state
  const [perkExpiryRemindersEnabled, setPerkExpiryRemindersEnabled] = useState(true);
  const [renewalRemindersEnabled, setRenewalRemindersEnabled] = useState(true);
  const [perkResetConfirmationEnabled, setPerkResetConfirmationEnabled] = useState(true);
  const [remind1DayBeforeMonthly, setRemind1DayBeforeMonthly] = useState(true);
  const [remind3DaysBeforeMonthly, setRemind3DaysBeforeMonthly] = useState(true);
  const [remind7DaysBeforeMonthly, setRemind7DaysBeforeMonthly] = useState(true);

  const getScaleValue = (cardId: string) => {
    if (!scaleValues.has(cardId)) {
      scaleValues.set(cardId, new Animated.Value(1));
    }
    return scaleValues.get(cardId)!;
  };

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
        remind1DayBeforeMonthly,
        remind3DaysBeforeMonthly,
        remind7DaysBeforeMonthly,
        monthlyPerkExpiryReminderDays,
      };
      await AsyncStorage.setItem(NOTIFICATION_PREFS_KEY, JSON.stringify(prefsToSave));
    } catch (e) {
      console.error("Failed to save notification prefs.", e);
    }
  };

  // Auto-save preferences when they change
  useEffect(() => { saveNotificationPreferences(); }, [
    perkExpiryRemindersEnabled,
    renewalRemindersEnabled, 
    perkResetConfirmationEnabled,
    remind1DayBeforeMonthly,
    remind3DaysBeforeMonthly,
    remind7DaysBeforeMonthly
  ]);

  const hasChanges = React.useMemo(() => {
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

  const handleCardPress = (cardId: string) => {
    if (isEditing) {
      return; // Do nothing in edit mode, drag handle will be used
    }
    showDatePicker(cardId);
  };

  const handleRemoveCard = (cardId: string) => {
    setSelectedCards(prev => prev.filter(id => id !== cardId));
    setRenewalDates(prevDates => {
      const newDates = {...prevDates};
      delete newDates[cardId];
      return newDates;
    });
  };

  const handleAddCard = (cardId: string) => {
    const cardScale = getScaleValue(cardId);
    
    if (!selectedCards.includes(cardId)) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      Animated.sequence([
        Animated.timing(cardScale, {
          toValue: 1.05,
          duration: 100,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(cardScale, {
          toValue: 1,
          duration: 100,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start();
      
      setTempSelectedCardIdsInModal(prev => {
        const newSet = new Set(prev);
        newSet.add(cardId);
        return newSet;
      });
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

  const handleDoneAddCardModal = () => {
    setSelectedCards(prev => {
      const combined = new Set([...prev, ...tempSelectedCardIdsInModal]);
      return Array.from(combined);
    });
    setAddCardModalVisible(false);
  };

  const filteredAvailableCardsForModal = React.useMemo(() => {
    return allCards.filter(card => 
      card.name.toLowerCase().includes(modalSearchQuery.toLowerCase())
    );
  }, [modalSearchQuery]);

  const anyRenewalDateSet = React.useMemo(() => {
    return Object.values(renewalDates).some(date => date !== undefined);
  }, [renewalDates]);

  // Notification toggle configurations
  const perkExpiryToggles: ToggleProps[] = [
    { label: "1 day before", value: remind1DayBeforeMonthly, onValueChange: setRemind1DayBeforeMonthly },
    { label: "3 days before", value: remind3DaysBeforeMonthly, onValueChange: setRemind3DaysBeforeMonthly },
    { label: "7 days before", value: remind7DaysBeforeMonthly, onValueChange: setRemind7DaysBeforeMonthly },
  ];

  const notificationItems = React.useMemo(() => [
    { 
      iconName: "alarm-outline" as keyof typeof Ionicons.glyphMap, 
      title: "Monthly Perk Expiry Reminders", 
      toggles: perkExpiryRemindersEnabled ? perkExpiryToggles : [
        { 
          label: "Enable perk expiry reminders", 
          value: perkExpiryRemindersEnabled, 
          onValueChange: setPerkExpiryRemindersEnabled 
        }
      ],
      iconColor: "#FF9500" 
    },
    { 
      iconName: "calendar-outline" as keyof typeof Ionicons.glyphMap,
      title: "Card Renewal Reminders", 
      details: anyRenewalDateSet 
        ? ["For cards with set anniversary dates"] 
        : ["Set renewal dates to enable reminders"],
      toggles: anyRenewalDateSet ? [
        { 
          label: "Enable renewal reminders", 
          value: renewalRemindersEnabled, 
          onValueChange: setRenewalRemindersEnabled 
        }
      ] : undefined,
      iconColor: anyRenewalDateSet ? "#34C759" : Colors.light.icon,
      dimmed: !anyRenewalDateSet,
      disabledReason: !anyRenewalDateSet ? "Set a card's renewal date to enable this reminder." : undefined,
    },
    { 
      iconName: "sync-circle-outline" as keyof typeof Ionicons.glyphMap, 
      title: "Perk Reset Confirmations", 
      details: ["1st of every month"],
      toggles: [
        { 
          label: "Enable reset confirmations", 
          value: perkResetConfirmationEnabled, 
          onValueChange: setPerkResetConfirmationEnabled 
        }
      ],
      iconColor: "#007AFF" 
    },
  ], [
    perkExpiryRemindersEnabled,
    renewalRemindersEnabled, 
    perkResetConfirmationEnabled,
    anyRenewalDateSet,
    perkExpiryToggles
  ]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007aff" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <>
      <ManageCardsContainer
        title="Manage Your Cards"
        subtitle="Update your card collection and notification preferences"
        showSaveButton={hasChanges && !isEditing}
        onSave={handleSaveChanges}
        isSaving={isSaving}
        saveButtonDisabled={!hasChanges}
        isDraggable={isEditing}
      >
        {/* Cards Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Your Cards</Text>
          {!isEditing && (
            <TouchableOpacity onPress={handleOpenAddCardModal} style={styles.addButton}>
              <Ionicons name="add-circle-outline" size={24} color="#007aff" />
              <Text style={styles.addButtonText}>Add Card</Text>
            </TouchableOpacity>
          )}
        </View>

        {isEditing ? (
          <DraggableFlatList
            data={selectedCardObjects}
            renderItem={({ item: card, drag }: RenderItemParams<Card>) => (
              <CardRow
                key={card.id}
                card={card}
                isSelected={false}
                onPress={handleCardPress}
                mode="manage"
                subtitle={formatDate(renewalDates[card.id])}
                subtitleStyle={renewalDates[card.id] ? 'normal' : 'placeholder'}
                showDragHandle={true}
                onDrag={drag}
                onRemove={handleRemoveCard}
              />
            )}
            keyExtractor={(item) => item.id}
            onDragEnd={({ data }) => {
              const newSelectedCardIds = data.map(card => card.id);
              setSelectedCards(newSelectedCardIds);
            }}
            style={styles.cardsList}
          />
        ) : (
          <View style={styles.cardsList}>
            {selectedCardObjects.length > 0 ? (
              selectedCardObjects.map((card) => (
                <CardRow
                  key={card.id}
                  card={card}
                  isSelected={false}
                  onPress={handleCardPress}
                  mode="manage"
                  subtitle={formatDate(renewalDates[card.id])}
                  subtitleStyle={renewalDates[card.id] ? 'normal' : 'placeholder'}
                />
              ))
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>No cards added yet</Text>
                <TouchableOpacity onPress={handleOpenAddCardModal} style={styles.emptyStateButton}>
                  <Text style={styles.emptyStateButtonText}>Add Your First Card</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* Notification Preferences Section */}
        <View style={styles.sectionDivider} />
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Notification Preferences</Text>
        </View>
        
        {notificationItems.map((itemProps, index) => (
          <ReminderToggleGroup
            key={itemProps.title}
            {...itemProps}
            mode="manage"
            index={index}
            isLastItem={index === notificationItems.length - 1}
          />
        ))}
      </ManageCardsContainer>

      {/* Add Card Modal */}
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
              const isAlreadySelected = selectedCards.includes(card.id);
              const isSelectedInModal = tempSelectedCardIdsInModal.has(card.id);

              return (
                <CardRow
                  key={card.id}
                  card={card}
                  isSelected={isSelectedInModal}
                  onPress={handleAddCard}
                  mode="onboard"
                  disabled={isAlreadySelected}
                  cardScaleAnim={getScaleValue(card.id)}
                />
              );
            })}
            {filteredAvailableCardsForModal.length === 0 && modalSearchQuery !== '' && (
              <Text style={styles.emptySearchText}>No cards found matching &quot;{modalSearchQuery}&quot;.</Text>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Date Picker */}
      {currentEditingCardId && (
        <DateTimePickerModal
          isVisible={isDatePickerVisible}
          mode="date"
          onConfirm={handleConfirmDate}
          onCancel={hideDatePicker}
          date={renewalDates[currentEditingCardId] || new Date()}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#EDEDED',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addButtonText: {
    marginLeft: 6,
    fontSize: 16,
    color: '#007aff',
    fontWeight: '500',
  },
  cardsList: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#EDEDED',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: Colors.light.icon,
    marginBottom: 16,
  },
  emptyStateButton: {
    backgroundColor: Colors.light.tint,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  emptyStateButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
  },
  sectionDivider: {
    height: 20,
    backgroundColor: '#f2f2f7',
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
    backgroundColor: '#ffffff',
  },
  emptySearchText: {
    padding: 20,
    textAlign: 'center',
    color: Colors.light.icon,
    fontSize: 16,
  },
});