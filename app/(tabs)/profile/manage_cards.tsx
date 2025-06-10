import React, { useState, useEffect, useLayoutEffect, useMemo, useRef, useCallback } from 'react';
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
  SaveFooter,
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
    getScaleValue,
    formatDate,
    hasChanges,
    selectedCardObjects,
    handleRemoveCard,
    handleDiscardChanges,
    handleSaveChanges,
  } = cardManagement;

  useEffect(() => {
    if (isEditMode && selectedCards.length === 0) {
      setIsEditMode(false);
    }
  }, [isEditMode, selectedCards.length]);

  const handleEditModeToggle = useCallback(() => {
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
  }, [isEditMode, hasChanges]);

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

  const handleOpenAddCardModal = useCallback(() => {
    setModalSearchQuery('');
    setTempSelectedCardIdsInModal(new Set());
    setAddCardModalVisible(true);
  }, []);

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

  const getItemLayout = (data: any, index: number) => ({
    length: ESTIMATED_CARD_ROW_HEIGHT,
    offset: ESTIMATED_CARD_ROW_HEIGHT * index,
    index,
  });

  useLayoutEffect(() => {
    navigation.setOptions({
        headerRight: () => (
            !isEditMode ? (
                <TouchableOpacity onPress={handleOpenAddCardModal} style={{ marginRight: 15 }}>
                    <Ionicons name="add" size={28} color={Colors.light.tint} />
                </TouchableOpacity>
            ) : null
        ),
        headerLeft: () => {
            if (selectedCards.length === 0 || (isEditMode && hasChanges)) {
                return null;
            }

            return (
                <TouchableOpacity onPress={handleEditModeToggle} style={{ marginLeft: 15 }}>
                    <Text style={{ color: Colors.light.tint, fontSize: 17, fontWeight: '600' }}>
                        {isEditMode ? 'Done' : 'Edit'}
                    </Text>
                </TouchableOpacity>
            );
        },
        headerTitle: 'Manage Cards',
        headerShown: true,
    });
  }, [navigation, isEditMode, hasChanges, selectedCards.length, handleEditModeToggle, handleOpenAddCardModal]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007aff" />
      </View>
    );
  }

  return (
    <>
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <FlatList
          data={selectedCardObjects}
          renderItem={({ item: card }) => {
            const formattedDate = formatDate(renewalDates[card.id]);
            let subtitle;
            if (formattedDate === 'Set renewal date ›') {
                subtitle = formattedDate;
            } else if (card.annualFee) {
                subtitle = `$${card.annualFee} • Next renewal ${formattedDate}`;
            } else {
                subtitle = `Next renewal ${formattedDate}`;
            }

            const cardContent = isEditMode ? (
              <CardRow
                key={card.id} card={card} isSelected={false} onPress={() => {}} mode="manage"
                subtitle={subtitle}
                subtitleStyle={renewalDates[card.id] ? 'normal' : 'placeholder'}
                showRemoveButton={true} onRemove={handleRemoveCard} isEditMode={true}
              />
            ) : (
              <CardRow
                key={card.id} card={card} isSelected={false} onPress={handleCardPress} mode="manage"
                subtitle={subtitle}
                subtitleStyle={renewalDates[card.id] ? 'normal' : 'placeholder'}
                showRemoveButton={false} isEditMode={false}
              />
            );
            
            return <View style={styles.cardContainer}>{cardContent}</View>
          }}
          keyExtractor={(card) => card.id}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListHeaderComponent={
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitleYourCards}>Your Cards</Text>
              </View>
              {selectedCardObjects.length === 0 && (
                <EmptyState onAddCard={handleOpenAddCardModal} />
              )}
            </View>
          }
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          ref={flatListRef}
          onLayout={handleScrollViewLayout} getItemLayout={getItemLayout}
        />

        <SaveFooter
          visible={hasChanges}
          onSave={handleSaveChanges}
          onDiscard={handleDiscardChanges}
          isSaving={isSaving}
        />
      </SafeAreaView>

      <AddCardModal
        visible={addCardModalVisible} onClose={handleDoneAddCardModal}
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
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.light.systemGroupedBackground },
  container: { flex: 1, backgroundColor: Colors.light.systemGroupedBackground },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 96 },
  section: { marginBottom: 8 },
  sectionHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingVertical: 8,
  },
  sectionTitleYourCards: { 
    fontSize: 13, 
    fontWeight: 'normal', 
    color: Colors.light.secondaryLabel, 
    textTransform: 'uppercase' 
  },
  cardContainer: {
    backgroundColor: Colors.light.background,
    borderRadius: 10,
    overflow: 'hidden',
  },
  separator: {
    height: 12,
  },
}); 