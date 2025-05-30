import React, { useState, useEffect, useCallback } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Card, Benefit, allCards } from '../src/data/card-data'; // Assuming selected card IDs might be passed
import { openPerkTarget } from './utils/linking'; // Import the new utility
import UserCardItem from './components/home/UserCardItem';
import SummaryDashboard from './components/home/SummaryDashboard';
import LottieView from 'lottie-react-native'; // Import LottieView
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker'; // Import DateTimePicker
import { Colors } from '../constants/Colors'; // Reverted to uppercase filename in import
import { supabase } from '../lib/supabase';
import { getUserCards } from '../lib/database';
import { useAuth } from '../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import ProgressDonut from './components/home/ProgressDonut';
import ExpandableCard from './components/home/ExpandableCard';

// Import notification functions
import {
  requestPermissionsAsync,
  scheduleMonthlyPerkResetNotifications,
  scheduleCardRenewalReminder, // We'll use this later
  cancelAllScheduledNotificationsAsync
} from './utils/notifications';

// Define PerkStatus type
type PerkStatus = 'available' | 'pending' | 'redeemed';

// Define CardPerk interface based on todo.md and Benefit interface
export interface CardPerk extends Benefit {
  cardId: string;
  status: PerkStatus;
  streakCount: number; // Added for streak tracking
  coldStreakCount: number; // Added for cold streak tracking
}

// Updated to handle both URL params and database cards
const getSelectedUserCardsWithPerks = async (
  userId: string,
  selectedCardIdsString?: string,
): Promise<{ card: Card; perks: CardPerk[] }[]> => {
  let selectedIds: string[] = [];

  // If we have URL params (from card selection screen), use those
  if (selectedCardIdsString) {
    selectedIds = selectedCardIdsString.split(',');
  } else {
    // Otherwise fetch from database
    const { data: userCards, error } = await getUserCards(userId);
    if (error) {
      console.error('Error fetching user cards:', error);
      return [];
    }
    selectedIds = allCards
      .filter(card => userCards?.some(uc => uc.card_name === card.name))
      .map(card => card.id);
  }
  
  if (selectedIds.length === 0) {
    console.log('No cards found for user');
    return []; 
  }

  return allCards
    .filter(card => selectedIds.includes(card.id))
    .map(card => ({
      card,
      perks: card.benefits.map(benefit => ({
        ...benefit,
        cardId: card.id,
        status: 'available' as PerkStatus,
        streakCount: 0,
        coldStreakCount: 0,
      })),
    }));
};

