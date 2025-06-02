import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Platform,
  Alert,
  ActivityIndicator,
  Image,
  LayoutAnimation,
  UIManager,
  NativeSyntheticEvent,
  NativeScrollEvent,
  ScrollViewProps,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import LottieView from 'lottie-react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Colors } from '../../constants/Colors';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import PerkDonutDisplayManager from '../components/home/PerkDonutDisplayManager';
import ExpandableCard from '../components/home/ExpandableCard';
import { useUserCards } from '../hooks/useUserCards';
import { usePerkStatus } from '../hooks/usePerkStatus';
import { format, differenceInDays, endOfMonth } from 'date-fns';
import { Card, CardPerk } from '../../src/data/card-data';
import AccountButton from '../components/home/AccountButton';
import Header from '../components/home/Header';
import StackedCardDisplay from '../components/home/StackedCardDisplay';
import ActionHintPill from '../components/home/ActionHintPill';

// Import notification functions
import {
  requestPermissionsAsync,
  scheduleMonthlyPerkResetNotifications,
  scheduleCardRenewalReminder,
  cancelAllScheduledNotificationsAsync
} from '../utils/notifications';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Move helper functions outside component
const getDaysRemainingInMonth = (): number => {
  const today = new Date();
  const lastDay = endOfMonth(today);
  return differenceInDays(lastDay, today) + 1;
};

const getStatusColor = (daysRemaining: number) => {
  if (daysRemaining <= 3) {
    return {
      bg: '#fff3e0',
      text: '#f57c00'
    };
  }
  return {
    bg: '#e3f2fd',
    text: '#1976d2'
  };
};

// Add type for ScrollView ref
type ScrollViewWithRef = ScrollViewProps & { ref?: React.RefObject<ScrollView> };

