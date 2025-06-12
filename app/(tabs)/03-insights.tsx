import React, { useState, useMemo, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, UIManager, SectionList, SectionListData, DefaultSectionT, Modal, Switch, Button, Pressable, Alert, ActivityIndicator, TextInput } from 'react-native';
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
import { MonthSummaryCard } from '../components/insights/MonthSummaryCard';
import { StreakBadge } from '../components/insights/StreakBadge';
import { FeeCoverageMeterChip } from '../components/insights/FeeCoverageMeterChip';
import { useAuth } from '../../contexts/AuthContext';
import { useUserCards } from '../hooks/useUserCards';
import { useFocusEffect } from '@react-navigation/native';

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
const defaultCardsForFilter = [
  { id: 'amex_gold', name: 'American Express Gold' },
  { id: 'chase_sapphire_preferred', name: 'Chase Sapphire Preferred' },
];

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
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
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
      <Text style={{ fontSize: 12, color: Colors.light.text, marginTop: 4 }}>Break-Even</Text>
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

export default function InsightsScreen() {
  const { user } = useAuth();
  const { 
    userCardsWithPerks, 
    isLoading: isLoadingUserCards,
    refreshUserCards 
  } = useUserCards();
  const insets = useSafeAreaInsets();
  const [expandedMonthKey, setExpandedMonthKey] = useState<string | null>(null);
  const sectionListRef = useRef<SectionList<MonthlyRedemptionSummary, YearSection>>(null);
  const [isFilterModalVisible, setFilterModalVisible] = useState(false);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [cardSearchQuery, setCardSearchQuery] = useState('');

  // Focus effect to refresh data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      console.log('[InsightsScreen] Screen focused, refreshing user cards');
      refreshUserCards();
    }, [refreshUserCards])
  );

  // Define default filter states
  const defaultPerkStatusFilter: PerkStatusFilter = 'all';
  const defaultSelectedCardIds = useMemo(() => defaultCardsForFilter.map(c => c.id), []);

  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);
  const [perkStatusFilter, setPerkStatusFilter] = useState<PerkStatusFilter>('all');
  const scrollYPosition = useRef(0); // For scroll position restoration

  // Transform user cards into the format needed for filtering
  const availableCardsForFilter = useMemo(() => {
    return userCardsWithPerks.map(({ card, perks }: UserCardWithPerks) => ({
      id: card.id,
      name: card.name,
      activityCount: perks.filter((p: CardPerk) => p.status === 'redeemed').length
    }));
  }, [userCardsWithPerks]);

  // Set default selected cards to all user cards and reset when cards change
  useEffect(() => {
    console.log('[InsightsScreen] Cards changed, updating selected cards');
    if (availableCardsForFilter.length > 0) {
      setSelectedCardIds(availableCardsForFilter.map((c: CardWithActivity) => c.id));
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
        const defaultCardsWithActivity = defaultCardsForFilter.map(card => ({ ...card, activityCount: 0 }));
        setInsightsData({ 
          yearSections: [], 
          achievements: [], 
          availableCardsForFilter: defaultCardsWithActivity, 
          currentFeeCoverageStreak: 0, 
          cardRois: [] 
        });
        return;
      }
    
      console.log('[InsightsScreen] Debug - Raw userCardsWithPerks:', JSON.stringify(userCardsWithPerks, null, 2));

      // Transform userCardsWithPerks to match the expected type
      const processedCards = userCardsWithPerks.map(({ card, perks }) => ({
        card: {
          id: card.id,
          name: card.name,
          benefits: card.benefits,
          annualFee: card.annualFee || 0,
        },
        perks: perks.map(perk => {
          console.log(`[InsightsScreen] Debug - Processing perk ${perk.name}:`, {
            originalStatus: perk.status,
            id: perk.id,
            definition_id: perk.definition_id,
            value: perk.value,
            period: perk.period
          });
          
          return {
            id: perk.id,
            definition_id: perk.definition_id,
            name: perk.name,
            value: perk.value,
            status: perk.status,
            period: perk.period,
          };
        }),
      }));

      console.log('[InsightsScreen] Debug - Processed cards:', JSON.stringify(processedCards, null, 2));

      const result = await generateDummyInsightsData(selectedCardIds, processedCards, user?.id);

      // Log the first month's data to verify what's being displayed
      if (result.yearSections.length > 0 && result.yearSections[0].data.length > 0) {
        const currentMonth = result.yearSections[0].data[0];
        console.log('[InsightsScreen] Debug - Current month data:', {
          monthYear: currentMonth.monthYear,
          totalRedeemed: currentMonth.totalRedeemedValue,
          totalPotential: currentMonth.totalPotentialValue,
          perksRedeemed: currentMonth.perksRedeemedCount,
          perksMissed: currentMonth.perksMissedCount,
          perkDetails: currentMonth.perkDetails.map(p => ({
            name: p.name,
            status: p.status,
            value: p.value
          }))
        });
      }

      setInsightsData(result);
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
    // Calculate trend data using only monthly perks
    const trendData = section.data.map(month => {
      const monthlyPerks = month.perkDetails.filter(perk => perk.period === 'monthly');
      const monthlyRedeemed = monthlyPerks.reduce((sum, perk) => 
        perk.status === 'redeemed' ? sum + perk.value : sum, 0
      );
      const monthlyPotential = monthlyPerks.reduce((sum, perk) => sum + perk.value, 0);
      return monthlyPotential > 0 ? (monthlyRedeemed / monthlyPotential) * 100 : 0;
    }).slice(0, 6).reverse();

    // Monthly data for the chart should also only include monthly perks
    const monthlyData = section.data.map(month => {
      const monthlyPerks = month.perkDetails.filter(perk => perk.period === 'monthly');
      return {
        redeemed: monthlyPerks.reduce((sum, perk) => 
          perk.status === 'redeemed' ? sum + perk.value : sum, 0
        ),
        potential: monthlyPerks.reduce((sum, perk) => sum + perk.value, 0)
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

  const handleCompareCards = () => {
    Alert.alert("Coming Soon!", "Compare Cards / ROI by Card feature is under development.");
  };

  const handleShare = () => {
    Alert.alert('Share feature coming soon!');
  };

  if (isLoadingUserCards || !isDataLoaded) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.light.tint} />
          <Text style={styles.loadingText}>Loading your insights...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.headerContainer}>
        <FilterChipRow
          perkStatusFilter={perkStatusFilter}
          setPerkStatusFilter={setPerkStatusFilter}
          selectedCardIds={selectedCardIds}
          availableCards={availableCardsForFilter}
          onManageFilters={() => setFilterModalVisible(true)}
          activeFilterCount={activeFilterCount}
        />
      </View>

      {insightsData.yearSections.length > 0 ? (
        <SectionList
          sections={insightsData.yearSections}
          keyExtractor={(item) => item.monthKey}
          renderItem={renderMonthSummaryCard}
          renderSectionHeader={renderSectionHeader}
          stickySectionHeadersEnabled={true}
          initialNumToRender={6}
          contentContainerStyle={styles.historySection}
          ListHeaderComponent={
            <>
              <OnboardingHint 
                perkStatusFilter={perkStatusFilter}
                selectedCardCount={selectedCardIds.length}
                defaultSelectedCardIds={defaultSelectedCardIds}
              />
              <CardRoiLeaderboard cardRois={insightsData.cardRois} />
              {insightsData.currentFeeCoverageStreak && insightsData.currentFeeCoverageStreak >= 2 && (
                <StreakBadge streakCount={insightsData.currentFeeCoverageStreak} />
              )}
              <View style={{height: 10}}/>
            </>
          }
          showsVerticalScrollIndicator={false}
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
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter Insights</Text>
              <TouchableOpacity 
                onPress={() => setFilterModalVisible(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color={Colors.light.text} />
              </TouchableOpacity>
            </View>
            
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

            <Text style={styles.filterSectionTitle}>CARDS</Text>
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color={Colors.light.icon} style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search cards..."
                placeholderTextColor={Colors.light.icon}
                value={cardSearchQuery}
                onChangeText={setCardSearchQuery}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {cardSearchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setCardSearchQuery('')} style={styles.clearSearchButton}>
                  <Ionicons name="close-circle" size={20} color={Colors.light.icon} />
                </TouchableOpacity>
              )}
            </View>
            <ScrollView style={styles.cardsScrollView}>
              {ISSUER_ORDER.map(issuer => {
                const cards = groupedCards[issuer] || [];
                const filteredCards = cards.filter(card => 
                  card.name.toLowerCase().includes(cardSearchQuery.toLowerCase())
                );
                
                if (filteredCards.length === 0) return null;
                
                return (
                  <View key={`issuer-${issuer}`} style={styles.issuerSection}>
                    <Text style={styles.issuerTitle}>{issuer}</Text>
                    {filteredCards.map(card => {
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

            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={[styles.footerButton, styles.clearButton]} 
                onPress={() => {
                  setSelectedCardIds([]);
                  setPerkStatusFilter('all');
                  setCardSearchQuery('');
                }}
              >
                <Text style={[styles.footerButtonText, styles.clearButtonText]}>Clear</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.footerButton, styles.applyButton]} 
                onPress={() => setFilterModalVisible(false)}
              >
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
  headerContainer: {
    backgroundColor: Colors.light.background,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    zIndex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#8e8e93',
  },
  historySection: { 
    paddingBottom: 80,
  },
  sectionHeaderContainer: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: Colors.light.background,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
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
    color: Colors.light.icon,
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
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.light.icon,
    borderRadius: 8,
    padding: 10,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
  },
  cardsScrollView: {
    maxHeight: 250,
    marginVertical: 10,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
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
  clearSearchButton: {
    padding: 5,
  },
}); 