export default function HomeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ selectedCardIds?: string; renewalDates?: string }>();

  const [userCardsWithPerks, setUserCardsWithPerks] = useState<
    { card: Card; perks: CardPerk[] }[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);

  // TODO: State for summary data
  const [monthlyCreditsPossible, setMonthlyCreditsPossible] = useState(0);
  const [monthlyCreditsRedeemed, setMonthlyCreditsRedeemed] = useState(0);
  const [yearlyCreditsPossible, setYearlyCreditsPossible] = useState(0);
  const [yearlyCreditsRedeemed, setYearlyCreditsRedeemed] = useState(0);
  // const [totalValueUsed, setTotalValueUsed] = useState(0); // We can perhaps derive this or keep it if it means something different

  // State for managing the current cycle for streaks/reset
  // Represents month and year, e.g., "2023-10" (October 2023)
  const [currentCycleIdentifier, setCurrentCycleIdentifier] = useState<string>(
    `${new Date().getFullYear()}-${new Date().getMonth()}`
  );
  // Stores which monthly perks have been redeemed *within the current cycle* to avoid double-counting streaks
  const [redeemedInCurrentCycle, setRedeemedInCurrentCycle] = useState<Record<string, boolean>>({});
  // New state to track cumulative value saved per card (for the session)
  const [cumulativeValueSavedPerCard, setCumulativeValueSavedPerCard] = useState<Record<string, number>>({});

  // State for celebration animation
  const [showCelebration, setShowCelebration] = useState(false);

  // State for DEV date picker
  const [showDatePickerForDev, setShowDatePickerForDev] = useState(false);
  const [devSelectedDate, setDevSelectedDate] = useState<Date>(new Date());

  const { user } = useAuth();

  useFocusEffect(
    useCallback(() => {
      StatusBar.setBarStyle('dark-content');
      if (Platform.OS === 'android') {
        StatusBar.setBackgroundColor('transparent');
        StatusBar.setTranslucent(true);
      }
      // Initial notification setup when screen comes into focus
      // Or you might prefer this in a top-level useEffect once on app load
      setupNotifications(); 
    }, [])
  );

  // Effect to load user cards
  useEffect(() => {
    const loadUserCards = async () => {
      try {
        setIsLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          console.error('No user found');
          router.replace('/(auth)/login');
          return;
        }

        const cards = await getSelectedUserCardsWithPerks(user.id, params.selectedCardIds);
        setUserCardsWithPerks(cards);
      } catch (error) {
        console.error('Error loading user cards:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadUserCards();
  }, [params.selectedCardIds, router]);

  // Effect to update summary credit data when userCardsWithPerks changes (e.g., after redemption)
  useEffect(() => {
    console.log("Calculating summary data because userCardsWithPerks changed");
    let mPossible = 0;
    let mRedeemed = 0;
    let yPossible = 0;
    let yRedeemed = 0;

    userCardsWithPerks.forEach(({ perks }) => { // Use userCardsWithPerks from state here
      perks.forEach(perk => {
        if (perk.period === 'monthly') {
          mPossible += perk.value;
          if (perk.status === 'redeemed') {
            mRedeemed += perk.value;
          }
        // Linter error fix: Assuming 'annually' covers 'yearly'. 
        // If card-data.ts uses 'yearly' ensure it's included or change this condition.
        } else if (perk.period === 'yearly') {
          yPossible += perk.value;
          if (perk.status === 'redeemed') {
            yRedeemed += perk.value;
          }
        }
      });
    });

    setMonthlyCreditsPossible(mPossible);
    setMonthlyCreditsRedeemed(mRedeemed);
    setYearlyCreditsPossible(yPossible);
    setYearlyCreditsRedeemed(yRedeemed);

    // Check for full monthly completion
    if (mPossible > 0 && mRedeemed === mPossible) {
      // Ensure celebration only triggers once per cycle for full redemption
      // This check might need more robust logic if mPossible can change mid-cycle
      // or if already celebrated in this cycle (e.g. by using a separate state)
      console.log("All monthly credits redeemed this cycle!");
      setShowCelebration(true); 
      // Consider a flag to prevent re-triggering in the same cycle if data changes slightly
    }

  }, [userCardsWithPerks]); // Only re-run if userCardsWithPerks change

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

    console.log("Setting up notifications...");
    await cancelAllScheduledNotificationsAsync(); // Clear old ones
    await scheduleMonthlyPerkResetNotifications();
    console.log("Monthly perk reset notifications scheduled.");

    // TODO: Schedule card renewal reminders
    // This requires parsing params.renewalDates and iterating through them
    if (params.renewalDates && params.selectedCardIds) {
      try {
        const renewalDatesMap = JSON.parse(params.renewalDates);
        const cardIds = params.selectedCardIds.split(',');
        const cards = allCards.filter(c => cardIds.includes(c.id));

        for (const card of cards) {
          if (renewalDatesMap[card.id]) {
            const renewalDate = new Date(renewalDatesMap[card.id]);
            // Ensure it's a valid date and in the future before scheduling
            if (!isNaN(renewalDate.getTime()) && renewalDate > new Date()) {
              console.log(`Scheduling renewal for ${card.name} on ${renewalDate.toLocaleDateString()}`);
              await scheduleCardRenewalReminder(card.name, renewalDate, 7); // 7 days before
              // Potentially schedule another one, e.g., 3 days before, if desired
            }
          }
        }
        console.log("Card renewal notifications scheduled (if any applicable).");
      } catch (error) {
        console.error("Error parsing renewal dates or scheduling card reminders:", error);
      }
    }
  };

  // Configuration for multi-choice perks
  const multiChoicePerksConfig: Record<string, Array<{ label: string; targetPerkName: string }>> = {
    "Uber / Grubhub Credit": [
      { label: "Open Uber (Rides)", targetPerkName: "Uber Ride Credit" },
      { label: "Open Uber Eats", targetPerkName: "Uber Eats Credit" },
      { label: "Open GrubHub", targetPerkName: "Grubhub Credit" },
    ],
    "Uber Cash": [
      { label: "Open Uber (Rides)", targetPerkName: "Uber Ride Credit" }, // Assumes "Uber Ride Credit" is in linking.ts
      { label: "Open Uber Eats", targetPerkName: "Uber Eats Credit" },   // Assumes "Uber Eats Credit" is in linking.ts
    ],
    "Digital Entertainment Credit": [
      { label: "Open Disney+", targetPerkName: "Disney+ Credit" },
      { label: "Open Hulu", targetPerkName: "Hulu Credit" },
      { label: "Open ESPN+", targetPerkName: "ESPN+ Credit" },
      { label: "Open Peacock", targetPerkName: "Peacock Credit" },
      { label: "Open NYTimes", targetPerkName: "NYTimes Credit" },
      // Note: Wall Street Journal can be added here once its linking.ts mapping is available
    ],
    "Disney Bundle Credit": [
      { label: "Open Disney+", targetPerkName: "Disney+ Credit" },
      { label: "Open Hulu", targetPerkName: "Hulu Credit" },
      { label: "Open ESPN+", targetPerkName: "ESPN+ Credit" },
    ],
    // Add other flexible perks here if needed
  };

  const setPerkStatus = (cardId: string, perkId: string, newStatus: PerkStatus) => {
    setUserCardsWithPerks(currentCardsData =>
      currentCardsData.map(cardData => {
        if (cardData.card.id === cardId) {
          const updatedPerks = cardData.perks.map(p => {
            if (p.id === perkId) {
              let updatedColdStreakCount = p.coldStreakCount;
              // Streak logic for monthly perks when marked as redeemed
              if (p.period === 'monthly' && newStatus === 'redeemed' && p.status !== 'redeemed' && !redeemedInCurrentCycle[p.id]) {
                console.log(`Incrementing streak for ${p.name}`);
                setRedeemedInCurrentCycle(prev => ({ ...prev, [p.id]: true }));
                setCumulativeValueSavedPerCard(prev => ({...prev, [cardId]: (prev[cardId] || 0) + p.value }));
                updatedColdStreakCount = 0; // Reset cold streak when hot streak increments
                return { ...p, status: newStatus, streakCount: p.streakCount + 1, coldStreakCount: updatedColdStreakCount };
              } else if (newStatus === 'redeemed' && p.status !== 'redeemed') {
                setCumulativeValueSavedPerCard(prev => ({...prev, [cardId]: (prev[cardId] || 0) + p.value }));
                // If it becomes redeemed (even if not for a new monthly streak point), cold streak ends.
                if (p.coldStreakCount > 0) updatedColdStreakCount = 0;
              }
              // If status is cleared to available or pending, cold streak doesn't change here, only via processNewMonth
              return { ...p, status: newStatus, coldStreakCount: updatedColdStreakCount };
            }
            return p;
          });
          return { ...cardData, perks: updatedPerks };
        }
        return cardData;
      })
    );
  };

  const handleTapPerk = async (cardId: string, perkId: string, perkToOpen: CardPerk) => {
    // This function will now primarily handle the "opening" or "choice" logic
    const choices = multiChoicePerksConfig[perkToOpen.name];

    let successfullyOpened = false;
    let actualPerkNameForLinking = perkToOpen.name; // Default to the original perk name

    if (choices) {
      // This is a multi-choice perk
      await new Promise<void>(resolve => {
        Alert.alert(
          `Redeem ${perkToOpen.name}`,
          "Choose an app to open:",
          [
            ...choices.map(choice => ({
              text: choice.label,
              onPress: async () => {
                // Create a temporary perk object with the chosen target name for linking
                const tempPerkForLinking: CardPerk = { ...perkToOpen, name: choice.targetPerkName };
                successfullyOpened = await openPerkTarget(tempPerkForLinking);
                actualPerkNameForLinking = choice.targetPerkName; // For logging, not strictly needed for redemption status logic
                resolve();
              },
            })),
            { text: "Cancel", style: "cancel", onPress: () => resolve() },
          ],
          { cancelable: true, onDismiss: () => resolve() }
        );
      });
    } else {
      // Single-target perk
      successfullyOpened = await openPerkTarget(perkToOpen);
    }

    if (successfullyOpened) {
      // Instead of directly setting here, let the main effect handle it if openPerkTarget implies redemption.
      // For now, openPerkTarget itself sets it to redeemed upon successful linking. If that changes, revisit.
      // The todo.md says: "On successful Linking.openURL, set perk.status = 'redeemed'"
      // This is currently handled if `successfullyOpened` is true and the logic inside the if block runs.
      // Let's explicitly call setPerkStatus if the action was to redeem via opening a link.
      setPerkStatus(cardId, perkId, 'redeemed'); 

      console.log(`Perk ${perkId} (${actualPerkNameForLinking}) for card ${cardId} marked as redeemed after successful link opening.`);
    } else {
      if (choices && !successfullyOpened) { // only log if it was a multi-choice and nothing was chosen/opened
         console.log(`Multi-choice perk ${perkToOpen.name} - no action taken or linking failed.`);
      } else if (!choices) { // original logging for single perks
        console.log(`Attempted to open perk ${perkId} (${perkToOpen.name}) for card ${cardId}, but it was not successful (app not installed or error).`);
      }
    }
  };

  const handleLongPressPerk = (cardId: string, perkId: string, currentPerk: CardPerk) => {
    Alert.alert(
      `Manage Perk: ${currentPerk.name}`,
      "Set perk status:",
      [
        {
          text: "Mark as Redeemed",
          onPress: () => setPerkStatus(cardId, perkId, 'redeemed'),
          // Optional: Add style if currentPerk.status === 'redeemed'
        },
        {
          text: "Mark as Pending",
          onPress: () => setPerkStatus(cardId, perkId, 'pending'),
          // Optional: Add style if currentPerk.status === 'pending'
        },
        {
          text: "Clear Status (Set to Available)",
          onPress: () => setPerkStatus(cardId, perkId, 'available'),
          // Optional: Add style if currentPerk.status === 'available'
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
    setShowDatePickerForDev(false); // Hide picker regardless of action
    if (event.type === 'set' && selectedDate) {
      setDevSelectedDate(selectedDate);
      console.log(`DEV: Date selected: ${selectedDate.toLocaleDateString()}`);
      // Call processNewMonth with the selected date to simulate that month
      processNewMonth(selectedDate); 
    }
  };

  // Placeholder for a function that would be called at the start of a new month
  const processNewMonth = (forcedDate?: Date) => {
    let newCycleIdentifier_Year: number;
    let newCycleIdentifier_Month: number;

    if (forcedDate) {
      newCycleIdentifier_Year = forcedDate.getFullYear();
      newCycleIdentifier_Month = forcedDate.getMonth(); // 0-11 for months
      console.log(`DEV: Forcing date to: ${forcedDate.toLocaleDateString()}`);
    } else {
      // This case would be for actual, automatic month change detection in production
      // For now, it's primarily driven by the DEV button with a forcedDate
      newCycleIdentifier_Year = new Date().getFullYear();
      newCycleIdentifier_Month = new Date().getMonth();
    }
    
    const newCycleIdentifier = `${newCycleIdentifier_Year}-${newCycleIdentifier_Month}`;

    // Only proceed if the cycle is genuinely different or forced by DEV tool
    if (newCycleIdentifier !== currentCycleIdentifier || forcedDate) {
      console.log(`Processing month change! Old cycle: ${currentCycleIdentifier}, New cycle: ${newCycleIdentifier}`);
      
      const [prevYearStr, prevMonthStr] = currentCycleIdentifier.split('-');
      const prevYear = parseInt(prevYearStr, 10);
      const prevMonth = parseInt(prevMonthStr, 10);

      // Determine if a conceptual year has passed for yearly perk resets
      // This is true if forcedDate makes new cycle >= 12 months after previous cycle identifier
      const conceptualMonthsPassed = (newCycleIdentifier_Year * 12 + newCycleIdentifier_Month) - (prevYear * 12 + prevMonth);
      const hasAYearPassed = forcedDate ? conceptualMonthsPassed >= 12 : false; // Only relevant if forced

      if (forcedDate && hasAYearPassed) {
        console.log("DEV: A conceptual year (or more) has passed due to forced date change.");
      }

      setUserCardsWithPerks(currentData => 
        currentData.map(cardData => ({
          ...cardData,
          perks: cardData.perks.map(p => {
            let newStreakCount = p.streakCount;
            let newColdStreakCount = p.coldStreakCount;
            let newStatus = p.status;

            if (p.period === 'monthly') {
              if (!redeemedInCurrentCycle[p.id]) {
                newStreakCount = 0;
                newColdStreakCount += 1; // Increment cold streak
                console.log(`Cold streak for ${p.name} now ${newColdStreakCount}`);
              } else {
                newColdStreakCount = 0; // Reset cold streak if redeemed
              }
              newStatus = 'available';
            } else if (p.period === 'yearly' && forcedDate && hasAYearPassed) {
              console.log(`DEV: Resetting yearly perk ${p.name} due to forced year passage.`);
              newStatus = 'available';
              newStreakCount = 0; 
              newColdStreakCount = 0; // Reset cold streak for yearly too on its reset
            }
            return { ...p, status: newStatus as PerkStatus, streakCount: newStreakCount, coldStreakCount: newColdStreakCount };
          })
        }))
      );
      setCurrentCycleIdentifier(newCycleIdentifier);
      setRedeemedInCurrentCycle({}); // Reset the tracker for the new cycle
      Alert.alert("Month Processed!", `Simulating for: ${newCycleIdentifier_Year}-${newCycleIdentifier_Month + 1}. Monthly perks updated.`);
    } else if (!forcedDate) { // Only show 'still same month' if not a dev-forced action
      Alert.alert("Still Same Month", "Monthly reset can only occur once a new calendar month begins.");
    }
  };

  // TODO: Implement functions to calculate summary data (monthly, yearly credits, value used)

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header with User Profile */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.welcomeText}>Welcome back,</Text>
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
                <Image
                  source={{ uri: user.user_metadata.avatar_url }}
                  style={styles.profileImage}
                />
              ) : (
                <View style={styles.profileImagePlaceholder}>
                  <Ionicons name="person" size={24} color="#007aff" />
                </View>
              )}
            </TouchableOpacity>
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
            <View style={styles.summarySection}>
              <ProgressDonut
                progress={monthlyCreditsPossible > 0 ? monthlyCreditsRedeemed / monthlyCreditsPossible : 0}
                value={monthlyCreditsRedeemed}
                total={monthlyCreditsPossible}
                label="Monthly Credits"
                size={140}
              />
              <View style={styles.yearlyProgressContainer}>
                <ProgressDonut
                  progress={yearlyCreditsPossible > 0 ? yearlyCreditsRedeemed / yearlyCreditsPossible : 0}
                  value={yearlyCreditsRedeemed}
                  total={yearlyCreditsPossible}
                  label="Yearly Credits"
                  size={100}
                  color="#34c759"
                />
              </View>
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

              {userCardsWithPerks.length > 0 ? (
                userCardsWithPerks.map(({ card, perks }) => (
                  <ExpandableCard
                    key={card.id}
                    card={card}
                    perks={perks}
                    cumulativeSavedValue={cumulativeValueSavedPerCard[card.id] || 0}
                    onTapPerk={handleTapPerk}
                    onLongPressPerk={handleLongPressPerk}
                  />
                ))
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
          onAnimationFinish={() => {
            setShowCelebration(false);
          }}
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
    paddingBottom: 15,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  welcomeText: {
    fontSize: 16,
    color: '#8e8e93',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1c1c1e',
  },
  profileButton: {
    height: 44,
    width: 44,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileImage: {
    height: 44,
    width: 44,
    borderRadius: 22,
  },
  profileImagePlaceholder: {
    height: 44,
    width: 44,
    borderRadius: 22,
    backgroundColor: '#f0f9ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  summarySection: {
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: '#ffffff',
  },
  yearlyProgressContainer: {
    marginTop: 16,
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
  lottieCelebration: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    pointerEvents: 'none',
  },
}); 