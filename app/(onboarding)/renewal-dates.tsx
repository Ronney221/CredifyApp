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
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useRoute } from '@react-navigation/native';
import { Card, allCards } from '../../src/data/card-data';
import { Colors } from '../../constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import DateTimePickerModal from "react-native-modal-datetime-picker";
import LottieView from 'lottie-react-native';
import { MotiView } from 'moti';
import { useOnboardingContext } from './_context/OnboardingContext';
import { onboardingScreenNames } from './_layout';
import { WIZARD_HEADER_HEIGHT } from './WizardHeader';

const CARD_ANIMATION_DELAY = 60;

// Helper to format date or return placeholder
const formatDate = (date: Date | null) => {
  if (!date) return 'Set Renewal Date'; // More generic placeholder
  return date.toLocaleDateString(); // Use device's locale for formatting
};

interface RenewalDateInfo {
  date: Date | null;
  skipped: boolean;
}

export default function OnboardingRenewalDatesScreen() {
  const router = useRouter();
  const { 
    setStep, 
    setIsHeaderGloballyHidden, 
    selectedCards: selectedCardIds, 
    renewalDates: contextRenewalDates,
    setRenewalDates: setContextRenewalDates 
  } = useOnboardingContext();
  const route = useRoute();

  useFocusEffect(
    React.useCallback(() => {
      const screenName = route.name.split('/').pop() || 'renewal-dates';
      const stepIndex = onboardingScreenNames.indexOf(screenName);
      if (stepIndex !== -1) {
        setStep(stepIndex);
      }
      setIsHeaderGloballyHidden(false);
      return () => {};
    }, [route.name, setStep, setIsHeaderGloballyHidden])
  );
  
  const selectedCardObjects = useMemo(() => {
    return allCards
      .filter(card => selectedCardIds.includes(card.id))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [selectedCardIds]);

  const [renewalDates, setRenewalDates] = useState<Map<string, RenewalDateInfo>>(() => {
    const initialDates = new Map<string, RenewalDateInfo>();
    selectedCardIds.forEach(id => {
      const existingDate = contextRenewalDates[id];
      initialDates.set(id, { date: existingDate || null, skipped: false });
    });
    return initialDates;
  });
  
  const [isDatePickerVisible, setDatePickerVisibility] = useState(false);
  const [currentCardIdForPicker, setCurrentCardIdForPicker] = useState<string | null>(null);

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
      newDates.set(currentCardIdForPicker, { date: date, skipped: false });
      setRenewalDates(newDates);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    hideDatePicker();
  };

  const handleSkipCard = (cardId: string) => {
    const newDates = new Map(renewalDates);
    newDates.set(cardId, { date: null, skipped: true });
    setRenewalDates(newDates);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };
  
  const handleNext = () => {
    const newContextRenewalDates: Record<string, Date> = {};
    let datesActuallySetCount = 0;
    
    renewalDates.forEach((info, cardId) => {
      if (info.date && !info.skipped) {
        newContextRenewalDates[cardId] = info.date;
        datesActuallySetCount++;
      }
    });
    
    setContextRenewalDates(newContextRenewalDates);

    const navigateToNextScreen = () => {
      router.push('/(onboarding)/notification-prefs');
    };

    if (datesActuallySetCount === 0 && selectedCardObjects.length > 0) {
      Alert.alert(
        "No Renewal Dates Set",
        "No renewal dates yet – we'll remind you after you add them in Settings.",
        [
          { text: "OK", onPress: navigateToNextScreen }
        ],
        { cancelable: false }
      );
    } else {
      navigateToNextScreen();
    }
  };

  const handleSkipAll = () => {
    // Clear any dates set in the context and navigate
    setContextRenewalDates({});
    router.push('/(onboarding)/notification-prefs');
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

  if (selectedCardObjects.length === 0) {
    return (
      <SafeAreaView style={[styles.container, styles.centered, {paddingTop: WIZARD_HEADER_HEIGHT }]} edges={['bottom', 'left', 'right']}>
        <Text>No cards selected. Please go back.</Text>
      </SafeAreaView>
    );
  }
  
  return (
    <SafeAreaView style={[styles.container, { paddingTop: WIZARD_HEADER_HEIGHT }]} edges={['bottom']}>
      <StatusBar barStyle="dark-content" />
      <DateTimePickerModal
        isVisible={isDatePickerVisible}
        mode="date"
        onConfirm={handleConfirmDate}
        onCancel={hideDatePicker}
        date={currentCardIdForPicker ? renewalDates.get(currentCardIdForPicker)?.date || new Date() : new Date()}
        maximumDate={new Date()}
      />
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerTextContainer}>
          <Text style={styles.title}>Set Renewal Dates (Optional)</Text>
          <Text style={styles.subtitle}>Choose your billing anniversary for each card. You can update these anytime in card settings.</Text>
        </View>

        {selectedCardObjects.map((card, index) => {
          const cardInfo = renewalDates.get(card.id);
          const networkColor = getCardNetworkColor(card);

          return (
            <MotiView
              key={card.id}
              from={{ opacity: 0, translateY: 20 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{
                type: 'timing',
                duration: 300,
                delay: index * CARD_ANIMATION_DELAY,
              }}
              style={styles.cardEntryRow}
            >
              <View style={[styles.cardImageWrapper, { backgroundColor: networkColor }]}>
                 <Image source={card.image} style={styles.cardImage} />
              </View>
              <View style={styles.cardDetailsContainer}>
                <Text style={styles.cardName}>{card.name}</Text>
                <TouchableOpacity 
                  style={styles.dateDisplayButton} 
                  onPress={() => showDatePicker(card.id)}
                  activeOpacity={0.7}
                >
                  {cardInfo?.date && !cardInfo.skipped ? (
                    <>
                      <Text style={[styles.dateText, styles.dateTextSet]}>{formatDate(cardInfo.date)}</Text>
                      <LottieView 
                        source={require('../../assets/animations/checkmark.json')} 
                        autoPlay 
                        loop={false} 
                        style={styles.lottieCheckmark} 
                        speed={1.5}
                      />
                    </>
                  ) : cardInfo?.skipped ? (
                    <>
                      <Text style={[styles.dateText, styles.dateSkippedText]}>Date Skipped</Text>
                      <Ionicons name="create-outline" size={20} color={Colors.light.icon} style={styles.editIcon} />
                    </>
                  ) : (
                    <>
                      <Text style={styles.dateTextPlaceholder}>{formatDate(null)}</Text>
                      <TouchableOpacity 
                        onPress={(e) => { e.stopPropagation(); handleSkipCard(card.id); }} 
                        style={styles.skipButton}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Text style={styles.skipButtonText}>Skip</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </MotiView>
          );
        })}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.nextButton}
          onPress={handleNext}
        >
          <Text style={styles.nextButtonText}>Next: Set Notifications ›</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.skipAllButton}
          onPress={handleSkipAll}
        >
          <Text style={styles.skipAllButtonText}>Skip all dates</Text>
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
    marginBottom: 8,
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
    minHeight: 44,
  },
  dateText: {
    fontSize: 16,
    color: Colors.light.text,
  },
  dateTextPlaceholder: {
    fontSize: 16,
    color: Colors.light.icon,
  },
  dateTextSet: {
    color: Colors.light.tint,
    fontWeight: '500',
  },
  dateSkippedText: {
    fontSize: 16,
    color: Colors.light.icon,
    fontStyle: 'italic',
  },
  lottieCheckmark: {
    width: 24,
    height: 24,
    marginLeft: 8,
  },
  editIcon: {
    marginLeft: 8,
  },
  skipButton: {
    paddingHorizontal: 8, 
    paddingVertical: 4,
  },
  skipButtonText: {
    fontSize: 15,
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
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: {width:0, height:2},
    elevation: 4,
  },
  nextButtonText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '600',
  },
  skipAllButton: {
    marginTop: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  skipAllButtonText: {
    fontSize: 16,
    color: Colors.light.tint,
    fontWeight: '500',
  },
}); 