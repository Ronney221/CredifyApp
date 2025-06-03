import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Platform,
  StatusBar,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Card, allCards } from '../../src/data/card-data';
import { Colors } from '../../constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import DateTimePickerModal from "react-native-modal-datetime-picker";

const HEADER_OFFSET = Platform.OS === 'ios' ? 120 : 90;

// Helper to format date as MM/DD/YYYY or return placeholder
const formatDate = (date: Date | null) => {
  if (!date) return 'MM/DD/YYYY';
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${month}/${day}/${year}`;
};

interface RenewalDateInfo {
  date: Date | null;
  // status is no longer needed as per new logic
}

export default function OnboardingRenewalDatesScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ selectedCardIds?: string }>();
  
  const [selectedCards, setSelectedCards] = useState<Card[]>([]);
  const [renewalDates, setRenewalDates] = useState<Map<string, RenewalDateInfo>>(new Map());
  
  const [isDatePickerVisible, setDatePickerVisibility] = useState(false);
  const [currentCardIdForPicker, setCurrentCardIdForPicker] = useState<string | null>(null);

  useEffect(() => {
    if (params.selectedCardIds) {
      try {
        const ids: string[] = JSON.parse(params.selectedCardIds);
        const filteredCards = allCards.filter(card => ids.includes(card.id));
        setSelectedCards(filteredCards);
        
        const initialRenewalDates = new Map<string, RenewalDateInfo>();
        filteredCards.forEach(card => {
          initialRenewalDates.set(card.id, { date: null }); // Simplified
        });
        setRenewalDates(initialRenewalDates);
      } catch (e) {
        console.error("Failed to parse selectedCardIds or filter cards:", e);
        Alert.alert("Error", "Could not load selected card data. Please go back and try again.");
      }
    }
  }, [params.selectedCardIds]);

  const showDatePicker = (cardId: string) => {
    setCurrentCardIdForPicker(cardId);
    setDatePickerVisibility(true);
  };

  const hideDatePicker = () => {
    setDatePickerVisibility(false);
    setCurrentCardIdForPicker(null);
  };

  const handleConfirmDate = (date: Date) => {
    if (currentCardIdForPicker) {
      const newDates = new Map(renewalDates);
      newDates.set(currentCardIdForPicker, { date: date });
      setRenewalDates(newDates);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    hideDatePicker();
  };
  
  const handleNext = () => {
    const renewalDataForNextScreen: Record<string, string | null> = {};
    selectedCards.forEach(card => { // Iterate over selectedCards to ensure all are included
      const cardId = card.id;
      const info = renewalDates.get(cardId);
      if (info && info.date) {
        renewalDataForNextScreen[cardId] = info.date.toISOString();
      } else {
        renewalDataForNextScreen[cardId] = null;
      }
    });

    router.push({
      pathname: '/(onboarding)/notification-prefs',
      params: { 
        selectedCardIds: params.selectedCardIds,
        renewalDates: JSON.stringify(renewalDataForNextScreen) 
      },
    });
  };

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

  if (selectedCards.length === 0 && params.selectedCardIds) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]} edges={['bottom', 'left', 'right']}>
        <Text>Loading card details...</Text>
      </SafeAreaView>
    );
  }
  
  return (
    <SafeAreaView style={[styles.container, { paddingTop: HEADER_OFFSET }]} edges={['bottom']}>
      <StatusBar barStyle="dark-content" />
      <DateTimePickerModal
        isVisible={isDatePickerVisible}
        mode="date"
        onConfirm={handleConfirmDate}
        onCancel={hideDatePicker}
        date={currentCardIdForPicker ? renewalDates.get(currentCardIdForPicker)?.date || new Date() : new Date()} // Set initial date for picker
        maximumDate={new Date()} // Optional: users typically set past/current renewal dates
      />
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerTextContainer}>
          <Text style={styles.title}>Set Renewal Dates (Optional)</Text>
          <Text style={styles.subtitle}>Choose your billing anniversary for each card. You can update these anytime in card settings.</Text>
        </View>

        {selectedCards.map((card) => {
          const cardInfo = renewalDates.get(card.id);
          const networkColor = getCardNetworkColor(card);

          return (
            <View key={card.id} style={styles.cardEntryRow}>
              <View style={[styles.cardImageWrapper, { backgroundColor: networkColor }]}>
                 <Image source={card.image} style={styles.cardImage} />
              </View>
              <View style={styles.cardDetailsContainer}>
                <Text style={styles.cardName}>{card.name}</Text>
                <TouchableOpacity 
                  style={styles.dateDisplayButton} 
                  onPress={() => showDatePicker(card.id)}
                  // No longer disabled based on status, always pressable
                >
                  <Text style={[styles.dateText, cardInfo?.date && styles.dateTextSet]}>
                    {cardInfo?.date ? formatDate(cardInfo.date) : 'MM/DD/YYYY'}
                  </Text>
                  <Ionicons name="chevron-forward" size={18} color={Colors.light.tint} />
                </TouchableOpacity>
                {/* "Ask me later" and "skippedText" removed */}
              </View>
            </View>
          );
        })}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.nextButton} // nextButtonDisabled style removed
          onPress={handleNext}
          // disabled prop removed
        >
          <Text style={styles.nextButtonText}>Next: Set Notifications ›</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f2f2f7',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingBottom: 20,
    paddingHorizontal: 16,
  },
  headerTextContainer: {
    paddingVertical: 20,
    marginBottom: 10,
    alignItems: 'center', 
  },
  title: {
    fontSize: 24, 
    fontWeight: 'bold',
    color: Colors.light.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.light.icon,
    textAlign: 'center',
    paddingHorizontal: 10, 
  },
  cardEntryRow: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  cardImageWrapper: { 
    width: 50,
    height: 32,
    borderRadius: 4,
    marginRight: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  cardDetailsContainer: {
    flex: 1,
  },
  cardName: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 8, // Reduced slightly as "ask me later" is gone
  },
  dateDisplayButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  dateText: {
    fontSize: 16,
    color: Colors.light.text,
  },
  dateTextSet: {
    color: Colors.light.tint,
    fontWeight: '500',
  },
  footer: {
    padding: 20,
    backgroundColor: '#f2f2f7',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#c7c7cc',
  },
  nextButton: {
    backgroundColor: Colors.light.tint,
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  nextButtonText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '600',
  },
}); 