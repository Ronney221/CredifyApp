import React, { useState, useMemo, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, UIManager, SectionList, SectionListData, DefaultSectionT, Modal, Switch, Button, Pressable, Alert } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors'; // Assuming you have a Colors constant
import { Card, Benefit, allCards, CardPerk } from '../../src/data/card-data'; // Assuming path
import Animated, { FadeIn, FadeOut, Layout, useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated'; // Added Reanimated imports
import AsyncStorage from '@react-native-async-storage/async-storage'; // Added AsyncStorage
import { Svg, Polyline, Circle, Path, G, Text as SvgText } from 'react-native-svg'; // Added Circle, Path, G for gauge and SvgText
import YearlyProgress from '../components/insights/YearlyProgress'; // Import the new component
import FilterChipRow from '../components/insights/FilterChipRow'; // Import the new component
import CardRoiLeaderboard from '../components/insights/CardRoiLeaderboard'; // Import the new component
import {
  generateDummyInsightsData,
  InsightsData,
  YearSection,
  MonthlyRedemptionSummary,
  Achievement,
  PerkStatusFilter,
} from '../../src/data/dummy-insights';

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

// --- UI COMPONENTS ---

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
  isEven: boolean;
}

const MonthSummaryCard: React.FC<MonthSummaryCardProps> = ({ summary, isExpanded, onToggleExpand, perkStatusFilter, isFirstOverallCard, isEven }) => {
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

  const showCelebratoryEmptyState = perkStatusFilter !== 'all' && filteredPerkDetails.length === 0;

  return (
    <Pressable onPress={onToggleExpand} hitSlop={{top:8,left:8,right:8,bottom:8}}>
      <View style={[styles.monthCard, isEven ? styles.monthCardAltBackground : null]}>
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
            <Animated.View style={[animatedChevronStyle, styles.chevronWrapper]}>
              <Ionicons name="chevron-down" size={24} color={Colors.light.text} />
            </Animated.View>
          </View>
        </View>

        {isExpanded && (
          <Animated.View layout={Layout.springify()} entering={FadeIn.duration(200)} exiting={FadeOut.duration(200)} style={styles.perkDetailsContainer}>
            {showCelebratoryEmptyState ? (
              <View style={styles.celebratoryEmptyState}>
                <Text style={styles.celebratoryEmoji}>🎉</Text>
                <Text style={styles.celebratoryText}>
                  Nice! You didn't miss any perks for this filter.
                </Text>
              </View>
            ) : filteredPerkDetails.length > 0 ? filteredPerkDetails.map(perk => (
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
      <Text style={styles.skeletonStubText}>Missed-value heat-map is cooking – track unredeemed perks by day soon!</Text>
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

const OnboardingHint: React.FC = () => {
  return (
    <Animated.View entering={FadeIn.duration(800).delay(500)} style={styles.onboardingHintContainer}>
      <Text style={styles.onboardingHintText}>
        Every dollar you've squeezed from your cards this year.
      </Text>
    </Animated.View>
  );
}

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
    if (!isDataLoaded) {
      const defaultCardsWithActivity = defaultCardsForFilter.map(card => ({ ...card, activityCount: 0 }));
      return { yearSections: [], achievements: [], availableCardsForFilter: defaultCardsWithActivity, currentFeeCoverageStreak: 0, cardRois: [] };
    }
    const { yearSections, achievements, currentFeeCoverageStreak, availableCardsForFilter, cardRois } = generateDummyInsightsData(selectedCardIds);
    return { yearSections, achievements, availableCardsForFilter, currentFeeCoverageStreak, cardRois };
  }, [selectedCardIds, isDataLoaded]);

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
        isEven={index % 2 === 0}
        />
    );
  };

  const renderSectionHeader = ({ section }: { section: YearSection }) => {
    // Dummy trend data for the sparkline - in a real app, this would come from your data source
    const trendData = section.data.map(month => (month.totalRedeemedValue / month.cardFeesProportion) * 100).slice(0, 6).reverse();

    return (
      <View style={styles.sectionHeaderContainer}>
        <YearlyProgress
          year={section.year}
          totalRedeemed={section.totalRedeemedForYear}
          totalPotential={section.totalPotentialForYear}
          trendData={trendData}
        />
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

        <FilterChipRow
          perkStatusFilter={perkStatusFilter}
          setPerkStatusFilter={setPerkStatusFilter}
          selectedCardIds={selectedCardIds}
          availableCards={insightsData.availableCardsForFilter}
          onManageFilters={() => setFilterModalVisible(true)}
          activeFilterCount={activeFilterCount}
        />

        <OnboardingHint />

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
            ListHeaderComponent={
              <>
                <CardRoiLeaderboard cardRois={insightsData.cardRois} />
                {insightsData.currentFeeCoverageStreak && insightsData.currentFeeCoverageStreak >= 2 && (
                  <StreakBadge streakCount={insightsData.currentFeeCoverageStreak} />
                )}
                <View style={{height: 10}}/>
              </>
            }
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
                    
                    <Text style={styles.filterSectionTitle}>PERK STATUS</Text>
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

                    <Text style={styles.filterSectionTitle}>CARD</Text>
                    <ScrollView style={styles.cardsScrollView}>
                      {[...insightsData.availableCardsForFilter]
                        .sort((a, b) => b.activityCount - a.activityCount)
                        .map(card => {
                          const isSelected = selectedCardIds.includes(card.id);
                          return (
                              <TouchableOpacity key={card.id} style={styles.cardFilterRow} onPress={() => toggleCardSelection(card.id)}>
                                  <View style={styles.checkboxContainer}>
                                    <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                                        {isSelected && <Ionicons name="checkmark" size={14} color="#FFF" />}
                                    </View>
                                  </View>
                                  <View style={styles.cardNameContainer}>
                                    <Text style={styles.cardFilterName}>{card.name}</Text>
                                    {card.activityCount > 0 && (
                                      <Text style={styles.cardActivityLabel}>{card.activityCount} redemption{card.activityCount > 1 ? 's' : ''}</Text>
                                    )}
                                  </View>
                              </TouchableOpacity>
                          );
                      })}
                    </ScrollView>

                    <View style={styles.modalFooter}>
                      <TouchableOpacity style={[styles.footerButton, styles.clearButton]} onPress={() => {
                        setSelectedCardIds(defaultSelectedCardIds);
                        setPerkStatusFilter(defaultPerkStatusFilter);
                      }}>
                        <Text style={[styles.footerButtonText, styles.clearButtonText]}>Clear</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.footerButton, styles.applyButton]} onPress={() => setFilterModalVisible(false)}>
                        <Text style={[styles.footerButtonText, styles.applyButtonText]}>Apply</Text>
                      </TouchableOpacity>
                    </View>
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
    backgroundColor: '#FFFFFF', 
    borderRadius: 12, 
    marginBottom: 15,
    padding: 15, 
    shadowColor: 'rgba(0,0,0,0.08)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1, 
    shadowRadius: 10,
    elevation: 2, 
  },
  monthCardAltBackground: {
    backgroundColor: '#F7F7F7',
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
    maxHeight: '80%', // Limit height to allow for footer
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
    textTransform: 'uppercase',
    letterSpacing: 0.8,
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
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: SEPARATOR_COLOR,
    alignItems: 'center', // Align items vertically
  },
  cardFilterName: {
    fontSize: 15,
    color: Colors.light.text,
  },
  checkboxContainer: { // Added for alignment
    paddingVertical: 10, // Increase vertical hitbox
    paddingHorizontal: 12, // Increase horizontal hitbox
    margin: -10, // Counteract padding to keep visual layout
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
  cardNameContainer: { // Added for text layout
    flex: 1,
  },
  cardActivityLabel: {
    fontSize: 12,
    color: Colors.light.icon,
    marginTop: 2,
  },
  cardsScrollView: {
    maxHeight: 250, // Limit height of card list to ensure footer is visible
    marginVertical: 10,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: SEPARATOR_COLOR,
  },
  footerButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearButton: {
    backgroundColor: '#E5E5EA',
    marginRight: 10,
  },
  clearButtonText: {
    color: Colors.light.text,
  },
  applyButton: {
    backgroundColor: Colors.light.tint,
  },
  applyButtonText: {
    color: '#FFFFFF',
  },
  footerButtonText: {
    fontSize: 16,
    fontWeight: '600',
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
  celebratoryEmptyState: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  celebratoryEmoji: {
    fontSize: 24,
    marginBottom: 8,
  },
  celebratoryText: {
    fontSize: 14,
    color: Colors.light.icon,
    textAlign: 'center',
    lineHeight: 20,
  },
  onboardingHintContainer: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    alignItems: 'center',
  },
  onboardingHintText: {
    fontSize: 13,
    color: Colors.light.icon,
    textAlign: 'center',
    fontStyle: 'italic',
  },
}); 