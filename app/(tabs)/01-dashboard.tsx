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
  Animated,
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
import { format, differenceInDays, endOfMonth, endOfYear, addMonths, getMonth, getYear } from 'date-fns';
import { Card, CardPerk, openPerkTarget } from '../../src/data/card-data';
import { trackPerkRedemption, deletePerkRedemption, setAutoRedemption, checkAutoRedemptionByCardId } from '../../lib/database';
import AccountButton from '../components/home/AccountButton';
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
const UNIQUE_PERK_PERIODS_STORAGE_KEY = '@user_unique_perk_periods';

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

export default function Dashboard() {
  const router = useRouter();
  const params = useLocalSearchParams<{ selectedCardIds?: string; renewalDates?: string; refresh?: string }>();
  const { user } = useAuth();
  const donutDisplayRef = useRef<{ refresh: () => void }>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const scrollY = useRef(new Animated.Value(0)).current;

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

  // State for unique perk periods, default to monthly and annual if not found
  const [uniquePerkPeriods, setUniquePerkPeriods] = useState<number[]>([1, 12]);

  // Use custom hooks
  const { userCardsWithPerks, isLoading, error: userCardsError, refreshUserCards } = useUserCards();
  const {
    periodAggregates,
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

  // Dynamic text for collapsed header
  const currentMonthName = useMemo(() => format(new Date(), 'MMMM'), []);
  const collapsedHeaderText = `${currentMonthName} Summary`;
  const userName = user?.user_metadata?.first_name || user?.email?.split('@')[0] || 'User';

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
          // Only consider perks whose cycle hasn't technically passed based on our calculation
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
    
    console.log('[Dashboard] Top actionable perk to highlight:', allActionablePerks.length > 0 ? allActionablePerks[0] : 'None');
    return allActionablePerks.length > 0 ? allActionablePerks[0] : null;
  }, [processedCardsFromPerkStatus]);

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
            console.log('[Dashboard] Loaded unique perk periods from AsyncStorage:', parsedPeriods);
            setUniquePerkPeriods(parsedPeriods);
          } else {
            console.log('[Dashboard] No valid unique perk periods in AsyncStorage, using default [1, 12].');
            setUniquePerkPeriods([1, 12]); // Default if empty or invalid
          }
        } else {
          console.log('[Dashboard] No unique perk periods found in AsyncStorage, using default [1, 12].');
          setUniquePerkPeriods([1, 12]); // Default if not found
        }
      } catch (e) {
        console.error("[Dashboard] Failed to load data from AsyncStorage.", e);
        setUniquePerkPeriods([1, 12]); // Default on error
      }
    };
    loadAsyncData();
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
  const handleActionHintPress = (perkToActivate: (CardPerk & { cardId: string; cardName: string; daysRemaining: number }) | null) => {
    if (perkToActivate) {
      setActiveCardId(perkToActivate.cardId);
      console.log('ActionHintPill tapped, setting active card:', perkToActivate.cardId, 'for perk:', perkToActivate.name);
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
      
      const refreshData = async () => {
        try {
          console.log('[Dashboard] Focus effect - refreshing user cards, savings, and async storage data');
          // Load unique periods again on focus in case they changed via 02-cards and came back
          const storedPeriods = await AsyncStorage.getItem(UNIQUE_PERK_PERIODS_STORAGE_KEY);
          if (storedPeriods !== null) {
            const parsedPeriods = JSON.parse(storedPeriods);
            if (Array.isArray(parsedPeriods) && parsedPeriods.length > 0) {
              setUniquePerkPeriods(parsedPeriods);
            } else {
              setUniquePerkPeriods([1, 12]); 
            }
          } else {
            setUniquePerkPeriods([1, 12]);
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
        console.log('[Dashboard] Optimistic update: setting perk', selectedPerk.id, 'to redeemed for card', selectedCardIdForModal);
        setPerkStatus(selectedCardIdForModal, selectedPerk.id, 'redeemed');
        
        // Background database operation
        const { error } = await trackPerkRedemption(user.id, selectedCardIdForModal, selectedPerk, selectedPerk.value);
        
        if (error) {
          console.error('Error tracking redemption in DB:', error);
          // Revert optimistic update on error
          console.log('[Dashboard] DB error, reverting perk', selectedPerk.id, 'to original status:', originalStatus, 'for card', selectedCardIdForModal);
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
        console.log('[Dashboard] DB trackPerkRedemption successful for', selectedPerk.id);
        handlePerkStatusChange(); 
        
        showToast(
          `${selectedPerk.name} marked as redeemed`,
          async () => {
            console.log('[Dashboard] Undo initiated for perk:', selectedPerk.id);
            setPerkStatus(selectedCardIdForModal, selectedPerk.id, 'available');
            try {
              const { error: undoError } = await deletePerkRedemption(user.id, selectedPerk.definition_id);
              if (undoError) {
                console.error('Error undoing redemption in DB:', undoError);
                setPerkStatus(selectedCardIdForModal, selectedPerk.id, 'redeemed'); 
                handlePerkStatusChange(); 
                showToast('Error undoing redemption');
              } else {
                console.log('[Dashboard] DB deletePerkRedemption successful for undo of', selectedPerk.id);
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
        console.log(`[Dashboard] Opened app for already redeemed perk: ${selectedPerk.name}`);
        // Optionally, show a toast, e.g.,
        // showToast(`${getAppName(perkToOpenAppFor)} opened.`); // getAppName would need to be accessible or simplified
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

    const originalStatus = selectedPerk.status; // Store original status

    // Close modal first
    handleModalDismiss();

    // Trigger haptic feedback immediately
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    // Optimistic update: immediately update global UI state
    console.log('[Dashboard] Optimistic update: setting perk', selectedPerk.id, 'to redeemed for card', selectedCardIdForModal);
    setPerkStatus(selectedCardIdForModal, selectedPerk.id, 'redeemed');
    // No immediate refresh here, wait for DB confirmation or failure

    try {
      // Background database operation
      const { error } = await trackPerkRedemption(user.id, selectedCardIdForModal, selectedPerk, selectedPerk.value);
      
      if (error) {
        console.error('Error tracking redemption in DB:', error);
        // Revert optimistic update on error
        console.log('[Dashboard] DB error, reverting perk', selectedPerk.id, 'to original status:', originalStatus, 'for card', selectedCardIdForModal);
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
      console.log('[Dashboard] DB trackPerkRedemption successful for', selectedPerk.id);
      handlePerkStatusChange(); // Refresh UI with new state
      showToast(`${selectedPerk.name} marked as redeemed.`); // Simple toast, no undo here
      
    } catch (dbError) {
      // Catch any unexpected errors from trackPerkRedemption or subsequent logic
      console.error('Unexpected error marking perk as redeemed:', dbError);
      // Revert optimistic update on error  
      console.log('[Dashboard] Catch block, reverting perk', selectedPerk.id, 'to original status:', originalStatus, 'for card', selectedCardIdForModal);
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

    // Trigger haptic feedback
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    // Optimistic update: set perk to 'available'
    console.log('[Dashboard] Optimistic update: setting perk', selectedPerk.id, 'to available for card', selectedCardIdForModal);
    setPerkStatus(selectedCardIdForModal, selectedPerk.id, 'available');

    try {
      // Background database operation to delete the redemption
      const { error } = await deletePerkRedemption(user.id, selectedPerk.definition_id);

      if (error) {
        console.error('Error deleting redemption in DB:', error);
        // Revert optimistic update on error
        console.log('[Dashboard] DB error, reverting perk', selectedPerk.id, 'to original status:', originalStatus, 'for card', selectedCardIdForModal);
        setPerkStatus(selectedCardIdForModal, selectedPerk.id, originalStatus);
        handlePerkStatusChange(); // Refresh UI with reverted state
        Alert.alert('Error', 'Failed to mark perk as available in the database.');
        return;
      }

      // DB operation successful
      console.log('[Dashboard] DB deletePerkRedemption successful for', selectedPerk.id);
      handlePerkStatusChange(); // Refresh UI with new 'available' state
      showToast(`${selectedPerk.name} marked as available.`);

    } catch (dbError) {
      console.error('Unexpected error marking perk as available:', dbError);
      // Revert optimistic update on error
      console.log('[Dashboard] Catch block, reverting perk', selectedPerk.id, 'to original status:', originalStatus, 'for card', selectedCardIdForModal);
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

  // Log for debugging, ensure it's called when sortedCards is defined
  if (!isLoading) {
    console.log('[Dashboard] Data for StackedCardDisplay (length):', sortedCards.length);
    // The more detailed log can be added here if needed, once stable
    // console.log('[Dashboard] Data for StackedCardDisplay (full):', sortedCards.map(c => ({ cardName: c.card.name, cardId: c.card.id, isActiveInSort: c.card.id === activeCardId, perks: c.perks.map(p => ({ name: p.name, id: p.id, status: p.status, periodMonths: p.periodMonths })) })));
  }

  // Enhanced loading state check
  const isOverallLoading = isLoading || isCalculatingSavings;

  if (userCardsError) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>Error loading cards. Please try again.</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Consolidated loading view
  if (isOverallLoading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.light.tint} />
          {isLoading && <Text style={styles.loadingText}>Loading card data...</Text>}
          {isCalculatingSavings && <Text style={styles.loadingText}>Calculating perk savings...</Text>}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
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
              <Text style={styles.userNameText}>{userName}</Text>
            </View>
            {/* Account button is also part of expanded view for consistent positioning before collapse */}
            <View style={styles.headerAccountButtonWrapper}>
                <AccountButton />
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
              <Text style={styles.collapsedHeaderText}>{collapsedHeaderText}</Text>
            </View>
            <View style={styles.headerAccountButtonWrapper}> 
              <AccountButton />
            </View>
          </Animated.View>
        </Animated.View>

        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.scrollContent} // This will have paddingTop
          scrollEventThrottle={16}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: false }
          )}
          showsVerticalScrollIndicator={false}
        >
          {/* NO Spacer View needed here if scrollContent has paddingTop */}
          
          {/* Render a single ActionHintPill for the most relevant perk */}
          {nextActionablePerkToHighlight && (
            <ActionHintPill 
              key={`action-hint-${nextActionablePerkToHighlight.id}`}
              perk={nextActionablePerkToHighlight} // Pass the full augmented perk object
              daysRemaining={nextActionablePerkToHighlight.daysRemaining}
              onPress={() => handleActionHintPress(nextActionablePerkToHighlight)}
            />
          )}

          {/* Summary Section with Donut Chart */}
          <View style={[styles.summarySection, { paddingTop: 0 }]}>
            <PerkDonutDisplayManager
              ref={donutDisplayRef}
              userCardsWithPerks={userCardsWithPerks}
              periodAggregates={periodAggregates}
              redeemedInCurrentCycle={redeemedInCurrentCycle}
              uniquePerkPeriods={uniquePerkPeriods}
            />
          </View>

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
                setPerkStatus={setPerkStatus}
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
          onMarkAvailable={handleMarkAvailable}
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
  animatedHeaderContainer: {
    backgroundColor: '#FFFFFF',
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
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
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
    justifyContent: 'space-between',
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
    // alignItems: 'center', // If you want text centered within this flex:1 container
    // justifyContent: 'center',
  },
  collapsedHeaderText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1c1c1e',
    textAlign: 'center', // Center text if container is flex:1
  },
  // Wrapper for AccountButton to be used in both expanded and collapsed states if needed for layout
  headerAccountButtonWrapper: {
    // Styles for positioning or sizing the button wrapper if needed
    // e.g., to ensure it aligns correctly with flexbox
    // width: 40, // If AccountButton needs explicit sizing for layout
    // height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: INITIAL_HEADER_HEIGHT, // Content starts below the absolute positioned header
    paddingBottom: 80, // Added padding for the tab navigation menu
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