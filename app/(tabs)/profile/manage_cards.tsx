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
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { Card, allCards } from '../../../src/data/card-data';
import { useRouter, useFocusEffect, useNavigation, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../contexts/AuthContext';
import { Colors } from '../../../constants/Colors';
import * as Haptics from 'expo-haptics';
import { CardRow } from '../../../components/manage/CardRow';
import { 
  AddCardModal, 
  EmptyState, 
  SaveFooter,
  useCardManagement,
} from '../../../components/cards';
import { MotiView } from 'moti';
import DraggableFlatList, { 
  ScaleDecorator,
  RenderItemParams,
} from 'react-native-draggable-flatlist';
import { updateCardOrder, saveUserCards } from '../../../lib/database';

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
  const [removingCardId, setRemovingCardId] = useState<string | null>(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const translateX = useRef(new Animated.Value(0)).current;

  const ESTIMATED_CARD_ROW_HEIGHT = 80;

  const {
    selectedCards,
    setSelectedCards,
    renewalDates,
    setRenewalDates,
    isLoading,
    isSaving,
    getScaleValue,
    formatDate,
    selectedCardObjects,
    handleRemoveCard,
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
    setIsEditMode(!isEditMode);
  }, [isEditMode]);

  const animateCardRemoval = useCallback((onComplete: () => void) => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
        easing: Easing.out(Easing.ease),
      }),
      Animated.timing(translateX, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
        easing: Easing.out(Easing.ease),
      }),
    ]).start(async () => {
      // Call onComplete first to update state
      await onComplete();
      // Reset animations after a small delay to ensure state updates have processed
      setTimeout(() => {
        fadeAnim.setValue(1);
        translateX.setValue(0);
        setRemovingCardId(null);
      }, 50);
    });
  }, [fadeAnim, translateX]);

  const handleRemoveCardWithConfirmation = useCallback((cardId: string) => {
    const card = selectedCardObjects.find(c => c.id === cardId);
    if (!card) return;

    Alert.alert(
      "Remove Card",
      `Are you sure you want to remove ${card.name}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => {
            if (Platform.OS === 'ios') {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            }
            
            // Set the removing card ID to trigger animation
            setRemovingCardId(cardId);
            
            // Start the removal animation
            animateCardRemoval(async () => {
              // Remove the card from state first
              handleRemoveCard(cardId);
              
              // Then save to database
              if (user?.id) {
                const updatedCards = selectedCardObjects.filter(c => c.id !== cardId);
                const { error } = await saveUserCards(user.id, updatedCards, renewalDates);
                if (error) {
                  console.error('Error saving cards after removal:', error);
                  Alert.alert("Error", "Failed to save changes. Please try again.");
                }
              }
            });
          }
        }
      ]
    );
  }, [selectedCardObjects, handleRemoveCard, user?.id, renewalDates, animateCardRemoval]);

  const handleDragEnd = useCallback(async ({ data }: { data: Card[] }) => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    const newOrder = data.map(card => card.id);
    setSelectedCards(newOrder);

    // Save the new order to the database immediately
    if (user?.id) {
      const { error } = await updateCardOrder(user.id, newOrder);
      if (error) {
        console.error('Error saving card order:', error);
        Alert.alert(
          "Error",
          "Failed to save card order. Please try reordering again.",
          [{ text: "OK" }]
        );
      }
    }
  }, [user?.id]);

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

  const handleDoneAddCardModal = async () => {
    const newCardIds = Array.from(tempSelectedCardIdsInModal);
    if (newCardIds.length > 0) {
      const updatedSelectedCards = [...selectedCards];
      newCardIds.forEach(id => {
        if (!updatedSelectedCards.includes(id)) {
          updatedSelectedCards.push(id);
        }
      });
      setSelectedCards(updatedSelectedCards);
      setNewlyAddedCardIdForScroll(newCardIds[0]);

      // Save the changes to the database
      if (user?.id) {
        const updatedCards = updatedSelectedCards.map(id => allCards.find(c => c.id === id)).filter(Boolean) as Card[];
        const { error } = await saveUserCards(user.id, updatedCards, renewalDates);
        if (error) {
          console.error('Error saving new cards:', error);
          Alert.alert(
            "Error",
            "Failed to save new cards. Please try again.",
            [{ text: "OK" }]
          );
        }
      }
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

  const renderItem = useCallback(({ item: card, drag, isActive }: RenderItemParams<Card>) => {
    const formattedDate = formatDate(renewalDates[card.id]);
    let subtitle;
    if (formattedDate === 'Set renewal date ›') {
      subtitle = formattedDate;
    } else if (card.annualFee) {
      subtitle = `$${card.annualFee} • Next renewal ${formattedDate}`;
    } else {
      subtitle = `Next renewal ${formattedDate}`;
    }

    const isRemoving = removingCardId === card.id;
    const animatedStyle = isRemoving ? {
      opacity: fadeAnim,
      transform: [
        { translateX: translateX },
        { 
          scale: fadeAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [0.8, 1],
          })
        }
      ],
    } : undefined;

    return (
      <ScaleDecorator>
        <Animated.View style={[
          styles.cardContainer,
          animatedStyle,
          isRemoving && { position: 'relative', zIndex: -1 }
        ]}>
          <CardRow
            key={card.id}
            card={card}
            isSelected={false}
            onPress={isEditMode ? () => {} : handleCardPress}
            mode="manage"
            subtitle={subtitle}
            subtitleStyle={renewalDates[card.id] ? 'normal' : 'placeholder'}
            showRemoveButton={isEditMode}
            onRemove={handleRemoveCardWithConfirmation}
            isEditMode={isEditMode}
            isActive={isActive}
            drag={drag}
          />
        </Animated.View>
      </ScaleDecorator>
    );
  }, [isEditMode, renewalDates, handleCardPress, handleRemoveCardWithConfirmation, removingCardId, fadeAnim, translateX]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {isEditMode ? (
            <TouchableOpacity onPress={handleEditModeToggle} style={{ marginRight: 15 }}>
              <Text style={{ color: Colors.light.tint, fontSize: 17, fontWeight: '600' }}>
                Done
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={handleOpenAddCardModal} style={{ marginRight: 15 }}>
              <Ionicons name="add" size={28} color={Colors.light.tint} />
            </TouchableOpacity>
          )}
        </View>
      ),
      headerLeft: () => {
        if (selectedCards.length === 0) {
          return null;
        }

        return (
          <TouchableOpacity onPress={handleEditModeToggle} style={{ marginLeft: 15 }}>
            <Text style={{ color: Colors.light.tint, fontSize: 17, fontWeight: '600' }}>
              {isEditMode ? '' : 'Edit'}
            </Text>
          </TouchableOpacity>
        );
      },
      headerTitle: 'Manage Cards',
      headerShown: true,
    });
  }, [navigation, isEditMode, selectedCards.length, handleEditModeToggle, handleOpenAddCardModal]);

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
        <DraggableFlatList
          data={selectedCardObjects}
          onDragEnd={handleDragEnd}
          keyExtractor={(card) => card.id}
          renderItem={renderItem}
          ListHeaderComponent={
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitleYourCards}>YOUR CARDS</Text>
              </View>
              {selectedCardObjects.length === 0 && (
                <EmptyState onAddCard={handleOpenAddCardModal} />
              )}
            </View>
          }
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          onLayout={handleScrollViewLayout}
          getItemLayout={getItemLayout}
          dragItemOverflow={false}
          dragHitSlop={{ top: -10, bottom: -10, left: -10, right: -10 }}
          activationDistance={8}
          animationConfig={{
            damping: 20,
            mass: 0.2,
            stiffness: 100,
          }}
        />
      </SafeAreaView>

      <AddCardModal
        visible={addCardModalVisible}
        onClose={handleDoneAddCardModal}
        selectedCardIds={selectedCards}
        tempSelectedCardIds={tempSelectedCardIdsInModal}
        searchQuery={modalSearchQuery}
        onSearchChange={setModalSearchQuery}
        onCardPress={handleAddCard}
        getScaleValue={getScaleValue}
      />

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
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.light.systemGroupedBackground },
  container: { flex: 1, backgroundColor: Colors.light.systemGroupedBackground },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 96 },
  section: { marginBottom: 16, paddingTop: 12 },
  sectionHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingVertical: 12,
  },
  sectionTitleYourCards: { 
    fontSize: 13, 
    letterSpacing: 0.5,
    fontWeight: '500', 
    color: Colors.light.secondaryLabel, 
    textTransform: 'uppercase' 
  },
  cardContainer: {
    backgroundColor: 'transparent',
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 12,
  },
  separator: {
    height: 12,
  },
}); 