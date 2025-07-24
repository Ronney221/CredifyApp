import React, { useState, useMemo, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, UIManager, SectionList, SectionListData, DefaultSectionT, Modal, Switch, Button, Pressable, Alert, ActivityIndicator, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Card, Benefit, allCards, CardPerk } from '../../src/data/card-data'; // Assuming path
import Animated, { FadeIn, FadeOut, Layout, useSharedValue, useAnimatedStyle, withTiming, useAnimatedScrollHandler, interpolate, Easing } from 'react-native-reanimated'; // Added Reanimated imports
import AsyncStorage from '@react-native-async-storage/async-storage'; // Added AsyncStorage
import { Svg, Polyline, Circle, Path, G, Text as SvgText } from 'react-native-svg'; // Added Circle, Path, G for gauge and SvgText
import YearlyProgress from '../../components/insights/YearlyProgress'; // Import the new component
import CardRoiLeaderboard from '../../components/insights/CardRoiLeaderboardNew'; // Import the new component
import InteractiveBarChart from '../../components/insights/InteractiveBarChart';
import HeroInsightCard from '../../components/insights/HeroInsightCard';
import InsightsSegmentedControl, { InsightTab } from '../../components/insights/InsightsSegmentedControl';
import {
  generateDummyInsightsData,
  InsightsData,
  YearSection,
  MonthlyRedemptionSummary,
  Achievement,
  PerkStatusFilter,
} from '../../src/data/dummy-insights';
import MonthSummaryCardNew from '../../components/insights/MonthSummaryCardNew';
import { StreakBadge } from '../../components/insights/StreakBadge';
import { FeeCoverageMeterChip } from '../../components/insights/FeeCoverageMeterChip';
import { useAuth } from '../../contexts/AuthContext';
import { useUserCards } from '../../hooks/useUserCards';
import { useFocusEffect , useNavigation } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import LottieView from 'lottie-react-native';

import { BlurView } from 'expo-blur';
import InsightsHelpModal from '../../components/insights/InsightsHelpModal';
import ErrorBoundary from '../../components/ErrorBoundary';
import InsightsEmptyState from '../../components/insights/InsightsEmptyState';
import InsightsLoadingState from '../../components/insights/InsightsLoadingState';
import InsightsFilterSheet from '../../components/insights/InsightsFilterSheet';
import { calculateRedemptionValues } from '../../utils/insights-calculations';
import { logger } from '../../utils/logger';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// --- CONSTANTS FOR COLORS (to avoid magic strings and for consistency) ---
const ACCENT_YELLOW_BACKGROUND = '#FFFBEA'; // For achievement pills
const SUCCESS_GREEN = '#34C759';
const SUCCESS_GREEN_BACKGROUND = 'rgba(52, 199, 89, 0.1)';
const WARNING_YELLOW = '#FFCC00'; // Updated and new colors based on feedback
const WARNING_YELLOW_BACKGROUND = 'rgba(255, 204, 0, 0.15)';
const NEUTRAL_GRAY_COLOR = '#8A8A8E'; // Updated and new colors based on feedback
const NEUTRAL_GRAY_BACKGROUND = 'rgba(142, 142, 147, 0.1)';
const DIVIDER_COLOR_WITH_OPACITY = 'rgba(0,0,0,0.15)';
const ERROR_RED = '#FF3B30';
const ERROR_RED_BACKGROUND = 'rgba(255, 59, 48, 0.1)';
const SUBTLE_GRAY_TEXT = Colors.light.icon; // For dimmed perk values
const CARD_BACKGROUND_COLOR = '#F8F8F8';
const SEPARATOR_COLOR = '#E0E0E0';
const SECONDARY_COLOR = '#ff9500'; // Fallback color, assuming secondary/accent are not defined in Colors.ts

// Add constant for tab bar offset
const TAB_BAR_OFFSET = Platform.OS === 'ios' ? 120 : 80; // Increased to account for home indicator

