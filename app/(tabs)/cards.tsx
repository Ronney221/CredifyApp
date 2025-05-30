import React, { useState, useEffect } from 'react';
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
import { Card, allCards } from '../../src/data/card-data';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { getUserCards, saveUserCards } from '../../lib/database';

export default function Cards() {
  const router = useRouter();
  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  const [initialSelectedCards, setInitialSelectedCards] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [renewalDates, setRenewalDates] = useState<Record<string, Date>>({});
  const [initialRenewalDates, setInitialRenewalDates] = useState<Record<string, Date>>({});
  const [isDatePickerVisible, setDatePickerVisibility] = useState(false);
  const [currentEditingCardId, setCurrentEditingCardId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Track if there are unsaved changes
  const hasChanges = React.useMemo(() => {
    const selectedCardsChanged = JSON.stringify(selectedCards.sort()) !== JSON.stringify(initialSelectedCards.sort());
    const renewalDatesChanged = JSON.stringify(renewalDates) !== JSON.stringify(initialRenewalDates);
    return selectedCardsChanged || renewalDatesChanged;
  }, [selectedCards, initialSelectedCards, renewalDates, initialRenewalDates]);

  // Load existing cards
  useEffect(() => {
    const loadExistingCards = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.replace('/(auth)/login');
          return;
        }

        // Load existing cards
        const { data: userCards, error } = await getUserCards(user.id);
        if (!error && userCards) {
          const cardIds = allCards
            .filter(card => userCards.some(uc => uc.card_name === card.name))
            .map(card => card.id);
          setSelectedCards(cardIds);
          setInitialSelectedCards(cardIds);
          
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

  const selectedCardObjects = React.useMemo(() => 
    allCards.filter(card => selectedCards.includes(card.id)),
    [selectedCards]
  );

  const unselectedCardObjects = React.useMemo(() => 
    allCards.filter(card => !selectedCards.includes(card.id)),
    [selectedCards]
  );

  const filteredUnselectedCards = React.useMemo(() => {
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

      // Update initial state to match current state
      setInitialSelectedCards(selectedCards);
      setInitialRenewalDates(renewalDates);

      // Navigate to the dashboard tab and force a refresh
      router.replace({
        pathname: '/(tabs)/dashboard',
        params: { 
          refresh: Date.now().toString(),
          selectedCardIds: selectedCards.join(','),
          renewalDates: JSON.stringify(renewalDates)
        }
      });
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
      <Text style={styles.title}>Manage Your Cards</Text>
      
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
              style={styles.cardItem}
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
      {hasChanges && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.continueButton,
              isSaving && styles.continueButtonDisabled,
            ]}
            onPress={handleContinue}
            disabled={isSaving}
            activeOpacity={0.8}
          >
            {isSaving ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.continueButtonText}>Save Changes</Text>
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
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchInput: {
    height: 40,
    borderColor: '#d1d1d6',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    backgroundColor: '#f2f2f7',
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: Platform.OS === 'android' ? 12 : 0,
    marginBottom: 12,
    paddingHorizontal: 16,
    color: '#1c1c1e',
  },
  cardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  cardTextContainer: {
    flex: 1,
  },
  cardImage: {
    width: 60,
    height: 40,
    resizeMode: 'contain',
    marginRight: 12,
  },
  cardName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1c1c1e',
  },
  noResultsText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
    color: '#666666',
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#ffffff',
    marginBottom: Platform.OS === 'ios' ? 49 : 56,
  },
  continueButton: {
    backgroundColor: '#007aff',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueButtonDisabled: {
    backgroundColor: '#c7c7cc',
  },
  continueButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  selectedCardsSection: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1c1c1e',
    marginLeft: 16,
    marginBottom: 8,
  },
  selectedCardsContainer: {
    paddingHorizontal: 16,
  },
  selectedCardItem: {
    width: 140,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginRight: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: '#007aff',
  },
  selectedCardImage: {
    width: '100%',
    height: 80,
    resizeMode: 'contain',
    marginBottom: 4,
  },
  selectedCardContent: {
    alignItems: 'center',
  },
  selectedCardName: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 4,
    color: '#1c1c1e',
  },
  selectedCardDateButton: {
    backgroundColor: '#f2f2f7',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  availableCardsSection: {
    flex: 1,
    paddingTop: 8,
  },
  dateTextSet: {
    fontSize: 12,
    color: '#1c1c1e',
  },
  dateTextPlaceholder: {
    fontSize: 12,
    color: '#8e8e93',
  },
}); 