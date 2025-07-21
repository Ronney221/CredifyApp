import React, { useState, useMemo, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, UIManager, SectionList, SectionListData, DefaultSectionT, Modal, Switch, Button, Pressable, Alert, ActivityIndicator, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Card, Benefit, allCards, CardPerk } from '../../src/data/card-data'; // Assuming path
import Animated, { FadeIn, FadeOut, Layout, useSharedValue, useAnimatedStyle, withTiming, useAnimatedScrollHandler, interpolate } from 'react-native-reanimated'; // Added Reanimated imports
import AsyncStorage from '@react-native-async-storage/async-storage'; // Added AsyncStorage
import { Svg, Polyline, Circle, Path, G, Text as SvgText } from 'react-native-svg'; // Added Circle, Path, G for gauge and SvgText
import YearlyProgress from '../../components/insights/YearlyProgress'; // Import the new component
import CardRoiLeaderboard from '../../components/insights/CardRoiLeaderboard'; // Import the new component
import MiniBarChart from '../../components/insights/MiniBarChart';
import {
  generateDummyInsightsData,
  InsightsData,
  YearSection,
  MonthlyRedemptionSummary,
  Achievement,
  PerkStatusFilter,
} from '../../src/data/dummy-insights';
import { MonthSummaryCard } from '../../components/insights/MonthSummaryCard';
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

// --- NEW PLACEHOLDER COMPONENTS ---

const HeatMapPlaceholder: React.FC = () => {
  return (
    <View style={[styles.placeholderModuleContainer, styles.skeletonStub]}>
      <Text style={styles.skeletonStubText}>Missed-value heat-map is cooking – track unredeemed perks by day soon!</Text>
    </View>
  );
};

