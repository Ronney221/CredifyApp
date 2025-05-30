import React, { useState, useCallback, useRef, useMemo } from 'react';
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
import { Colors } from '../constants/Colors';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import PerkDonutDisplayManager from './components/home/PerkDonutDisplayManager';
import ExpandableCard, { ExpandableCardProps } from './components/home/ExpandableCard';
import { useUserCards } from './hooks/useUserCards';
import { usePerkStatus } from './hooks/usePerkStatus';
import { format, differenceInDays, endOfMonth } from 'date-fns';
import { Card, CardPerk, openPerkTarget } from '../src/data/card-data';

// Import notification functions
import {
  requestPermissionsAsync,
  scheduleMonthlyPerkResetNotifications,
  scheduleCardRenewalReminder,
  cancelAllScheduledNotificationsAsync
} from './utils/notifications';

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

export default function HomeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ selectedCardIds?: string; renewalDates?: string }>();
  const { user } = useAuth();

  // State for DEV date picker
  const [showDatePickerForDev, setShowDatePickerForDev] = useState(false);
  const [devSelectedDate, setDevSelectedDate] = useState<Date>(new Date());
  const [activeCardId, setActiveCardId] = useState<string | null>(null);

  // Use custom hooks
  const { userCardsWithPerks, isLoading, error } = useUserCards(params.selectedCardIds);
  const {
    monthlyCreditsRedeemed,
    monthlyCreditsPossible,
    yearlyCreditsRedeemed,
    yearlyCreditsPossible,
    cumulativeValueSavedPerCard,
    showCelebration,
    setShowCelebration,
    setPerkStatus,
    processNewMonth,
  } = usePerkStatus(userCardsWithPerks);

  const scrollViewRef = useRef<ScrollView>(null);

  const daysRemaining = useMemo(() => getDaysRemainingInMonth(), []);
  const statusColors = useMemo(() => getStatusColor(daysRemaining), [daysRemaining]);

  const getDaysRemainingMessage = useCallback(() => {
    if (daysRemaining === 1) {
      return "Last day to use this month's perks";
    } else if (daysRemaining <= 3) {
      return `${daysRemaining} days left to use this month's perks`;
    }
    return `${daysRemaining} days remaining`;
  }, [daysRemaining]);

  useFocusEffect(
    useCallback(() => {
      StatusBar.setBarStyle('dark-content');
      if (Platform.OS === 'android') {
        StatusBar.setBackgroundColor('transparent');
        StatusBar.setTranslucent(true);
      }
      setupNotifications(); 
    }, [])
  );

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
    const success = await openPerkTarget(perk);
    if (success) {
      setPerkStatus(cardId, perkId, 'redeemed'); 
    }
  };

  const handleLongPressPerk = (cardId: string, perkId: string, currentPerk: CardPerk) => {
    const isRedeemed = currentPerk.status === 'redeemed';
    Alert.alert(
      `Manage ${currentPerk.name}`,
      isRedeemed 
        ? "This perk has been redeemed. Would you like to mark it as available again?"
        : "Would you like to mark this perk as redeemed?",
      [
        isRedeemed 
          ? {
              text: "Mark as Available",
              onPress: () => setPerkStatus(cardId, perkId, 'available'),
            }
          : {
          text: "Mark as Redeemed",
          onPress: () => setPerkStatus(cardId, perkId, 'redeemed'),
        },
        {
          text: "Cancel",
          style: "cancel",
        },
      ],
      { cancelable: true }
    );
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
    // Configure the animation
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    
    setActiveCardId(isExpanded ? cardId : null);
    
    if (isExpanded) {
      // Wait for the next frame to ensure the card has moved to its new position
      requestAnimationFrame(() => {
        scrollViewRef.current?.scrollTo({
          y: 400, // Start 500 pixels from the top
          animated: true
        });
      });
    }
  };

  const sortedCards = sortCardsByUnredeemedPerks(userCardsWithPerks);

  if (error) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Error loading cards. Please try again.</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        {...(Platform.select({
          ios: { ref: scrollViewRef },
          android: { ref: scrollViewRef },
        }))}
        scrollEventThrottle={16}
      >
        {/* Header with User Profile */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.welcomeText}>Hello,</Text>
              <Text style={styles.userName}>{user?.user_metadata?.full_name || 'User'}</Text>
            </View>
            <TouchableOpacity
              style={styles.profileButton}
              onPress={() => {
                Alert.alert(
                  'Account Options',
                  'What would you like to do?',
                  [
                    {
                      text: 'Edit Cards',
                      onPress: () => router.push({
                        pathname: '/card-selection-screen',
                        params: { mode: 'edit' }
                      } as any),
                    },
                    {
                      text: 'Sign Out',
                      onPress: async () => {
                        try {
                          const { error } = await supabase.auth.signOut();
                          if (error) throw error;
                          router.replace('/');
                        } catch (error) {
                          console.error('Error signing out:', error);
                          Alert.alert('Error', 'Failed to sign out. Please try again.');
                        }
                      },
                      style: 'destructive',
                    },
                    {
                      text: 'Cancel',
                      style: 'cancel',
                    },
                  ]
                );
              }}
            >
              {user?.user_metadata?.avatar_url ? (
                <Image source={{ uri: user.user_metadata.avatar_url }} style={styles.profileImage} />
              ) : (
                <View style={styles.profileImagePlaceholder}>
                  <Text style={styles.profileInitial}>
                    {user?.user_metadata?.full_name?.[0]?.toUpperCase() || 'U'}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
          
          {/* Month Status Bar */}
          <View style={styles.monthIndicator}>
            <View style={styles.monthStatusContainer}>
              <Text style={styles.currentMonth}>
                {format(new Date(), 'MMMM yyyy')}
              </Text>
              <View style={[styles.statusBadge, { backgroundColor: statusColors.bg }]}>
                <Text style={[styles.statusText, { color: statusColors.text }]}>
                  {getDaysRemainingMessage()}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007aff" />
            <Text style={styles.loadingText}>Loading your cards...</Text>
          </View>
        ) : (
          <>
            {/* Summary Section with Donut Chart */}
            <View style={[styles.summarySection, { paddingTop: 0 }]}>
              <PerkDonutDisplayManager
                userCardsWithPerks={userCardsWithPerks}
                monthlyCreditsRedeemed={monthlyCreditsRedeemed}
                monthlyCreditsPossible={monthlyCreditsPossible}
              />
            </View>

            {/* Cards Section */}
            <View style={styles.cardsSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Your Cards</Text>
                <TouchableOpacity
                  style={styles.addCardButton}
                  onPress={() => router.push({
                    pathname: '/card-selection-screen',
                    params: { mode: 'edit' }
                  } as any)}
                >
                  <Ionicons name="add-circle-outline" size={20} color="#007aff" />
                  <Text style={styles.addCardText}>Add Card</Text>
                </TouchableOpacity>
              </View>

              {sortedCards.length > 0 ? (
                sortedCards.map(({ card, perks }, index) => {
                  const expandableCardProps = {
                    card,
                    perks,
                    cumulativeSavedValue: cumulativeValueSavedPerCard[card.id] || 0,
                    onTapPerk: handleTapPerk,
                    onLongPressPerk: handleLongPressPerk,
                    onExpandChange: handleCardExpandChange,
                    isActive: card.id === activeCardId,
                    sortIndex: index,
                  };

                  return React.createElement(ExpandableCard, {
                    ...expandableCardProps,
                    key: card.id,
                  });
                })
              ) : (
                <View style={styles.noCardsContainer}>
                  <Ionicons name="card-outline" size={48} color="#8e8e93" />
                  <Text style={styles.noCardsText}>
                    No cards selected. Add your first card to start tracking rewards!
                  </Text>
                  <TouchableOpacity
                    style={styles.addFirstCardButton}
                    onPress={() => router.push({
                      pathname: '/card-selection-screen',
                      params: { mode: 'edit' }
                    } as any)}
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
          </>
        )}
      </ScrollView>

      {showCelebration && (
        <LottieView 
          source={require('../assets/animations/celebration.json')}
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
    paddingBottom: 20,
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