import React, { useState, useEffect, useLayoutEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Platform,
  StatusBar,
  ActivityIndicator,
  ActionSheetIOS,
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePickerModal from "react-native-modal-datetime-picker";
import DraggableFlatList, { RenderItemParams } from 'react-native-draggable-flatlist';
import { Card, allCards } from '../../src/data/card-data';
import { useRouter, useFocusEffect, useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { Colors } from '../../constants/Colors';
import * as Haptics from 'expo-haptics';
import { CardRow } from '../components/manage/CardRow';
import { ReminderToggleGroup } from '../components/manage/ReminderToggleGroup';
import { 
  AddCardModal, 
  UndoSnackbar, 
  EmptyState, 
  SaveFooter, 
  PageHeader,
  useCardManagement,
  useNotificationPreferences 
} from '../components/cards';

export default function Cards() {
  const router = useRouter();
  const navigation = useNavigation();
  const { user } = useAuth();
  
  // Custom hooks for state management
  const cardManagement = useCardManagement(user?.id);
  const notificationPreferences = useNotificationPreferences();
  
  // Modal and date picker state
  const [addCardModalVisible, setAddCardModalVisible] = useState(false);
  const [modalSearchQuery, setModalSearchQuery] = useState('');
  const [tempSelectedCardIdsInModal, setTempSelectedCardIdsInModal] = useState<Set<string>>(new Set());
  const [isDatePickerVisible, setDatePickerVisibility] = useState(false);
  const [currentEditingCardId, setCurrentEditingCardId] = useState<string | null>(null);

  const {
    selectedCards,
    setSelectedCards,
    renewalDates,
    setRenewalDates,
    isLoading,
    isSaving,
    isEditing,
    setIsEditing,
    deletedCard,
    showUndoSnackbar,
    flashingCardId,
    setFlashingCardId,
    getScaleValue,
    formatDate,
    hasChanges,
    selectedCardObjects,
    anyRenewalDateSet,
    handleRemoveCard,
    handleUndoDelete,
    handleSaveChanges,
  } = cardManagement;

  const { buildNotificationItems } = notificationPreferences;

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity 
          onPress={handleHeaderAction} 
          style={{ marginRight: 15, padding: 5 }}
        >
          <Ionicons 
            name="ellipsis-horizontal" 
            size={24} 
            color={Platform.OS === 'ios' ? '#007aff' : '#000000'} 
          />
        </TouchableOpacity>
      ),
    });
  }, [navigation, isEditing]);

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

  const handleHeaderAction = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', isEditing ? 'Done Editing' : 'Edit Cards'],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            setIsEditing(!isEditing);
          }
        }
      );
    } else {
      setIsEditing(!isEditing);
    }
  };

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

  const handleAddCard = (cardId: string) => {
    const cardScale = getScaleValue(cardId);
    
    // Toggle selection instead of just adding
    if (tempSelectedCardIdsInModal.has(cardId)) {
      // Deselect
      setTempSelectedCardIdsInModal(prev => {
        const newSet = new Set(prev);
        newSet.delete(cardId);
        return newSet;
      });
    } else {
      // Select
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

  const handleOpenAddCardModal = () => {
    setModalSearchQuery('');
    setTempSelectedCardIdsInModal(new Set());
    setAddCardModalVisible(true);
  };

  const handleDoneAddCardModal = () => {
    const newCardIds = Array.from(tempSelectedCardIdsInModal);
    if (newCardIds.length > 0) {
      setSelectedCards(prev => {
        const combined = new Set([...prev, ...tempSelectedCardIdsInModal]);
        return Array.from(combined);
      });
      
      // Flash the first newly added card
      const firstNewCardId = newCardIds[0];
      setFlashingCardId(firstNewCardId);
      
      // Clear flash after animation
      setTimeout(() => {
        setFlashingCardId(null);
      }, 800);
    }
    
    setAddCardModalVisible(false);
  };

  const filteredAvailableCardsForModal = useMemo(() => {
    return allCards.filter(card => 
      card.name.toLowerCase().includes(modalSearchQuery.toLowerCase())
    );
  }, [modalSearchQuery]);

  const notificationItems = buildNotificationItems(anyRenewalDateSet);

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
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <PageHeader 
          title="Manage Your Cards"
          subtitle="Update your card collection and notification preferences"
        />

        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Cards Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Your Cards</Text>
              {isEditing && (
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
                      flashAnimation={flashingCardId === card.id}
                    />
                  ))
                ) : (
                  <EmptyState isEditing={isEditing} onAddCard={handleOpenAddCardModal} />
                )}
              </View>
            )}
          </View>

          {/* Notification Preferences Section */}
          <View style={styles.section}>
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
          </View>
        </ScrollView>

        <SaveFooter 
          visible={hasChanges && !isEditing}
          onSave={handleSaveChanges}
          isSaving={isSaving}
        />
      </SafeAreaView>

      <UndoSnackbar 
        visible={showUndoSnackbar}
        deletedCard={deletedCard}
        onUndo={handleUndoDelete}
      />

      <AddCardModal
        visible={addCardModalVisible}
        onClose={handleDoneAddCardModal}
        availableCards={filteredAvailableCardsForModal}
        selectedCardIds={selectedCards}
        tempSelectedCardIds={tempSelectedCardIdsInModal}
        searchQuery={modalSearchQuery}
        onSearchChange={setModalSearchQuery}
        onCardPress={handleAddCard}
        getScaleValue={getScaleValue}
      />

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
  container: {
    flex: 1,
    backgroundColor: '#f2f2f7',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#EDEDED',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6E6E73',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
});