// Add after imports
const EXPANDED_HEADER_HEIGHT = 160;
const COLLAPSED_HEADER_HEIGHT = 60;
const HEADER_SCROLL_DISTANCE = EXPANDED_HEADER_HEIGHT - COLLAPSED_HEADER_HEIGHT;

// --- UI COMPONENTS ---

interface MeterChipProps {
  value: number;
  displayTextType: 'full' | 'percentage_only';
}

interface SparklineProps {
  data: number[];
  height: number;
  width: number;
  color: string;
}

const Sparkline: React.FC<SparklineProps> = ({ data, height, width, color }) => {
  if (!data || data.length === 0) return null;

  const points = data
    .map((val, index) => {
      const x = (index / (data.length - 1)) * width;
      const y = height - (Math.max(0, Math.min(100, val)) / 100) * height; // Scale val 0-100 to height
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <View style={{ height, width, marginTop: 8 }}>
      <Svg height={height} width={width}>
        <Polyline points={points} fill="none" stroke={color} strokeWidth="2" />
      </Svg>
    </View>
  );
};

const ASYNC_STORAGE_FILTER_KEY = '@insights_filters';

// Format currency helper
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};


const OnboardingHint: React.FC<{ 
  perkStatusFilter: PerkStatusFilter; 
  selectedCardCount: number;
  defaultSelectedCardIds: string[];
}> = ({ perkStatusFilter, selectedCardCount, defaultSelectedCardIds }) => {
  // Show motivational text when using default filters
  const isDefaultView = perkStatusFilter === 'all' && 
    selectedCardCount === defaultSelectedCardIds.length &&
    selectedCardCount > 0;

  const filterText = perkStatusFilter === 'all' 
    ? 'Showing all perks'
    : `Showing ${perkStatusFilter} perks`;

  return (
    <Animated.View 
      entering={FadeIn.duration(800).delay(500)} 
      style={styles.onboardingHintContainer}
    >
      <Text style={styles.onboardingHintText}>
        {isDefaultView 
          ? "Every dollar you've squeezed from your cards this year."
          : `${filterText} · ${selectedCardCount} card${selectedCardCount !== 1 ? 's' : ''} selected`
        }
      </Text>
    </Animated.View>
  );
}

interface CardWithActivity {
  id: string;
  name: string;
  activityCount: number;
}

interface GroupedCards {
  [issuer: string]: CardWithActivity[];
}

interface UserCardWithPerks {
  card: Card;
  perks: CardPerk[];
}

const getIssuerFromCard = (cardName: string): string => {
  const lowerName = cardName.toLowerCase();
  if (lowerName.includes('amex') || lowerName.includes('american express')) return 'American Express';
  if (lowerName.includes('chase')) return 'Chase';
  if (lowerName.includes('capital one')) return 'Capital One';
  if (lowerName.includes('citi')) return 'Citi';
  if (lowerName.includes('discover')) return 'Discover';
  if (lowerName.includes('wells fargo')) return 'Wells Fargo';
  if (lowerName.includes('bank of america') || lowerName.includes('boa')) return 'Bank of America';
  if (lowerName.includes('us bank') || lowerName.includes('usb')) return 'U.S. Bank';
  return 'Other';
};

const ISSUER_ORDER = [
  'American Express',
  'Chase',
  'Capital One',
  'Citi',
  'Bank of America',
  'Wells Fargo',
  'U.S. Bank',
  'Discover',
  'Other'
];

// Add after imports, before component
// Helper functions for chronological data processing
const parseMonthKey = (k: string): Date => {
  const [y, m] = k.split('-').map(Number);
  return new Date(y, m - 1); // month is 0-based
};

const rightPad = <T,>(arr: T[] = [], size = 6, fillValue: T): T[] => {
  const res = new Array(size).fill(fillValue);
  const offset = size - Math.min(arr.length, size);
  arr.slice(-size).forEach((v, i) => (res[offset + i] = v));
  return res;
};


