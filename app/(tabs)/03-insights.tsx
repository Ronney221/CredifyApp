import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, LayoutAnimation, Platform, UIManager } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors'; // Assuming you have a Colors constant
import { Card, Benefit, allCards } from '../../src/data/card-data'; // Assuming path

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface PerkRedemptionDetail {
  id: string;
  name:string;
  value: number;
  status: 'redeemed' | 'missed';
  period: Benefit['period'];
}

interface MonthlyRedemptionSummary {
  monthYear: string; // e.g., "July 2024"
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

interface InsightsData {
  monthlySummaries: MonthlyRedemptionSummary[];
  achievements: Achievement[];
}

// --- DUMMY DATA GENERATION ---
const generateDummyInsightsData = (): InsightsData => {
  const insightsCards = allCards.filter(
    card => card.id === 'amex_gold' || card.id === 'chase_sapphire_preferred'
  );

  const monthlySummaries: MonthlyRedemptionSummary[] = [];
  const achievements: Achievement[] = [];
  const now = new Date();

  let consecutiveFeeCoverageMonths = 0;
  let highestSingleMonthRedemption = { month: '', value: 0 };
  const perkRedemptionStreaks: Record<string, number> = {}; // perkId: streakCount
  let consecutiveMonthsAllPerksRedeemed = 0;


  for (let i = 5; i >= 0; i--) { // Last 6 months
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthYear = date.toLocaleString('default', { month: 'long', year: 'numeric' });

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

    monthlySummaries.push({
      monthYear,
      totalRedeemedValue: monthTotalRedeemed,
      totalPotentialValue: monthTotalPotential,
      perksRedeemedCount: monthPerksRedeemed,
      perksMissedCount: monthPerksMissed,
      perkDetails: currentMonthPerkDetails,
      cardFeesProportion: monthlyFeeProrationTarget,
      allMonthlyPerksRedeemedThisMonth: allCurrentMonthlyPerksRedeemed,
    });

    // Achievement Calculations
    if (monthTotalRedeemed >= monthlyFeeProrationTarget) {
      consecutiveFeeCoverageMonths++;
    } else {
      consecutiveFeeCoverageMonths = 0;
    }

    if (monthTotalRedeemed > highestSingleMonthRedemption.value) {
      highestSingleMonthRedemption = { month: monthYear, value: monthTotalRedeemed };
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
      description: `${consecutiveFeeCoverageMonths} consecutive months on pace to cover annual fees.`,
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


  return { monthlySummaries, achievements };
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

interface MonthSummaryCardProps {
  summary: MonthlyRedemptionSummary;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

const MonthSummaryCard: React.FC<MonthSummaryCardProps> = ({ summary, isExpanded, onToggleExpand }) => {
  const feeCoverageRatio = summary.cardFeesProportion > 0 ? summary.totalRedeemedValue / summary.cardFeesProportion : 0;
  const onPaceForFees = feeCoverageRatio >= 1;
  
  return (
    <View style={styles.monthCard}>
      <TouchableOpacity onPress={onToggleExpand} activeOpacity={0.7} style={styles.monthCardHeader}>
        <View>
          <Text style={styles.monthYearText}>{summary.monthYear}</Text>
          <Text style={styles.monthRedeemedValue}>
            ${summary.totalRedeemedValue.toFixed(0)} redeemed
            {summary.totalPotentialValue > 0 && ` (of $${summary.totalPotentialValue.toFixed(0)})`}
          </Text>
          <Text style={styles.monthPerkCount}>
            {summary.perksRedeemedCount} perk(s) utilized
          </Text>
           {summary.cardFeesProportion > 0 && (
            <Text style={[styles.feePaceText, onPaceForFees ? styles.onPace : styles.offPace]}>
              {onPaceForFees ? 'On pace ' : 'Off pace '} 
              for annual fee coverage ({Math.round(feeCoverageRatio * 100)}%)
            </Text>
          )}
        </View>
        <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={24} color={Colors.light.text} />
      </TouchableOpacity>

      {isExpanded && (
        <View style={styles.perkDetailsContainer}>
          {summary.perkDetails.length > 0 ? summary.perkDetails.map(perk => (
            <View key={perk.id} style={styles.perkDetailItem}>
              <Ionicons 
                name={perk.status === 'redeemed' ? 'checkmark-circle' : 'close-circle'} 
                size={20} 
                color={perk.status === 'redeemed' ? Colors.light.tint : '#FF3B30'} 
                style={styles.perkStatusIcon}
              />
              <Text style={styles.perkName}>{perk.name} (${perk.value.toFixed(0)})</Text>
              <Text style={[
                  styles.perkStatusText, 
                  perk.status === 'redeemed' ? styles.redeemedText : styles.missedText
              ]}>
                {perk.status === 'redeemed' ? 'Redeemed' : 'Missed'}
              </Text>
            </View>
          )) : <Text style={styles.noPerksText}>No monthly perks tracked for this period.</Text>}
        </View>
      )}
    </View>
  );
};


export default function InsightsScreen() {
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null);
  
  // Use useMemo to generate dummy data only once, or if dependencies change (none in this case)
  const insightsData = useMemo(() => generateDummyInsightsData(), []);

  const handleToggleMonth = (monthYear: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedMonth(prev => (prev === monthYear ? null : monthYear));
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.headerTitle}>Your Redemption Journey</Text>

        {/* Achievements Section */}
        {insightsData.achievements.length > 0 && (
          <View style={styles.achievementsSection}>
            <Text style={styles.sectionTitle}>Achievements</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.achievementsScroll}>
              {insightsData.achievements.map(ach => (
                <AchievementChip key={ach.id} achievement={ach} />
              ))}
            </ScrollView>
          </View>
        )}
        
        {/* Monthly History Section */}
        <View style={styles.historySection}>
          <Text style={styles.sectionTitle}>Monthly Breakdown</Text>
          {insightsData.monthlySummaries.map(summary => (
            <MonthSummaryCard
              key={summary.monthYear}
              summary={summary}
              isExpanded={expandedMonth === summary.monthYear}
              onToggleExpand={() => handleToggleMonth(summary.monthYear)}
            />
          ))}
        </View>

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
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.light.text,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
    textAlign: 'center',
  },
  achievementsSection: {
    paddingVertical: 15,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.light.text,
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  achievementsScroll: {
    paddingHorizontal: 20,
    paddingRight: 40, // Ensure last chip isn't cut off
  },
  achievementChip: {
    backgroundColor: '#F8F8F8', // A distinct background
    borderRadius: 16,
    padding: 15,
    marginRight: 15,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
    minWidth: 280, // Give it some width
  },
  achievementEmoji: {
    fontSize: 30,
    marginRight: 12,
  },
  achievementTextContainer: {
    flex: 1,
  },
  achievementTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginBottom: 2,
  },
  achievementDescription: {
    fontSize: 13,
    color: Colors.light.icon, // A more subtle color for description
    flexWrap: 'wrap',
  },
  historySection: {
    paddingHorizontal: 15,
  },
  monthCard: {
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    marginBottom: 15,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 2,
  },
  monthCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  monthYearText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 6,
  },
  monthRedeemedValue: {
    fontSize: 15,
    color: Colors.light.tint, // Use tint color for redeemed value
    fontWeight: '500',
    marginBottom: 4,
  },
  monthPerkCount: {
    fontSize: 14,
    color: Colors.light.icon,
    marginBottom: 6,
  },
  feePaceText: {
    fontSize: 13,
    fontWeight: '500',
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderRadius: 6,
    overflow: 'hidden', // to ensure borderRadius is applied to background
    alignSelf: 'flex-start', // So it doesn't take full width
  },
  onPace: {
    backgroundColor: 'rgba(52, 199, 89, 0.1)', // Light green background
    color: '#34C759', // Green text
  },
  offPace: {
    backgroundColor: 'rgba(255, 59, 48, 0.1)', // Light red background
    color: '#FF3B30', // Red text
  },
  perkDetailsContainer: {
    marginTop: 15,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0', // A light separator color
  },
  perkDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  perkStatusIcon: {
    marginRight: 10,
  },
  perkName: {
    flex: 1,
    fontSize: 14,
    color: Colors.light.text,
  },
  perkStatusText: {
    fontSize: 14,
    fontWeight: '500',
  },
  redeemedText: {
    color: Colors.light.tint,
  },
  missedText: {
    color: '#FF3B30',
  },
  noPerksText: {
    fontSize: 14,
    color: Colors.light.icon,
    textAlign: 'center',
    paddingVertical: 10,
  },
}); 