export default function Dashboard() {
  const router = useRouter();
  const params = useLocalSearchParams<{ selectedCardIds?: string; renewalDates?: string; refresh?: string }>();
  const { user } = useAuth();
  const donutDisplayRef = useRef<{ refresh: () => void }>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  // State for DEV date picker
  const [showDatePickerForDev, setShowDatePickerForDev] = useState(false);
  const [devSelectedDate, setDevSelectedDate] = useState<Date>(new Date());
  const [activeCardId, setActiveCardId] = useState<string | null>(null);

  // Use custom hooks
  const { userCardsWithPerks, isLoading, error, refreshUserCards } = useUserCards(params.selectedCardIds);
  const {
    monthlyCreditsRedeemed,
    monthlyCreditsPossible,
    yearlyCreditsRedeemed,
    yearlyCreditsPossible,
    cumulativeValueSavedPerCard,
    userCardsWithPerks: processedCardsFromPerkStatus,
    setPerkStatus,
    isCalculatingSavings,
    refreshSavings,
    redeemedInCurrentCycle,
    showCelebration,
    setShowCelebration,
    processNewMonth,
  } = usePerkStatus(userCardsWithPerks);

  const daysRemaining = useMemo(() => getDaysRemainingInMonth(), []);
  const statusColors = useMemo(() => getStatusColor(daysRemaining), [daysRemaining]);

  const nextActionablePerk = useMemo(() => {
    let actionablePerk: (CardPerk & { cardId: string; cardName: string }) | null = null;
    let highestValue = 0;

    processedCardsFromPerkStatus.forEach(cardData => {
      cardData.perks.forEach(perk => {
        if (perk.status === 'available' && perk.periodMonths === 1) {
          if (perk.value > highestValue) {
            highestValue = perk.value;
            actionablePerk = { 
              ...perk, 
              cardId: cardData.card.id,
              cardName: cardData.card.name 
            };
          }
        }
      });
    });
    return actionablePerk;
  }, [processedCardsFromPerkStatus]);

  // Refresh data when navigating back to dashboard
  useFocusEffect(
    useCallback(() => {
      StatusBar.setBarStyle('dark-content');
      if (Platform.OS === 'android') {
        StatusBar.setBackgroundColor('transparent');
        StatusBar.setTranslucent(true);
      }
      setupNotifications();
      donutDisplayRef.current?.refresh();
    }, [refreshUserCards])
  );

  // Effect to refresh data when params.refresh changes (e.g., after saving cards)
  useEffect(() => {
    if (params.refresh) {
      console.log('[Dashboard] Refresh parameter detected, calling refreshUserCards.');
      refreshUserCards();
    }
  }, [params.refresh, refreshUserCards]);

  // Function to set up notifications
  const setupNotifications = async () => {
    const hasPermission = await requestPermissionsAsync();
    if (!hasPermission) {
      Alert.alert(
        "Permissions Required",
        "Please enable notifications in settings to receive reminders.",
      );
      return;
    }

    await cancelAllScheduledNotificationsAsync();
    await scheduleMonthlyPerkResetNotifications();

    if (params.renewalDates && params.selectedCardIds) {
      try {
        const renewalDatesMap = JSON.parse(params.renewalDates);
        const cardIds = params.selectedCardIds.split(',');

        for (const cardData of userCardsWithPerks) {
          if (renewalDatesMap[cardData.card.id]) {
            const renewalDate = new Date(renewalDatesMap[cardData.card.id]);
            if (!isNaN(renewalDate.getTime()) && renewalDate > new Date()) {
              await scheduleCardRenewalReminder(cardData.card.name, renewalDate, 7);
            }
          }
        }
      } catch (error) {
        console.error("Error scheduling card reminders:", error);
      }
    }
  };

  const handleTapPerk = async (cardId: string, perkId: string, perk: any) => {
    setPerkStatus(cardId, perkId, 'redeemed'); 
  };

  const handleLongPressPerk = (cardId: string, perkId: string, intendedNewStatus: 'available' | 'redeemed') => {
    setPerkStatus(cardId, perkId, intendedNewStatus);
  };

  // DEV Date Picker Handler
  const handleDevDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowDatePickerForDev(false);
    if (event.type === 'set' && selectedDate) {
      setDevSelectedDate(selectedDate);
      processNewMonth(selectedDate); 
    }
  };

  const sortCardsByUnredeemedPerks = (cards: { card: Card; perks: CardPerk[] }[]): typeof cards => {
    return [...cards].sort((a, b) => {
      if (a.card.id === activeCardId) return -1;
      if (b.card.id === activeCardId) return 1;

      const aUnredeemed = a.perks.filter(p => p.status === 'available').length;
      const bUnredeemed = b.perks.filter(p => p.status === 'available').length;
      
      if (aUnredeemed !== bUnredeemed) {
        return bUnredeemed - aUnredeemed;
      }
      
      return 0;
    });
  };

  const handleCardExpandChange = (cardId: string, isExpanded: boolean) => {
    // LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); // REMOVED - Reanimated handles this in ExpandableCard
    setActiveCardId(isExpanded ? cardId : null);
    
    // Scroll logic can remain if still desired
    if (isExpanded) {
      requestAnimationFrame(() => {
        const cardIndex = sortedCards.findIndex(c => c.card.id === cardId);
        // Basic estimation of offset: assumes each card header is roughly 60-70pts, 
        // plus some for section headers or other elements above the cards list.
        // This might need fine-tuning based on actual layout.
        const estimatedHeaderHeight = 200; // Adjust this based on what's above the cards list typically
        const estimatedCardHeight = 70; // Approximate height of a collapsed card
        const scrollToY = estimatedHeaderHeight + (cardIndex * estimatedCardHeight);

        scrollViewRef.current?.scrollTo({
          y: scrollToY, 
          animated: true
        });
      });
    }
  };

  const handlePerkStatusChange = useCallback(() => {
    donutDisplayRef.current?.refresh();
  }, []);

  const sortedCards = sortCardsByUnredeemedPerks(userCardsWithPerks);

  if (error) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Error loading cards. Please try again.</Text>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.light.tint} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        ref={scrollViewRef}
        scrollEventThrottle={16}
      >
        <Header />

        {/* Summary Section with Donut Chart */}
        <View style={[styles.summarySection, { paddingTop: 0 }]}>
          <PerkDonutDisplayManager
            ref={donutDisplayRef}
            userCardsWithPerks={userCardsWithPerks}
            monthlyCreditsRedeemed={monthlyCreditsRedeemed}
            monthlyCreditsPossible={monthlyCreditsPossible}
            redeemedInCurrentCycle={redeemedInCurrentCycle}
          />
        </View>

        {/* Action Hint Pill */}
        {nextActionablePerk && (
          <ActionHintPill 
            perk={nextActionablePerk} 
            daysRemaining={daysRemaining} 
            onPress={() => {
              console.log('ActionHintPill tapped for:', nextActionablePerk);
              // TODO: Implement navigation to card and perk
              // Example: setActiveCardId(nextActionablePerk.cardId); 
              // then scroll to it, or router.push with params
            }}
          />
        )}

        {/* Cards Section */}
        <View style={styles.cardsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Your Cards</Text>
          </View>

          {sortedCards.length > 0 ? (
            <StackedCardDisplay
              sortedCards={sortedCards}
              cumulativeValueSavedPerCard={cumulativeValueSavedPerCard}
              activeCardId={activeCardId}
              onTapPerk={handleTapPerk}
              onLongPressPerk={handleLongPressPerk}
              onExpandChange={handleCardExpandChange}
              onPerkStatusChange={handlePerkStatusChange}
            />
          ) : (
            <View style={styles.noCardsContainer}>
              <Ionicons name="card-outline" size={48} color="#8e8e93" />
              <Text style={styles.noCardsText}>
                No cards selected. Add your first card to start tracking rewards!
              </Text>
              <TouchableOpacity
                style={styles.addFirstCardButton}
                onPress={() => router.push("/(tabs)/02-cards")}
              >
                <Text style={styles.addFirstCardButtonText}>Add Your First Card</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* DEV Date Picker */}
        <View style={styles.devSection}>
          <TouchableOpacity
            onPress={() => setShowDatePickerForDev(true)}
            style={styles.devButton}
          >
            <Text style={styles.devButtonText}>DEV: Set Current Date & Process Month</Text>
          </TouchableOpacity>

          {showDatePickerForDev && (
            <DateTimePicker
              testID="dateTimePickerForDev"
              value={devSelectedDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleDevDateChange}
              {...(Platform.OS === 'ios' && { textColor: Colors.light.text })}
            />
          )}
        </View>
      </ScrollView>

      {showCelebration && (
        <LottieView 
          source={require('../../assets/animations/celebration.json')}
          autoPlay 
          loop={false} 
          onAnimationFinish={() => setShowCelebration(false)}
          style={styles.lottieCelebration}
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
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0,
    paddingBottom: 12,
    backgroundColor: '#ffffff',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  welcomeText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1c1c1e',
    marginTop: 2,
  },
  profileButton: {
    height: 40,
    width: 40,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#ff8c00',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileImage: {
    height: 40,
    width: 40,
    borderRadius: 20,
  },
  profileImagePlaceholder: {
    height: 40,
    width: 40,
    borderRadius: 20,
    backgroundColor: '#ff8c00',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInitial: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  summarySection: {
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: '#ffffff',
  },
  cardsSection: {
    flex: 1,
    paddingTop: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1c1c1e',
  },
  addCardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  addCardText: {
    color: '#007aff',
    marginLeft: 4,
    fontSize: 15,
  },
  noCardsContainer: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#f9f9f9',
    margin: 20,
    borderRadius: 16,
  },
  noCardsText: {
    fontSize: 16,
    color: '#8e8e93',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  addFirstCardButton: {
    backgroundColor: '#007aff',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  addFirstCardButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  devSection: {
    padding: 20,
    marginTop: 20,
  },
  devButton: {
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  devButtonText: {
    color: '#666666',
    fontSize: 14,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#8e8e93',
  },
  errorText: {
    fontSize: 16,
    color: '#ff3b30',
    textAlign: 'center',
  },
  lottieCelebration: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    pointerEvents: 'none',
  },
  monthIndicator: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 12,
  },
  monthStatusContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  currentMonth: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1c1c1e',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
  },
}); 