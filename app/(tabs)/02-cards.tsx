import React, { useState, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Platform,
  StatusBar,
  ActivityIndicator,
  Animated,
  Easing,
  LayoutChangeEvent,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { Card, allCards } from '../../src/data/card-data';
import { useRouter, useFocusEffect, useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { Colors } from '../../constants/Colors';
import * as Haptics from 'expo-haptics';
import { CardRow } from '../components/manage/CardRow';
import { ReminderToggleGroup } from '../components/notifications/ReminderToggleGroup';
import { 
  AddCardModal, 
  EmptyState, 
  SaveChangesModal,
  PageHeader,
  useCardManagement,
  useNotificationPreferences 
} from '../components/cards';
import { MotiView } from 'moti';

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
  const [showFloatingAdd, setShowFloatingAdd] = useState(true);
  const [scrollY, setScrollY] = useState(0);
  const [isEditMode, setIsEditMode] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const flatListRef = useRef<FlatList<Card>>(null);
  const [newlyAddedCardIdForScroll, setNewlyAddedCardIdForScroll] = useState<string | null>(null);
  const [scrollViewHeight, setScrollViewHeight] = useState(0);

  const ESTIMATED_CARD_ROW_HEIGHT = 80; // Define an estimated height for CardRow

  const {
    selectedCards,
    setSelectedCards,
    renewalDates,
    setRenewalDates,
    isLoading,
    isSaving,
    deletedCard,
    showUndoSnackbar,
    getScaleValue,
    formatDate,
    hasChanges,
    selectedCardObjects,
    anyRenewalDateSet,
    initialSelectedCards,
    initialRenewalDates,
    handleRemoveCard,
    handleUndoDelete,
    handleDiscardChanges,
    handleSaveChanges,
  } = cardManagement;

  const { buildNotificationItems } = notificationPreferences;

  // Check if user is maximizing perks for growth hook
  const isMaximizingPerks = useMemo(() => {
    // All cards have renewal dates
    const allCardsHaveRenewalDates = selectedCards.length > 0 && selectedCards.every(cardId => renewalDates[cardId]);
    
    // All notification preferences are enabled
    const allNotificationsEnabled = notificationPreferences.perkExpiryRemindersEnabled && 
                                   notificationPreferences.renewalRemindersEnabled && 
                                   notificationPreferences.perkResetConfirmationEnabled;
    
    return allCardsHaveRenewalDates && allNotificationsEnabled && selectedCards.length >= 2;
  }, [selectedCards, renewalDates, notificationPreferences]);

  // Debug logging
  useEffect(() => {
    console.log('Debug - hasChanges:', hasChanges);
    console.log('Debug - isEditMode:', isEditMode);
    console.log('Debug - selectedCards.length:', selectedCards.length);
    console.log('Debug - initialSelectedCards.length:', initialSelectedCards.length);
    console.log('Debug - deletedCard:', deletedCard?.card.name || 'null');
    console.log('Debug - modal should show:', hasChanges && !isEditMode);
  }, [hasChanges, isEditMode, selectedCards.length, initialSelectedCards.length, deletedCard]);

  // Auto-exit edit mode when no cards remain
  useEffect(() => {
    if (isEditMode && selectedCards.length === 0) {
      setIsEditMode(false);
    }
  }, [isEditMode, selectedCards.length]);

  // Handle edit mode exit with smart save modal logic
  const handleEditModeToggle = () => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    
    if (isEditMode && hasChanges) {
      // Exiting edit mode with changes - let the modal show
      setIsEditMode(false);
    } else if (isEditMode && !hasChanges) {
      // Exiting edit mode with no changes - skip modal
      setIsEditMode(false);
    } else {
      // Entering edit mode
      setIsEditMode(true);
    }
  };

  const handleShareSavings = () => {
    // Estimate savings based on number of cards (simplified)
    const estimatedSavings = selectedCards.length * 150; // $150 average savings per card
    
    if (Platform.OS === 'ios') {
      const Share = require('react-native').Share;
      Share.share({
        message: `I'm maximizing my credit card perks with Credify! Saved $${estimatedSavings} so far by tracking all my benefits. 💳✨`,
        url: 'https://credify.app', // Replace with actual app store link
      });
    }
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

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
      console.log(`[Cards] Setting renewal date for card ${currentEditingCardId}:`, date.toISOString());
      setRenewalDates((prevDates) => ({
        ...prevDates,
        [currentEditingCardId]: date,
      }));
      if (!selectedCards.includes(currentEditingCardId)) {
        console.log(`[Cards] Adding card ${currentEditingCardId} to selected cards`);
        setSelectedCards(prev => [...prev, currentEditingCardId!]);
      }
    }
    hideDatePicker();
  };

  const handleCardPress = (cardId: string) => {
    showDatePicker(cardId);
  };

  const handleAddCard = (cardId: string) => {
    const cardScale = getScaleValue(cardId);
    
    if (tempSelectedCardIdsInModal.has(cardId)) {
      setTempSelectedCardIdsInModal(prev => {
        const newSet = new Set(prev);
        newSet.delete(cardId);
        return newSet;
      });
    } else {
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
      const firstNewCardId = newCardIds[0];
      setSelectedCards(prev => {
        const currentIds = new Set(prev);
        newCardIds.forEach(id => currentIds.add(id));
        return Array.from(currentIds);
      });
      setNewlyAddedCardIdForScroll(firstNewCardId); 
    }
    setAddCardModalVisible(false);
    setTempSelectedCardIdsInModal(new Set());
  };

  // useEffect for scrolling to new card
  useEffect(() => {
    if (newlyAddedCardIdForScroll && flatListRef.current && selectedCardObjects.length > 0 && scrollViewHeight > 0) {
      const cardIndex = selectedCardObjects.findIndex(card => card.id === newlyAddedCardIdForScroll);

      if (cardIndex !== -1) {
        // For FlatList, use scrollToIndex or scrollToOffset
        flatListRef.current?.scrollToIndex({ 
          index: cardIndex, 
          animated: true, 
          viewPosition: 0.5, // 0 for top, 0.5 for center, 1 for bottom
        });
      }

      const scrollFinishDelay = 500; 
      const timer = setTimeout(() => {
        setNewlyAddedCardIdForScroll(null);
      }, scrollFinishDelay);

      return () => clearTimeout(timer);
    }
  }, [newlyAddedCardIdForScroll, selectedCardObjects, scrollViewHeight]);

  const handleScrollViewLayout = (event: LayoutChangeEvent) => {
    const { height } = event.nativeEvent.layout;
    setScrollViewHeight(height);
  };

  const handleScroll = (event: any) => {
    const currentScrollY = event.nativeEvent.contentOffset.y;
    const contentHeight = event.nativeEvent.contentSize.height;
    const layoutHeight = event.nativeEvent.layoutMeasurement.height;
    const scrollDirection = currentScrollY > scrollY ? 'down' : 'up';
    
    setScrollY(currentScrollY);
    
    // Hide floating add button when scrolling down, show when scrolling up
    // Also hide when near the bottom of the page
    const isNearBottom = currentScrollY + layoutHeight >= contentHeight - 100;
    
    if (scrollDirection === 'down' && currentScrollY > 100) {
      setShowFloatingAdd(false);
    } else if ((scrollDirection === 'up' || currentScrollY < 50) && !isNearBottom) {
      setShowFloatingAdd(true);
    } else if (isNearBottom) {
      setShowFloatingAdd(false);
    }
  };

  const filteredAvailableCardsForModal = useMemo(() => {
    return allCards.filter(card => 
      card.name.toLowerCase().includes(modalSearchQuery.toLowerCase())
    );
  }, [modalSearchQuery]);

  const notificationItems = buildNotificationItems(anyRenewalDateSet);

  const getItemLayout = (data: any, index: number) => ({
    length: ESTIMATED_CARD_ROW_HEIGHT,
    offset: ESTIMATED_CARD_ROW_HEIGHT * index,
    index,
  });

  const handleScrollToIndexFailed = (info: { index: number, highestMeasuredFrameIndex: number, averageItemLength: number }) => {
    console.warn('FlatList: scrollToIndex failed. Info:', info);
    // Optionally, you could try to scroll to offset as a fallback:
    // flatListRef.current?.scrollToOffset({ offset: info.index * ESTIMATED_CARD_ROW_HEIGHT, animated: true });
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
    <>
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <PageHeader 
          title="Manage Your Cards"
          subtitle="Update your card collection and notification preferences"
        />

        <FlatList
          data={selectedCardObjects}
          renderItem={({ item: card }) => (
            isEditMode ? (
              <CardRow
                key={card.id}
                card={card}
                isSelected={false}
                onPress={() => {}}
                mode="manage"
                subtitle={formatDate(renewalDates[card.id])}
                subtitleStyle={renewalDates[card.id] ? 'normal' : 'placeholder'}
                showRemoveButton={true}
                onRemove={handleRemoveCard}
                isEditMode={true}
              />
            ) : (
              <CardRow
                key={card.id}
                card={card}
                isSelected={false}
                onPress={handleCardPress}
                mode="manage"
                subtitle={formatDate(renewalDates[card.id])}
                subtitleStyle={renewalDates[card.id] ? 'normal' : 'placeholder'}
                showRemoveButton={false}
                isEditMode={false}
              />
            )
          )}
          keyExtractor={(card) => card.id}
          ListHeaderComponent={
            <>
              {/* Celebratory Growth Hook */}
              {isMaximizingPerks && (
                <TouchableOpacity style={styles.celebratoryRibbon} onPress={handleShareSavings}>
                  <Text style={styles.celebratoryText}>
                    🚀 You&apos;re maximizing every perk - share your savings!
                  </Text>
                  <Ionicons name="share-outline" size={16} color="#ffffff" />
                </TouchableOpacity>
              )}

              {/* Cards Section Header */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitleYourCards}>Your Cards</Text>
                  {selectedCards.length > 0 && (
                    <TouchableOpacity 
                      onPress={handleEditModeToggle} 
                      style={styles.editIconButton}
                    >
                      <Ionicons 
                        name={isEditMode ? "checkmark-done-outline" : "create-outline"} 
                        size={24} 
                        color={Colors.light.tint}
                      />
                    </TouchableOpacity>
                  )}
                </View>
                {selectedCardObjects.length === 0 && (
                  <EmptyState onAddCard={handleOpenAddCardModal} />
                )}
              </View>
            </>
          }
          ListFooterComponent={
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
          }
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          ref={flatListRef}
          onLayout={handleScrollViewLayout}
          getItemLayout={getItemLayout}
          onScrollToIndexFailed={handleScrollToIndexFailed}
        />

        {/* Floating Add Button */}
        <MotiView
          animate={{
            opacity: showFloatingAdd ? 1 : 0,
            scale: showFloatingAdd ? 1 : 0.8,
            translateY: showFloatingAdd ? 0 : 20,
          }}
          transition={{
            type: 'timing',
            duration: 200,
          }}
          style={styles.floatingAddButton}
        >
          <TouchableOpacity 
            onPress={handleOpenAddCardModal}
            activeOpacity={0.8}
            style={styles.floatingAddButtonTouchable}
          >
            <Ionicons name="add-circle" size={56} color="#007aff" />
          </TouchableOpacity>
        </MotiView>

        <SaveChangesModal 
          visible={hasChanges && !isEditMode}
          onSave={handleSaveChanges}
          onDiscard={handleDiscardChanges}
          isSaving={isSaving}
          deletedCard={deletedCard}
          hasOtherChanges={hasChanges && deletedCard !== null}
        />
      </SafeAreaView>

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
    paddingBottom: 80, // Added padding to ensure last item is scrollable above floating button / modal
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
  sectionTitleYourCards: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6E6E73',
  },
  cardsList: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#EDEDED',
  },
  floatingAddButton: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 100 : 72,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  floatingAddButtonTouchable: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  celebratoryRibbon: {
    backgroundColor: '#007aff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  celebratoryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginRight: 8,
  },
  editButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#f2f2f7',
  },
  editButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#20B2AA',
  },
  editIconButton: {
    padding: 6,
  },
});