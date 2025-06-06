import React, { useState, useCallback, useRef, useMemo, useEffect, useImperativeHandle } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
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
  Animated,
  FlatList,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
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
import { format, differenceInDays, endOfMonth, endOfYear, addMonths, getMonth, getYear } from 'date-fns';
import { Card, CardPerk, openPerkTarget } from '../../src/data/card-data';
import { trackPerkRedemption, deletePerkRedemption, setAutoRedemption, checkAutoRedemptionByCardId } from '../../lib/database';
import CardExpanderFooter from '../components/home/CardExpanderFooter';
import ActionHintPill from '../components/home/ActionHintPill';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
const UNIQUE_PERK_PERIODS_STORAGE_KEY = '@user_unique_perk_periods';

const showToast = (message: string, onUndo?: () => void) => {
  const toastMessage = onUndo ? `${message}\nTap to undo` : message;
  const toast = Toast.show(toastMessage, {
    duration: onUndo ? 4000 : 2000,
    position: Toast.positions.BOTTOM,
    shadow: true, animation: true, hideOnPress: true, delay: 0,
    containerStyle: { borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 64, backgroundColor: '#1c1c1e' },
    textStyle: { fontSize: 14, fontWeight: '500', textAlign: 'center', lineHeight: 20 },
    onPress: () => { 
      if (onUndo) { 
        Toast.hide(toast);
        onUndo(); 
      }
    },
  });
};

// Define CardPerkWithMeta type for nextPerkRef
type CardPerkWithMeta = CardPerk & { cardId: string; cardName: string; cycleEndDate: Date; daysRemaining: number };

// Helper function to calculate perk cycle end date and days remaining
const calculatePerkCycleDetails = (perk: CardPerk, currentDate: Date): { cycleEndDate: Date; daysRemaining: number } => {
  if (!perk.periodMonths) {
    // Should not happen for perks we are considering for cycles
    return { cycleEndDate: endOfYear(addMonths(currentDate, 24)), daysRemaining: 365 * 2 }; // Far future
  }

  const currentMonth = getMonth(currentDate); // 0-11
  const currentYear = getYear(currentDate);
  let cycleEndDate: Date;

  switch (perk.periodMonths) {
    case 1: // Monthly
      cycleEndDate = endOfMonth(currentDate);
      break;
    case 3: // Quarterly
      const quarter = Math.floor(currentMonth / 3);
      const endMonthOfQuarter = quarter * 3 + 2; // Q1 (0) -> 2 (Mar), Q2 (1) -> 5 (Jun), etc.
      cycleEndDate = endOfMonth(new Date(currentYear, endMonthOfQuarter, 1));
      break;
    case 6: // Bi-Annually
      const half = Math.floor(currentMonth / 6);
      const endMonthOfHalf = half * 6 + 5; // H1 (0) -> 5 (Jun), H2 (1) -> 11 (Dec)
      cycleEndDate = endOfMonth(new Date(currentYear, endMonthOfHalf, 1));
      break;
    case 12: // Annually
      cycleEndDate = endOfYear(currentDate);
      break;
    default:
      // For other uncommon periods, estimate as end of month after periodMonths from start of current month
      // This is a fallback and might need refinement based on specific perk rules
      const startOfCurrentMonth = new Date(currentYear, currentMonth, 1);
      cycleEndDate = endOfMonth(addMonths(startOfCurrentMonth, perk.periodMonths -1));
      // If this calculation results in a date in the past for the current cycle, advance it by periodMonths
      if (cycleEndDate < currentDate) {
         cycleEndDate = endOfMonth(addMonths(cycleEndDate, perk.periodMonths));
      }
      break;
  }

  let daysRemaining = differenceInDays(cycleEndDate, currentDate);
  // Ensure daysRemaining is not negative if cycleEndDate is slightly in the past due to timing.
  daysRemaining = Math.max(0, daysRemaining);

  return { cycleEndDate, daysRemaining };
};