export default function InsightsScreen() {
  const { user } = useAuth();
  const { 
    userCardsWithPerks, 
    isLoading: isLoadingUserCards,
    refreshUserCards 
  } = useUserCards();
  const navigation = useNavigation();
  const [expandedMonthKey, setExpandedMonthKey] = useState<string | null>(null);
  const sectionListRef = useRef<SectionList<MonthlyRedemptionSummary, YearSection>>(null);
  const [isFilterModalVisible, setFilterModalVisible] = useState(false);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [cardSearchQuery, setCardSearchQuery] = useState('');
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [isHelpModalVisible, setHelpModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<InsightTab>('summary');

  // Add scroll animation values
  const scrollY = useSharedValue(0);
  const headerScrollProgress = useSharedValue(0);

  // Add scroll handler with smoother easing
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
      // Smooth transition with easing curve
      const rawProgress = Math.min(1, Math.max(0, scrollY.value / HEADER_SCROLL_DISTANCE));
      headerScrollProgress.value = withTiming(rawProgress, {
        duration: 50,
        easing: Easing.bezier(0.4, 0.0, 0.2, 1),
      });
    },
  });

  // Add animated styles
  const expandedHeaderStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(
        headerScrollProgress.value,
        [0, 1],
        [1, 0],
        'clamp'
      ),
      transform: [
        {
          translateY: interpolate(
            headerScrollProgress.value,
            [0, 1],
            [0, -20],
            'clamp'
          ),
        },
      ],
    };
  });

  const collapsedHeaderStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(
        headerScrollProgress.value,
        [0, 1],
        [0, 1],
        'clamp'
      ),
      transform: [
        {
          translateY: interpolate(
            headerScrollProgress.value,
            [0, 1],
            [20, 0],
            'clamp'
          ),
        },
      ],
    };
  });

  // Focus effect to refresh data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      refreshUserCards();
    }, [refreshUserCards])
  );

  // Define default filter states
  const defaultPerkStatusFilter: PerkStatusFilter = 'all';
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);
  const [perkStatusFilter, setPerkStatusFilter] = useState<PerkStatusFilter>('all');
  const scrollYPosition = useRef(0); // For scroll position restoration

  // Transform user cards into the format needed for filtering
  const availableCardsForFilter = useMemo(() => {
    logger.log('[InsightsScreen] Cards loaded:', userCardsWithPerks.length);
    if (userCardsWithPerks.length > 0) {
      logger.log('[InsightsScreen] Card IDs:', userCardsWithPerks.map(({ card }) => ({ id: card.id, name: card.name })));
    }
    return userCardsWithPerks.map(({ card, perks }: UserCardWithPerks) => ({
      id: card.id,
      name: card.name,
      activityCount: perks.filter((p: CardPerk) => p.status === 'redeemed').length
    }));
  }, [userCardsWithPerks]);

  // Set default selected cards to all user cards and reset when cards change
  useEffect(() => {
    if (availableCardsForFilter.length > 0) {
      // Select all available cards by default
      setSelectedCardIds(availableCardsForFilter.map(card => card.id));
      setIsDataLoaded(true);
    } else {
      setSelectedCardIds([]);
      setIsDataLoaded(false);
    }
  }, [availableCardsForFilter]);

  // Reset expanded state when cards change
  useEffect(() => {
    setExpandedMonthKey(null);
  }, [userCardsWithPerks]);

  const groupedCards = useMemo(() => {
    const grouped: GroupedCards = {};
    
    // Initialize all issuers with empty arrays
    ISSUER_ORDER.forEach(issuer => {
      grouped[issuer] = [];
    });

    // Group cards by issuer
    availableCardsForFilter.forEach((card: CardWithActivity) => {
      const issuer = getIssuerFromCard(card.name);
      if (!grouped[issuer]) {
        grouped[issuer] = [];
      }
      grouped[issuer].push(card);
    });

    // Sort cards within each issuer by name
    Object.keys(grouped).forEach(issuer => {
      grouped[issuer].sort((a, b) => a.name.localeCompare(b.name));
    });

    return grouped;
  }, [availableCardsForFilter]);

  const toggleCardSelection = (cardId: string) => {
    setSelectedCardIds(prev => {
      if (prev.includes(cardId)) {
        return prev.filter(id => id !== cardId);
      } else {
        return [...prev, cardId];
      }
    });
  };

  const [insightsData, setInsightsData] = useState<InsightsData>({
    yearSections: [],
    achievements: [],
    availableCardsForFilter: [],
    currentFeeCoverageStreak: 0,
    cardRois: []
  });

  useEffect(() => {
    async function loadInsightsData() {
      if (!isDataLoaded) {
        setInsightsData({ 
          yearSections: [], 
          achievements: [], 
          availableCardsForFilter: [], 
          currentFeeCoverageStreak: 0, 
          cardRois: [] 
        });
        return;
      }
    
      // Transform userCardsWithPerks to match the expected type
      const processedCards = userCardsWithPerks.map(({ card, perks }) => ({
        card: {
          id: card.id,
          name: card.name,
          benefits: card.benefits,
          annualFee: card.annualFee || 0,
        },
        perks: perks.map(perk => {
          // Don't map status - pass through the database format
          return {
            id: perk.id,
            definition_id: perk.definition_id,
            name: perk.name,
            value: perk.value,
            status: perk.status, // Use original status from database
            period: perk.period,
            remaining_value: perk.remaining_value,
          };
        }),
      }));

      logger.log('[InsightsScreen] Generating insights with:', {
        selectedCardIds,
        processedCardsCount: processedCards.length,
        userId: user?.id
      });
      
      const result = await generateDummyInsightsData(selectedCardIds, processedCards, user?.id);
      
      logger.log('[InsightsScreen] Generated insights result:', {
        yearSectionsCount: result.yearSections.length,
        hasData: result.yearSections.length > 0
      });

      // Helper function to determine if a month is the current month
      const isCurrentMonth = (monthYear: string) => {
        const now = new Date();
        const currentMonthYear = `${now.toLocaleString('default', { month: 'long' })} ${now.getFullYear()}`;
        return monthYear === currentMonthYear;
      };

      // Filter out months with no activity (no redeemed perks), but always include current month
      const filteredYearSections = result.yearSections.map(yearSection => {
        // Filter months: include if it has at least one redeemed perk OR if it's the current month
        const filteredData = yearSection.data.filter(month => {
          const hasRedeemedPerks = month.perkDetails.some(perk => perk.status === 'redeemed');
          const isCurrentMonthData = isCurrentMonth(month.monthYear);
          return hasRedeemedPerks || isCurrentMonthData;
        });

        // Recalculate the total redeemed value for the year based on filtered months
        const totalRedeemedForYear = filteredData.reduce((sum, month) => sum + month.totalRedeemedValue, 0);

        return {
          ...yearSection,
          data: filteredData,
          totalRedeemedForYear
        };
      }).filter(yearSection => yearSection.data.length > 0); // Remove years with no data

      // Update the result with filtered data
      const filteredResult = {
        ...result,
        yearSections: filteredYearSections
      };

      // Log summary if we have insights data
      if (filteredResult.yearSections.length > 0) {
        logger.log('[InsightsScreen] Loaded insights for', filteredResult.yearSections.length, 'year(s)');
      }

      setInsightsData(filteredResult);
    }

    loadInsightsData();
  }, [selectedCardIds, isDataLoaded, userCardsWithPerks, user?.id]);

  // Set the default expanded month when data loads
  useEffect(() => {
    if (insightsData.yearSections.length > 0 && insightsData.yearSections[0].data.length > 0) {
      if (expandedMonthKey === null) { // Only set on initial load
        setExpandedMonthKey(insightsData.yearSections[0].data[0].monthKey);
      }
    }
  }, [insightsData]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    // Only count perk status filter if it's not showing all
    if (perkStatusFilter !== 'all') count++;
    // Only count card filter if not all cards are selected
    if (selectedCardIds.length < availableCardsForFilter.length) count++;
    return count;
  }, [perkStatusFilter, selectedCardIds, availableCardsForFilter]);

  const handleToggleMonth = (monthKey: string) => {
    setExpandedMonthKey(prev => (prev === monthKey ? null : monthKey));
  };

  const renderMonthSummaryCard = ({ item, index, section }: { item: MonthlyRedemptionSummary; index: number; section: YearSection }) => {
    const isFirstOverallCard = insightsData.yearSections.length > 0 && 
                               section.year === insightsData.yearSections[0].year && 
                               index === 0;
    return (
        <MonthSummaryCardNew
        summary={item}
        isExpanded={expandedMonthKey === item.monthKey}
        onToggleExpand={() => handleToggleMonth(item.monthKey)}
        perkStatusFilter={perkStatusFilter}
        isFirstOverallCard={isFirstOverallCard}
        isEven={index % 2 === 0}
        />
    );
  };

  const renderSectionHeader = ({ section }: { section: YearSection }) => {
    // Guard against empty data
    if (!section.data || section.data.length === 0) {
      return null;
    }

    // Calculate trend data using only monthly perks with shared calculation function
    const trendData = section.data.map(month => {
      // Create a temporary summary with only monthly perks for consistent calculation
      const monthlyOnlySummary = {
        ...month,
        perkDetails: month.perkDetails.filter(perk => perk.period === 'monthly')
      };
      const calculations = calculateRedemptionValues(monthlyOnlySummary, false, false);
      return calculations.potentialValue > 0 ? (calculations.totalRedeemedValue / calculations.potentialValue) * 100 : 0;
    }).slice(0, 6).reverse();

    // Monthly data for the chart using shared calculation function
    const monthlyData = section.data.map(month => {
      const monthlyOnlySummary = {
        ...month,
        perkDetails: month.perkDetails.filter(perk => perk.period === 'monthly')
      };
      const calculations = calculateRedemptionValues(monthlyOnlySummary, false, false);
      return {
        redeemed: calculations.redeemedValue,
        partial: calculations.partialValue,
        potential: calculations.potentialValue
      };
    }).slice(0, 6).reverse();

    // Calculate total annual fees for selected cards
    const totalAnnualFees = insightsData.cardRois.reduce((sum, card) => sum + (card.annualFee || 0), 0);

    return (
      <View style={styles.sectionHeaderContainer}>
        <YearlyProgress
          year={section.year}
          totalRedeemed={section.totalRedeemedForYear}
          totalAnnualFees={totalAnnualFees}
          trendData={trendData}
          monthlyData={monthlyData}
        />
      </View>
    );
  };


  // Update useLayoutEffect for header configuration
  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => null
    });
  }, [navigation]);

  if (isLoadingUserCards || !isDataLoaded) {
    return (
      <SafeAreaView style={styles.container} edges={['right', 'left']}>
        <StatusBar style="dark" translucent backgroundColor="transparent" />
        <View style={styles.container}>
          <BlurView intensity={80} tint="extraLight" style={styles.fixedHeader}>
            <Text style={styles.screenTitle}>Insights</Text>
            <View style={styles.headerButtonsContainer}>
              <TouchableOpacity 
                onPress={() => setHelpModalVisible(true)}
                style={[styles.headerButton, styles.helpButton]}
              >
                <Ionicons 
                  name="help-circle-outline" 
                  size={24} 
                  color={Colors.light.text} 
                />
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.headerButton, styles.filterButton]}
                onPress={() => setFilterModalVisible(true)}
              >
                <Ionicons 
                  name="funnel-outline" 
                  size={24} 
                  color={Colors.light.text} 
                />
              </TouchableOpacity>
            </View>
          </BlurView>
          <View style={styles.loadingStateContainer}>
            <InsightsLoadingState onRetry={refreshUserCards} />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Prepare data for the first year section (current year)
  const currentYearSection = insightsData.yearSections[0];
  const currentYearData = currentYearSection ? {
    year: currentYearSection.year,
    totalRedeemed: currentYearSection.totalRedeemedForYear,
    totalAnnualFees: insightsData.cardRois.reduce((sum, card) => sum + (card.annualFee || 0), 0),
  } : null;


  return (
    <SafeAreaView style={styles.container} edges={['right', 'left']}>
      <StatusBar style="dark" translucent backgroundColor="transparent" />
      <View style={styles.container}>
        {/* Blurred header with help and filter */}
        <BlurView intensity={80} tint="extraLight" style={styles.fixedHeader}>
          <Text style={styles.screenTitle}>Insights</Text>
          <View style={styles.headerButtonsContainer}>
            <TouchableOpacity 
              onPress={() => setHelpModalVisible(true)}
              style={[styles.headerButton, styles.helpButton]}
            >
              <Ionicons 
                name="help-circle-outline" 
                size={24} 
                color={Colors.light.text} 
              />
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.headerButton, styles.filterButton]}
              onPress={() => setFilterModalVisible(true)}
            >
              <Ionicons 
                name="funnel-outline" 
                size={24} 
                color={Colors.light.text} 
              />
              {activeFilterCount > 0 && (
                <View style={styles.headerBadge}>
                  <Text style={styles.headerBadgeText}>{activeFilterCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </BlurView>

        {insightsData.yearSections.length > 0 ? (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Hero Insight Card */}
            <HeroInsightCard
              totalEarned={currentYearData?.totalRedeemed || 0}
              totalAnnualFees={currentYearData?.totalAnnualFees || 0}
              monthlyTrend={(() => {
                if (!currentYearSection) return [];
                const monthsChrono = [...currentYearSection.data]
                  .sort((a, b) => parseMonthKey(a.monthKey).getTime() - parseMonthKey(b.monthKey).getTime())
                  .slice(-6);
                return monthsChrono.map(m => {
                  const calculations = calculateRedemptionValues(m, false, false);
                  return m.totalPotentialValue > 0 
                    ? (calculations.totalRedeemedValue / m.totalPotentialValue) * 100 
                    : 0;
                });
              })()}
              onPress={() => setActiveTab('trends')}
            />

            {/* Segmented Control */}
            <InsightsSegmentedControl
              activeTab={activeTab}
              onTabChange={setActiveTab}
            />

            {/* Tab Content */}
            <View style={styles.tabContent}>
              {activeTab === 'summary' && (
                <Animated.View 
                  entering={FadeIn.duration(400).delay(100)}
                  key="summary-tab"
                >
                  {/* Key metrics in a clean grid */}
                  <View style={styles.metricsGrid}>
                    <View style={styles.metricCard}>
                      <Text style={styles.metricLabel}>Monthly Average</Text>
                      <Text style={styles.metricValue}>
                        ${Math.round((currentYearData?.totalRedeemed || 0) / 12)}
                      </Text>
                    </View>
                    <View style={styles.metricCard}>
                      <Text style={styles.metricLabel}>Active Cards</Text>
                      <Text style={styles.metricValue}>
                        {insightsData.cardRois.length}
                      </Text>
                    </View>
                  </View>
                  
                  {/* Quick insights */}
                  <View style={styles.sectionContainer}>
                    <Text style={styles.sectionTitle}>This Month's Focus</Text>
                    <Text style={styles.sectionSubtitle}>
                      Your most impactful opportunities
                    </Text>
                    {currentYearSection?.data[0] && (() => {
                      const currentMonth = currentYearSection.data[0];
                      const urgentPerks = currentMonth.perkDetails
                        .filter(perk => 
                          (perk.period === 'monthly' || perk.expiresThisMonth) && 
                          perk.status === 'available'
                        )
                        .sort((a, b) => b.value - a.value)
                        .slice(0, 3);

                      if (urgentPerks.length === 0) {
                        return (
                          <View style={styles.successCard}>
                            <Ionicons name="checkmark-circle" size={24} color="#34C759" />
                            <Text style={styles.successText}>
                              All due perks redeemed! 🎉
                            </Text>
                          </View>
                        );
                      }

                      return (
                        <View style={styles.opportunitiesList}>
                          {urgentPerks.map((perk, index) => (
                            <View key={perk.id} style={styles.opportunityItem}>
                              <View style={styles.opportunityIcon}>
                                <Ionicons 
                                  name={perk.period === 'monthly' ? 'calendar' : 'time'} 
                                  size={16} 
                                  color="#FF9500" 
                                />
                              </View>
                              <View style={styles.opportunityContent}>
                                <Text style={styles.opportunityName} numberOfLines={1}>
                                  {perk.name}
                                </Text>
                                <Text style={styles.opportunityMeta}>
                                  {perk.period === 'monthly' ? 'Monthly' : 'Expires this month'} • {formatCurrency(perk.value)}
                                </Text>
                              </View>
                            </View>
                          ))}
                        </View>
                      );
                    })()}
                  </View>
                </Animated.View>
              )}

              {activeTab === 'cards' && (
                <Animated.View 
                  entering={FadeIn.duration(400).delay(100)}
                  key="cards-tab"
                >
                  <CardRoiLeaderboard cardRois={insightsData.cardRois} />
                </Animated.View>
              )}

              {activeTab === 'trends' && (
                <Animated.View 
                  entering={FadeIn.duration(400).delay(100)}
                  key="trends-tab"
                >
                  {currentYearSection && (
                    <InteractiveBarChart
                      data={(() => {
                        const monthsChrono = [...currentYearSection.data]
                          .sort((a, b) => parseMonthKey(a.monthKey).getTime() - parseMonthKey(b.monthKey).getTime());
                        return monthsChrono.map(m => {
                          const calculations = calculateRedemptionValues(m, false, false);
                          return calculations.redeemedValue + calculations.partialValue;
                        }).slice(-6);
                      })()}
                      rawData={(() => {
                        const monthsChrono = [...currentYearSection.data]
                          .sort((a, b) => parseMonthKey(a.monthKey).getTime() - parseMonthKey(b.monthKey).getTime());
                        return monthsChrono.map(m => {
                          const calculations = calculateRedemptionValues(m, false, false);
                          return {
                            redeemed: calculations.redeemedValue,
                            partial: calculations.partialValue,
                            potential: m.totalPotentialValue,
                            monthKey: m.monthKey
                          };
                        }).slice(-6);
                      })()}
                      totalAnnualFees={insightsData.cardRois.reduce((sum, card) => sum + (card.annualFee || 0), 0)}
                      height={280}
                    />
                  )}
                </Animated.View>
              )}

              {activeTab === 'tips' && (
                <Animated.View 
                  entering={FadeIn.duration(400).delay(100)}
                  key="tips-tab"
                >
                  <View style={styles.monthlyHistoryHeader}>
                    <Text style={styles.sectionTitle}>Monthly History</Text>
                    <Text style={styles.filterHintText}>
                      Review your redemption patterns
                    </Text>
                  </View>
                  {currentYearSection?.data.slice(0, 3).map((month, index) => (
                    <ErrorBoundary key={month.monthKey}>
                      <MonthSummaryCardNew
                        summary={month}
                        isExpanded={expandedMonthKey === month.monthKey}
                        onToggleExpand={() => handleToggleMonth(month.monthKey)}
                        perkStatusFilter={perkStatusFilter}
                        isFirstOverallCard={index === 0}
                        isEven={index % 2 === 0}
                      />
                    </ErrorBoundary>
                  ))}
                </Animated.View>
              )}
            </View>
          </ScrollView>
        ) : (
          <View style={styles.loadingStateContainer}>
            <InsightsEmptyState
              selectedCardCount={selectedCardIds.length}
              activeFilterCount={activeFilterCount}
            />
          </View>
        )}

        <InsightsFilterSheet
          isVisible={isFilterModalVisible}
          onClose={() => setFilterModalVisible(false)}
          perkStatusFilter={perkStatusFilter}
          setPerkStatusFilter={setPerkStatusFilter}
          selectedCardIds={selectedCardIds}
          setSelectedCardIds={setSelectedCardIds}
          groupedCards={groupedCards}
          availableCardsForFilter={availableCardsForFilter}
          toggleCardSelection={toggleCardSelection}
          activeFilterCount={activeFilterCount}
        />
        <InsightsHelpModal 
          isVisible={isHelpModalVisible}
          onClose={() => setHelpModalVisible(false)}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFE',
  },
  fixedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: Platform.OS === 'ios' ? 54 : 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1C1C1E',
    letterSpacing: -0.5,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: Platform.OS === 'ios' ? 100 : 80,
    paddingBottom: TAB_BAR_OFFSET,
  },
  tabContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  metricLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#8E8E93',
    marginBottom: 6,
    letterSpacing: -0.08,
  },
  metricValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1C1C1E',
    letterSpacing: -0.8,
  },
  sectionContainer: {
    marginBottom: 24,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 16,
    letterSpacing: -0.08,
  },
  successCard: {
    backgroundColor: 'rgba(52, 199, 89, 0.1)',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  successText: {
    fontSize: 15,
    color: '#34C759',
    fontWeight: '600',
  },
  opportunitiesList: {
    gap: 8,
  },
  opportunityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 149, 0, 0.2)',
    gap: 12,
  },
  opportunityIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 149, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  opportunityContent: {
    flex: 1,
  },
  opportunityName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 2,
  },
  opportunityMeta: {
    fontSize: 13,
    color: '#8E8E93',
    fontWeight: '500',
  },
  headerContainer: {
    backgroundColor: Colors.light.background,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    zIndex: 1,
  },
  roiSection: {
    marginTop: 0,
  },
  chartSection: {
    marginTop: 12,
    marginHorizontal: 15,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 0,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'visible',
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingHorizontal: 15,
    paddingTop: 15,
  },
  chartTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.light.text,
  },
  monthlyHistoryHeader: {
    marginTop: 30,
    marginBottom: 15,
    paddingHorizontal: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 8,
  },
  filterHintText: {
    fontSize: 13,
    color: Colors.light.icon,
    marginBottom: 15,
    fontStyle: 'italic',
  },
  headerBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: Colors.light.tint,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.light.background,
  },
  headerBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  onboardingHintContainer: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    alignItems: 'center',
  },
  onboardingHintText: {
    fontSize: 13,
    color: Colors.light.icon,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  stickyHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    overflow: 'hidden',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(212,212,212,0.5)',
  },
  largeHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 5,
    overflow: 'hidden',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0, 0, 0, 0.15)',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  collapsedHeaderContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: COLLAPSED_HEADER_HEIGHT,
  },
  collapsedRoiContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  collapsedHeaderTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1C1C1E',
    letterSpacing: -0.2,
  },
  sectionHeaderContainer: {
  },
  headerButtonsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 18,
    marginLeft: 8,
  },
  helpButton: {
    backgroundColor: 'rgba(142, 142, 147, 0.12)',
  },
  filterButton: {
    backgroundColor: 'rgba(142, 142, 147, 0.12)',
  },
  loadingStateContainer: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 100 : 80,
  },
}); 