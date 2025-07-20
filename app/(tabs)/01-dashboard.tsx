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
  AppState,
  AppStateStatus,
  RefreshControl,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import LottieView from 'lottie-react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import Toast from 'react-native-root-toast';
import * as Haptics from 'expo-haptics';
import { Colors } from '../../constants/Colors';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import PerkDonutDisplayManager from '../../components/home/PerkDonutDisplayManager';
import ExpandableCard from '../../components/home/ExpandableCard';
import PerkInfoSheet from '../../components/home/PerkInfoSheet';
import PerkLoggingModal from '../../components/home/PerkLoggingModal';
import WelcomeBackSnackbar from '../../components/home/WelcomeBackSnackbar';
import { useUserCards } from '../../hooks/useUserCards';
import { usePerkStatus } from '../../hooks/usePerkStatus';
import { useAutoRedemptions } from '../../hooks/useAutoRedemptions';
import { usePerkRedemption } from '../../hooks/usePerkRedemption';
import { format, differenceInDays, endOfMonth, endOfYear, addMonths, getMonth, getYear } from 'date-fns';
import { Card, CardPerk, openPerkTarget } from '../../src/data/card-data';
import { trackPerkRedemption, deletePerkRedemption, setAutoRedemption, checkAutoRedemptionByCardId } from '../../lib/database';
import ActionHintPill from '../../components/home/ActionHintPill';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BlurView } from 'expo-blur';
import { useOnboardingContext } from '../(onboarding)/_context/OnboardingContext';
import AIChatButton from '../../components/home/AIChatButton';
import { useSharedValue, useAnimatedScrollHandler, runOnJS } from 'react-native-reanimated';
import UserCardItem from '../../components/home/UserCardItem';
import { schedulePerkExpiryNotifications } from '../../services/notification-perk-expiry';
import UsernameRequirementModal from '../../components/profile/UsernameRequirementModal';

// Import notification functions
import {
  getNotificationPermissions,
  scheduleCardRenewalReminder,
  cancelNotification,
} from '../../utils/notifications';
import { NotificationPreferences } from '../../types/notification-types';

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
const CHAT_NOTIFICATION_KEY = '@ai_chat_notification_active';

