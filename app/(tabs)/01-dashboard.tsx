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
  ActionSheetIOS,
  AlertButton,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import LottieView from 'lottie-react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import Toast from 'react-native-root-toast';
import * as Haptics from 'expo-haptics';
import { Colors } from '../../constants/Colors';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import PerkDonutDisplayManager from '../components/home/PerkDonutDisplayManager';
import ExpandableCard from '../components/home/ExpandableCard';
import PerkActionModal from '../components/home/PerkActionModal';
import { useUserCards } from '../hooks/useUserCards';
import { usePerkStatus } from '../hooks/usePerkStatus';
import { useAutoRedemptions } from '../hooks/useAutoRedemptions';
import { format, differenceInDays, endOfMonth } from 'date-fns';
import { Card, CardPerk, openPerkTarget } from '../../src/data/card-data';
import { trackPerkRedemption, deletePerkRedemption, setAutoRedemption, checkAutoRedemptionByCardId } from '../../lib/database';
import AccountButton from '../components/home/AccountButton';
import Header from '../components/home/Header';
import StackedCardDisplay from '../components/home/StackedCardDisplay';
import ActionHintPill from '../components/home/ActionHintPill';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SwipeCoachMark from '../components/home/SwipeCoachMark';

// Import notification functions
import {
  requestPermissionsAsync,
  scheduleMonthlyPerkResetNotifications,
  scheduleCardRenewalReminder,
  cancelAllScheduledNotificationsAsync,
  NotificationPreferences,
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

const SWIPE_HINT_STORAGE_KEY = '@user_seen_swipe_hint';

const showToast = (message: string, onUndo?: () => void) => {
  const toastMessage = onUndo 
    ? `${message}\nTap to undo`
    : message;

  const toast = Toast.show(toastMessage, {
    duration: onUndo ? 4000 : 2000,
    position: Toast.positions.BOTTOM,
    shadow: true,
    animation: true,
    hideOnPress: true,
    delay: 0,
    containerStyle: {
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      marginBottom: 64,
      backgroundColor: '#1c1c1e',
    },
    textStyle: {
      fontSize: 14,
      fontWeight: '500',
      textAlign: 'center',
      lineHeight: 20,
    },
    onPress: () => {
      if (onUndo) {
        Toast.hide(toast);
        onUndo();
      }
    },
  });
};

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

  // Modal state for perk action
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedPerk, setSelectedPerk] = useState<CardPerk | null>(null);
  const [selectedCardIdForModal, setSelectedCardIdForModal] = useState<string | null>(null);

  // Coach Mark State
  const [userHasSeenSwipeHint, setUserHasSeenSwipeHint] = useState(false);
  const [shouldShowSwipeCoachMark, setShouldShowSwipeCoachMark] = useState(false);

  // Use custom hooks
  const { userCardsWithPerks, isLoading, error, refreshUserCards } = useUserCards();
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
  const { getAutoRedemptionByPerkName, refreshAutoRedemptions } = useAutoRedemptions();

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

  // Load swipe hint status from AsyncStorage
  useEffect(() => {
    const loadHintStatus = async () => {
      try {
        const seen = await AsyncStorage.getItem(SWIPE_HINT_STORAGE_KEY);
        if (seen !== null) {
          setUserHasSeenSwipeHint(JSON.parse(seen));
        }
      } catch (e) {
        console.error("Failed to load swipe hint status.", e);
      }
    };
    loadHintStatus();
  }, []);

  // Determine if coach mark should be shown
  useEffect(() => {
    const hasActionableMonthlyPerks = processedCardsFromPerkStatus.some(cardData => 
      cardData.perks.some(perk => perk.status === 'available' && perk.periodMonths === 1)
    );

    if (!isLoading && !userHasSeenSwipeHint && hasActionableMonthlyPerks) {
      setShouldShowSwipeCoachMark(true);
    } else {
      setShouldShowSwipeCoachMark(false);
    }
  }, [isLoading, userHasSeenSwipeHint, processedCardsFromPerkStatus]);

  const handleDismissSwipeCoachMark = async () => {
    try {
      await AsyncStorage.setItem(SWIPE_HINT_STORAGE_KEY, JSON.stringify(true));
      setUserHasSeenSwipeHint(true);
      setShouldShowSwipeCoachMark(false);
    } catch (e) {
      console.error("Failed to save swipe hint status.", e);
    }
  };

  // Handler for the action hint pill press
  const handleActionHintPress = (perkToActivate: (CardPerk & { cardId: string; cardName: string }) | null) => {
    if (perkToActivate) {
      // Set the card as active. This will trigger its expansion via ExpandableCard's useEffect.
      // The existing handleCardExpandChange (called by ExpandableCard) will handle scrolling.
      setActiveCardId(perkToActivate.cardId);
      console.log('ActionHintPill tapped, setting active card:', perkToActivate.cardId);
      // Potentially, also directly call openPerkTarget if desired, though user might want to see context first
      // openPerkTarget(perkToActivate);
    }
  };

  // Refresh data when navigating back to dashboard
  useFocusEffect(
    useCallback(() => {
      StatusBar.setBarStyle('dark-content');
      if (Platform.OS === 'android') {
        StatusBar.setBackgroundColor('transparent');
        StatusBar.setTranslucent(true);
      }
      
      // Always refresh data when focusing on dashboard with error handling
      const refreshData = async () => {
        try {
          console.log('[Dashboard] Focus effect - refreshing user cards and savings');
          await refreshUserCards();
          await refreshSavings();
          donutDisplayRef.current?.refresh();
          await setupNotifications();
        } catch (error) {
          console.warn('[Dashboard] Focus effect refresh failed (network issue):', error);
          // Don't show error to user for focus effect failures - just log it
        }
      };
      
      refreshData();
    }, [refreshUserCards, refreshSavings])
  );

  // Effect to refresh data when params.refresh changes (e.g., after saving cards)
  useEffect(() => {
    if (params.refresh) {
      console.log('[Dashboard] Refresh parameter detected, calling refreshUserCards.');
      refreshUserCards();
    }
  }, [params.refresh, refreshUserCards]);

  const NOTIFICATION_PREFS_KEY = '@notification_preferences';

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

    // Load preferences
    let prefs: NotificationPreferences = {}; // Default to empty object (all true by default in scheduler)
    try {
      const jsonValue = await AsyncStorage.getItem(NOTIFICATION_PREFS_KEY);
      if (jsonValue != null) {
        prefs = JSON.parse(jsonValue);
        // The monthlyPerkExpiryReminderDays array is now directly in prefs if saved from 02-cards.tsx
        // No need to reconstruct it here.
      }
    } catch (e) {
      console.error("[Dashboard] Failed to load notification prefs for scheduling.", e);
    }

    await cancelAllScheduledNotificationsAsync();
    // Pass user ID and the full prefs object (which now includes monthlyPerkExpiryReminderDays if set)
    await scheduleMonthlyPerkResetNotifications(user?.id, prefs);

    if (params.renewalDates && params.selectedCardIds) {
      try {
        const renewalDatesMap = JSON.parse(params.renewalDates);
        // const cardIds = params.selectedCardIds.split(','); // Not directly used here

        for (const cardData of userCardsWithPerks) { // Use userCardsWithPerks from useUserCards hook
          if (renewalDatesMap[cardData.card.id]) {
            const renewalDate = new Date(renewalDatesMap[cardData.card.id]);
            if (!isNaN(renewalDate.getTime()) && renewalDate > new Date()) {
              await scheduleCardRenewalReminder(cardData.card.name, renewalDate, 7, prefs);
            }
          }
        }
      } catch (error) {
        console.error("Error scheduling card reminders:", error);
      }
    }
  };

  const handleTapPerk = async (cardId: string, perkId: string, perk: CardPerk) => {
    if (!user) {
      Alert.alert(
        "Authentication Required",
        "Please log in to track perks.",
        [
          { text: "Log In", onPress: () => router.push('/(auth)/login') },
          { text: "Cancel", style: "cancel" },
        ]
      );
      return;
    }

    // Show the modal instead of immediately opening the app
    setSelectedPerk(perk);
    setSelectedCardIdForModal(cardId);
    setModalVisible(true);
  };

  const handleModalDismiss = () => {
    setModalVisible(false);
    setSelectedPerk(null);
    setSelectedCardIdForModal(null);
  };

  const handleOpenApp = async (targetPerkName?: string) => {
    if (!selectedPerk || !selectedCardIdForModal || !user) return;

    const perkToRedeem = targetPerkName 
      ? { ...selectedPerk, name: targetPerkName }
      : selectedPerk;

    // Close modal first
    handleModalDismiss();

    try {
      // Open the app target
      const didOpen = await openPerkTarget(perkToRedeem);
      
      if (didOpen && Platform.OS === 'ios') {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }

      // Automatically mark as redeemed
      if (user) {
        try {
          // Optimistic update: immediately update global UI state
          setPerkStatus(selectedCardIdForModal, selectedPerk.id, 'redeemed');
          handlePerkStatusChange();
          
          // Background database operation
          const { error } = await trackPerkRedemption(user.id, selectedCardIdForModal, selectedPerk, selectedPerk.value);
          
          if (error) {
            // Revert optimistic update on error
            setPerkStatus(selectedCardIdForModal, selectedPerk.id, 'available');
            handlePerkStatusChange();
            
            if (typeof error === 'object' && error !== null && 'message' in error && (error as any).message === 'Perk already redeemed this period') {
              Alert.alert('Already Redeemed', 'This perk has already been redeemed this month.');
            } else {
              console.error('Error tracking redemption:', error);
              Alert.alert('Error', 'Failed to mark perk as redeemed.');
            }
            return;
          }

          // Force refresh both global state and local ExpandableCard state
          await refreshUserCards();
          await refreshSavings();
          handlePerkStatusChange();
          
          showToast(
            `${selectedPerk.name} marked as redeemed`,
            async () => {
              try {
                // Undo the redemption
                const { error: undoError } = await deletePerkRedemption(user.id, selectedPerk.definition_id);
                if (undoError) {
                  console.error('Error undoing redemption:', undoError);
                  showToast('Error undoing redemption');
                } else {
                  // Force refresh after undo
                  await refreshUserCards();
                  await refreshSavings();
                  handlePerkStatusChange();
                }
              } catch (undoError) {
                console.error('Unexpected error undoing redemption:', undoError);
                showToast('Error undoing redemption');
              }
            }
          );
        } catch (dbError) {
          // Revert optimistic update on error
          setPerkStatus(selectedCardIdForModal, selectedPerk.id, 'available');
          handlePerkStatusChange();
          console.error('Unexpected error in auto-redemption:', dbError);
          Alert.alert('Error', 'Failed to track redemption.');
        }
      }
    } catch (error) {
      console.error('Error opening perk target:', error);
      Alert.alert('Error', 'Could not open the link for this perk.');
    }
  };

  const handleMarkRedeemed = async () => {
    if (!selectedPerk || !selectedCardIdForModal || !user) return;

    // Close modal first
    handleModalDismiss();

    try {
      // Optimistic update: immediately update global UI state
      setPerkStatus(selectedCardIdForModal, selectedPerk.id, 'redeemed');
      handlePerkStatusChange();
      
      // Trigger haptic feedback immediately
      if (Platform.OS === 'ios') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }

      // Background database operation
      const { error } = await trackPerkRedemption(user.id, selectedCardIdForModal, selectedPerk, selectedPerk.value);
      
      if (error) {
        // Revert optimistic update on error
        setPerkStatus(selectedCardIdForModal, selectedPerk.id, 'available');
        handlePerkStatusChange();
        
        if (typeof error === 'object' && error !== null && 'message' in error && (error as any).message === 'Perk already redeemed this period') {
          Alert.alert('Already Redeemed', 'This perk has already been redeemed this month.');
        } else {
          console.error('Error tracking redemption:', error);
          Alert.alert('Error', 'Failed to mark perk as redeemed.');
        }
        return;
      }

      // Force refresh both global state and local ExpandableCard state
      await refreshUserCards();
      await refreshSavings();
      handlePerkStatusChange();
      
    } catch (dbError) {
      // Revert optimistic update on error  
      setPerkStatus(selectedCardIdForModal, selectedPerk.id, 'available');
      handlePerkStatusChange();
      console.error('Unexpected error marking perk as redeemed:', dbError);
      Alert.alert('Error', 'Failed to mark perk as redeemed.');
    }
  };

  // DEV Date Picker Handler
  const handleDevDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowDatePickerForDev(false);
    if (event.type === 'set' && selectedDate) {
      setDevSelectedDate(selectedDate);
      processNewMonth(selectedDate); 
    }
  };

  // DEV function to reset swipe hint for testing
  const handleResetSwipeHint = async () => {
    try {
      await AsyncStorage.removeItem(SWIPE_HINT_STORAGE_KEY);
      setUserHasSeenSwipeHint(false);
      setShouldShowSwipeCoachMark(true);
      Alert.alert('Success', 'Swipe hint reset. Coach mark will show again.');
    } catch (e) {
      console.error("Failed to reset swipe hint.", e);
      Alert.alert('Error', 'Failed to reset swipe hint.');
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
    // Immediate donut refresh
    donutDisplayRef.current?.refresh();
    // Force immediate refresh of global state
    refreshSavings();
    // Also refresh user cards to ensure ExpandableCard gets updated data
    refreshUserCards();
  }, [refreshSavings, refreshUserCards]);

  const sortedCards = sortCardsByUnredeemedPerks(processedCardsFromPerkStatus);

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
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* <StatusBar barStyle="dark-content" backgroundColor="#ffffff" /> */}
      <View style={styles.mainContainer}>
        <Header /> 

        <ScrollView 
          ref={scrollViewRef}
          contentContainerStyle={styles.scrollContent}
          scrollEventThrottle={16}
        >
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
              onPress={() => handleActionHintPress(nextActionablePerk)}
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

          {/* Swipe Coach Mark */}
          <SwipeCoachMark 
            visible={shouldShowSwipeCoachMark}
            onDismiss={handleDismissSwipeCoachMark}
          />

          {/* DEV Date Picker */}
          <View style={styles.devSection}>
            <TouchableOpacity
              onPress={() => setShowDatePickerForDev(true)}
              style={styles.devButton}
            >
              <Text style={styles.devButtonText}>DEV: Set Current Date & Process Month</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleResetSwipeHint}
              style={[styles.devButton, { marginTop: 8 }]}
            >
              <Text style={styles.devButtonText}>DEV: Reset Swipe Coach Mark</Text>
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

        {/* Perk Action Modal */}
        <PerkActionModal
          visible={modalVisible}
          perk={selectedPerk}
          onDismiss={handleModalDismiss}
          onOpenApp={handleOpenApp}
          onMarkRedeemed={handleMarkRedeemed}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8F7FF',
  },
  mainContainer: {
    flex: 1,
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
    backgroundColor: '#FAFAFE',
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