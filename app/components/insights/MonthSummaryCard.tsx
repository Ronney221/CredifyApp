import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { 
  FadeIn, 
  FadeOut, 
  Layout, 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming,
  withSpring,
  interpolateColor
} from 'react-native-reanimated';
import { Colors } from '../../../constants/Colors';
import { MonthlyRedemptionSummary, PerkStatusFilter } from '../../../src/data/dummy-insights';
import { FeeCoverageMeterChip } from './FeeCoverageMeterChip';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

interface MonthSummaryCardProps {
  summary: MonthlyRedemptionSummary;
  isExpanded: boolean;
  onToggleExpand: () => void;
  perkStatusFilter: PerkStatusFilter;
  isFirstOverallCard: boolean;
  isEven: boolean;
}

const getPeriodBadgeText = (period: string) => {
  switch (period) {
    case 'monthly': return 'Monthly';
    case 'quarterly': return 'Quarterly';
    case 'semi_annual': return 'Semi-Annual';
    case 'annual': return 'Annual';
    default: return period;
  }
};

const getPeriodBadgeColor = (period: string): string => {
  switch (period) {
    case 'monthly': return Colors.light.tint;
    case 'quarterly': return '#4CAF50'; // Green
    case 'semi_annual': return '#FF9800'; // Orange
    case 'annual': return '#9C27B0'; // Purple
    default: return Colors.light.tint;
  }
};