const ForecastDialPlaceholder: React.FC = () => {
  const size = 50; // Reduced size
  const strokeWidth = 5;
  const radius = (size - strokeWidth) / 2;
  const progress = 0.6; // Static progress
  const circumference = radius * Math.PI * 2;

  // Calculate arc path coordinates more safely
  const angleToRadians = (angle: number) => (angle * Math.PI) / 180;
  const startAngle = angleToRadians(45);
  const endAngle = angleToRadians(315);
  
  const startX = size / 2 - radius * Math.cos(startAngle);
  const startY = size / 2 + radius * Math.sin(startAngle);
  const endX = size / 2 + radius * Math.cos(startAngle);
  const endY = size / 2 + radius * Math.sin(startAngle);

  const arcPath = `M ${startX.toFixed(2)} ${startY.toFixed(2)} A ${radius} ${radius} 0 1 1 ${endX.toFixed(2)} ${endY.toFixed(2)}`;

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: size, height: size * 0.85, alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <G transform={`rotate(-225 ${size/2} ${size/2})`}>
            <Path d={arcPath} stroke={Colors.light.icon} strokeWidth={strokeWidth} strokeOpacity={0.3} fill="none" />
            <Path d={arcPath} stroke={Colors.light.tint} strokeWidth={strokeWidth} strokeDasharray={`${circumference}`} strokeDashoffset={`${circumference * (1 - progress * (4/3))}`} fill="none" strokeLinecap="round"/>
          </G>
          <SvgText x={size/2} y={(size/2) + 4} fill={Colors.light.tint} fontSize="10" fontWeight="bold" textAnchor="middle">
            {`${Math.round(progress * 100)}%`}
          </SvgText>
        </Svg>
      </View>
      <Text style={{ fontSize: 12, color: Colors.light.tint, marginTop: 4 }}>Break-Even</Text>
    </View>
  );
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

  // Add scroll animation values
  const scrollY = useSharedValue(0);
  const headerScrollProgress = useSharedValue(0);

  // Add scroll handler
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
      // Transition over HEADER_SCROLL_DISTANCE pixels of scroll
      headerScrollProgress.value = Math.min(1, Math.max(0, scrollY.value / HEADER_SCROLL_DISTANCE));
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
        <MonthSummaryCard
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
      <View style={styles.container}>
        <InsightsLoadingState onRetry={refreshUserCards} />
      </View>
    );
  }

  // Prepare data for the first year section (current year)
  const currentYearSection = insightsData.yearSections[0];
  const currentYearData = currentYearSection ? {
    year: currentYearSection.year,
    totalRedeemed: currentYearSection.totalRedeemedForYear,
    totalAnnualFees: insightsData.cardRois.reduce((sum, card) => sum + (card.annualFee || 0), 0),
  } : null;

  // Update the collapsed header content to include the filter button
 
  // Filter Modal Content
  const renderFilterModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={isFilterModalVisible}
      onRequestClose={() => setFilterModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filter Performance Data</Text>
            <TouchableOpacity 
              onPress={() => setFilterModalVisible(false)}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color={Colors.light.text} />
            </TouchableOpacity>
          </View>

          <Text style={styles.filterSectionTitle}>PERK STATUS</Text>
          <View style={styles.perkStatusContainer}>
            {(['all', 'redeemed', 'partial', 'missed'] as PerkStatusFilter[]).map(status => (
              <TouchableOpacity
                key={status}
                style={[styles.perkStatusChip, perkStatusFilter === status && styles.perkStatusChipSelected]}
                onPress={() => setPerkStatusFilter(status)}
              >
                <Text style={[styles.perkStatusChipText, perkStatusFilter === status && styles.perkStatusChipTextSelected]}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.filterSectionTitle}>SHOW CARDS</Text>
          <View style={styles.selectAllRow}>
            <TouchableOpacity 
              style={styles.selectAllButton}
              onPress={() => setSelectedCardIds(availableCardsForFilter.map(c => c.id))}
            >
              <Text style={styles.selectButtonText}>Select All</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.selectAllButton}
              onPress={() => setSelectedCardIds([])}
            >
              <Text style={styles.selectButtonText}>Deselect All</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.cardsScrollView}>
            {ISSUER_ORDER.map(issuer => {
              const cards = groupedCards[issuer] || [];
              if (cards.length === 0) return null;
              
              return (
                <View key={`issuer-${issuer}`} style={styles.issuerSection}>
                  <Text style={styles.issuerTitle}>{issuer}</Text>
                  {cards.map(card => {
                    const isSelected = selectedCardIds.includes(card.id);
                    return (
                      <TouchableOpacity 
                        key={`card-${card.id}`}
                        style={styles.cardFilterRow} 
                        onPress={() => toggleCardSelection(card.id)}
                      >
                        <View style={styles.checkboxContainer}>
                          <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                            {isSelected && <Ionicons name="checkmark" size={14} color="#FFF" />}
                          </View>
                        </View>
                        <View style={styles.cardNameContainer}>
                          <Text style={styles.cardFilterName}>{card.name}</Text>
                          {card.activityCount > 0 && (
                            <Text style={styles.cardActivityLabel}>
                              {card.activityCount} redemption{card.activityCount > 1 ? 's' : ''}
                            </Text>
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              );
            })}
          </ScrollView>

          <TouchableOpacity 
            style={styles.applyButton}
            onPress={() => setFilterModalVisible(false)}
          >
            <Text style={styles.applyButtonText}>Apply Filters</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container} edges={['right', 'left']}>
      <StatusBar style="dark" />
      <View style={styles.container}>
        {/* Sticky Header */}
        <Animated.View style={[
          styles.stickyHeader,
          collapsedHeaderStyle,
          {
            height: COLLAPSED_HEADER_HEIGHT + insets.top,
            paddingTop: insets.top
          }
        ]}>
          <BlurView intensity={90} tint="light" style={StyleSheet.absoluteFill} />
          <View style={styles.collapsedHeaderContent}>
            <Text style={styles.collapsedHeaderTitle}>
              {currentYearData && `${currentYearData.year} ROI: ${Math.round((currentYearData.totalRedeemed / currentYearData.totalAnnualFees) * 100)}%`}
            </Text>
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
          </View>
        </Animated.View>

        {/* Large Header */}
        <Animated.View style={[
          styles.largeHeader,
          expandedHeaderStyle,
          {
            height: EXPANDED_HEADER_HEIGHT + insets.top,
            paddingTop: insets.top
          }
        ]}>
          <BlurView intensity={90} tint="light" style={StyleSheet.absoluteFill} />
          {currentYearData && (
            <YearlyProgress 
              year={currentYearData.year}
              totalRedeemed={currentYearData.totalRedeemed}
              totalAnnualFees={currentYearData.totalAnnualFees}
              trendData={[]}
              scrollProgress={headerScrollProgress}
              isSticky={false}
            />
          )}
        </Animated.View>

        {insightsData.yearSections.length > 0 ? (
          <Animated.ScrollView
            onScroll={scrollHandler}
            scrollEventThrottle={16}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingTop: EXPANDED_HEADER_HEIGHT + insets.top }
            ]}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.roiSection}>
              <CardRoiLeaderboard cardRois={insightsData.cardRois} />
            </View>

            {/* Monthly Performance Chart */}
            <View style={styles.chartSection}>
              <View style={styles.chartHeader}>
                <Text style={styles.chartTitle}>Monthly Performance</Text>
              </View>
              {currentYearSection && (
                <React.Fragment>
                  {(() => {
                    // Sort months chronologically (oldest to newest)
                    const monthsChrono = [...currentYearSection.data]
                      .sort((a, b) => parseMonthKey(a.monthKey).getTime() - parseMonthKey(b.monthKey).getTime());

                    // Calculate percentage and raw data arrays using shared calculation function
                    const pct = monthsChrono.map(m => {
                      const calculations = calculateRedemptionValues(m, false, false);
                      return m.totalPotentialValue > 0 
                        ? (calculations.totalRedeemedValue / m.totalPotentialValue) * 100 
                        : 0;
                    });
                    const raw = monthsChrono.map(m => {
                      const calculations = calculateRedemptionValues(m, false, false);
                      return {
                        redeemed: calculations.redeemedValue,
                        partial: calculations.partialValue,
                        potential: m.totalPotentialValue,
                        monthKey: m.monthKey
                      };
                    });

                    return (
                      <MiniBarChart
                        data={rightPad(pct, 6, 0)}
                        rawData={raw}
                      />
                    );
                  })()}
                </React.Fragment>
              )}
            </View>

            {/* Monthly History Section */}
            <View style={styles.monthlyHistoryHeader}>
              <Text style={styles.sectionTitle}>Monthly History</Text>
              <Text style={styles.filterHintText}>
                Tap the filter icon above to focus on specific perks or cards
              </Text>
            </View>

            {/* Monthly History List */}
            {currentYearSection?.data.map((month, index) => (
              <ErrorBoundary key={month.monthKey}>
                <MonthSummaryCard
                  summary={month}
                  isExpanded={expandedMonthKey === month.monthKey}
                  onToggleExpand={() => handleToggleMonth(month.monthKey)}
                  perkStatusFilter={perkStatusFilter}
                  isFirstOverallCard={index === 0}
                  isEven={index % 2 === 0}
                />
              </ErrorBoundary>
            ))}
          </Animated.ScrollView>
        ) : (
          <InsightsEmptyState
            selectedCardCount={selectedCardIds.length}
            activeFilterCount={activeFilterCount}
          />
        )}

        {renderFilterModal()}
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
    backgroundColor: 'white',
  },
  headerContainer: {
    backgroundColor: Colors.light.background,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    zIndex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FAFAFE',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.light.text,
  },
  closeButton: {
    padding: 5,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginTop: 15,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  selectAllRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  selectAllButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: Colors.light.background,
    borderWidth: 1,
    borderColor: Colors.light.tint,
  },
  selectButtonText: {
    color: Colors.light.tint,
    fontSize: 14,
    fontWeight: '500',
  },
  cardsScrollView: {
    maxHeight: 250,
    marginVertical: 10,
  },
  issuerSection: {
    marginBottom: 10,
  },
  issuerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginBottom: 5,
  },
  cardFilterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E0E0E0',
    alignItems: 'center',
  },
  checkboxContainer: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    margin: -10,
    marginRight: 0,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#BDBDBD',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: Colors.light.tint,
    borderColor: Colors.light.tint,
  },
  cardNameContainer: {
    flex: 1,
  },
  cardFilterName: {
    fontSize: 15,
    color: Colors.light.text,
  },
  cardActivityLabel: {
    fontSize: 12,
    color: Colors.light.icon,
    marginTop: 2,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: TAB_BAR_OFFSET,
  },
  roiSection: {
    marginTop: 0,
  },
  chartSection: {
    marginTop: 12,
    marginHorizontal: 15,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    alignItems: 'center',
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
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
  placeholderModuleContainer: {
    width: '100%',
    justifyContent: 'center',
    backgroundColor: CARD_BACKGROUND_COLOR,
    borderRadius: 8,
    marginVertical: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  skeletonStub: {
    height: 48,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: CARD_BACKGROUND_COLOR,
    borderRadius: 8,
    marginVertical: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  skeletonStubText: {
    fontSize: 14,
    color: Colors.light.icon, 
    textAlign: 'center',
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
  applyButton: {
    backgroundColor: Colors.light.tint,
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 24,
    marginHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  applyButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 0.5,
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
  collapsedHeaderTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1C1C1E',
    flex: 1,
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
  perkStatusContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
    gap: 8,
  },
  perkStatusChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.light.icon,
    backgroundColor: 'rgba(0,0,0,0.03)',
  },
  perkStatusChipSelected: {
    backgroundColor: Colors.light.tint,
    borderColor: Colors.light.tint,
  },
  perkStatusChipText: {
    fontSize: 14,
    color: Colors.light.text,
    fontWeight: '500',
  },
  perkStatusChipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
}); 