// Header Animation Constants
const INITIAL_HEADER_HEIGHT = 80; // Reduced from 90
const COLLAPSED_HEADER_HEIGHT = 50;
const HEADER_SCROLL_DISTANCE = INITIAL_HEADER_HEIGHT - COLLAPSED_HEADER_HEIGHT;

// Constants for FlatList card rendering & expansion
const DEFAULT_CARDS_VISIBLE = 4;
const ESTIMATED_COLLAPSED_CARD_HEIGHT = 109; // Updated from 96, based on Amex Gold (larger) collapsed height
const ESTIMATED_EXPANDED_CARD_HEIGHT = 555; // Updated from 316, based on Amex Gold (max observed) expanded height

// Define the type for a single item in the cards list - MOVED HERE and defined explicitly
type CardListItem = { card: Card; perks: CardPerk[] };

export default function Dashboard() {
  const router = useRouter();
  const params = useLocalSearchParams<{ selectedCardIds?: string; renewalDates?: string; refresh?: string }>();
  const { user } = useAuth();
  const donutDisplayRef = useRef<{ refresh: () => void }>(null);
  const flatListRef = useRef<FlatList<CardListItem>>(null);
  const scrollY = useRef(new Animated.Value(0)).current;
  const nextPerkRef = useRef<CardPerkWithMeta | null>(null);

  // State for DEV date picker
  const [showDatePickerForDev, setShowDatePickerForDev] = useState(false);
  const [devSelectedDate, setDevSelectedDate] = useState<Date>(new Date());
  const [activeCardId, setActiveCardId] = useState<string | null>(null);

  // Modal state for perk action
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedPerk, setSelectedPerk] = useState<CardPerk | null>(null);
  const [selectedCardIdForModal, setSelectedCardIdForModal] = useState<string | null>(null);
  const [listHeaderHeight, setListHeaderHeight] = useState(0);

  // Coach Mark State - This will be handled inside ExpandableCard now
  const [userHasSeenSwipeHint, setUserHasSeenSwipeHint] = useState(false);

  // State for unique perk periods, default to monthly and annual if not found
  const [uniquePerkPeriodsForToggle, setUniquePerkPeriodsForToggle] = useState<number[]>([1, 12]); // Renamed for clarity

  // State for managing card list expansion (previously in StackedCardDisplay)
  const [isCardListExpanded, setIsCardListExpanded] = useState(false);

  // State for the ActionHintPill content, derived from nextActionablePerkToHighlight
  const [headerPillContent, setHeaderPillContent] = useState<(CardPerk & { cardId: string; cardName: string; cycleEndDate: Date; daysRemaining: number }) | null>(null);

  // Use custom hooks
  const { 
    userCardsWithPerks, 
    isLoading: isUserCardsInitialLoading, // Renamed for clarity
    isRefreshing: isUserCardsRefreshing, // Renamed for clarity
    error: userCardsError, 
    refreshUserCards 
  } = useUserCards();
  const {
    periodAggregates,
    cumulativeValueSavedPerCard,
    userCardsWithPerks: processedCardsFromPerkStatus,
    setPerkStatus,
    isCalculatingSavings, // This indicates background processing after cards are loaded
    refreshSavings,
    redeemedInCurrentCycle,
    showCelebration,
    setShowCelebration,
    processNewMonth,
  } = usePerkStatus(userCardsWithPerks);
  const { getAutoRedemptionByPerkName, refreshAutoRedemptions } = useAutoRedemptions();

  // Initial log after hooks have run
  console.log("DEBUG: Dashboard component - AFTER hooks. isUserCardsInitialLoading:", isUserCardsInitialLoading, "isUserCardsRefreshing:", isUserCardsRefreshing, "isCalculatingSavings:", isCalculatingSavings, "userCardsWithPerks count:", userCardsWithPerks?.length);

  const daysRemaining = useMemo(() => getDaysRemainingInMonth(), []);
  const statusColors = useMemo(() => getStatusColor(daysRemaining), [daysRemaining]);

  // Dynamic text for collapsed header
  const currentMonthName = useMemo(() => format(new Date(), 'MMMM'), []);
  const collapsedHeaderText = `${currentMonthName} Summary`;
  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';

  // Animated values for header styles
  const animatedHeaderHeight = scrollY.interpolate({
    inputRange: [0, HEADER_SCROLL_DISTANCE],
    outputRange: [INITIAL_HEADER_HEIGHT, COLLAPSED_HEADER_HEIGHT],
    extrapolate: 'clamp',
  });

  // Opacity for the expanded content (greeting)
  const expandedContentOpacity = scrollY.interpolate({
    inputRange: [0, HEADER_SCROLL_DISTANCE * 0.5], 
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  // Translate Y for the expanded content (greeting)
  const expandedContentTranslateY = scrollY.interpolate({
    inputRange: [0, HEADER_SCROLL_DISTANCE * 0.5],
    outputRange: [0, -15], // Slight upward movement
    extrapolate: 'clamp',
  });

  // Opacity for the collapsed content (summary title & account button container)
  const collapsedContentOpacity = scrollY.interpolate({
    inputRange: [HEADER_SCROLL_DISTANCE * 0.5, HEADER_SCROLL_DISTANCE], 
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  // Determine the single next actionable perk to highlight
  const nextActionablePerkToHighlight = useMemo(() => {
    const currentDate = new Date();
    const allActionablePerks: (CardPerk & { cardId: string; cardName: string; cycleEndDate: Date; daysRemaining: number })[] = [];

    processedCardsFromPerkStatus.forEach(cardData => {
      cardData.perks.forEach(perk => {
        if (perk.status === 'available') {
          const { cycleEndDate, daysRemaining } = calculatePerkCycleDetails(perk, currentDate);
          if (daysRemaining >= 0) { 
            allActionablePerks.push({
              ...perk, 
              cardId: cardData.card.id,
              cardName: cardData.card.name,
              cycleEndDate,
              daysRemaining,
            });
          }
        }
      });
    });

    // Sort by daysRemaining (asc), then by value (desc)
    allActionablePerks.sort((a, b) => {
      if (a.daysRemaining !== b.daysRemaining) {
        return a.daysRemaining - b.daysRemaining;
      }
      return b.value - a.value; // Higher value first if daysRemaining is the same
    });
    
    return allActionablePerks.length > 0 ? allActionablePerks[0] : null;
  }, [processedCardsFromPerkStatus]);

  // Update state for headerPillContent when nextActionablePerkToHighlight changes
  useEffect(() => {
    setHeaderPillContent(nextActionablePerkToHighlight);
  }, [nextActionablePerkToHighlight]);

  // Load swipe hint status and unique perk periods from AsyncStorage
  useEffect(() => {
    const loadAsyncData = async () => {
      try {
        const seenHint = await AsyncStorage.getItem(SWIPE_HINT_STORAGE_KEY);
        if (seenHint !== null) {
          setUserHasSeenSwipeHint(JSON.parse(seenHint));
        }

        const storedPeriods = await AsyncStorage.getItem(UNIQUE_PERK_PERIODS_STORAGE_KEY);
        if (storedPeriods !== null) {
          const parsedPeriods = JSON.parse(storedPeriods);
          if (Array.isArray(parsedPeriods) && parsedPeriods.length > 0) {
            setUniquePerkPeriodsForToggle(parsedPeriods);
          } else {
            setUniquePerkPeriodsForToggle([1, 12]); // Default if empty or invalid
          }
        } else {
          setUniquePerkPeriodsForToggle([1, 12]); // Default if not found
        }
      } catch (e) {
        console.error("[Dashboard] Failed to load data from AsyncStorage.", e);
        setUniquePerkPeriodsForToggle([1, 12]); // Default on error
      }
    };
    loadAsyncData();
  }, []);

  const handleHintDismissed = async () => {
    if (!userHasSeenSwipeHint) {
      try {
        await AsyncStorage.setItem(SWIPE_HINT_STORAGE_KEY, JSON.stringify(true));
        setUserHasSeenSwipeHint(true);
      } catch (e) {
        console.error("Failed to save swipe hint status.", e);
      }
    }
  };

  // Handler for the action hint pill press - memoized
  const handleActionHintPress = useCallback((perkToActivate: (CardPerk & { cardId: string; cardName: string; cycleEndDate: Date; daysRemaining: number }) | null) => {
    if (perkToActivate) {
      setSelectedPerk(perkToActivate);
      setSelectedCardIdForModal(perkToActivate.cardId);
      setModalVisible(true);
    }
  }, [setSelectedPerk, setSelectedCardIdForModal, setModalVisible]);

  // Refresh data when navigating back to dashboard
  useFocusEffect(
    useCallback(() => {
      // StatusBar.setBarStyle('dark-content'); // Temporarily comment out for testing
      // if (Platform.OS === 'android') { // Commenting out Android specific calls as well
      //   StatusBar.setBackgroundColor('transparent'); 
      //   StatusBar.setTranslucent(true); 
      // }
      
      const refreshData = async () => {
        try {
          const storedPeriods = await AsyncStorage.getItem(UNIQUE_PERK_PERIODS_STORAGE_KEY);
          if (storedPeriods !== null) {
            const parsedPeriods = JSON.parse(storedPeriods);
            if (Array.isArray(parsedPeriods) && parsedPeriods.length > 0) {
              setUniquePerkPeriodsForToggle(parsedPeriods);
            } else {
              setUniquePerkPeriodsForToggle([1, 12]); 
            }
          } else {
            setUniquePerkPeriodsForToggle([1, 12]);
          }

          await refreshUserCards();
          await refreshSavings();
          donutDisplayRef.current?.refresh();
          await setupNotifications();
        } catch (error) {
          console.warn('[Dashboard] Focus effect refresh failed:', error);
        }
      };
      
      refreshData();
    }, [refreshUserCards, refreshSavings])
  );

  // Effect to refresh data when params.refresh changes (e.g., after saving cards)
  useEffect(() => {
    if (params.refresh) {
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

  const handleTapPerk = useCallback(async (cardId: string, perkId: string, perk: CardPerk) => {
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
  }, [user, router]);

  const handleModalDismiss = () => {
    setModalVisible(false);
    setSelectedPerk(null);
    setSelectedCardIdForModal(null);
  };

  const handleOpenApp = async (targetPerkName?: string) => {
    if (!selectedPerk || !selectedCardIdForModal || !user) return;

    const perkToOpenAppFor = targetPerkName
      ? { ...selectedPerk, name: targetPerkName }
      : selectedPerk;

    // Close modal first
    handleModalDismiss();

    try {
      // Always attempt to open the app target
      const didOpen = await openPerkTarget(perkToOpenAppFor);
      if (didOpen && Platform.OS === 'ios') {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }

      // Only track redemption if the perk is currently available
      if (selectedPerk.status === 'available') {
        const originalStatus = selectedPerk.status; 

        // Optimistic update for redemption
          setPerkStatus(selectedCardIdForModal, selectedPerk.id, 'redeemed');
          
          // Background database operation
          const { error } = await trackPerkRedemption(user.id, selectedCardIdForModal, selectedPerk, selectedPerk.value);
          
          if (error) {
          console.error('Error tracking redemption in DB:', error);
            // Revert optimistic update on error
          setPerkStatus(selectedCardIdForModal, selectedPerk.id, originalStatus);
            handlePerkStatusChange();
            
            if (typeof error === 'object' && error !== null && 'message' in error && (error as any).message === 'Perk already redeemed this period') {
            Alert.alert('Already Redeemed', 'This perk was already marked as redeemed.');
            } else {
            Alert.alert('Error', 'Failed to mark perk as redeemed in the database.');
            }
            return;
          }

        // DB operation successful
          handlePerkStatusChange();
          
          showToast(
            `${selectedPerk.name} marked as redeemed`,
            async () => {
            setPerkStatus(selectedCardIdForModal, selectedPerk.id, 'available');
              try {
                const { error: undoError } = await deletePerkRedemption(user.id, selectedPerk.definition_id);
                if (undoError) {
                console.error('Error undoing redemption in DB:', undoError);
                setPerkStatus(selectedCardIdForModal, selectedPerk.id, 'redeemed'); 
                handlePerkStatusChange(); 
                  showToast('Error undoing redemption');
                } else {
                  handlePerkStatusChange();
                showToast(`${selectedPerk.name} redemption undone.`);
              }
            } catch (undoCatchError) {
              console.error('Unexpected error during undo redemption:', undoCatchError);
              setPerkStatus(selectedCardIdForModal, selectedPerk.id, 'redeemed'); 
              handlePerkStatusChange(); 
                showToast('Error undoing redemption');
              }
            }
          );
      } else if (selectedPerk.status === 'redeemed') {
        // Perk is already redeemed, we just opened the app.
      }
    } catch (openErrorOrDbError) {
      console.error('Error in perk action flow:', openErrorOrDbError);
      // If an error occurs, ensure the modal is dismissed if it wasn't already.
      handleModalDismiss(); 

      // Attempt to revert optimistic UI update if it was an 'available' perk that failed redemption.
      // Check if selectedPerk is still defined and if its status was 'available' before this error.
      // This part is tricky because originalStatus is scoped inside the 'if (available)' block.
      // A more robust way would be to rely on the `setPerkStatus` calls within the error handling
      // of the `trackPerkRedemption` block.
      // For now, a generic error alert is shown.
      Alert.alert('Operation Failed', 'An error occurred while processing the perk. Please check its status.');
    }
  };

  const handleMarkRedeemed = async () => {
    if (!selectedPerk || !selectedCardIdForModal || !user) return;

    const originalStatus = selectedPerk.status;

    // Close modal first
    handleModalDismiss();
    await Promise.resolve(); // Allow modal dismissal to process
      
      // Trigger haptic feedback immediately
      if (Platform.OS === 'ios') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }

    // Optimistic update: immediately update global UI state
    setPerkStatus(selectedCardIdForModal, selectedPerk.id, 'redeemed');
    handlePerkStatusChange(); // Attempt to refresh donut with optimistic state

    try {
      // Background database operation
      const { error } = await trackPerkRedemption(user.id, selectedCardIdForModal, selectedPerk, selectedPerk.value);
      
      if (error) {
        console.error('Error tracking redemption in DB:', error);
        // Revert optimistic update on error
        setPerkStatus(selectedCardIdForModal, selectedPerk.id, originalStatus);
        handlePerkStatusChange(); // Refresh UI with reverted state
        
        if (typeof error === 'object' && error !== null && 'message'in error && (error as any).message === 'Perk already redeemed this period') {
          Alert.alert('Already Redeemed', 'This perk has already been redeemed this month.');
        } else {
          Alert.alert('Error', 'Failed to mark perk as redeemed in the database.');
        }
        return;
      }

      // DB operation successful
      handlePerkStatusChange(); // Refresh UI with new state (final confirmation)
      showToast(`${selectedPerk.name} marked as redeemed.`); // Simple toast, no undo here
      
    } catch (dbError) {
      // Catch any unexpected errors from trackPerkRedemption or subsequent logic
      console.error('Unexpected error marking perk as redeemed:', dbError);
      // Revert optimistic update on error  
      setPerkStatus(selectedCardIdForModal, selectedPerk.id, originalStatus);
      handlePerkStatusChange(); // Refresh UI with reverted state
      Alert.alert('Error', 'An unexpected error occurred while marking perk as redeemed.');
    }
  };

  // New function to handle marking a perk as available
  const handleMarkAvailable = async () => {
    if (!selectedPerk || !selectedCardIdForModal || !user) return;

    const originalStatus = selectedPerk.status;

    // Close modal first
    handleModalDismiss();
    await Promise.resolve(); // Allow modal dismissal to process

    // Trigger haptic feedback
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    // Optimistic update: set perk to 'available'
    setPerkStatus(selectedCardIdForModal, selectedPerk.id, 'available');
    handlePerkStatusChange(); // Attempt to refresh donut with optimistic state

    try {
      // Background database operation to delete the redemption
      const { error } = await deletePerkRedemption(user.id, selectedPerk.definition_id);

      if (error) {
        console.error('Error deleting redemption in DB:', error);
        // Revert optimistic update on error
        setPerkStatus(selectedCardIdForModal, selectedPerk.id, originalStatus);
        handlePerkStatusChange(); // Refresh UI with reverted state
        Alert.alert('Error', 'Failed to mark perk as available in the database.');
        return;
      }

      // DB operation successful
      handlePerkStatusChange(); // Refresh UI with new 'available' state (final confirmation)
      showToast(`${selectedPerk.name} marked as available.`);

    } catch (dbError) {
      console.error('Unexpected error marking perk as available:', dbError);
      // Revert optimistic update on error
      setPerkStatus(selectedCardIdForModal, selectedPerk.id, originalStatus);
      handlePerkStatusChange(); // Refresh UI with reverted state
      Alert.alert('Error', 'An unexpected error occurred while marking perk as available.');
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
      Alert.alert('Success', 'Swipe hint reset. Coach mark will show again.');
    } catch (e) {
      console.error("Failed to reset swipe hint.", e);
      Alert.alert('Error', 'Failed to reset swipe hint.');
    }
  };

  const handleCardExpandChange = useCallback((cardId: string, isExpanded: boolean, index: number) => {
    console.log(`[Dashboard] handleCardExpandChange: cardId=${cardId}, isExpanded=${isExpanded}, index=${index}`);
    setActiveCardId(isExpanded ? cardId : null);

    if (isExpanded) {
      // We use a timeout to ensure the scroll happens *after* the card's expand animation (300ms) has finished.
      setTimeout(() => {
        flatListRef.current?.scrollToIndex({
          animated: true,
          index,
          viewPosition: 0.3, // Scrolls the item to the top of the list view
        });
      }, 350);
    }
  }, [setActiveCardId]);

  const handlePerkStatusChange = useCallback(() => {
    refreshSavings(); // Recalculate aggregates and savings
    donutDisplayRef.current?.refresh(); // Refresh donut animation
  }, [refreshSavings]); // Add refreshSavings to dependency array

  const sortedCards = useMemo(() => {
    // console.log('[Dashboard] Memoizing sortedCards. ActiveCardId:', activeCardId);
    // Directly use processedCardsFromPerkStatus without sorting for now
    return processedCardsFromPerkStatus;
  }, [processedCardsFromPerkStatus]);

  const cardsListData = useMemo(() => {
    return isCardListExpanded ? sortedCards : sortedCards.slice(0, DEFAULT_CARDS_VISIBLE);
  }, [isCardListExpanded, sortedCards]);

  // Log for debugging, ensure it's called when sortedCards is defined
  if (!isUserCardsInitialLoading) {
  }

  // renderItem function for the FlatList
  const renderExpandableCardItem = ({ item, index }: { item: CardListItem, index: number }) => (
    <ExpandableCard
      card={item.card}
      perks={item.perks}
      cumulativeSavedValue={cumulativeValueSavedPerCard[item.card.id] || 0}
      onTapPerk={handleTapPerk}
      onExpandChange={handleCardExpandChange}
      onPerkStatusChange={handlePerkStatusChange}
      setPerkStatus={setPerkStatus}
      isActive={item.card.id === activeCardId}
      sortIndex={index} 
      userHasSeenSwipeHint={userHasSeenSwipeHint}
      onHintDismissed={handleHintDismissed}
    />
  );

  // Create the ListHeaderElement using useMemo for stability
  const listHeaderElement = useMemo(() => {
    console.log("DEBUG: Dashboard listHeaderElement useMemo. Pill content:", headerPillContent ? 'Exists' : 'null');
    return (
      <View onLayout={(event) => {
        const { height } = event.nativeEvent.layout;
        if (height > 0 && height !== listHeaderHeight) {
          // LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          setListHeaderHeight(height);
        }
      }}>
        {headerPillContent && (
          <ActionHintPill 
            perk={headerPillContent} 
            onPress={() => handleActionHintPress(headerPillContent)} 
            daysRemaining={headerPillContent.daysRemaining} 
          />
        )}
        <View style={styles.summarySection}>
          <PerkDonutDisplayManager
            ref={donutDisplayRef}
            userCardsWithPerks={userCardsWithPerks}
            periodAggregates={periodAggregates}
            redeemedInCurrentCycle={redeemedInCurrentCycle}
            uniquePerkPeriods={uniquePerkPeriodsForToggle}
            backgroundColor="#FAFAFE"
          />
        </View>
        <View style={styles.cardsSectionHeader}>
          <Text style={styles.sectionTitle}>Your Cards</Text>
        </View>
      </View>
    );
  }, [
    headerPillContent, 
    handleActionHintPress, 
    donutDisplayRef, // donutDisplayRef is stable, but including if its .current access implies dependency
    userCardsWithPerks, 
    periodAggregates, 
    redeemedInCurrentCycle, 
    uniquePerkPeriodsForToggle,
    listHeaderHeight
  ]);

  const renderListFooter = useCallback(() => {
    const hiddenCardsCount = sortedCards.length - cardsListData.length;
    return (
      <>
        {/* Card Expander Footer */}
        {(sortedCards.length > DEFAULT_CARDS_VISIBLE) && (
          <CardExpanderFooter
            hiddenCardsCount={hiddenCardsCount}
            isExpanded={isCardListExpanded}
            onToggleExpanded={() => setIsCardListExpanded(!isCardListExpanded)}
          />
        )}
      </>
    );
  }, [sortedCards, cardsListData, isCardListExpanded]);

  // Only show full-screen loader on the very first load of user cards.
  // Subsequent refreshes (isUserCardsRefreshing) or savings calculations (isCalculatingSavings)
  // will happen in the background without a full-screen loader.
  const coachMarkTopOffset = COLLAPSED_HEADER_HEIGHT + 250; // Position below the collapsed header and card header

  if (isUserCardsInitialLoading) { // Check only the initial loading state from useUserCards
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.light.tint} />
          <Text style={styles.loadingText}>Loading your card data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (userCardsError) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>Error loading cards. Please try again.</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Log before returning the main JSX tree
  console.log("DEBUG: Dashboard component - BEFORE MAIN RETURN. isUserCardsInitialLoading:", isUserCardsInitialLoading, "isUserCardsRefreshing:", isUserCardsRefreshing, "isCalculatingSavings:", isCalculatingSavings, "sortedCards count:", sortedCards?.length);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar style="dark" />
      <View style={styles.mainContainer}>
        <Animated.View style={[styles.animatedHeaderContainer, { height: animatedHeaderHeight }]}>
          {/* Expanded Header Content (Greeting) */}
          <Animated.View 
            style={[
              styles.expandedHeaderContent,
              { 
                opacity: expandedContentOpacity, 
                transform: [{ translateY: expandedContentTranslateY }] 
              }
            ]}
          >
            <View style={styles.greetingTextContainer}>
              <Text style={styles.welcomeText}>Good morning,</Text>
              <Text style={styles.userNameText}>{userName || ' '}</Text>
            </View>
          </Animated.View>

          {/* Collapsed Header Content (Summary Title & Account Button) */}
          <Animated.View 
            style={[
              styles.collapsedHeaderElementsContainer, 
              { opacity: collapsedContentOpacity }
            ]}
          >
            <View style={styles.collapsedTitleContainer}>
              <Text style={styles.collapsedHeaderText}>{collapsedHeaderText || ' '}</Text>
            </View>
          </Animated.View>
        </Animated.View>

        {/* Main content area now uses FlatList */}
        {sortedCards.length > 0 ? (
           <Animated.FlatList // Use Animated.FlatList for onScroll event
            ref={flatListRef}
            data={cardsListData}
            renderItem={renderExpandableCardItem}
            keyExtractor={(item) => item.card.id}
            ListHeaderComponent={listHeaderElement} // Use the memoized element
            ListFooterComponent={renderListFooter}
            contentContainerStyle={styles.flatListContentContainer} // New style for FlatList specific content padding
            style={styles.flatListOverallStyle} // Style for the FlatList container itself
            showsVerticalScrollIndicator={false}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { y: scrollY } } }],
              { useNativeDriver: false }
            )}
            scrollEventThrottle={16}
            extraData={activeCardId} // Changed extraData
          />
        ) : (
          // No cards state - needs to be scrollable if header content is tall
          // or ensure header content is also minimal.
          // For now, let's wrap the no cards view in a basic ScrollView if needed,
          // or ensure ListHeader + this occupies screen correctly.
          // This part might need adjustment based on visual requirements of "no cards" view with header.
          <ScrollView 
            contentContainerStyle={styles.scrollContent} // Re-use existing scrollContent for padding
            showsVerticalScrollIndicator={false}
             onScroll={Animated.event( // Also attach scroll handler here for header animation
              [{ nativeEvent: { contentOffset: { y: scrollY } } }],
              { useNativeDriver: false }
            )}
            scrollEventThrottle={16}
          >
            {/* {listHeaderElement} Temporarily removed for testing no-cards scenario */}
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
            {renderListFooter()}
          </ScrollView>
        )}

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
          onMarkAvailable={handleMarkAvailable}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FAFAFE',
  },
  mainContainer: {
    flex: 1,
  },
  animatedHeaderContainer: {
    backgroundColor: '#FAFAFE',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    paddingHorizontal: 16, 
    position: 'absolute', 
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    // overflow: 'hidden', // Avoid if it causes clipping, ensure children are managed
  },
  expandedHeaderContent: {
    height: INITIAL_HEADER_HEIGHT,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center', // Vertically center items in expanded state
    // paddingBottom: 10, // Adjust as needed for spacing
    // backgroundColor: 'lightpink', // For debugging
  },
  greetingTextContainer: {
    flex: 1, // Allow greeting to take available space
  },
  welcomeText: {
    fontSize: 14,
    color: '#8A8A8E',
    fontWeight: '400',
  },
  userNameText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1c1c1e',
    marginTop: 2,
  },
  collapsedHeaderElementsContainer: {
    height: COLLAPSED_HEADER_HEIGHT,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute', // Position it to overlay correctly during transition
    top: 0, // Align to the top of parent when parent is collapsed
    left: 16, 
    right: 16,
    // bottom: 0, // Removed, top: 0 with parent height COLLAPSED_HEADER_HEIGHT controls it
    // backgroundColor: 'lightblue', // For debugging
  },
  collapsedTitleContainer: {
    flex: 1, 
    alignItems: 'center', // If you want text centered within this flex:1 container
    justifyContent: 'center',
  },
  collapsedHeaderText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1c1c1e',
    textAlign: 'center', // Center text if container is flex:1
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: INITIAL_HEADER_HEIGHT, // Content starts below the absolute positioned header
    paddingBottom: 80, // Added padding for the tab navigation menu
  },
  summarySection: {
    // This container now just provides vertical spacing and background
    paddingTop: 0,
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
    backgroundColor: '#FAFAFE',
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
  flatListOverallStyle: { // New style for the FlatList component itself
    flex: 1, // Ensure FlatList takes up available space
    // The paddingTop to clear the absolute header will be handled by contentContainerStyle or ListHeaderComponent's structure
  },
  flatListContentContainer: { // New style for FlatList's content
    paddingTop: INITIAL_HEADER_HEIGHT, // Content starts below the absolute positioned header
    paddingBottom: 80, // Retain bottom padding
    flexGrow: 1, // Important for ScrollView-like behavior if content is short
  },
  cardsSectionHeader: { // New style for the header within ListHeaderComponent
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 20, // Add some padding if it's the first thing after summary
    marginBottom: 12,
  },
}); 