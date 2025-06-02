import React, { useState, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, UIManager, SectionList, SectionListData, DefaultSectionT } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors'; // Assuming you have a Colors constant
import { Card, Benefit, allCards } from '../../src/data/card-data'; // Assuming path
import Animated, { FadeIn, FadeOut, Layout } from 'react-native-reanimated'; // Added Reanimated imports

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// --- CONSTANTS FOR COLORS (to avoid magic strings and for consistency) ---
const ACCENT_YELLOW_BACKGROUND = '#FFFBEA'; // For achievement pills
const SUCCESS_GREEN = '#34C759';
const SUCCESS_GREEN_BACKGROUND = 'rgba(52, 199, 89, 0.1)';
const WARNING_ORANGE = '#FF9F0A'; // Updated as per user request
const WARNING_ORANGE_BACKGROUND = 'rgba(255, 159, 10, 0.1)'; // Adjusted to match #FF9F0A
const ERROR_RED = '#FF3B30';
const ERROR_RED_BACKGROUND = 'rgba(255, 59, 48, 0.1)';
const SUBTLE_GRAY_TEXT = Colors.light.icon; // For dimmed perk values
const CARD_BACKGROUND_COLOR = '#F8F8F8';
const SEPARATOR_COLOR = '#E0E0E0';

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
}