const TIMELINE_DOT_SIZE = 12;
const TIMELINE_LINE_WIDTH = 2;
const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const MonthSummaryCard: React.FC<MonthSummaryCardProps> = ({
  summary,
  isExpanded,
  onToggleExpand,
  perkStatusFilter,
  isFirstOverallCard,
  isEven,
}) => {
  const router = useRouter();
  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);
  const cardOpacity = useSharedValue(1);

  // Calculate fee coverage based on only monthly perks
  const monthlyPerks = summary.perkDetails.filter(perk => perk.period === 'monthly');
  const monthlyRedeemedValue = monthlyPerks.reduce((sum, perk) => 
    perk.status === 'redeemed' ? sum + perk.value : sum, 0
  );
  const monthlyPotentialValue = monthlyPerks.reduce((sum, perk) => sum + perk.value, 0);
  
  const feeCoveragePercentage = monthlyPotentialValue > 0 
    ? (monthlyRedeemedValue / monthlyPotentialValue) * 100 
    : 0;

  // Calculate stats for the summary view
  const totalPerks = summary.perkDetails.length;
  const redeemedPerks = summary.perksRedeemedCount;
  const missedPerks = summary.perksMissedCount;
  const availablePerks = totalPerks - redeemedPerks - missedPerks;
  
  // Calculate the month's performance score (0-100)
  const performanceScore = totalPerks > 0 
    ? Math.round((redeemedPerks / totalPerks) * 100)
    : 0;

  // Get performance status and color
  const getPerformanceStatus = () => {
    if (performanceScore >= 90) return { text: 'Excellent', color: '#34C759' };
    if (performanceScore >= 70) return { text: 'Good', color: '#5856D6' };
    if (performanceScore >= 50) return { text: 'Fair', color: '#FF9500' };
    return { text: 'Needs Improvement', color: '#FF3B30' };
  };

  const performanceStatus = getPerformanceStatus();

  // Determine if this is the current month
  const isCurrentMonth = new Date().toLocaleString('default', { month: 'long' }) === 
    summary.monthYear.split(' ')[0];

  // Calculate bar segments for the visual meter
  const getBarSegments = () => {
    const segments = [];
    const total = redeemedPerks + missedPerks + availablePerks;
    
    // Add redeemed segments
    for (let i = 0; i < redeemedPerks; i++) {
      segments.push({ type: 'redeemed', color: SUCCESS_GREEN });
    }
    
    // Add missed segments
    for (let i = 0; i < missedPerks; i++) {
      segments.push({ type: 'missed', color: NEUTRAL_GRAY_COLOR });
    }
    
    // Add available segments
    for (let i = 0; i < availablePerks; i++) {
      segments.push({ type: 'available', color: Colors.light.tint });
    }
    
    return segments;
  };

  const barSegments = getBarSegments();

  useEffect(() => {
    rotation.value = withSpring(isExpanded ? 180 : 0, {
      damping: 15,
      stiffness: 120
    });
  }, [isExpanded, rotation]);

  const animatedChevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }]
  }));

  const animatedCardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: cardOpacity.value
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.98, { damping: 15, stiffness: 120 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 120 });
  };

  // Separate perks into monthly and non-monthly
  const monthlyPerkDetails = summary.perkDetails
    .filter(perk => perk.period === 'monthly')
    .filter(perk => {
      if (perkStatusFilter === 'all') return true;
      return perk.status === perkStatusFilter;
    })
    .sort((a, b) => b.value - a.value);

  // For non-monthly perks, only show if redeemed or expired this month
  const nonMonthlyPerkDetails = summary.perkDetails
    .filter(perk => perk.period !== 'monthly')
    .filter(perk => {
      // Always show redeemed perks
      if (perk.status === 'redeemed') return true;
      // For missed perks, only show if they expired this month
      if (perk.status === 'missed') return perk.expiresThisMonth === true;
      return false;
    })
    .filter(perk => {
      if (perkStatusFilter === 'all') return true;
      return perk.status === perkStatusFilter;
    })
    .sort((a, b) => b.value - a.value);

  const showCelebratoryEmptyState = perkStatusFilter === 'redeemed' && 
    monthlyPerkDetails.length === 0 && nonMonthlyPerkDetails.length === 0;

  const handleRemindMe = (perkId: string) => {
    router.push('/profile/notifications');
  };

  const renderPerkItem = (perk: any, isMonthly: boolean) => (
    <View key={perk.id} style={styles.perkDetailItem}>
      <Ionicons 
        name={
          perk.status === 'redeemed' 
            ? 'checkmark-circle' 
            : perk.status === 'available'
            ? 'time-outline'
            : 'alert-circle-outline'
        }
        size={20} 
        color={
          perk.status === 'redeemed' 
            ? SUCCESS_GREEN 
            : perk.status === 'available'
            ? Colors.light.tint
            : NEUTRAL_GRAY_COLOR
        }
        style={styles.perkStatusIcon}
      />
      <View style={styles.perkContentContainer}>
        <View style={styles.perkNameRow}>
          <Text style={styles.perkName}>{perk.name}</Text>
          <Text style={styles.perkValueDimmed}>(${perk.value.toFixed(0)})</Text>
          {!isMonthly && (
            <View style={[styles.periodBadge, { backgroundColor: getPeriodBadgeColor(perk.period) }]}>
              <Text style={styles.periodBadgeText}>{getPeriodBadgeText(perk.period)}</Text>
            </View>
          )}
        </View>
        <Text style={[
          styles.perkStatusText, 
          perk.status === 'redeemed' ? styles.redeemedText : 
          perk.status === 'available' ? styles.availableText : styles.missedText
        ]}>
          {perk.status === 'redeemed' ? 'Redeemed' : 
           perk.status === 'available' ? 'Available' : 'Missed'}
        </Text>
      </View>
    </View>
  );

  const renderTimelineNode = () => (
    <View style={styles.timelineNode}>
      <View style={[
        styles.timelineDot,
        isCurrentMonth && styles.timelineDotCurrent
      ]} />
      <View style={styles.timelineLine} />
    </View>
  );

  const renderVisualMeter = () => (
    <View style={styles.visualMeter}>
      {barSegments.map((segment, index) => (
        <View
          key={index}
          style={[
            styles.meterSegment,
            { backgroundColor: segment.color }
          ]}
        />
      ))}
    </View>
  );

  return (
    <Pressable 
      onPress={onToggleExpand} 
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      hitSlop={{top:8,left:8,right:8,bottom:8}}
    >
      <Animated.View style={[
        styles.monthCard,
        isCurrentMonth && styles.currentMonthCard,
        animatedCardStyle
      ]}>
        <LinearGradient
          colors={isCurrentMonth 
            ? ['rgba(255,255,255,0.95)', 'rgba(255,255,255,0.98)']
            : ['rgba(255,255,255,0.9)', 'rgba(255,255,255,0.95)']}
          style={styles.cardGradient}
        >
          <View style={styles.cardContent}>
            {renderTimelineNode()}
            
            <View style={styles.mainContent}>
              <View style={styles.headerRow}>
                <View style={styles.monthInfo}>
                  <Text style={styles.monthYearText}>{summary.monthYear}</Text>
                  {isCurrentMonth && (
                    <Text style={styles.currentMonthLabel}>Current Month</Text>
                  )}
                </View>
                <Text style={styles.totalValue}>
                  ${summary.totalRedeemedValue.toFixed(0)}
                  {isCurrentMonth && ' Saved So Far'}
                </Text>
              </View>

              {isCurrentMonth ? (
                // Current Month View
                <View style={styles.currentMonthStats}>
                  {renderVisualMeter()}
                  <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                      <Ionicons name="checkmark-circle" size={16} color={SUCCESS_GREEN} />
                      <Text style={styles.statText}>{redeemedPerks} Redeemed</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Ionicons name="alert-circle-outline" size={16} color={NEUTRAL_GRAY_COLOR} />
                      <Text style={styles.statText}>{missedPerks} Missed</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Ionicons name="time-outline" size={16} color={Colors.light.tint} />
                      <Text style={styles.statText}>{availablePerks} Available</Text>
                    </View>
                  </View>
                </View>
              ) : (
                // Past Month View
                <View style={styles.pastMonthStats}>
                  <View style={styles.pastMonthMeter}>
                    {renderVisualMeter()}
                  </View>
                  <Animated.View style={[animatedChevronStyle, styles.chevronWrapper]}>
                    <Ionicons name="chevron-forward" size={20} color={Colors.light.text} />
                  </Animated.View>
                </View>
              )}
            </View>
          </View>

          {/* Expanded Detail View */}
          {isExpanded && (
            <Animated.View 
              layout={Layout.springify()} 
              entering={FadeIn.duration(200)} 
              exiting={FadeOut.duration(200)} 
              style={styles.perkDetailsContainer}
            >
              <View style={styles.detailedHeader}>
                <Text style={styles.detailedTitle}>Monthly Breakdown</Text>
                <View style={styles.detailedStats}>
                  <View style={styles.detailedStat}>
                    <Text style={styles.detailedStatValue}>${summary.totalRedeemedValue.toFixed(0)}</Text>
                    <Text style={styles.detailedStatLabel}>Total Value</Text>
                  </View>
                  <View style={styles.detailedStat}>
                    <Text style={styles.detailedStatValue}>{totalPerks}</Text>
                    <Text style={styles.detailedStatLabel}>Total Perks</Text>
                  </View>
                </View>
              </View>

              {showCelebratoryEmptyState ? (
                <View style={styles.celebratoryEmptyState}>
                  <Text style={styles.celebratoryEmoji}>🎉</Text>
                  <Text style={styles.celebratoryText}>
                    Nice! You did not miss any perks for this filter.
                  </Text>
                </View>
              ) : (monthlyPerkDetails.length > 0 || nonMonthlyPerkDetails.length > 0) ? (
                <>
                  {[...monthlyPerkDetails, ...nonMonthlyPerkDetails].some(perk => perk.status !== 'redeemed') && (
                    <TouchableOpacity 
                      onPress={() => handleRemindMe('')}
                      style={styles.monthRemindButton}
                    >
                      <LinearGradient
                        colors={['rgba(0,122,255,0.1)', 'rgba(0,122,255,0.05)']}
                        style={styles.remindButtonGradient}
                      >
                        <Ionicons name="notifications-outline" size={16} color={Colors.light.tint} />
                        <Text style={styles.monthRemindButtonText}>Set reminders for missed perks</Text>
                        <Ionicons name="chevron-forward" size={16} color={Colors.light.tint} />
                      </LinearGradient>
                    </TouchableOpacity>
                  )}
                  
                  {monthlyPerkDetails.length > 0 && (
                    <>
                      <Text style={styles.perkSectionTitle}>Monthly Perks</Text>
                      {monthlyPerkDetails.map(perk => renderPerkItem(perk, true))}
                    </>
                  )}

                  {nonMonthlyPerkDetails.length > 0 && (
                    <>
                      <Text style={[styles.perkSectionTitle, { marginTop: monthlyPerkDetails.length > 0 ? 20 : 0 }]}>
                        Additional Perks
                      </Text>
                      {nonMonthlyPerkDetails.map(perk => renderPerkItem(perk, false))}
                    </>
                  )}
                </>
              ) : <Text style={styles.noPerksText}>No perks match current filter.</Text>}
            </Animated.View>
          )}
        </LinearGradient>
      </Animated.View>
    </Pressable>
  );
};

