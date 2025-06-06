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
import { Card, allCards } from '../../../src/data/card-data';
import { useRouter, useFocusEffect, useNavigation, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../contexts/AuthContext';
import { Colors } from '../../../constants/Colors';
import * as Haptics from 'expo-haptics';
import { CardRow } from '../../components/manage/CardRow';
import { 
  AddCardModal, 
  EmptyState, 
  SaveChangesModal,
  PageHeader,
  useCardManagement,
} from '../../components/cards';
import { MotiView } from 'moti';

export default function ManageCardsScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { user } = useAuth();
  
  const cardManagement = useCardManagement(user?.id);
  
  const [addCardModalVisible, setAddCardModalVisible] = useState(false);
  const [modalSearchQuery, setModalSearchQuery] = useState('');
  const [tempSelectedCardIdsInModal, setTempSelectedCardIdsInModal] = useState<Set<string>>(new Set());
  const [isDatePickerVisible, setDatePickerVisibility] = useState(false);
  const [currentEditingCardId, setCurrentEditingCardId] = useState<string | null>(null);
  const [showFloatingAdd, setShowFloatingAdd] = useState(true);
  const [scrollY, setScrollY] = useState(0);
  const [isEditMode, setIsEditMode] = useState(false);
  const flatListRef = useRef<FlatList<Card>>(null);
  const [newlyAddedCardIdForScroll, setNewlyAddedCardIdForScroll] = useState<string | null>(null);
  const [scrollViewHeight, setScrollViewHeight] = useState(0);

  const ESTIMATED_CARD_ROW_HEIGHT = 80;

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
    handleRemoveCard,
    handleUndoDelete,
    handleDiscardChanges,
    handleSaveChanges,
  } = cardManagement;

  useEffect(() => {
    if (isEditMode && selectedCards.length === 0) {
      setIsEditMode(false);
    }
  }, [isEditMode, selectedCards.length]);

  const handleEditModeToggle = () => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    
    if (isEditMode && hasChanges) {
      setIsEditMode(false);
    } else if (isEditMode && !hasChanges) {
      setIsEditMode(false);
    } else {
      setIsEditMode(true);
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
        Animated.timing(cardScale, { toValue: 1.05, duration: 100, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(cardScale, { toValue: 1, duration: 100, easing: Easing.out(Easing.ease), useNativeDriver: true }),
      ]).start();
      
      setTempSelectedCardIdsInModal(prev => new Set(prev).add(cardId));
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

  useEffect(() => {
    if (newlyAddedCardIdForScroll && flatListRef.current && selectedCardObjects.length > 0 && scrollViewHeight > 0) {
      const cardIndex = selectedCardObjects.findIndex(card => card.id === newlyAddedCardIdForScroll);
      if (cardIndex !== -1) {
        flatListRef.current?.scrollToIndex({ index: cardIndex, animated: true, viewPosition: 0.5 });
      }
      const timer = setTimeout(() => setNewlyAddedCardIdForScroll(null), 500);
      return () => clearTimeout(timer);
    }
  }, [newlyAddedCardIdForScroll, selectedCardObjects, scrollViewHeight]);

  const handleScrollViewLayout = (event: LayoutChangeEvent) => {
    setScrollViewHeight(event.nativeEvent.layout.height);
  };

  const handleScroll = (event: any) => {
    const currentScrollY = event.nativeEvent.contentOffset.y;
    const contentHeight = event.nativeEvent.contentSize.height;
    const layoutHeight = event.nativeEvent.layoutMeasurement.height;
    const scrollDirection = currentScrollY > scrollY ? 'down' : 'up';
    
    setScrollY(currentScrollY);
    
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

  const getItemLayout = (data: any, index: number) => ({
    length: ESTIMATED_CARD_ROW_HEIGHT,
    offset: ESTIMATED_CARD_ROW_HEIGHT * index,
    index,
  });

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007aff" />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Manage Cards', headerShown: true }} />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <FlatList
          data={selectedCardObjects}
          renderItem={({ item: card }) => (
            isEditMode ? (
              <CardRow
                key={card.id} card={card} isSelected={false} onPress={() => {}} mode="manage"
                subtitle={formatDate(renewalDates[card.id])}
                subtitleStyle={renewalDates[card.id] ? 'normal' : 'placeholder'}
                showRemoveButton={true} onRemove={handleRemoveCard} isEditMode={true}
              />
            ) : (
              <CardRow
                key={card.id} card={card} isSelected={false} onPress={handleCardPress} mode="manage"
                subtitle={formatDate(renewalDates[card.id])}
                subtitleStyle={renewalDates[card.id] ? 'normal' : 'placeholder'}
                showRemoveButton={false} isEditMode={false}
              />
            )
          )}
          keyExtractor={(card) => card.id}
          ListHeaderComponent={
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitleYourCards}>Your Cards</Text>
                {selectedCards.length > 0 && (
                  <TouchableOpacity onPress={handleEditModeToggle} style={styles.editIconButton}>
                    <Ionicons name={isEditMode ? "checkmark-done-outline" : "create-outline"} size={24} color={Colors.light.tint} />
                  </TouchableOpacity>
                )}
              </View>
              {selectedCardObjects.length === 0 && (
                <EmptyState onAddCard={handleOpenAddCardModal} />
              )}
            </View>
          }
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          onScroll={handleScroll} scrollEventThrottle={16} ref={flatListRef}
          onLayout={handleScrollViewLayout} getItemLayout={getItemLayout}
        />

        <MotiView
          animate={{ opacity: showFloatingAdd ? 1 : 0, scale: showFloatingAdd ? 1 : 0.8, translateY: showFloatingAdd ? 0 : 20 }}
          transition={{ type: 'timing', duration: 200 }}
          style={styles.floatingAddButton}
        >
          <TouchableOpacity onPress={handleOpenAddCardModal} activeOpacity={0.8} style={styles.floatingAddButtonTouchable}>
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
        visible={addCardModalVisible} onClose={handleDoneAddCardModal}
        availableCards={filteredAvailableCardsForModal}
        selectedCardIds={selectedCards}
        tempSelectedCardIds={tempSelectedCardIdsInModal}
        searchQuery={modalSearchQuery} onSearchChange={setModalSearchQuery}
        onCardPress={handleAddCard} getScaleValue={getScaleValue}
      />

      {currentEditingCardId && (
        <DateTimePickerModal
          isVisible={isDatePickerVisible} mode="date"
          onConfirm={handleConfirmDate} onCancel={hideDatePicker}
          date={renewalDates[currentEditingCardId] || new Date()}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f2f2f7' },
  container: { flex: 1, backgroundColor: '#f2f2f7' },
  scrollView: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 80 },
  section: { marginBottom: 20 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#EDEDED' },
  sectionTitleYourCards: { fontSize: 12, fontWeight: '600', color: '#6E6E73' },
  floatingAddButton: { position: 'absolute', bottom: Platform.OS === 'ios' ? 100 : 72, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: '#ffffff', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 8 },
  floatingAddButtonTouchable: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
  editIconButton: { padding: 6 },
}); 