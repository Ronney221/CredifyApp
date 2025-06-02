import React, { useState, useMemo, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, UIManager, SectionList, SectionListData, DefaultSectionT, Modal, Switch, Button, Pressable, Alert } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors'; // Assuming you have a Colors constant
import { Card, Benefit, allCards, CardPerk } from '../../src/data/card-data'; // Assuming path
import Animated, { FadeIn, FadeOut, Layout, useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated'; // Added Reanimated imports
import AsyncStorage from '@react-native-async-storage/async-storage'; // Added AsyncStorage
import { Svg, Polyline, Circle, Path, G, Text as SvgText } from 'react-native-svg'; // Added Circle, Path, G for gauge and SvgText
import ProgressDonut from '../components/home/ProgressDonut'; // Import ProgressDonut

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

type PerkStatusFilter = 'all' | 'redeemed' | 'missed';

interface PerkRedemptionDetail {
  id: string;
  name:string;
  value: number;
  status: 'redeemed' | 'missed';
  period: Benefit['period'];
}

interface MonthlyRedemptionSummary {
  monthYear: string; // e.g., "July 2024"
  monthKey: string; // Unique key for the month, e.g., "2024-07"
  totalRedeemedValue: number;
  totalPotentialValue: number;
  perksRedeemedCount: number;
  perksMissedCount: number;
  perkDetails: PerkRedemptionDetail[];
  cardFeesProportion: number; // For calculating "on pace for annual fee"
  allMonthlyPerksRedeemedThisMonth: boolean;
  coverageTrend: number[]; // Added for sparkline
}

interface Achievement {
  id: string;
  emoji: string;
  title: string;
  description: string;
}

interface YearSection extends DefaultSectionT {
  year: string;
  data: MonthlyRedemptionSummary[];
  totalRedeemedForYear: number;
  totalPotentialForYear: number;
}

interface InsightsData {
  yearSections: YearSection[]; // Changed from monthlySummaries
  achievements: Achievement[];
  availableCardsForFilter: { id: string; name: string }[];
  currentFeeCoverageStreak?: number; // Added for streak badge
}

// --- DUMMY DATA GENERATION ---
const generateDummyInsightsData = (selectedCards: string[]): Omit<InsightsData, 'availableCardsForFilter' | 'currentFeeCoverageStreak'> & { currentFeeCoverageStreak?: number } => {
  const insightsCards = allCards.filter(
    card => selectedCards.includes(card.id)
  );

  const monthlyDataByYear: Record<string, { شهرs: MonthlyRedemptionSummary[], yearTotalRedeemed: number, yearTotalPotential: number }> = {};
  const achievements: Achievement[] = [];
  const now = new Date();

  let consecutiveFeeCoverageMonths = 0;
  let highestSingleMonthRedemption = { month: '', value: 0 };
  const perkRedemptionStreaks: Record<string, number> = {}; // perkId: streakCount
  let consecutiveMonthsAllPerksRedeemed = 0;

  if (insightsCards.length === 0) {
    return { yearSections: [], achievements: [{
      id: 'no_cards_selected',
      emoji: '💳',
      title: 'No Cards Selected',
      description: 'Select cards in the filter to see insights.',
    }], currentFeeCoverageStreak: 0 };
  }

  for (let i = 5; i >= 0; i--) { 
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const yearStr = date.getFullYear().toString();
    const monthYearDisplay = date.toLocaleString('default', { month: 'long', year: 'numeric' });
    const monthKey = `${yearStr}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    if (!monthlyDataByYear[yearStr]) {
      monthlyDataByYear[yearStr] = { شهرs: [], yearTotalRedeemed: 0, yearTotalPotential: 0 };
    }

    let monthTotalRedeemed = 0;
    let monthTotalPotential = 0;
    let monthPerksRedeemed = 0;
    let monthPerksMissed = 0;
    const currentMonthPerkDetails: PerkRedemptionDetail[] = [];
    let allMonthlyPerksAvailableThisMonth = 0;
    let allMonthlyPerksRedeemedThisMonthCount = 0;

    let totalAnnualFeesForProration = 0;
    insightsCards.forEach(card => {
      totalAnnualFeesForProration += card.annualFee || 0;
    });
    const monthlyFeeProrationTarget = totalAnnualFeesForProration / 12;

    // Generate dummy coverage trend for the last 12 months
    const coverageTrend: number[] = Array.from({ length: 12 }, () => Math.floor(Math.random() * 101));

    insightsCards.forEach(card => {
      card.benefits.forEach(perk => {
        if (perk.period === 'monthly') {
          allMonthlyPerksAvailableThisMonth++;
          const isRedeemed = Math.random() > 0.4; // 60% chance of redeeming a monthly perk
          monthTotalPotential += perk.value;
          currentMonthPerkDetails.push({
            id: perk.definition_id, // Use definition_id for uniqueness
            name: perk.name,
            value: perk.value,
            status: isRedeemed ? 'redeemed' : 'missed',
            period: perk.period,
          });

          if (isRedeemed) {
            monthTotalRedeemed += perk.value;
            monthPerksRedeemed++;
            allMonthlyPerksRedeemedThisMonthCount++;
            perkRedemptionStreaks[perk.definition_id] = (perkRedemptionStreaks[perk.definition_id] || 0) + 1;
          } else {
            monthPerksMissed++;
            perkRedemptionStreaks[perk.definition_id] = 0; // Reset streak
          }
        }
        // TODO: Handle yearly/semi-annual/quarterly perks appropriately if they factor into monthly views
      });
    });
    
    const allCurrentMonthlyPerksRedeemed = allMonthlyPerksAvailableThisMonth > 0 && allMonthlyPerksRedeemedThisMonthCount === allMonthlyPerksAvailableThisMonth;

    const monthSummary: MonthlyRedemptionSummary = {
      monthKey,
      monthYear: monthYearDisplay,
      totalRedeemedValue: monthTotalRedeemed,
      totalPotentialValue: monthTotalPotential,
      perksRedeemedCount: monthPerksRedeemed,
      perksMissedCount: monthPerksMissed,
      perkDetails: currentMonthPerkDetails,
      cardFeesProportion: monthlyFeeProrationTarget > 0 ? monthlyFeeProrationTarget : 0.01, // Avoid division by zero for feeProration
      allMonthlyPerksRedeemedThisMonth: allCurrentMonthlyPerksRedeemed,
      coverageTrend, // Added
    };
    // Add to the beginning of the array for that year to keep months in reverse chronological order within the year section
    monthlyDataByYear[yearStr].شهرs.unshift(monthSummary);
    monthlyDataByYear[yearStr].yearTotalRedeemed += monthTotalRedeemed;
    monthlyDataByYear[yearStr].yearTotalPotential += monthTotalPotential;

    // Achievement Calculations
    if (monthlyFeeProrationTarget > 0 && monthTotalRedeemed >= monthlyFeeProrationTarget) {
      consecutiveFeeCoverageMonths++;
    } else {
      consecutiveFeeCoverageMonths = 0;
    }

    if (monthTotalRedeemed > highestSingleMonthRedemption.value) {
      highestSingleMonthRedemption = { month: monthYearDisplay, value: monthTotalRedeemed };
    }
    
    if(allCurrentMonthlyPerksRedeemed) {
      consecutiveMonthsAllPerksRedeemed++;
    } else {
      consecutiveMonthsAllPerksRedeemed = 0;
    }
  }

  // Populate Achievements based on calculated streaks/data
  if (highestSingleMonthRedemption.value > 0) {
    achievements.push({
      id: 'highest_month',
      emoji: '🏆',
      title: 'Top Month!',
      description: `Highest single-month redemption: $${highestSingleMonthRedemption.value.toFixed(0)} in ${highestSingleMonthRedemption.month}.`,
    });
  }

  if (consecutiveFeeCoverageMonths >= 2) { // Example: 2 months for a streak
    achievements.push({
      id: 'fee_coverage_streak',
      emoji: '🔥',
      title: 'Fee Crusher!',
      description: `${consecutiveFeeCoverageMonths} consecutive months >50% fees covered.`,
    });
  }
  
  if (consecutiveMonthsAllPerksRedeemed >= 2) {
     achievements.push({
      id: 'all_perks_streak',
      emoji: '💯',
      title: 'Perk Perfectionist!',
      description: `${consecutiveMonthsAllPerksRedeemed} consecutive months redeeming all available monthly perks.`,
    });
  }

  for (const perkId in perkRedemptionStreaks) {
    if (perkRedemptionStreaks[perkId] >= 3) { // Example: 3 months for a specific perk streak
      const perkDetail = allCards.flatMap(c => c.benefits).find(p => p.definition_id === perkId);
      if (perkDetail) {
        achievements.push({
          id: `perk_streak_${perkId}`,
          emoji: '🎯',
          title: `${perkDetail.name} Streak!`,
          description: `Redeemed ${perkDetail.name} for ${perkRedemptionStreaks[perkId]} months in a row.`,
        });
      }
    }
  }
   // Add a fallback if no achievements yet
   if (achievements.length === 0 && insightsCards.length > 0) {
    achievements.push({
      id: 'getting_started',
      emoji: '🚀',
      title: 'Getting Started!',
      description: 'Keep redeeming perks to unlock achievements and see your progress.',
    });
  }

  // Convert monthlyDataByYear to yearSections, sorted by year descending (most recent year first)
  const yearSections: YearSection[] = Object.keys(monthlyDataByYear)
    .sort((a, b) => parseInt(b) - parseInt(a)) // Sort years descending
    .map(year => ({
      year: year,
      data: monthlyDataByYear[year].شهرs, // Months are already reverse chrono
      totalRedeemedForYear: monthlyDataByYear[year].yearTotalRedeemed,
      totalPotentialForYear: monthlyDataByYear[year].yearTotalPotential,
    }));

  return { yearSections, achievements, currentFeeCoverageStreak: consecutiveFeeCoverageMonths >= 2 ? consecutiveFeeCoverageMonths : undefined };
};


// --- UI COMPONENTS ---

interface AchievementChipProps {
  achievement: Achievement;
}

const AchievementChip: React.FC<AchievementChipProps> = ({ achievement }) => {
  return (
    <View style={styles.achievementChip}>
      <Text style={styles.achievementEmoji}>{achievement.emoji}</Text>
      <View style={styles.achievementTextContainer}>
        <Text style={styles.achievementTitle}>{achievement.title}</Text>
        <Text style={styles.achievementDescription}>{achievement.description}</Text>
      </View>
    </View>
  );
};

interface MeterChipProps {
  value: number;
  displayTextType: 'full' | 'percentage_only';
}

const FeeCoverageMeterChip: React.FC<MeterChipProps> = ({ value, displayTextType }) => {
  let chipStyle = styles.meterChipGreen;
  let textStyle = styles.meterChipTextGreen;
  let iconName: keyof typeof Ionicons.glyphMap = 'checkmark-circle-outline';

  if (value < 50) {
    chipStyle = styles.meterChipGray;
    textStyle = styles.meterChipTextGray;
    iconName = 'alert-circle-outline';
  } else if (value < 90) { // Changed from < 100 to < 90 for Yellow
    chipStyle = styles.meterChipYellow;
    textStyle = styles.meterChipTextYellow;
    iconName = 'arrow-up-circle-outline';
  }
  const chipText = displayTextType === 'full' ? `${value.toFixed(0)}% fee coverage` : `${value.toFixed(0)}%`;

  return (
    <View style={[styles.meterChipBase, chipStyle]}>
      <Ionicons name={iconName} size={14} color={textStyle.color} style={styles.meterChipIcon} />
      <Text style={[styles.meterChipTextBase, textStyle]}>{chipText}</Text>
    </View>
  );
};

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

interface StreakBadgeProps {
  streakCount?: number;
}

const StreakBadge: React.FC<StreakBadgeProps> = ({ streakCount }) => {
  if (!streakCount || streakCount < 2) { // Minimum 2 month streak to show
    return null;
  }
  return (
    <Animated.View entering={FadeIn.duration(500)} style={styles.streakBadgeContainer}>
      <Text style={styles.streakBadgeText}>🔥 {streakCount}-month fee coverage streak!</Text>
    </Animated.View>
  );
};

interface MonthSummaryCardProps {
  summary: MonthlyRedemptionSummary;
  isExpanded: boolean;
  onToggleExpand: () => void;
  perkStatusFilter: PerkStatusFilter;
  isFirstOverallCard: boolean;
}

const MonthSummaryCard: React.FC<MonthSummaryCardProps> = ({ summary, isExpanded, onToggleExpand, perkStatusFilter, isFirstOverallCard }) => {
  const feeCoveragePercentage = summary.cardFeesProportion > 0 
    ? (summary.totalRedeemedValue / summary.cardFeesProportion) * 100 
    : 0;
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withTiming(isExpanded ? 180 : 0, { duration: 200 });
  }, [isExpanded, rotation]);

  const animatedChevronStyle = useAnimatedStyle(() => {
    return { transform: [{ rotate: `${rotation.value}deg` }] };
  });
  
  const filteredPerkDetails = useMemo(() => {
    if (perkStatusFilter === 'all') return summary.perkDetails;
    return summary.perkDetails.filter(perk => perk.status === perkStatusFilter);
  }, [summary.perkDetails, perkStatusFilter]);

  return (
    <Pressable onPress={onToggleExpand} hitSlop={{top:8,left:8,right:8,bottom:8}}>
      <View style={styles.monthCard}>
        <View style={styles.monthCardHeader}>
          <View style={styles.monthCardInfo}>
            <Text style={styles.monthYearText}>{summary.monthYear}</Text>
            <View style={styles.redeemedValueContainer}>
              <Text style={styles.monthRedeemedValue}>
                ${summary.totalRedeemedValue.toFixed(0)} redeemed
              </Text>
              {summary.totalPotentialValue > 0 && 
                <Text style={styles.monthPotentialValue}> of ${summary.totalPotentialValue.toFixed(0)}</Text>}
            </View>
            <Text style={styles.monthPerkCount}>
              {summary.perksRedeemedCount} perks used
            </Text>
          </View>
          <View style={styles.monthCardRightColumn}>
            {summary.cardFeesProportion > 0 && (
              <FeeCoverageMeterChip 
                value={feeCoveragePercentage} 
                displayTextType={isFirstOverallCard ? 'full' : 'percentage_only'}
              />
            )}
            <Sparkline data={summary.coverageTrend} height={30} width={80} color={Colors.light.tint} />
            <Animated.View style={[animatedChevronStyle, styles.chevronWrapper]}>
              <Ionicons name="chevron-down" size={24} color={Colors.light.text} />
            </Animated.View>
          </View>
        </View>

        {isExpanded && (
          <Animated.View layout={Layout.springify()} entering={FadeIn.duration(200)} exiting={FadeOut.duration(200)} style={styles.perkDetailsContainer}>
            {filteredPerkDetails.length > 0 ? filteredPerkDetails.map(perk => (
              <View key={perk.id} style={styles.perkDetailItem}>
                <Ionicons 
                  name={perk.status === 'redeemed' ? 'checkmark-circle' : 'close-circle'} 
                  size={20} 
                  color={perk.status === 'redeemed' ? SUCCESS_GREEN : ERROR_RED} 
                  style={styles.perkStatusIcon}
                />
                <View style={styles.perkNameContainer}>
                  <Text style={styles.perkName}>{perk.name}</Text>
                  <Text style={styles.perkValueDimmed}>(${perk.value.toFixed(0)})</Text>
                </View>
                <Text style={[
                    styles.perkStatusText, 
                    perk.status === 'redeemed' ? styles.redeemedText : styles.missedText
                ]}>
                  {perk.status === 'redeemed' ? 'Redeemed' : 'Missed'}
                </Text>
              </View>
            )) : <Text style={styles.noPerksText}>No perks match current filter.</Text>}
          </Animated.View>
        )}
      </View>
    </Pressable>
  );
};

const defaultCardsForFilter = [
  { id: 'amex_gold', name: 'American Express Gold' },
  { id: 'chase_sapphire_preferred', name: 'Chase Sapphire Preferred' },
];

const ASYNC_STORAGE_FILTER_KEY = 'insights_filters';

// --- NEW PLACEHOLDER COMPONENTS ---

const HeatMapPlaceholder: React.FC = () => {
  return (
    <View style={[styles.placeholderModuleContainer, styles.skeletonStub]}>
      <Text style={styles.skeletonStubText}>📅 Missed Value Heat-Map (Coming Soon!)</Text>
    </View>
  );
};

const ForecastDialPlaceholder: React.FC = () => {
  const size = 50; // Reduced size
  const strokeWidth = 5;
  const radius = (size - strokeWidth) / 2;
  const progress = 0.6; // Static progress
  const angle = 135 + progress * 270; 
  const circumference = radius * Math.PI * 2;

  const arcPath = `M ${size / 2 - radius * Math.cos(45 * Math.PI/180)} ${size / 2 + radius * Math.sin(45 * Math.PI/180)} A ${radius} ${radius} 0 1 1 ${size/2 + radius * Math.cos(45*Math.PI/180)} ${size/2 + radius * Math.sin(45*Math.PI/180)}`;

  return (
    <View style={styles.forecastDialContainer}>
      <View style={{ width: size, height: size * 0.85, alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <G transform={`rotate(-225 ${size/2} ${size/2})`}>
            <Path d={arcPath} stroke={Colors.light.icon} strokeWidth={strokeWidth} strokeOpacity={0.3} fill="none" />
            <Path d={arcPath} stroke={Colors.light.tint} strokeWidth={strokeWidth} strokeDasharray={circumference} strokeDashoffset={circumference * (1 - progress * (4/3))} fill="none" strokeLinecap="round"/>
          </G>
          <SvgText x={size/2} y={(size/2) + 4} fill={Colors.light.tint} fontSize="10" fontWeight="bold" textAnchor="middle">
            {`${Math.round(progress * 100)}%`}
          </SvgText>
        </Svg>
      </View>
      <Text style={styles.forecastDialLabel}>Break-Even</Text>
    </View>
  );
};

export default function InsightsScreen() {
  const insets = useSafeAreaInsets(); // For FAB positioning
  const [expandedMonthKey, setExpandedMonthKey] = useState<string | null>(null);
  const sectionListRef = useRef<SectionList<MonthlyRedemptionSummary, YearSection>>(null);
  const [isFilterModalVisible, setFilterModalVisible] = useState(false);
  
  // Define default filter states
  const defaultPerkStatusFilter: PerkStatusFilter = 'all';
  const defaultSelectedCardIds = useMemo(() => defaultCardsForFilter.map(c => c.id), []);

  const [selectedCardIds, setSelectedCardIds] = useState<string[]>(defaultSelectedCardIds);
  const [perkStatusFilter, setPerkStatusFilter] = useState<PerkStatusFilter>(defaultPerkStatusFilter);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const scrollYPosition = useRef(0); // For scroll position restoration

  // Load filters from AsyncStorage on mount
  useEffect(() => {
    const loadFilters = async () => {
      try {
        const storedFilters = await AsyncStorage.getItem(ASYNC_STORAGE_FILTER_KEY);
        if (storedFilters) {
          const parsedFilters = JSON.parse(storedFilters);
          setSelectedCardIds(parsedFilters.selectedCardIds || defaultCardsForFilter.map(c => c.id));
          setPerkStatusFilter(parsedFilters.perkStatusFilter || 'all');
        }
      } catch (e) {
        console.warn('Failed to load filters from storage', e);
      } finally {
        setIsDataLoaded(true);
      }
    };
    loadFilters();
  }, []);

  // Save filters to AsyncStorage when they change
  useEffect(() => {
    if (!isDataLoaded) return; // Don't save initial default state before loading finishes
    const saveFilters = async () => {
      try {
        const filtersToSave = JSON.stringify({ selectedCardIds, perkStatusFilter });
        await AsyncStorage.setItem(ASYNC_STORAGE_FILTER_KEY, filtersToSave);
      } catch (e) {
        console.warn('Failed to save filters to storage', e);
      }
    };
    saveFilters();
  }, [selectedCardIds, perkStatusFilter, isDataLoaded]);

  const insightsData = useMemo(() => {
    if (!isDataLoaded) return { yearSections: [], achievements: [], availableCardsForFilter: defaultCardsForFilter, currentFeeCoverageStreak: 0 };
    const { yearSections, achievements, currentFeeCoverageStreak } = generateDummyInsightsData(selectedCardIds);
    // availableCardsForFilter should come from allCards or a more dynamic source if cards can be added/removed by user elsewhere
    const availableCards = allCards.map(c => ({id: c.id, name: c.name }));
    return { yearSections, achievements, availableCardsForFilter: availableCards, currentFeeCoverageStreak };
  }, [selectedCardIds, isDataLoaded]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (perkStatusFilter !== defaultPerkStatusFilter) count++;
    // Check if selectedCardIds is different from the default set
    const sortedSelected = [...selectedCardIds].sort();
    const sortedDefault = [...defaultSelectedCardIds].sort();
    if (JSON.stringify(sortedSelected) !== JSON.stringify(sortedDefault)) count++;
    return count;
  }, [perkStatusFilter, selectedCardIds, defaultPerkStatusFilter, defaultSelectedCardIds]);

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
        />
    );
  };

  const renderSectionHeader = ({ section }: { section: YearSection }) => {
    const yearProgress = section.totalPotentialForYear > 0 ? section.totalRedeemedForYear / section.totalPotentialForYear : 0;
    const amountSavedThisYear = section.totalRedeemedForYear.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 });
    const potentialSavingsThisYear = section.totalPotentialForYear.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 });

    return (
      <View style={styles.sectionHeaderContainer}>
        <View style={styles.sectionHeaderDetails}>
            <Text style={styles.sectionListHeader}>{section.year}</Text>
            {/* Potentially add more year-specific summary text here if needed */}
        </View>
        <View style={styles.sectionHeaderDonutContainer}>
            <ProgressDonut 
                progress={yearProgress}
                size={80} // Smaller donut for header
                strokeWidth={5}
                amount={amountSavedThisYear} // Display redeemed amount
                label={`of ${potentialSavingsThisYear} potential`}
                detailLineOne="Total Saved This Year"
                detailLineTwo="" //  Can be empty or show something else
                color={Colors.light.tint} // Or a year-specific color theme
            />
        </View>
      </View>
    );
  };

  const handleCompareCards = () => {
    Alert.alert("Coming Soon!", "Compare Cards / ROI by Card feature is under development.");
  };

  const handleShare = () => {
    Alert.alert('Share feature coming soon!');
  };

  const toggleCardSelection = (cardId: string) => {
    setSelectedCardIds(prev => 
      prev.includes(cardId) ? prev.filter(id => id !== cardId) : [...prev, cardId]
    );
  };

  if (!isDataLoaded) {
    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.loadingContainer}>
                <Text>Loading insights...</Text>
            </View>
        </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
        {/* Header is now rendered by navigator */}

        {insightsData.currentFeeCoverageStreak && insightsData.currentFeeCoverageStreak >= 2 && (
          <StreakBadge streakCount={insightsData.currentFeeCoverageStreak} />
        )}
        
        <View style={styles.roiPlaceholderContainer}>
          <Text style={styles.placeholderTitleSmall}>🏆 Card ROI Leaderboard (Coming Soon!)</Text>
        </View>

        {insightsData.achievements.length > 0 && (
          <View style={styles.achievementsSectionContainer}>
            <Text style={styles.sectionTitle}>Achievements</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.achievementsScroll}>
              {insightsData.achievements.map(ach => (
                <AchievementChip key={ach.id} achievement={ach} />
              ))}
            </ScrollView>
          </View>
        )}
        
        {insightsData.yearSections.length > 0 ? (
            <SectionList<MonthlyRedemptionSummary, YearSection>
            ref={sectionListRef}
            sections={insightsData.yearSections}
            keyExtractor={(item) => item.monthKey}
            renderItem={renderMonthSummaryCard}
            renderSectionHeader={renderSectionHeader}
            stickySectionHeadersEnabled={true}
            initialNumToRender={6} /* Added initialNumToRender */
            onScroll={(event) => { /* Store scroll position */
              scrollYPosition.current = event.nativeEvent.contentOffset.y;
            }}
            scrollEventThrottle={16}
            contentContainerStyle={styles.historySection}
            ListHeaderComponent={<View style={{height: 10}}/>}
            showsVerticalScrollIndicator={false}
            ListFooterComponent={() => (
              <View style={styles.placeholdersContainer}>
                <HeatMapPlaceholder />
              </View>
            )}
            />
        ) : (
            <View style={styles.emptyStateContainer}>
                <Text style={styles.emptyStateText}>No insights to display.</Text>
                 {(selectedCardIds.length === 0 || activeFilterCount > 0) && 
                    <Text style={styles.emptyStateSubText}>Try adjusting your filters or selecting cards.</Text>}
            </View>
        )}

        {/* Active Filter Chip - positioned near FAB or above list */}
        {activeFilterCount > 0 && (
            <TouchableOpacity 
                style={[styles.activeFilterChip, { bottom: insets.bottom + 16 + 48 + 10 }]} // Position above FAB
                onPress={() => setFilterModalVisible(true)}
            >
                <Ionicons name="options-outline" size={16} color={Colors.dark.text} />
                <Text style={styles.activeFilterChipText}>{activeFilterCount} filter{activeFilterCount > 1 ? 's' : ''} active</Text>
            </TouchableOpacity>
        )}

        {/* Filter FAB */}
        <TouchableOpacity style={[styles.fab, { bottom: insets.bottom + 16 }]} onPress={() => setFilterModalVisible(true)}>
            <Ionicons name="filter" size={24} color={Colors.dark.text} />{/* Ensure icon color contrasts with new FAB bg*/}
        </TouchableOpacity>

        {/* Filter Modal */}
        <Modal
            animationType="slide"
            transparent={true}
            visible={isFilterModalVisible}
            onRequestClose={() => setFilterModalVisible(false)}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>Filter Insights</Text>
                    
                    <Text style={styles.filterSectionTitle}>Perk Status</Text>
                    <View style={styles.filterOptionRow}>
                        {(['all', 'redeemed', 'missed'] as PerkStatusFilter[]).map(status => (
                            <TouchableOpacity 
                                key={status} 
                                style={[styles.filterButton, perkStatusFilter === status && styles.filterButtonSelected]}
                                onPress={() => setPerkStatusFilter(status)}
                            >
                                <Text style={[styles.filterButtonText, perkStatusFilter === status && styles.filterButtonTextSelected]}>
                                    {status.charAt(0).toUpperCase() + status.slice(1)}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <Text style={styles.filterSectionTitle}>Cards</Text>
                    {insightsData.availableCardsForFilter.map(card => (
                        <View key={card.id} style={styles.cardFilterRow}>
                            <Text style={styles.cardFilterName}>{card.name}</Text>
                            <Switch 
                                trackColor={{ false: '#767577', true: Colors.light.tint }}
                                thumbColor={selectedCardIds.includes(card.id) ? Colors.light.tint : '#f4f3f4'}
                                ios_backgroundColor="#3e3e3e"
                                onValueChange={() => toggleCardSelection(card.id)}
                                value={selectedCardIds.includes(card.id)}
                            />
                        </View>
                    ))}

                    <Button title="Apply Filters" onPress={() => setFilterModalVisible(false)} /> 
                </View>
            </View>
        </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  roiPlaceholderContainer: {
    paddingVertical: 8,
    alignItems: 'center',
    marginBottom: 5,
  },
  achievementsSectionContainer: { 
    paddingVertical: 10, 
    backgroundColor: Colors.light.background, 
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.light.text,
    paddingHorizontal: 20,
    marginBottom: 10, 
  },
  achievementsScroll: {
    paddingHorizontal: 12,
    paddingBottom: 10, 
  },
  achievementChip: {
    backgroundColor: ACCENT_YELLOW_BACKGROUND, 
    borderRadius: 8, 
    paddingVertical: 10, 
    paddingHorizontal: 12,
    marginRight: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 }, 
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    minWidth: 250, 
  },
  achievementEmoji: {
    fontSize: 24,
    marginRight: 10,
  },
  achievementTextContainer: {
    flex: 1,
  },
  achievementTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginBottom: 2,
  },
  achievementDescription: {
    fontSize: 11,
    color: Colors.light.icon, 
    flexWrap: 'wrap',
  },
  historySection: { 
    paddingHorizontal: 15,
    paddingBottom: 80,
  },
  sectionHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: Colors.light.background, // Ensure background for sticky header
    borderBottomWidth: 1,
    borderBottomColor: SEPARATOR_COLOR, 
  },
  sectionHeaderDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  sectionHeaderDonutContainer: {
    // Align donut to the right, adjust as needed
  },
  sectionListHeader: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.light.text,
  },
  forecastDialContainer: {
    alignItems: 'center',
  },
  forecastDialLabel: {
    fontSize: 10,
    color: Colors.light.icon,
    marginTop: -5,
  },
  monthCard: {
    backgroundColor: CARD_BACKGROUND_COLOR, 
    borderRadius: 8, 
    marginBottom: 15,
    padding: 12, 
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1, 
    shadowRadius: 3,
    elevation: 1, 
  },
  monthCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start', 
  },
  monthCardInfo: { 
    flex: 1, 
    marginRight: 8, 
  },
  monthCardRightColumn: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    minHeight: 70, 
  },
  chevronWrapper: {
    marginTop: 'auto', 
  },
  redeemedValueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  monthYearText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 6,
  },
  monthRedeemedValue: {
    fontSize: 17,
    color: Colors.light.tint, 
    fontWeight: '600',
  },
  monthPotentialValue: {
    fontSize: 15,
    color: Colors.light.text,
    opacity: 0.7,
    marginLeft: 4,
  },
  monthPerkCount: {
    fontSize: 12,
    color: SUBTLE_GRAY_TEXT,
    opacity: 0.6,
    marginBottom: 8, 
  },
  meterChipBase: {
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderRadius: 16,
    alignSelf: 'flex-end',
    marginBottom: 8,
    borderWidth: 1, 
    flexDirection: 'row',
    alignItems: 'center',
  },
  meterChipIcon: {
    marginRight: 4,
  },
  meterChipTextBase: {
    fontSize: 12,
    fontWeight: '500',
  },
  meterChipGreen: {
    backgroundColor: SUCCESS_GREEN_BACKGROUND,
    borderColor: SUCCESS_GREEN,
  },
  meterChipTextGreen: {
    color: SUCCESS_GREEN,
  },
  meterChipYellow: {
    backgroundColor: WARNING_YELLOW_BACKGROUND,
    borderColor: WARNING_YELLOW,
  },
  meterChipTextYellow: {
    color: Colors.light.text,
  },
  meterChipGray: {
    backgroundColor: NEUTRAL_GRAY_BACKGROUND,
    borderColor: NEUTRAL_GRAY_COLOR,
  },
  meterChipTextGray: {
    color: NEUTRAL_GRAY_COLOR,
  },
  perkDetailsContainer: {
    marginTop: 15,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: SEPARATOR_COLOR, 
    overflow: 'hidden', 
  },
  perkDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10, 
  },
  perkStatusIcon: {
    marginRight: 10,
  },
  perkNameContainer: { 
    flex: 1,
    flexDirection: 'row',
    alignItems: 'baseline', 
  },
  perkName: {
    fontSize: 14,
    color: Colors.light.text,
    marginRight: 4, 
  },
  perkValueDimmed: {
    fontSize: 13,
    color: SUBTLE_GRAY_TEXT,
  },
  perkStatusText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 'auto', 
  },
  redeemedText: {
    color: SUCCESS_GREEN,
  },
  missedText: {
    color: ERROR_RED,
  },
  noPerksText: {
    fontSize: 14,
    color: SUBTLE_GRAY_TEXT, 
    textAlign: 'center',
    paddingVertical: 10,
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyStateSubText: {
    fontSize: 14,
    color: SUBTLE_GRAY_TEXT,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 10,
    backgroundColor: SECONDARY_COLOR, // Use defined secondary color
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6, 
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    backgroundColor: CARD_BACKGROUND_COLOR, 
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginBottom: 20,
    textAlign: 'center',
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginTop: 15,
    marginBottom: 10,
  },
  filterOptionRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 15,
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.light.icon,
  },
  filterButtonSelected: {
    backgroundColor: Colors.light.tint,
    borderColor: Colors.light.tint,
  },
  filterButtonText: {
    color: Colors.light.text,
  },
  filterButtonTextSelected: {
    color: Colors.light.background, 
  },
  cardFilterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: SEPARATOR_COLOR,
  },
  cardFilterName: {
    fontSize: 15,
    color: Colors.light.text,
  },
  streakBadgeContainer: {
    backgroundColor: ACCENT_YELLOW_BACKGROUND,
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    alignSelf: 'center',
    marginVertical: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  streakBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
  },
  placeholdersContainer: {
    paddingHorizontal: 15,
    paddingBottom: 20,
    alignItems: 'center',
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
  placeholderTitleSmall: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.light.icon,
    marginBottom: 5,
    textAlign: 'center',
  },
  dialPlaceholderText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: Colors.light.tint,
  },
  activeFilterChip: {
    position: 'absolute',
    right: 10 + 16, // Align with FAB horizontally
    backgroundColor: Colors.light.tint, // Or another contrasting color
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 4,
  },
  activeFilterChipText: {
    color: Colors.dark.text, // Ensure text is readable on chip background
    fontSize: 13,
    fontWeight: '500',
    marginLeft: 6,
  },
}); 