const showToast = (message: string, onUndo?: (() => void) | null) => {
  // Only append "Tap to undo" if there's an actual undo function
  const toastMessage = onUndo ? `${message}\nTap to undo` : message;
  const toast = Toast.show(toastMessage, {
    duration: onUndo ? 4000 : 2000,
    position: Toast.positions.BOTTOM,
    shadow: true,
    animation: true,
    hideOnPress: true,
    delay: 0,
    opacity: 1,
    containerStyle: { 
      borderRadius: 12, 
      paddingHorizontal: 16, 
      paddingVertical: 12, 
      marginBottom: Platform.OS === 'ios' ? 64 : 48, 
      backgroundColor: '#1c1c1e',
      width: '90%',
      maxWidth: 400,
      alignSelf: 'center',
    },
    textStyle: { 
      fontSize: 14, 
      fontWeight: '500', 
      textAlign: 'center', 
      lineHeight: 20,
      color: '#FFFFFF',
    },
    onShow: () => {
      console.log('Toast shown:', toastMessage);
    },
    onHidden: () => {
      console.log('Toast hidden:', toastMessage);
    },
    onPress: () => { 
      if (onUndo) { 
        Toast.hide(toast);
        onUndo(); 
      }
    },
  });
  
  return toast;
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
const EXPANDED_HEADER_CONTENT_HEIGHT = 60; // Increased height for better visual balance
const COLLAPSED_HEADER_CONTENT_HEIGHT = 20;
const HEADER_SCROLL_DISTANCE = EXPANDED_HEADER_CONTENT_HEIGHT - COLLAPSED_HEADER_CONTENT_HEIGHT;

// Constants for FlatList card rendering & expansion
const ESTIMATED_COLLAPSED_CARD_HEIGHT = 109; // Updated from 96, based on Amex Gold (larger) collapsed height
const ESTIMATED_EXPANDED_CARD_HEIGHT = 555; // Updated from 316, based on Amex Gold (max observed) expanded height

// Define the type for a single item in the cards list - MOVED HERE and defined explicitly
interface CardListItem {
  card: Card;
  perks: CardPerk[];
  cumulativeSavedValue: number;
  onTapPerk: (cardId: string, perkId: string, perk: CardPerk) => Promise<void>;
  onExpandChange: (cardId: string, isExpanded: boolean, index: number) => void;
  onPerkStatusChange: () => void;
  setPerkStatus: (cardId: string, perkId: string, status: 'available' | 'redeemed' | 'partially_redeemed', remainingValue?: number) => void;
  isActive: boolean;
  sortIndex: number;
  userHasSeenSwipeHint: boolean;
  onHintDismissed: () => Promise<void>;
  setPendingToast: (toast: { message: string; onUndo?: (() => void) | null } | null) => void;
  renewalDate?: Date | null;
  onRenewalDatePress?: () => void;
  onOpenLoggingModal: (perk: CardPerk) => void;
}

// Add default notification preferences
const defaultNotificationPreferences: NotificationPreferences = {
  perkExpiryRemindersEnabled: true,
  renewalRemindersEnabled: true,
  perkResetConfirmationEnabled: true,
  weeklyDigestEnabled: true,
  firstOfMonthRemindersEnabled: true,
  monthlyPerkExpiryReminderDays: [7, 3, 1],
  perkExpiryReminderTime: '09:00',
  renewalReminderDays: [7],
  quarterlyPerkRemindersEnabled: true,
  semiAnnualPerkRemindersEnabled: true,
  annualPerkRemindersEnabled: true
};

// Add constant for tab bar offset
const TAB_BAR_OFFSET = Platform.OS === 'ios' ? 120 : 80; // Increased to account for home indicator

export default function Dashboard() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ selectedCardIds?: string; renewalDates?: string; refresh?: string }>();
  const { user } = useAuth();
  const { userCardsWithPerks, isLoading: isUserCardsInitialLoading, refreshUserCards } = useUserCards();
  const donutDisplayRef = useRef<{ refresh: () => void }>(null);
  const flatListRef = useRef<FlatList<CardListItem>>(null);
  const scrollY = useRef(new Animated.Value(0)).current;
  const lastScrollY = useRef(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showDevDatePicker, setShowDevDatePicker] = useState(false);
  const [userHasSeenSwipeHint, setUserHasSeenSwipeHint] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [selectedPerk, setSelectedPerk] = useState<CardPerk | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [showInfoSheet, setShowInfoSheet] = useState(false);
  const [showLoggingModal, setShowLoggingModal] = useState(false);
  const [loggingPerk, setLoggingPerk] = useState<CardPerk | null>(null);
  const [showWelcomeBackSnackbar, setShowWelcomeBackSnackbar] = useState(false);
  const [welcomeBackPerk, setWelcomeBackPerk] = useState<CardPerk | null>(null);
  const [retryAttempt, setRetryAttempt] = useState(0);
  const maxRetries = 5; // Maximum number of retry attempts
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [showUsernameModal, setShowUsernameModal] = useState(false);

  // Move all useEffects to the top level, right after state declarations
  useEffect(() => {
    // Load async data on mount
    const loadInitialData = async () => {
      try {
        const hintSeen = await AsyncStorage.getItem(SWIPE_HINT_STORAGE_KEY);
        setUserHasSeenSwipeHint(hintSeen === 'true');
      } catch (error) {
        console.error('Error loading swipe hint status:', error);
      }
    };
    loadInitialData();
  }, []);

  useEffect(() => {
    if (refreshUserCards) {
      refreshUserCards();
    }
  }, [refreshUserCards]);

  // State for pending toast notification after returning from another app
  const [pendingToast, setPendingToast] = useState<{ message: string; onUndo?: (() => void) | null } | null>(null);
  const appState = useRef(AppState.currentState);

  // State for DEV date picker
  const [showDatePickerForDev, setShowDatePickerForDev] = useState(false);
  const [devSelectedDate, setDevSelectedDate] = useState<Date>(new Date());

  // Modal state for perk action (removed - now using separate states for info sheet and logging modal)
  const [listHeaderHeight, setListHeaderHeight] = useState(0);
  const [showAiChatNotification, setShowAiChatNotification] = useState(false);
  const [isUpdatingPerk, setIsUpdatingPerk] = useState(false);

  // State for unique perk periods, default to monthly and annual if not found
  const [uniquePerkPeriodsForToggle, setUniquePerkPeriodsForToggle] = useState<number[]>([]); // Renamed for clarity

  // State for the ActionHintPill content, derived from nextActionablePerkToHighlight
  const [headerPillContent, setHeaderPillContent] = useState<(CardPerk & { cardId: string; cardName: string; cycleEndDate: Date; daysRemaining: number }) | null>(null);

  // Use custom hooks
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
  
  // Initialize perk redemption hook (will set onPerkStatusChange later)
  const { handleMarkRedeemed: perkRedemptionMarkRedeemed, handleMarkAvailable: perkRedemptionMarkAvailable } = usePerkRedemption({
    userId: user?.id || '',
    setPerkStatus,
    onPerkStatusChange: () => {}, // Will be set properly in a later refactor
    refreshAutoRedemptions,
  });
  const { hasRedeemedFirstPerk, markFirstPerkRedeemed } = useOnboardingContext();

  const checkNotificationStatus = async () => {
    const chatNotificationStatus = await AsyncStorage.getItem(CHAT_NOTIFICATION_KEY);
    setShowAiChatNotification(chatNotificationStatus === 'true');
  };

  const handleOpenAiChat = useCallback(async () => {
    if (showAiChatNotification) {
      setShowAiChatNotification(false);
      await AsyncStorage.removeItem(CHAT_NOTIFICATION_KEY);
    }
  }, [showAiChatNotification]);

  // Initial log after hooks have run
  // console.log("DEBUG: Dashboard component - AFTER hooks. isUserCardsInitialLoading:", isUserCardsInitialLoading, "isUserCardsRefreshing:", isRefreshing, "isCalculatingSavings:", isCalculatingSavings, "userCardsWithPerks count:", userCardsWithPerks?.length);

  const daysRemaining = useMemo(() => getDaysRemainingInMonth(), []);
  const statusColors = useMemo(() => getStatusColor(daysRemaining), [daysRemaining]);

  // --- Derived Heights ---
  const totalHeaderHeight = EXPANDED_HEADER_CONTENT_HEIGHT + insets.top;
  const scrollViewPaddingTop = totalHeaderHeight;

  // Dynamic text for collapsed header
  const currentMonthName = useMemo(() => format(new Date(), 'MMMM'), []);
  const collapsedHeaderText = `${currentMonthName} Summary`;
  const userName = useMemo(() => {
    const fullName = user?.user_metadata?.full_name;
    if (fullName && fullName.trim().length > 0) {
      const first = fullName.trim().split(' ')[0];
      return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
    }
    const emailPrefix = user?.email?.split('@')[0] || 'User';
    return emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1).toLowerCase();
  }, [user]);

  // Dynamic greeting based on time of day and random easter eggs
  const welcomeText = useMemo(() => {
    const hour = new Date().getHours();
    const greetings = [
      'Welcome back,',
      'Ready to save more?',
      'Let\'s maximize those perks!',
      'Time to earn some rewards!',
      'Stack those points!',
      'Cashback mode: ON',
      'Perk up your day!',
      'Let\'s crush those annual fees!',
      'Your wallet says thanks!',
      'Another day, another bonus!',
      'Swipe right on savings!',
      'You\'re the MVP of rewards!',
      'Let\'s make your cards work for you!',
      'Savings never sleep!',
      'Keep calm and redeem on!',
      'Rewards radar activated!',
      'Let\'s squeeze every cent!',
      'Your perks are waiting!',
      'Unlock extra value today!',
      'Savings squad assemble!',
      'Time to flex those benefits!',
      'Card magic in progress!',
      'Optimize, redeem, repeat!',
      'More perks, less hassle!',
      'Victory lap for your wallet!',
      'Rewards radar activated!',
      'Let\'s squeeze every cent!',
      'Your perks are waiting!'
    ];
    // 20% chance to show a fun greeting
    if (Math.random() < 0.2) {
      return greetings[Math.floor(Math.random() * greetings.length)];
    }
    if (hour < 5) return 'Late night hustle?';
    if (hour < 12) return 'Good morning,';
    if (hour < 17) return 'Good afternoon,';
    if (hour < 22) return 'Good evening,';
    return 'Late night savings?';
  }, []);

  // Animated values for header styles
  const expandedContentOpacity = scrollY.interpolate({
    inputRange: [0, HEADER_SCROLL_DISTANCE / 2],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const expandedContentTranslateY = scrollY.interpolate({
    inputRange: [0, HEADER_SCROLL_DISTANCE],
    outputRange: [0, -10],
    extrapolate: 'clamp',
  });

  const collapsedContentOpacity = scrollY.interpolate({
    inputRange: [HEADER_SCROLL_DISTANCE / 2, HEADER_SCROLL_DISTANCE],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const headerHeight = scrollY.interpolate({
    inputRange: [0, HEADER_SCROLL_DISTANCE],
    outputRange: [totalHeaderHeight, COLLAPSED_HEADER_CONTENT_HEIGHT + insets.top],
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
  // hiding headerpill for now 
  useEffect(() => {
    // setHeaderPillContent(nextActionablePerkToHighlight);
  }, [nextActionablePerkToHighlight]);

  // Effect for handling app state changes to show deferred toasts
  useEffect(() => {
    let isSubscribed = true;
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (!isSubscribed) return;
      
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        // App has come to the foreground
        if (pendingToast) {
          // Add a small delay to ensure the toast shows after the app is fully active
          setTimeout(() => {
            if (pendingToast) {
              showToast(pendingToast.message, pendingToast.onUndo);
              setPendingToast(null); // Clear after showing
            }
          }, 500);
        }
      }
      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      isSubscribed = false;
      subscription.remove();
    };
  }, [pendingToast]);

  // Load unique perk periods from AsyncStorage
  useEffect(() => {
    let isSubscribed = true;
    const loadAsyncData = async () => {
      try {
        const storedPeriods = await AsyncStorage.getItem(UNIQUE_PERK_PERIODS_STORAGE_KEY);
        if (!isSubscribed) return;
        
        // console.log('[Dashboard] Loading unique perk periods from AsyncStorage:', storedPeriods);
        if (storedPeriods !== null) {
          const parsedPeriods = JSON.parse(storedPeriods);
          // console.log('[Dashboard] Parsed unique perk periods:', parsedPeriods);
          if (Array.isArray(parsedPeriods) && parsedPeriods.length > 0) {
            // console.log('[Dashboard] Setting unique periods to:', parsedPeriods);
            setUniquePerkPeriodsForToggle(parsedPeriods);
          } else {
            // console.log('[Dashboard] Invalid periods array, setting to empty array');
            setUniquePerkPeriodsForToggle([]); // Default if empty or invalid
          }
        } else {
          // console.log('[Dashboard] No stored periods found, setting to empty array');
          setUniquePerkPeriodsForToggle([]); // Default if not found
        }

        await checkNotificationStatus();
      } catch (e) {
        console.error("[Dashboard] Failed to load data from AsyncStorage.", e);
        if (isSubscribed) {
          setUniquePerkPeriodsForToggle([]); // Default on error
        }
      }
    };
    loadAsyncData();

    return () => {
      isSubscribed = false;
    };
  }, []);

  // Add effect to log when uniquePerkPeriodsForToggle changes
  useEffect(() => {
    // console.log('[Dashboard] uniquePerkPeriodsForToggle updated:', uniquePerkPeriodsForToggle);
  }, [uniquePerkPeriodsForToggle]);

  // Update unique perk periods when userCardsWithPerks changes
  useEffect(() => {
    if (userCardsWithPerks && userCardsWithPerks.length > 0) {
      const periods = new Set<number>();
      userCardsWithPerks.forEach(cardData => {
        cardData.perks.forEach(perk => {
          if (perk.periodMonths) {
            periods.add(perk.periodMonths);
            // console.log(`[Dashboard] Found period ${perk.periodMonths} from perk ${perk.name} in card ${cardData.card.name}`);
          }
        });
      });

      const sortedPeriods = Array.from(periods).sort((a, b) => a - b);
      // console.log('[Dashboard] Current periods from userCardsWithPerks:', sortedPeriods);
      
      if (sortedPeriods.length > 0) {
        // Update the state to re-render the component with the correct periods
        setUniquePerkPeriodsForToggle(sortedPeriods);
        
        // Save to AsyncStorage so it's available on next load
        const savePeriods = async () => {
          try {
            await AsyncStorage.setItem(UNIQUE_PERK_PERIODS_STORAGE_KEY, JSON.stringify(sortedPeriods));
            // console.log('[Dashboard] Saved unique perk periods to AsyncStorage:', sortedPeriods);
          } catch (e) {
            console.error("[Dashboard] Failed to save unique perk periods to AsyncStorage:", e);
          }
        };
        savePeriods();
        // Move the scheduling call here to ensure it uses the updated periods
        setupNotifications(sortedPeriods);
      } else {
        // If there are no periods, still run setup to handle card renewal notifications
        setupNotifications([]);
      }
    }
  }, [userCardsWithPerks]);

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
      setSelectedCardId(perkToActivate.cardId);
      setShowInfoSheet(true);
    }
  }, [setSelectedPerk, setSelectedCardId, setShowInfoSheet]);

  // Refresh data when navigating back to dashboard
  useFocusEffect(
    useCallback(() => {
      const refreshData = async () => {
        try {
          // Load stored periods first
          const storedPeriods = await AsyncStorage.getItem(UNIQUE_PERK_PERIODS_STORAGE_KEY);
          let periodsToSchedule: number[] = [];
          if (storedPeriods !== null) {
            const parsedPeriods = JSON.parse(storedPeriods);
            if (Array.isArray(parsedPeriods) && parsedPeriods.length > 0) {
              periodsToSchedule = parsedPeriods;
              setUniquePerkPeriodsForToggle(parsedPeriods);
            } else {
              setUniquePerkPeriodsForToggle([]); 
            }
          } else {
            setUniquePerkPeriodsForToggle([]);
          }

          await checkNotificationStatus();

          // Force a complete refresh of user cards
          if (refreshUserCards) {
            await refreshUserCards();
            // Add a small delay to ensure the cards are loaded before refreshing other data
            await new Promise(resolve => setTimeout(resolve, 100));
          }
          
          // Refresh other data
          await refreshSavings();
          await refreshAutoRedemptions();
          
          // Refresh the donut display
          if (donutDisplayRef.current?.refresh) {
            donutDisplayRef.current.refresh();
          }
        } catch (error) {
          console.warn('[Dashboard] Focus effect refresh failed:', error);
        }
      };
      
      refreshData();
    }, [refreshUserCards, refreshSavings, refreshAutoRedemptions])
  );

  // Effect to refresh data when params.refresh changes (e.g., after saving cards)
  useEffect(() => {
    if (params.refresh) {
      refreshUserCards();
    }
  }, [params.refresh, refreshUserCards]);

  const NOTIFICATION_PREFS_KEY = '@notification_preferences';

  // Function to set up notifications
  const setupNotifications = async (periodsToSchedule: number[]) => {
    const hasPermission = await getNotificationPermissions();
    if (!hasPermission) {
      Alert.alert(
        "Permissions Required",
        "Please enable notifications in settings to receive reminders.",
      );
      return;
    }

    // Load preferences with default values
    let prefs: NotificationPreferences = { ...defaultNotificationPreferences };
    try {
      const jsonValue = await AsyncStorage.getItem(NOTIFICATION_PREFS_KEY);
      if (jsonValue != null) {
        prefs = { ...defaultNotificationPreferences, ...JSON.parse(jsonValue) };
      }
    } catch (e) {
      console.error("[Dashboard] Failed to load notification prefs for scheduling.", e);
    }

    await cancelNotification();
    
    // Schedule notifications for each unique perk period the user has
    if (user?.id) {
      // console.log(`[Dashboard] Scheduling perk expiry notifications for periods: ${periodsToSchedule.join(', ')}`);
      for (const period of periodsToSchedule) {
        await schedulePerkExpiryNotifications(user.id, prefs, period);
      }
    }

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
          { text: "Log In", onPress: () => router.push("/") },
          { text: "Cancel", style: "cancel" },
        ]
      );
      return;
    }

    // Show the Information Sheet instead of the old modal
    setSelectedPerk(perk);
    setSelectedCardId(cardId);
    setShowInfoSheet(true);
  }, [user, router]);

  const handleInfoSheetDismiss = () => {
    setShowInfoSheet(false);
    setSelectedPerk(null);
    setSelectedCardId(null);
  };

  const handleLoggingModalDismiss = () => {
    setShowLoggingModal(false);
    setLoggingPerk(null);
  };

  const handleOpenLoggingModal = useCallback((perk: CardPerk) => {
    setLoggingPerk(perk);
    setShowLoggingModal(true);
  }, []);

  const handleWelcomeBackDismiss = () => {
    setShowWelcomeBackSnackbar(false);
    setWelcomeBackPerk(null);
  };

  const handleSaveLog = useCallback(async (amount: number) => {
    if (!loggingPerk || !user) return;

    setIsUpdatingPerk(true);
    handleLoggingModalDismiss();

    try {
      // Find the card ID for this perk
      const cardWithPerk = userCardsWithPerks.find(card => 
        card.perks.some(p => p.id === loggingPerk.id)
      );
      
      if (!cardWithPerk) {
        Alert.alert('Error', 'Could not find card for this perk.');
        setIsUpdatingPerk(false);
        return;
      }

      // Use the perk redemption hook
      await perkRedemptionMarkRedeemed(cardWithPerk.card.id, loggingPerk, amount);
      
    } catch (error) {
      console.error('Error saving log:', error);
      Alert.alert('Error', 'Failed to save usage log.');
    } finally {
      setIsUpdatingPerk(false);
    }
  }, [loggingPerk, user, userCardsWithPerks, perkRedemptionMarkRedeemed]);

  const handleOpenApp = async (targetPerkName?: string) => {
    if (!selectedPerk || !selectedCardId || !user) return;

    const perkToOpenAppFor = targetPerkName
      ? { ...selectedPerk, name: targetPerkName }
      : selectedPerk;

    // Store perk info for when user returns
    const perkInfo = {
      perkId: selectedPerk.id,
      cardId: selectedCardId,
      status: selectedPerk.status,
      name: selectedPerk.name,
      value: selectedPerk.value,
      remaining_value: selectedPerk.remaining_value
    };

    // Close info sheet first
    handleInfoSheetDismiss();

    // Only show welcome back for available or partially redeemed perks
    if (selectedPerk.status === 'available' || selectedPerk.status === 'partially_redeemed') {
      console.log('🎯 Setting up AppState listener for perk:', perkInfo.name, 'Current AppState:', appState.current);
      
      let hasShownWelcomeBack = false;
      let wasInBackground = false;

      // Set up a one-time AppState change listener
      const handleAppStateChange = (nextAppState: AppStateStatus) => {
        console.log('🔄 AppState changed:', { 
          current: appState.current, 
          next: nextAppState,
          perkName: perkInfo.name,
          hasShownWelcomeBack,
          wasInBackground 
        });

        // Track when app goes to background or inactive
        if (nextAppState === 'background' || nextAppState === 'inactive') {
          console.log('📱 App went to background/inactive, setting wasInBackground = true');
          wasInBackground = true;
          return;
        }

        // Show welcome back snackbar when coming back to active state
        if (nextAppState === 'active' && wasInBackground && !hasShownWelcomeBack) {
          console.log('🎉 Showing welcome back for:', perkInfo.name);
          hasShownWelcomeBack = true;
          
          // Remove the listener since we only want to handle the first return to the app
          subscription.remove();

          // Show welcome back snackbar
          setWelcomeBackPerk(selectedPerk);
          setShowWelcomeBackSnackbar(true);
        } else if (nextAppState === 'active' && wasInBackground && hasShownWelcomeBack) {
          console.log('🔄 App returned to active but welcome back already shown');
        } else if (nextAppState === 'active' && !wasInBackground) {
          console.log('🔄 App became active but was never in background');
        }
        appState.current = nextAppState;
      };

      const subscription = AppState.addEventListener('change', handleAppStateChange);
      console.log('✅ AppState listener registered successfully');
    }

    try {
      // Always attempt to open the app target
      console.log('🚀 About to open perk target:', perkToOpenAppFor.name);
      const openResult = await openPerkTarget(perkToOpenAppFor);
      console.log('📱 App opening result:', openResult);
      
      if (openResult.success && Platform.OS === 'ios') {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }

      // If we used a fallback (WebBrowser), show the snackbar immediately
      // since WebBrowser doesn't trigger AppState transitions
      if (openResult.success && openResult.usedFallback) {
        console.log('🌐 Used fallback URL, showing welcome back snackbar immediately');
        setWelcomeBackPerk(selectedPerk);
        setShowWelcomeBackSnackbar(true);
      }
    } catch (openErrorOrDbError) {
      console.error('Error in perk action flow:', openErrorOrDbError);
      handleInfoSheetDismiss();
      Alert.alert('Operation Failed', 'An error occurred while opening the app.');
    }
  };

  const handleMarkRedeemed = async (partialAmount?: number) => {
    if (!selectedPerk || !selectedCardId || !user) return;

    // --- Start loading state ---
    setIsUpdatingPerk(true);
    handleInfoSheetDismiss();

    try {
        const isPartiallyRedeemed = selectedPerk.status === 'partially_redeemed';
        const isPartialRedemption = partialAmount !== undefined && partialAmount < selectedPerk.value;
        const valueToRedeem = partialAmount ?? selectedPerk.value;

        // NOTE: We no longer call setPerkStatus() here.

        // If fully redeeming a partially redeemed perk, delete the old record first.
        if (isPartiallyRedeemed && !isPartialRedemption) {
            const { error: deleteError } = await deletePerkRedemption(user.id, selectedPerk.definition_id);
            if (deleteError) {
                throw new Error('Failed to delete prior partial redemption.');
            }
        }

        // --- Await the database operation ---
        const { error } = await trackPerkRedemption(
            user.id,
            selectedCardId,
            selectedPerk,
            valueToRedeem,
            selectedPerk.parent_redemption_id
        );

        if (error) {
            console.error('Error tracking redemption in DB:', error);
            Alert.alert('Error', 'Failed to save redemption.');
            setIsUpdatingPerk(false); // Turn off loading
            return;
        }

        // --- On success, refresh state from the authoritative source (the server) ---
        await refreshUserCards();
        await refreshAutoRedemptions();

        showToast(
            `${selectedPerk.name} ${isPartialRedemption ? 'partially' : ''} redeemed${isPartialRedemption ? ` ($${valueToRedeem})` : ''}.`
        );
        
        if (!hasRedeemedFirstPerk) {
            await markFirstPerkRedeemed();
            setShowAiChatNotification(true);
            await AsyncStorage.setItem(CHAT_NOTIFICATION_KEY, 'true');
        }

    } catch (err) {
        console.error('Unexpected error marking perk as redeemed:', err);
        Alert.alert('Error', 'An unexpected error occurred.');
    } finally {
        // --- End loading state ---
        setIsUpdatingPerk(false);
    }
};

  // New function to handle marking a perk as available
  const handleMarkAvailable = async () => {
    if (!selectedPerk || !selectedCardId || !user) return;

    // --- Start loading state ---
    setIsUpdatingPerk(true);
    handleInfoSheetDismiss();

    try {
        // NOTE: We no longer call setPerkStatus() here.

        // --- Await the database operation ---
        const { error } = await deletePerkRedemption(user.id, selectedPerk.definition_id);

        if (error) {
            console.error('Error deleting redemption in DB:', error);
            Alert.alert('Error', 'Failed to mark perk as available.');
            setIsUpdatingPerk(false); // Turn off loading
            return;
        }

        // --- On success, refresh state from the authoritative source (the server) ---
        await refreshUserCards();
        await refreshAutoRedemptions();

        showToast(`${selectedPerk.name} marked as available.`);

    } catch (err) {
        console.error('Unexpected error marking perk as available:', err);
        Alert.alert('Error', 'An unexpected error occurred.');
    } finally {
        // --- End loading state ---
        setIsUpdatingPerk(false);
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
    // console.log(`[Dashboard] handleCardExpandChange: cardId=${cardId}, isExpanded=${isExpanded}, index=${index}`);
    setActiveCardId(isExpanded ? cardId : null);

    if (isExpanded) {
      // We use a timeout to ensure the scroll happens *after* the card's expand animation (300ms) has finished.
      setTimeout(() => {
        flatListRef.current?.scrollToIndex({
          animated: true,
          index,
          viewPosition: 0.15 // Scrolls the item to the top of the list view
        });
      }, 100);
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
    return sortedCards;
  }, [sortedCards]);

  // Log for debugging, ensure it's called when sortedCards is defined
  if (!isUserCardsInitialLoading) {
  }

  // Add state for renewal dates from URL params
  const [renewalDates, setRenewalDates] = useState<Record<string, Date>>({});

  // Parse renewal dates from URL params
  useEffect(() => {
    if (params.renewalDates) {
      try {
        const dates = JSON.parse(params.renewalDates);
        const parsedDates: Record<string, Date> = {};
        Object.entries(dates).forEach(([cardId, dateStr]) => {
          if (typeof dateStr === 'string') {
            parsedDates[cardId] = new Date(dateStr);
          }
        });
        setRenewalDates(parsedDates);
      } catch (error) {
        console.error('Error parsing renewal dates:', error);
      }
    }
  }, [params.renewalDates]);

  // Add handler for renewal date press
  const handleRenewalDatePress = useCallback((cardId: string) => {
    router.push({
      pathname: "/(tabs)/profile/manage_cards",
      params: { highlightCardId: cardId }
    });
  }, [router]);

  // Map cards to CardListItems with all required properties
  const cardListItems: CardListItem[] = useMemo(() => cardsListData.map((cardData, index) => {
    console.log('[Dashboard] Mapping card to list item:', {
      cardName: cardData.card.name,
      cardRenewalDate: cardData.card.renewalDate,
      stateRenewalDate: renewalDates[cardData.card.id]
    });
    
    return {
      card: cardData.card,
      perks: cardData.perks,
      cumulativeSavedValue: cumulativeValueSavedPerCard[cardData.card.id] || 0,
      onTapPerk: handleTapPerk,
      onExpandChange: handleCardExpandChange,
      onPerkStatusChange: handlePerkStatusChange,
      setPerkStatus,
      isActive: activeCardId === cardData.card.id,
      sortIndex: index,
      userHasSeenSwipeHint,
      onHintDismissed: handleHintDismissed,
      setPendingToast,
      renewalDate: cardData.card.renewalDate,
      onRenewalDatePress: () => handleRenewalDatePress(cardData.card.id),
      onOpenLoggingModal: handleOpenLoggingModal
    };
  }), [
    cardsListData,
    cumulativeValueSavedPerCard,
    activeCardId,
    userHasSeenSwipeHint,
    handleHintDismissed,
    handleTapPerk,
    handleCardExpandChange,
    handlePerkStatusChange,
    setPerkStatus,
    setPendingToast,
    handleRenewalDatePress,
    handleOpenLoggingModal
  ]);

  // renderItem function for the FlatList
  const renderExpandableCardItem = ({ item, index }: { item: CardListItem, index: number }) => (
    <ExpandableCard
      key={item.card.id}
      card={item.card}
      perks={item.perks}
      cumulativeSavedValue={item.cumulativeSavedValue}
      onTapPerk={item.onTapPerk}
      onExpandChange={item.onExpandChange}
      onPerkStatusChange={item.onPerkStatusChange}
      setPerkStatus={item.setPerkStatus}
      isActive={item.isActive}
      sortIndex={index}
      userHasSeenSwipeHint={item.userHasSeenSwipeHint}
      onHintDismissed={item.onHintDismissed}
      setPendingToast={item.setPendingToast}
      renewalDate={item.renewalDate}
      onRenewalDatePress={item.onRenewalDatePress}
      onOpenLoggingModal={item.onOpenLoggingModal}
    />
  );

  // Create the ListHeaderElement using useMemo for stability
  const listHeaderElement = useMemo(() => {
    // console.log("DEBUG: Dashboard listHeaderElement useMemo. Pill content:", headerPillContent ? 'Exists' : 'null');
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
          <AIChatButton
            showNotification={showAiChatNotification}
            onOpen={handleOpenAiChat}
            onClose={checkNotificationStatus}
          />
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
    listHeaderHeight,
    showAiChatNotification,
    handleOpenAiChat
  ]);

  // Smart action logic for dashboard button - Top 0.1% experience
  const getDashboardAction = useMemo(() => {
    const cardCount = userCardsWithPerks.length;
    const totalSavings = Object.values(cumulativeValueSavedPerCard).reduce((sum, val) => sum + val, 0);
    
    // Priority 1: If they have 0-1 cards, focus on growth
    if (cardCount === 0) {
      return {
        label: "Add Your First Card",
        action: "ADD_CARDS" as const,
        icon: "add-circle-outline" as keyof typeof Ionicons.glyphMap,
        params: { mode: "quick-add", source: "dashboard", intent: "first-card" }
      };
    } else if (cardCount === 1) {
      return {
        label: "Add More Cards", 
        action: "ADD_CARDS" as const,
        icon: "add-outline" as keyof typeof Ionicons.glyphMap,
        params: { mode: "quick-add", source: "dashboard", intent: "expand-collection" }
      };
    }
    
    // Priority 2: If they have 2-4 cards, focus on optimization
    if (cardCount <= 4) {
      return {
        label: "Optimize Card Order",
        action: "REORDER" as const,
        icon: "trending-up-outline" as keyof typeof Ionicons.glyphMap,
        params: { 
          mode: "reorder-only", 
          source: "dashboard",
          currentOrder: userCardsWithPerks.map(c => c.card.id).join(','),
          totalSavings: totalSavings.toString()
        }
      };
    }
    
    // Priority 3: If they have 5+ cards, focus on management
    return {
      label: "Quick Card Settings",
      action: "QUICK_MANAGE" as const,
      icon: "options-outline" as keyof typeof Ionicons.glyphMap,
      params: { 
        mode: "dashboard-tools", 
        source: "dashboard",
        totalSavings: totalSavings.toString(),
        cardCount: cardCount.toString()
      }
    };
  }, [userCardsWithPerks.length, cumulativeValueSavedPerCard, userCardsWithPerks]);


  // Create the ListFooterElement using useMemo for stability
  const listFooterElement = useMemo(() => (
    <View style={styles.manageCardsContainer}>
      <TouchableOpacity
        style={styles.manageCardsFooter}
        onPress={handleDashboardAction}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={`${getDashboardAction.label} - ${getDashboardAction.action.replace('_', ' ').toLowerCase()}`}
        accessibilityHint={`Opens ${getDashboardAction.action.toLowerCase().replace('_', ' ')} interface`}
      >
        <Ionicons 
          name={getDashboardAction.icon} 
          size={18} 
          color="#FFFFFF" 
          style={{ marginRight: 8 }} 
        />
        <Text style={styles.manageCardsText}>{getDashboardAction.label}</Text>
      </TouchableOpacity>
    </View>
  ), [handleDashboardAction, getDashboardAction]);

  // Only show full-screen loader on the very first load of user cards.
  // Subsequent refreshes (isUserCardsRefreshing) or savings calculations (isCalculatingSavings)
  // will happen in the background without a full-screen loader.
  const coachMarkTopOffset = COLLAPSED_HEADER_CONTENT_HEIGHT + 250; // Position below the collapsed header and card header

  // Add useEffect for automatic retry
  useEffect(() => {
    let timeoutId: number;
    
    if (userCardsWithPerks.length === 0 && !isUserCardsInitialLoading && retryAttempt < maxRetries) {
      const retryDelay = Math.min(1000 * Math.pow(2, retryAttempt), 10000); // Exponential backoff, max 10 seconds
      
      timeoutId = window.setTimeout(() => {
        refreshUserCards();
        setRetryAttempt(prev => prev + 1);
      }, retryDelay);

      return () => {
        if (timeoutId) {
          window.clearTimeout(timeoutId);
        }
      };
    }
  }, [userCardsWithPerks.length, isUserCardsInitialLoading, retryAttempt, refreshUserCards]);

  // Check if user needs to set display name
  useEffect(() => {
    if (user && !isUserCardsInitialLoading) {
      const fullName = user?.user_metadata?.full_name;
      const emailPrefix = user?.email?.split('@')[0] || '';    
      // Show modal if no display name is set (empty or just whitespace)
      if (!fullName || fullName.trim().length === 0) {
        setShowUsernameModal(true);
      }
    }
  }, [user, isUserCardsInitialLoading]);

  const handleUsernameModalComplete = () => {
    setShowUsernameModal(false);
  };

  // Enhanced dashboard action handler with premium interactions
  const handleDashboardAction = useCallback(async () => {
    // Get action fresh each time to avoid stale closures
    const cardCount = userCardsWithPerks.length;
    const totalSavings = Object.values(cumulativeValueSavedPerCard).reduce((sum, val) => sum + val, 0);
    
    let action;
    if (cardCount === 0) {
      action = {
        label: "Add Your First Card",
        action: "ADD_CARDS" as const,
        icon: "add-circle-outline" as keyof typeof Ionicons.glyphMap,
        params: { mode: "quick-add", source: "dashboard", intent: "first-card" }
      };
    } else if (cardCount === 1) {
      action = {
        label: "Add More Cards", 
        action: "ADD_CARDS" as const,
        icon: "add-outline" as keyof typeof Ionicons.glyphMap,
        params: { mode: "quick-add", source: "dashboard", intent: "expand-collection" }
      };
    } else if (cardCount <= 4) {
      action = {
        label: "Optimize Card Order",
        action: "REORDER" as const,
        icon: "trending-up-outline" as keyof typeof Ionicons.glyphMap,
        params: { 
          mode: "reorder-only", 
          source: "dashboard",
          currentOrder: userCardsWithPerks.map(c => c.card.id).join(','),
          totalSavings: totalSavings.toString()
        }
      };
    } else {
      action = {
        label: "Quick Card Settings",
        action: "QUICK_MANAGE" as const,
        icon: "options-outline" as keyof typeof Ionicons.glyphMap,
        params: { 
          mode: "dashboard-tools", 
          source: "dashboard",
          totalSavings: totalSavings.toString(),
          cardCount: cardCount.toString()
        }
      };
    }
    
    try {
      // Premium haptic feedback based on action type
      if (action.action === 'ADD_CARDS') {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } else if (action.action === 'REORDER') {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } else {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      }

      // Smart routing with context
      router.push({
        pathname: '/(tabs)/profile/manage_cards',
        params: {
          ...action.params,
          backButton: 'Dashboard', // Custom back button text
          timestamp: Date.now().toString() // Force refresh if same params
        }
      });

    } catch (error) {
      console.error('[Dashboard] Error in dashboard action:', error);
      // Fallback to basic navigation
      router.push('/(tabs)/profile/manage_cards');
    }
  }, [userCardsWithPerks, cumulativeValueSavedPerCard, router]);

  if (isUserCardsInitialLoading || (userCardsWithPerks.length === 0 && retryAttempt < maxRetries)) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <LottieView
            source={require('../../assets/animations/credit_card_animation.json')}
            autoPlay
            loop
            style={styles.loadingAnimation}
            renderMode="HARDWARE"
            speed={0.7}
          />
          <Text style={styles.loadingText}>
            {isUserCardsInitialLoading ? 'Loading your card data...' : 'Syncing your cards...'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (userCardsWithPerks.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>No cards found</Text>
          <Text style={styles.errorSubText}>
            Get started by adding your first credit card to track rewards.
          </Text>
          <TouchableOpacity
            style={styles.errorAddCardButton}
            onPress={() => router.push('/(tabs)/profile/manage_cards')}
          >
            <Text style={styles.addCardButtonText}>Add Cards</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Log before returning the main JSX tree
  // console.log("DEBUG: Dashboard component - BEFORE MAIN RETURN. isUserCardsInitialLoading:", isUserCardsInitialLoading, "isUserCardsRefreshing:", isRefreshing, "isCalculatingSavings:", isCalculatingSavings, "sortedCards count:", sortedCards?.length);

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    {
      useNativeDriver: false,
      listener: (event: { nativeEvent: { contentOffset: { y: number } } }) => {
        lastScrollY.current = event.nativeEvent.contentOffset.y;
      }
    }
  );

  // Separate animation for height
  const animatedHeight = scrollY.interpolate({
    inputRange: [0, 70],
    outputRange: [70, 0],
    extrapolate: 'clamp'
  });

  return (
    <SafeAreaView style={styles.safeArea} edges={['right', 'left']}>
      <StatusBar 
        style="dark"
        backgroundColor="transparent"
        translucent={true}
      />
      <View style={styles.mainContainer}>
        {/* Animated Header */}
        <Animated.View
          style={[
            styles.animatedHeaderContainer,
            { height: headerHeight },
          ]}
        >
          <BlurView
            intensity={90}
            tint="light"
            style={StyleSheet.absoluteFill}
          />

          {/* Expanded Header Content (Greeting) */}
          <Animated.View
            style={[
              styles.headerContent,
              styles.expandedHeaderContent,
              {
                paddingTop: insets.top,
                opacity: expandedContentOpacity,
                transform: [{ translateY: expandedContentTranslateY }],
              },
            ]}
          >
            <View>
              <Text style={styles.welcomeText}>{welcomeText}</Text>
              <Text style={styles.userNameText}>{userName}</Text>
            </View>
          </Animated.View>

          {/* Collapsed Header Content (Summary Title) */}
          <Animated.View
            style={[
              styles.headerContent,
              styles.collapsedHeaderContent,
              { 
                paddingTop: insets.top / 1.3,
                opacity: collapsedContentOpacity 
              },
            ]}
          >
            <Text style={styles.collapsedHeaderText}>
              {collapsedHeaderText}
            </Text>
          </Animated.View>
        </Animated.View>

        {/* Main content area now uses FlatList */}
        {sortedCards.length > 0 ? (
          <Animated.FlatList
            ref={flatListRef}
            data={cardListItems}
            renderItem={renderExpandableCardItem}
            keyExtractor={(item) => item.card.id}
            ListHeaderComponent={listHeaderElement}
            ListFooterComponent={listFooterElement}
            contentContainerStyle={[
              styles.flatListContent,
              { paddingTop: scrollViewPaddingTop }
            ]}
            style={styles.flatListOverallStyle}
            showsVerticalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            extraData={activeCardId}
          />
        ) : (
          <ScrollView 
            contentContainerStyle={[
              styles.scrollContent,
              { paddingTop: scrollViewPaddingTop }
            ]}
            showsVerticalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
          >
            <View style={styles.noCardsContainer}>
              <Ionicons name="card-outline" size={48} color="#8e8e93" />
              <Text style={styles.noCardsText}>
                No cards selected. Add your first card to start tracking rewards!
              </Text>
              <TouchableOpacity
                style={styles.addFirstCardButton}
                onPress={() => router.push('/(tabs)/profile/manage_cards')}
              >
                <Text style={styles.addFirstCardButtonText}>Add Your First Card</Text>
              </TouchableOpacity>
            </View>
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

        {/* Perk Information Sheet */}
        <PerkInfoSheet
          visible={showInfoSheet}
          perk={selectedPerk}
          onDismiss={handleInfoSheetDismiss}
          onOpenApp={handleOpenApp}
        />

        {/* Perk Logging Modal */}
        <PerkLoggingModal
          visible={showLoggingModal}
          perk={loggingPerk}
          onDismiss={handleLoggingModalDismiss}
          onSaveLog={handleSaveLog}
        />

        {/* Welcome Back Snackbar */}
        <WelcomeBackSnackbar
          visible={showWelcomeBackSnackbar}
          perk={welcomeBackPerk}
          onLogUsage={() => {
            handleWelcomeBackDismiss();
            if (welcomeBackPerk) {
              handleOpenLoggingModal(welcomeBackPerk);
            }
          }}
          onDismiss={handleWelcomeBackDismiss}
        />


        {/* Loading overlay */}
        {isUpdatingPerk && (
          <View style={styles.updatingOverlay}>
            <ActivityIndicator size="large" color="#FFFFFF" />
          </View>
        )}

        {/* Username Requirement Modal */}
        <UsernameRequirementModal
          visible={showUsernameModal}
          onComplete={handleUsernameModalComplete}
          currentEmail={user?.email}
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
    backgroundColor: '#FAFAFE',
  },
  animatedHeaderContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    overflow: 'hidden',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(212,212,212,0.5)',
  },
  headerContent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
  },
  expandedHeaderContent: {
    justifyContent: 'center',
  },
  welcomeText: {
    fontSize: 16,
    color: '#3C3C43',
    fontWeight: '400',
    opacity: 0.8,
  },
  userNameText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1C1C1E',
    marginTop: 2,
  },
  collapsedHeaderContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  collapsedHeaderText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: EXPANDED_HEADER_CONTENT_HEIGHT,
    paddingBottom: TAB_BAR_OFFSET,
  },
  summarySection: {
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
    paddingHorizontal: 16,
    fontWeight: '600',
    color: '#1c1c1e',
  },
  headerAddCardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  headerAddCardText: {
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
    color: Colors.light.secondaryLabel,
    fontWeight: '500',
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1c1c1e',
    textAlign: 'center',
    marginBottom: 8,
  },
  errorSubText: {
    fontSize: 16,
    color: Colors.light.secondaryLabel,
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 32,
  },
  errorButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  retryButton: {
    backgroundColor: Colors.light.tint,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorAddCardButton: {
    backgroundColor: '#ffffff',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.light.tint,
  },
  addCardButtonText: {
    color: Colors.light.tint,
    fontSize: 16,
    fontWeight: '600',
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
  flatListOverallStyle: {
    flex: 1,
  },
  cardsSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 20,
    marginBottom: 18,
  },
  flatListContent: {
    flexGrow: 1,
    paddingBottom: TAB_BAR_OFFSET,
  },
  updatingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2000,
  },
  loadingAnimation: {
    width: 300,
    height: 300,
    marginBottom: -40,
  },
  manageCardsContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
  },
  manageCardsFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    backgroundColor: Colors.light.tint,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  manageCardsText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
} as const); 