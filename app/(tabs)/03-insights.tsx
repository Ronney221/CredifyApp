import React, { useState, useMemo, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, UIManager, SectionList, SectionListData, DefaultSectionT, Modal, Switch, Button } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors'; // Assuming you have a Colors constant
import { Card, Benefit, allCards, CardPerk } from '../../src/data/card-data'; // Assuming path
import Animated, { FadeIn, FadeOut, Layout } from 'react-native-reanimated'; // Added Reanimated imports
import AsyncStorage from '@react-native-async-storage/async-storage'; // Added AsyncStorage

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
}

interface InsightsData {
  yearSections: YearSection[]; // Changed from monthlySummaries
  achievements: Achievement[];
  availableCardsForFilter: { id: string; name: string }[];
}

// --- DUMMY DATA GENERATION ---
const generateDummyInsightsData = (selectedCards: string[]): Omit<InsightsData, 'availableCardsForFilter'> => {
  const insightsCards = allCards.filter(
    card => selectedCards.includes(card.id)
  );

  const monthlyDataByYear: Record<string, MonthlyRedemptionSummary[]> = {};
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
    }] };
  }

  for (let i = 5; i >= 0; i--) { 
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const yearStr = date.getFullYear().toString();
    const monthYearDisplay = date.toLocaleString('default', { month: 'long', year: 'numeric' });
    const monthKey = `${yearStr}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    if (!monthlyDataByYear[yearStr]) {
      monthlyDataByYear[yearStr] = [];
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
    };
    // Add to the beginning of the array for that year to keep months in reverse chronological order within the year section
    monthlyDataByYear[yearStr].unshift(monthSummary);

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
      data: monthlyDataByYear[year], // Months are already reverse chrono within the year due to unshift
    }));

  return { yearSections, achievements };
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
  value: number; // Percentage value (e.g., 104 for 104%)
  displayTextType: 'full' | 'percentage_only';
}

const FeeCoverageMeterChip: React.FC<MeterChipProps> = ({ value, displayTextType }) => {
  let chipStyle = styles.meterChipGreen;
  let textStyle = styles.meterChipTextGreen;
  const chipText = displayTextType === 'full' ? `${value.toFixed(0)}% fee coverage` : `${value.toFixed(0)}%`;

  if (value < 50) {
    chipStyle = styles.meterChipGray; // Changed from Red to Gray
    textStyle = styles.meterChipTextGray;
  } else if (value < 90) { // Changed from < 100 to < 90 for Yellow
    chipStyle = styles.meterChipYellow;
    textStyle = styles.meterChipTextYellow;
  }
  // Default is Green (>=90)

  return (
    <View style={[styles.meterChipBase, chipStyle]}>
      <Text style={[styles.meterChipTextBase, textStyle]}>{chipText}</Text>
    </View>
  );
};

interface MonthSummaryCardProps {
  summary: MonthlyRedemptionSummary;
  isExpanded: boolean;
  onToggleExpand: () => void;
  perkStatusFilter: PerkStatusFilter;
  isFirstOverallCard: boolean; // New prop
}

const MonthSummaryCard: React.FC<MonthSummaryCardProps> = ({ summary, isExpanded, onToggleExpand, perkStatusFilter, isFirstOverallCard }) => {
  const feeCoveragePercentage = summary.cardFeesProportion > 0 
    ? (summary.totalRedeemedValue / summary.cardFeesProportion) * 100 
    : 0;
  
  const filteredPerkDetails = useMemo(() => {
    if (perkStatusFilter === 'all') return summary.perkDetails;
    return summary.perkDetails.filter(perk => perk.status === perkStatusFilter);
  }, [summary.perkDetails, perkStatusFilter]);
  
  return (
    <View style={styles.monthCard}>
      <TouchableOpacity onPress={onToggleExpand} activeOpacity={0.7} style={styles.monthCardHeader}>
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
        {/* Right aligned Chevron and Chip Container */}
        <View style={styles.monthCardRightAlignContainer}>
            <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={24} color={Colors.light.text} />
            {summary.cardFeesProportion > 0 && (
                <FeeCoverageMeterChip 
                    value={feeCoveragePercentage} 
                    displayTextType={isFirstOverallCard ? 'full' : 'percentage_only'}
                />
            )}
        </View>
      </TouchableOpacity>

      {isExpanded && (
        <Animated.View layout={Layout.springify()} entering={FadeIn.duration(200)} exiting={FadeOut.duration(200)} style={styles.perkDetailsContainer}>
          {filteredPerkDetails.length > 0 ? filteredPerkDetails.map(perk => (
            <View key={perk.id} style={styles.perkDetailItem}>
              <Ionicons 
                name={perk.status === 'redeemed' ? 'checkmark-circle' : 'close-circle'} 
                size={20} 
                color={perk.status === 'redeemed' ? SUCCESS_GREEN : ERROR_RED_BACKGROUND} 
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
  );
};

const defaultCardsForFilter = [
  { id: 'amex_gold', name: 'American Express Gold' },
  { id: 'chase_sapphire_preferred', name: 'Chase Sapphire Preferred' },
];

const ASYNC_STORAGE_FILTER_KEY = 'insights_filters';

export default function InsightsScreen() {
  const [expandedMonthKey, setExpandedMonthKey] = useState<string | null>(null);
  const sectionListRef = useRef<SectionList<MonthlyRedemptionSummary, YearSection>>(null);
  const [isFilterModalVisible, setFilterModalVisible] = useState(false);
  
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>(defaultCardsForFilter.map(c => c.id));
  const [perkStatusFilter, setPerkStatusFilter] = useState<PerkStatusFilter>('all');
  const [isDataLoaded, setIsDataLoaded] = useState(false);

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
    if (!isDataLoaded) return { yearSections: [], achievements: [], availableCardsForFilter: defaultCardsForFilter }; // Return empty while loading or before defaults applied
    const { yearSections, achievements } = generateDummyInsightsData(selectedCardIds);
    return { yearSections, achievements, availableCardsForFilter: defaultCardsForFilter };
  }, [selectedCardIds, isDataLoaded]);

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

  const renderSectionHeader = ({ section }: { section: YearSection }) => (
    <Text style={styles.sectionListHeader}>{section.year}</Text>
  );

  const handleShare = () => {
    // Placeholder for actual sharing logic
    alert('Share feature coming soon!');
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
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <View style={styles.mainHeaderContainer}> {/* Renamed for clarity */}
            <View style={styles.headerLeftPlaceholder} />
            <Text style={styles.headerTitle}>Your Redemption Journey</Text>
            <TouchableOpacity onPress={handleShare} style={styles.headerButton}>
                <Ionicons name="share-outline" size={24} color={Colors.light.text} />
            </TouchableOpacity>
        </View>
        <View style={styles.headerDivider} />

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
            contentContainerStyle={styles.historySection}
            ListHeaderComponent={<View style={{height: 10}}/>}
            showsVerticalScrollIndicator={false}
            />
        ) : (
            <View style={styles.emptyStateContainer}>
                <Text style={styles.emptyStateText}>No insights to display.</Text>
                 {selectedCardIds.length === 0 && 
                    <Text style={styles.emptyStateSubText}>Try selecting some cards in the filter.</Text>}
            </View>
        )}

        {/* Filter FAB */}
        <TouchableOpacity style={styles.fab} onPress={() => setFilterModalVisible(true)}>
            <Ionicons name="filter" size={24} color={Colors.light.background} />
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
    backgroundColor: Colors.light.background, // Use app's background color
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainHeaderContainer: { // Renamed for clarity from headerContainer
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15, 
    paddingTop: 16, // Adjusted as per feedback
    backgroundColor: Colors.light.background, 
  },
  headerLeftPlaceholder: {
    width: 24, 
  },
  headerTitle: {
    fontSize: 22, 
    fontWeight: 'bold',
    color: Colors.light.text,
    textAlign: 'center',
  },
  headerButton: {
    padding: 5, 
  },
  headerDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: DIVIDER_COLOR_WITH_OPACITY, // Updated color
    width: '100%',
    marginTop: 10, 
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
  sectionListHeader: { 
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.light.text,
    backgroundColor: Colors.light.background, 
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: SEPARATOR_COLOR,
  },
  achievementsScroll: {
    paddingHorizontal: 12, // Adjusted as per feedback
    paddingBottom: 10, 
  },
  achievementChip: {
    backgroundColor: ACCENT_YELLOW_BACKGROUND, 
    borderRadius: 8, 
    paddingVertical: 10, 
    paddingHorizontal: 12, // Adjusted as per feedback
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
    fontSize: 14, // Adjusted for caption1 feel
    fontWeight: 'bold',
    color: Colors.light.text,
    marginBottom: 2,
  },
  achievementDescription: {
    fontSize: 11, // Adjusted for caption1 feel
    color: Colors.light.icon, 
    flexWrap: 'wrap',
  },
  historySection: { 
    paddingHorizontal: 15,
    paddingBottom: 80, 
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
    // alignItems: 'flex-start', // Removed to allow right container to define its own alignment
  },
  monthCardInfo: {
    flex: 1, 
    marginRight: 8, 
    // Removed alignItems: flex-start to allow natural flow or specific alignment below
  },
  monthCardRightAlignContainer: { // New container for chevron and chip
    alignItems: 'flex-end', // Right align items here
    // justifyContent: 'space-between', // If chevron and chip need space between them vertically
  },
  redeemedValueContainer: { // To group redeemed and potential value for text styling
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
    fontSize: 17, // title3
    color: Colors.light.tint, 
    fontWeight: '600', // title3
    // marginBottom: 4, // Moved to container
  },
  monthPotentialValue: {
    fontSize: 15, // body
    color: Colors.light.text, // Base color before opacity
    opacity: 0.7, // body opacity
    marginLeft: 4, // Space after redeemed value
  },
  monthPerkCount: {
    fontSize: 12, // caption1
    color: SUBTLE_GRAY_TEXT, // Base color before opacity
    opacity: 0.6, // caption1 opacity
    marginBottom: 8, 
  },
  meterChipBase: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    // alignSelf: 'flex-start', // Will be controlled by parent container monthCardRightAlignContainer
    marginTop: 4,
    borderWidth: 1, 
  },
  meterChipTextBase: {
    fontSize: 13,
    fontWeight: '500',
  },
  meterChipGreen: {
    backgroundColor: SUCCESS_GREEN_BACKGROUND,
    borderColor: SUCCESS_GREEN,
  },
  meterChipTextGreen: {
    color: SUCCESS_GREEN,
  },
  meterChipYellow: { // New Yellow style
    backgroundColor: WARNING_YELLOW_BACKGROUND,
    borderColor: WARNING_YELLOW,
  },
  meterChipTextYellow: {
    color: Colors.light.text, // Dark text on light yellow for contrast
  },
  meterChipGray: { // New Gray style
    backgroundColor: NEUTRAL_GRAY_BACKGROUND,
    borderColor: NEUTRAL_GRAY_COLOR,
  },
  meterChipTextGray: {
    color: NEUTRAL_GRAY_COLOR,
  },
  // ERROR_RED styles are kept for perk status, but meter chip uses Gray now for <50%
  // meterChipRed: { ... }
  // meterChipTextRed: { ... }
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
    color: ERROR_RED_BACKGROUND, // Changed from ERROR_RED for consistency if it was a text color before
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
    bottom: 10,
    backgroundColor: Colors.light.tint,
    borderRadius: 28, 
    width: 56,
    height: 56,
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
}); 