const SUCCESS_GREEN = '#34C759';
const NEUTRAL_GRAY_COLOR = '#8A8A8E';
const SUBTLE_GRAY_TEXT = Colors.light.icon;
const SEPARATOR_COLOR = '#E0E0E0';

const styles = StyleSheet.create({
  monthCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    shadowColor: 'rgba(0,0,0,0.1)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 3,
    overflow: 'hidden',
  },
  currentMonthCard: {
    shadowColor: Colors.light.tint,
    shadowOpacity: 0.2,
    shadowRadius: 16,
  },
  cardGradient: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  cardContent: {
    flexDirection: 'row',
    padding: 16,
  },
  timelineNode: {
    width: 24,
    alignItems: 'center',
    marginRight: 12,
  },
  timelineDot: {
    width: TIMELINE_DOT_SIZE,
    height: TIMELINE_DOT_SIZE,
    borderRadius: TIMELINE_DOT_SIZE / 2,
    backgroundColor: Colors.light.tint,
    marginBottom: 4,
  },
  timelineDotCurrent: {
    backgroundColor: Colors.light.tint,
    shadowColor: Colors.light.tint,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 4,
  },
  timelineLine: {
    width: TIMELINE_LINE_WIDTH,
    flex: 1,
    backgroundColor: SEPARATOR_COLOR,
  },
  mainContent: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  monthInfo: {
    flex: 1,
  },
  monthYearText: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.light.text,
    letterSpacing: -0.5,
  },
  currentMonthLabel: {
    fontSize: 13,
    color: Colors.light.tint,
    marginTop: 2,
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.light.tint,
  },
  currentMonthStats: {
    marginTop: 8,
  },
  visualMeter: {
    flexDirection: 'row',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 12,
  },
  meterSegment: {
    flex: 1,
    marginHorizontal: 1,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 13,
    color: Colors.light.text,
    opacity: 0.8,
  },
  pastMonthStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pastMonthMeter: {
    flex: 1,
    height: 6,
    marginRight: 12,
  },
  chevronWrapper: {
    marginLeft: 'auto',
  },
  perkDetailsContainer: {
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: SEPARATOR_COLOR,
    overflow: 'hidden',
  },
  detailedHeader: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  detailedTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 12,
  },
  detailedStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: 12,
    padding: 12,
  },
  detailedStat: {
    alignItems: 'center',
  },
  detailedStatValue: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
  },
  detailedStatLabel: {
    fontSize: 12,
    color: Colors.light.text,
    opacity: 0.7,
    marginTop: 2,
  },
  perkDetailItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  perkStatusIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  perkContentContainer: {
    flex: 1,
  },
  perkNameRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    gap: 4,
    marginBottom: 2,
  },
  perkName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
  },
  perkValueDimmed: {
    fontSize: 15,
    color: Colors.light.tint,
    fontWeight: '600',
  },
  perkStatusText: {
    fontSize: 13,
    fontWeight: '500',
    opacity: 0.8,
  },
  redeemedText: {
    color: SUCCESS_GREEN,
  },
  missedText: {
    color: NEUTRAL_GRAY_COLOR,
  },
  availableText: {
    color: Colors.light.tint,
  },
  noPerksText: {
    fontSize: 14,
    color: SUBTLE_GRAY_TEXT,
    textAlign: 'center',
    paddingVertical: 20,
  },
  celebratoryEmptyState: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  celebratoryEmoji: {
    fontSize: 32,
    marginBottom: 12,
  },
  celebratoryText: {
    fontSize: 15,
    color: Colors.light.icon,
    textAlign: 'center',
    lineHeight: 22,
  },
  monthRemindButton: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  remindButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  monthRemindButtonText: {
    flex: 1,
    fontSize: 15,
    color: Colors.light.tint,
    marginLeft: 8,
    fontWeight: '500',
  },
  perkSectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 12,
    paddingHorizontal: 16,
    opacity: 0.8,
  },
  periodBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginLeft: 6,
  },
  periodBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
}); 