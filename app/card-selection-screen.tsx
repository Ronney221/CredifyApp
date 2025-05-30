import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Image,
  TouchableOpacity,
  TextInput,
  Platform,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { Card, allCards } from '../src/data/card-data';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { supabase } from '../lib/supabase';
import { getUserCards, saveUserCards, hasUserSelectedCards } from '../lib/database';

export default function CardSelectionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: 'edit' }>();
  const isEditMode = params.mode === 'edit';

  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [renewalDates, setRenewalDates] = useState<Record<string, Date>>({});
  const [isDatePickerVisible, setDatePickerVisibility] = useState(false);
  const [currentEditingCardId, setCurrentEditingCardId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Load existing cards if in edit mode
  useEffect(() => {
    const loadExistingCards = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.replace('/(auth)/login');
          return;
        }

        if (isEditMode) {
          // Load existing cards for editing
          const { data: userCards, error } = await getUserCards(user.id);
          if (!error && userCards) {
            const cardIds = allCards
              .filter(card => userCards.some(uc => uc.card_name === card.name))
              .map(card => card.id);
            setSelectedCards(cardIds);
            
            // Load renewal dates if available
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
          }
        } else {
          // Check if user has cards only in initial selection mode
          const hasCards = await hasUserSelectedCards(user.id);
          if (hasCards) {
            router.replace('/home');
            return;
          }
        }
        setIsLoading(false);
      } catch (error) {
        console.error('Error loading cards:', error);
        setIsLoading(false);
      }
    };

    loadExistingCards();
  }, [router, isEditMode]);

  useFocusEffect(
    useCallback(() => {
      StatusBar.setBarStyle('dark-content');
      if (Platform.OS === 'android') {
        StatusBar.setBackgroundColor('transparent');
        StatusBar.setTranslucent(true);
      }
      return () => {
        // Optional: cleanup if you need to reset status bar styles when screen loses focus
      };
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

  const toggleCardSelection = (cardId: string) => {
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

  const selectedCardObjects = useMemo(() => 
    allCards.filter(card => selectedCards.includes(card.id)),
    [selectedCards]
  );

  const unselectedCardObjects = useMemo(() => 
    allCards.filter(card => !selectedCards.includes(card.id)),
    [selectedCards]
  );

  const filteredUnselectedCards = useMemo(() => {
    if (!searchQuery) {
      return unselectedCardObjects;
    }
    return unselectedCardObjects.filter((card) =>
      card.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, unselectedCardObjects]);

  const handleContinue = async () => {
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

      // Navigate back to home screen
      router.replace('/home');
    } catch (error) {
      console.error('Error in continue handler:', error);
    } finally {
      setIsSaving(false);
    }
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
    <SafeAreaView style={styles.container} edges={[]}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent={true} />
      <Text style={styles.title}>{isEditMode ? 'Edit Your Cards' : 'Select Your Cards'}</Text>
      
      {/* Selected Cards Section */}
      {selectedCardObjects.length > 0 && (
        <View style={styles.selectedCardsSection}>
          <Text style={styles.sectionTitle}>Selected Cards</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.selectedCardsContainer}
          >
            {selectedCardObjects.map((card) => (
              <TouchableOpacity
                key={card.id}
                style={styles.selectedCardItem}
                onPress={() => toggleCardSelection(card.id)}
                activeOpacity={0.7}
              >
                <Image source={card.image} style={styles.selectedCardImage} />
                <View style={styles.selectedCardContent}>
                  <Text style={styles.selectedCardName} numberOfLines={2}>
                    {card.name}
                  </Text>
                  <TouchableOpacity
                    onPress={() => showDatePicker(card.id)}
                    style={styles.selectedCardDateButton}
                  >
                    <Text
                      style={
                        renewalDates[card.id]
                          ? styles.dateTextSet
                          : styles.dateTextPlaceholder
                      }
                    >
                      {formatDate(renewalDates[card.id])}
                    </Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search for a card..."
          placeholderTextColor="#8e8e93"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Available Cards Section */}
      <View style={styles.availableCardsSection}>
        <Text style={styles.sectionTitle}>Available Cards</Text>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollViewContent}
        >
          {filteredUnselectedCards.map((card) => (
            <TouchableOpacity
              key={card.id}
              style={[styles.cardItem]}
              onPress={() => toggleCardSelection(card.id)}
              activeOpacity={0.7}
            >
              <Image source={card.image} style={styles.cardImage} />
              <View style={styles.cardTextContainer}>
                <Text style={styles.cardName}>{card.name}</Text>
              </View>
            </TouchableOpacity>
          ))}
          {filteredUnselectedCards.length === 0 && (
            <Text style={styles.noResultsText}>
              No cards found matching your search.
            </Text>
          )}
        </ScrollView>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.continueButton,
            (selectedCards.length === 0 || isSaving) && styles.continueButtonDisabled,
          ]}
          onPress={handleContinue}
          disabled={selectedCards.length === 0 || isSaving}
          activeOpacity={0.8}
        >
          {isSaving ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.continueButtonText}>
              {isEditMode ? 'Save Changes' : 'Continue'}
            </Text>
          )}
        </TouchableOpacity>
      </View>

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
    backgroundColor: '#ffffff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666666',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchInput: {
    height: 45,
    borderColor: '#d1d1d6',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    backgroundColor: '#f0f0f0',
    fontSize: 16,
    marginBottom: 10,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  scrollViewContent: {
    paddingTop: 10,
    paddingBottom: 10,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    marginTop: Platform.OS === 'android' ? 15 : 5,
    marginBottom: 15,
    textAlign: 'center',
    color: '#1c1c1e',
  },
  cardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  cardTextContainer: {
    flex: 1,
    marginLeft: 10,
  },
  cardImage: {
    width: 80,
    height: 50,
    resizeMode: 'contain',
    marginRight: 15,
    borderRadius: 4,
  },
  cardName: {
    fontSize: 17,
    fontWeight: '500',
    flexShrink: 1,
    color: '#1c1c1e',
    marginBottom: 5,
  },
  noResultsText: {
    textAlign: 'center',
    marginTop: 30,
    fontSize: 16,
    color: '#666666',
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 10 : 5,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#ffffff',
  },
  continueButton: {
    backgroundColor: '#007aff',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  continueButtonDisabled: {
    backgroundColor: '#c7c7cc',
    shadowOpacity: 0,
    elevation: 0,
  },
  continueButtonText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '600',
  },
  selectedCardsSection: {
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1c1c1e',
    marginLeft: 16,
    marginBottom: 12,
  },
  selectedCardsContainer: {
    paddingHorizontal: 16,
  },
  selectedCardItem: {
    width: 160,
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    marginRight: 12,
    padding: 12,
    borderWidth: 2,
    borderColor: '#007aff',
  },
  selectedCardImage: {
    width: '100%',
    height: 100,
    resizeMode: 'contain',
    marginBottom: 8,
  },
  selectedCardContent: {
    alignItems: 'center',
  },
  selectedCardName: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 8,
    color: '#1c1c1e',
  },
  selectedCardDateButton: {
    backgroundColor: '#ffffff',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#c0c0c0',
    width: '100%',
    alignItems: 'center',
  },
  availableCardsSection: {
    flex: 1,
    paddingTop: 15,
  },
  dateTextSet: {
    fontSize: 14,
    color: '#1c1c1e',
  },
  dateTextPlaceholder: {
    fontSize: 14,
    color: '#a0a0a0',
  },
}); 