// --- DUMMY DATA GENERATION ---
const generateDummyInsightsData = (): InsightsData => {
  const insightsCards = allCards.filter(
    card => card.id === 'amex_gold' || card.id === 'chase_sapphire_preferred'
  );

  const monthlyDataByYear: Record<string, MonthlyRedemptionSummary[]> = {};
  const achievements: Achievement[] = [];
  const now = new Date();

  let consecutiveFeeCoverageMonths = 0;
  let highestSingleMonthRedemption = { month: '', value: 0 };
  const perkRedemptionStreaks: Record<string, number> = {}; // perkId: streakCount
  let consecutiveMonthsAllPerksRedeemed = 0;

  // Generate for the last 6 months, ensuring chronological order for streak calculations (oldest first)
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
      const perkDetail = insightsCards.flatMap(c => c.benefits).find(p => p.definition_id === perkId);
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
   if (achievements.length === 0) {
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
}

const FeeCoverageMeterChip: React.FC<MeterChipProps> = ({ value }) => {
  let chipStyle = styles.meterChipGreen;
  let textStyle = styles.meterChipTextGreen;
  if (value < 50) {
    chipStyle = styles.meterChipRed;
    textStyle = styles.meterChipTextRed;
  } else if (value < 100) {
    chipStyle = styles.meterChipOrange;
    textStyle = styles.meterChipTextOrange;
  }

  return (
    <View style={[styles.meterChipBase, chipStyle]}>
      <Text style={[styles.meterChipTextBase, textStyle]}>{value.toFixed(0)}% fee coverage</Text>
    </View>
  );
};

interface MonthSummaryCardProps {
  summary: MonthlyRedemptionSummary;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

const MonthSummaryCard: React.FC<MonthSummaryCardProps> = ({ summary, isExpanded, onToggleExpand }) => {
  const feeCoveragePercentage = summary.cardFeesProportion > 0 
    ? (summary.totalRedeemedValue / summary.cardFeesProportion) * 100 
    : 0;
  
  return (
    <View style={styles.monthCard}>
      <TouchableOpacity onPress={onToggleExpand} activeOpacity={0.7} style={styles.monthCardHeader}>
        <View style={styles.monthCardInfo}>
          <Text style={styles.monthYearText}>{summary.monthYear}</Text>
          <Text style={styles.monthRedeemedValue}>
            ${summary.totalRedeemedValue.toFixed(0)} redeemed
            {summary.totalPotentialValue > 0 && 
              <Text style={styles.monthPotentialValue}> of ${summary.totalPotentialValue.toFixed(0)}</Text>}
          </Text>
          <Text style={styles.monthPerkCount}>
            {summary.perksRedeemedCount} perks used
          </Text>
          {summary.cardFeesProportion > 0 && (
            <FeeCoverageMeterChip value={feeCoveragePercentage} />
          )}
        </View>
        <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={24} color={Colors.light.text} />
      </TouchableOpacity>

      {isExpanded && (
        <Animated.View layout={Layout.springify()} entering={FadeIn.duration(200)} exiting={FadeOut.duration(200)} style={styles.perkDetailsContainer}>
          {summary.perkDetails.length > 0 ? summary.perkDetails.map(perk => (
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
          )) : <Text style={styles.noPerksText}>No monthly perks tracked for this period.</Text>}
        </Animated.View>
      )}
    </View>
  );
};


export default function InsightsScreen() {
  const [expandedMonthKey, setExpandedMonthKey] = useState<string | null>(null);
  const sectionListRef = useRef<SectionList<MonthlyRedemptionSummary, YearSection>>(null);
  
  // Use useMemo to generate dummy data only once, or if dependencies change (none in this case)
  const insightsData = useMemo(() => generateDummyInsightsData(), []);

  const handleToggleMonth = (monthKey: string) => {
    // LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); // Replaced by Reanimated
    setExpandedMonthKey(prev => (prev === monthKey ? null : monthKey));
  };

  const renderMonthSummaryCard = ({ item }: { item: MonthlyRedemptionSummary }) => (
    <MonthSummaryCard
      summary={item}
      isExpanded={expandedMonthKey === item.monthKey}
      onToggleExpand={() => handleToggleMonth(item.monthKey)}
    />
  );

  const renderSectionHeader = ({ section }: { section: YearSection }) => (
    <Text style={styles.sectionListHeader}>{section.year}</Text>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerContainer}>
            <Text style={styles.headerTitle}>Your Redemption Journey</Text>
            <View style={styles.headerDivider} />
        </View>

        {/* Achievements Section */}
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
        
        <SectionList<MonthlyRedemptionSummary, YearSection>
          ref={sectionListRef}
          sections={insightsData.yearSections}
          keyExtractor={(item) => item.monthKey}
          renderItem={renderMonthSummaryCard}
          renderSectionHeader={renderSectionHeader}
          stickySectionHeadersEnabled={true}
          contentContainerStyle={styles.historySection}
          ListHeaderComponent={<View style={{height: 10}}/>} // Small space after achievements before first year header
          showsVerticalScrollIndicator={false}
        />

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background, // Use app's background color
  },
  scrollContent: {
    paddingBottom: 40, // For bottom spacing, especially with tab bar
  },
  headerContainer: {
    paddingHorizontal: 20,
    paddingTop: 24, // Adjusted top padding
    paddingBottom: 10,
    alignItems: 'center', // Center title
    backgroundColor: Colors.light.background, // Ensure header bg matches for sticky effect
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.light.text,
    textAlign: 'center',
    marginBottom: 10, // Space before divider
  },
  headerDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.light.icon, // Using icon color for a subtle divider
    width: '100%',
  },
  achievementsSectionContainer: { // New container for achievements section
    paddingVertical: 15,
    marginBottom: 0, // Reduced margin as SectionList will have its own padding
    backgroundColor: Colors.light.background, // Match background
  },
  sectionTitle: { // Used for Achievements title and can be used for other ad-hoc sections
    fontSize: 20,
    fontWeight: '600',
    color: Colors.light.text,
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  sectionListHeader: { // Style for Year headers in SectionList
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.light.text,
    backgroundColor: Colors.light.background, // Match background for sticky effect
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: SEPARATOR_COLOR,
  },
  achievementsScroll: {
    paddingHorizontal: 20,
    paddingVertical: 5, // Add some vertical padding for the pills
  },
  achievementChip: {
    backgroundColor: ACCENT_YELLOW_BACKGROUND, 
    borderRadius: 8, // Pill shape
    paddingVertical: 10, // Adjusted padding for pill
    paddingHorizontal: 15, // Adjusted padding for pill
    marginRight: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 }, // Softer shadow
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    minWidth: 250, // Ensure enough space for content
  },
  achievementEmoji: {
    fontSize: 24, // Slightly smaller emoji for pill
    marginRight: 10,
  },
  achievementTextContainer: {
    flex: 1,
  },
  achievementTitle: {
    fontSize: 15, // Adjusted for pill
    fontWeight: 'bold',
    color: Colors.light.text,
    marginBottom: 2,
  },
  achievementDescription: {
    fontSize: 12, // Smaller body text for pill
    color: Colors.light.icon, 
    flexWrap: 'wrap',
  },
  historySection: { // Now used for SectionList contentContainerStyle
    paddingHorizontal: 15,
    paddingBottom: 40, // Ensure space at the bottom
  },
  monthCard: {
    backgroundColor: CARD_BACKGROUND_COLOR, 
    borderRadius: 8, // Adjusted border radius
    marginBottom: 15,
    padding: 12, // Inset content by 12pt
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1, // Standard shadow
    shadowRadius: 3,
    elevation: 1, // Elevation 1 as requested
  },
  monthCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start', // Align items to start for multi-line text
  },
  monthCardInfo: {
    flex: 1, // Allow text to wrap
    marginRight: 8, // Space between info and chevron
  },
  monthYearText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 6,
  },
  monthRedeemedValue: {
    fontSize: 15,
    color: Colors.light.tint, 
    fontWeight: '500',
    marginBottom: 4,
  },
  monthPotentialValue: {
    fontSize: 14,
    color: SUBTLE_GRAY_TEXT,
  },
  monthPerkCount: {
    fontSize: 14,
    color: SUBTLE_GRAY_TEXT,
    marginBottom: 8, // Increased margin before meter chip
  },
  meterChipBase: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 4,
    borderWidth: 1, // Common border width
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
  meterChipOrange: {
    backgroundColor: WARNING_ORANGE_BACKGROUND,
    borderColor: WARNING_ORANGE,
  },
  meterChipTextOrange: {
    color: WARNING_ORANGE,
  },
  meterChipRed: {
    backgroundColor: ERROR_RED_BACKGROUND,
    borderColor: ERROR_RED,
  },
  meterChipTextRed: {
    color: ERROR_RED,
  },
  perkDetailsContainer: {
    // Styles for the container that will be animated by Reanimated
    marginTop: 15,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: SEPARATOR_COLOR, 
    overflow: 'hidden', // Important for Reanimated Layout animations
  },
  perkDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10, // Increased padding for better spacing
  },
  perkStatusIcon: {
    marginRight: 10,
  },
  perkNameContainer: { // Container for perk name and its dimmed value
    flex: 1,
    flexDirection: 'row',
    alignItems: 'baseline', // Align text along the baseline
  },
  perkName: {
    fontSize: 14,
    color: Colors.light.text,
    marginRight: 4, // Space between name and value
  },
  perkValueDimmed: {
    fontSize: 13,
    color: SUBTLE_GRAY_TEXT,
  },
  perkStatusText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 'auto', // Push status to the right
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
}); 