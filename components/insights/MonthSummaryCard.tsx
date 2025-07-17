import React, { useEffect, useMemo } from 'react';
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
import { Colors } from '../../constants/Colors';
import { MonthlyRedemptionSummary, PerkStatusFilter } from '../../src/data/dummy-insights';
import { FeeCoverageMeterChip } from './FeeCoverageMeterChip';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

// Constants
const SUCCESS_GREEN = '#34C759';
const PARTIAL_ORANGE = '#FF9500';
const NEUTRAL_GRAY_COLOR = '#8A8A8E';
const SUBTLE_GRAY_TEXT = Colors.light.icon;
const SEPARATOR_COLOR = '#E0E0E0';
const TIMELINE_DOT_SIZE = 12;
const TIMELINE_LINE_WIDTH = 2;

interface PerkDetail {
  id: string;
  name: string;
  value: number;
  status: 'redeemed' | 'missed' | 'available' | 'partial';
  period: 'monthly' | 'quarterly' | 'semi_annual' | 'annual';
  expiresThisMonth?: boolean;
  expiresNextMonth?: boolean;
  partialValue?: number; // For partial redemptions
}

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

  // Calculate fee coverage based on only monthly perks (memoized)
  const monthlyPerks = useMemo(() => 
    summary.perkDetails.filter(perk => perk.period === 'monthly'), 
    [summary.perkDetails]
  );
  
  const monthlyRedeemedValue = useMemo(() => 
    monthlyPerks.reduce((sum, perk) => 
      perk.status === 'redeemed' ? sum + perk.value : sum, 0
    ), [monthlyPerks]
  );
  
  const monthlyPotentialValue = useMemo(() => 
    monthlyPerks.reduce((sum, perk) => sum + perk.value, 0), 
    [monthlyPerks]
  );
  
  const feeCoveragePercentage = useMemo(() => 
    monthlyPotentialValue > 0 
      ? (monthlyRedeemedValue / monthlyPotentialValue) * 100 
      : 0,
    [monthlyRedeemedValue, monthlyPotentialValue]
  );

  // Helper function to determine if a perk is relevant to this month
  const isPerkRelevantToMonth = (perk: PerkDetail) => {
    // Always include redeemed and partial perks
    if (perk.status === 'redeemed' || perk.status === 'partial') return true;
    
    // For monthly perks, they're always relevant
    if (perk.period === 'monthly') return true;
    
    // For non-monthly perks, logic depends on current vs historical month
    if (perk.status === 'missed' || perk.status === 'available') {
      if (isCurrentMonth) {
        // Current month: include if expires this month OR next month
        return perk.expiresThisMonth === true || perk.expiresNextMonth === true;
      } else {
        // Historical month: only include if expired in that specific month
        return perk.expiresThisMonth === true;
      }
    }
    
    return false;
  };

  // Update calculations for the summary view (memoized)
  const relevantPerks = useMemo(() => 
    summary.perkDetails.filter(isPerkRelevantToMonth), 
    [summary.perkDetails]
  );
  
  const totalPerks = useMemo(() => relevantPerks.length, [relevantPerks]);
  
  const redeemedPerks = useMemo(() => 
    relevantPerks.filter(perk => perk.status === 'redeemed').length, 
    [relevantPerks]
  );

  const partialPerks = useMemo(() => 
    relevantPerks.filter(perk => perk.status === 'partial').length, 
    [relevantPerks]
  );
  
  const missedPerks = useMemo(() => 
    relevantPerks.filter(perk => perk.status === 'missed').length, 
    [relevantPerks]
  );
  
  const availablePerks = useMemo(() => 
    relevantPerks.filter(perk => perk.status === 'available').length, 
    [relevantPerks]
  );

  // Update performance score calculation (include partial as 50% weight)
  const performanceScore = totalPerks > 0 
    ? Math.round(((redeemedPerks + (partialPerks * 0.5)) / totalPerks) * 100)
    : 0;

  // Get performance status and color
  const getPerformanceStatus = () => {
    if (performanceScore >= 90) return { text: 'Excellent', color: '#34C759' };
    if (performanceScore >= 70) return { text: 'Good', color: '#5856D6' };
    if (performanceScore >= 50) return { text: 'Fair', color: '#FF9500' };
    return { text: 'Needs Improvement', color: '#FF3B30' };
  };

  const performanceStatus = getPerformanceStatus();

  // Determine if this is the current month - make this more precise
  const isCurrentMonth = (() => {
    const now = new Date();
    const [monthStr, yearStr] = summary.monthYear.split(' ');
    return monthStr === now.toLocaleString('default', { month: 'long' }) &&
           yearStr === now.getFullYear().toString();
  })();

  // Add this helper function to determine if we have any perks at all
  const hasAnyPerks = summary.perkDetails.length > 0;

  // Calculate missed out value
  const missedOutValue = useMemo(() => {
    return relevantPerks
      .filter(perk => perk.status === 'missed')
      .reduce((sum, perk) => sum + perk.value, 0);
  }, [relevantPerks]);

  // Update the bar segments calculation to handle empty current month and partial redemptions
  const getBarSegments = () => {
    // If it's current month and we have no perks, show one "available" segment
    if (isCurrentMonth && !hasAnyPerks) {
      return [{ type: 'available', color: Colors.light.tint }];
    }

    const segments = [];
    
    // Add redeemed segments
    for (let i = 0; i < redeemedPerks; i++) {
      segments.push({ type: 'redeemed', color: SUCCESS_GREEN });
    }

    // Add partial segments
    for (let i = 0; i < partialPerks; i++) {
      segments.push({ type: 'partial', color: PARTIAL_ORANGE });
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
    rotation.value = withTiming(isExpanded ? 90 : 0, {
      duration: 200
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

  // Update the perk details filtering
  const monthlyPerkDetails = summary.perkDetails
    .filter(perk => perk.period === 'monthly')
    .filter(perk => {
      if (perkStatusFilter === 'all') return true;
      return perk.status === perkStatusFilter;
    })
    .sort((a, b) => b.value - a.value);

  const nonMonthlyPerkDetails = summary.perkDetails
    .filter(perk => perk.period !== 'monthly')
    .filter(perk => {
      // Always show redeemed and partial perks
      if (perk.status === 'redeemed' || perk.status === 'partial') return true;
      // For missed/available perks, logic depends on current vs historical month
      if (perk.status === 'missed' || perk.status === 'available') {
        if (isCurrentMonth) {
          return perk.expiresThisMonth === true || perk.expiresNextMonth === true;
        } else {
          return perk.expiresThisMonth === true;
        }
      }
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

  // Add a helper function to get expiration status text
  const getExpirationStatus = (perk: PerkDetail) => {
    if (perk.expiresNextMonth) return 'Expires Next Month';
    if (perk.expiresThisMonth) return 'Expires This Month';
    return '';
  };

  const renderPerkItem = (perk: PerkDetail, isMonthly: boolean) => (
    <View key={perk.id} style={[
      styles.perkDetailItem,
      perk.status === 'missed' && styles.missedPerkItem
    ]}>
      <Ionicons 
        name={
          perk.status === 'redeemed' 
            ? 'checkmark-circle' 
            : perk.status === 'partial'
            ? 'checkmark-circle-outline'
            : perk.status === 'available'
            ? 'time-outline'
            : 'close-circle'
        }
        size={20} 
        color={
          perk.status === 'redeemed' 
            ? SUCCESS_GREEN 
            : perk.status === 'partial'
            ? PARTIAL_ORANGE
            : perk.status === 'available'
            ? Colors.light.tint
            : NEUTRAL_GRAY_COLOR
        }
        style={styles.perkStatusIcon}
      />
      <View style={styles.perkContentContainer}>
        <View style={styles.perkNameRow}>
          <Text style={[
            styles.perkName,
            perk.status === 'missed' && styles.missedPerkText
          ]}>{perk.name}</Text>
          <View style={styles.perkValueContainer}>
            {perk.status === 'partial' && perk.partialValue ? (
              <Text style={styles.perkValue}>
                ${perk.partialValue.toFixed(0)} / ${perk.value.toFixed(0)}
              </Text>
            ) : (
              <Text style={[
                styles.perkValue,
                perk.status === 'missed' && styles.missedPerkText
              ]}>${perk.value.toFixed(0)}</Text>
            )}
          </View>
        </View>
        {!isMonthly && (perk.expiresThisMonth || (perk.expiresNextMonth && isCurrentMonth)) && (
          <Text style={styles.expirationText}>
            {getExpirationStatus(perk)}
          </Text>
        )}
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
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={`${summary.monthYear} insights ${isExpanded ? 'expanded' : 'collapsed'}`}
      accessibilityHint={`${isExpanded ? 'Collapse' : 'Expand'} to ${isExpanded ? 'hide' : 'show'} perk details`}
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

              <View style={styles.monthStats}>
                <View style={styles.monthContent}>
                  {renderVisualMeter()}
                  <View style={styles.monthStatsRow}>
                    <View style={styles.statItem}>
                      <Ionicons name="checkmark-circle" size={16} color={SUCCESS_GREEN} />
                      <Text style={styles.statText}>
                        {hasAnyPerks ? `${redeemedPerks} Redeemed` : 'No perks redeemed yet'}
                      </Text>
                    </View>
                    {partialPerks > 0 && (
                      <View style={styles.statItem}>
                        <Ionicons name="checkmark-circle-outline" size={16} color={PARTIAL_ORANGE} />
                        <Text style={styles.statText}>{partialPerks} Partial</Text>
                      </View>
                    )}
                    {isCurrentMonth ? (
                      hasAnyPerks ? (
                        <View style={styles.statItem}>
                          <Ionicons name="time-outline" size={16} color={Colors.light.tint} />
                          <Text style={styles.statText}>{availablePerks} Available</Text>
                        </View>
                      ) : (
                        <View style={styles.statItem}>
                          <Ionicons name="time-outline" size={16} color={Colors.light.tint} />
                          <Text style={styles.statText}>Start tracking your perks</Text>
                        </View>
                      )
                    ) : (
                      <View style={styles.statItem}>
                        <Ionicons name="alert-circle-outline" size={16} color={NEUTRAL_GRAY_COLOR} />
                        <Text style={styles.statText}>{missedPerks} Missed</Text>
                      </View>
                    )}
                  </View>
                </View>
                <Animated.View style={[animatedChevronStyle, styles.chevronWrapper]}>
                  <Ionicons name="chevron-forward" size={20} color={Colors.light.text} />
                </Animated.View>
              </View>
            </View>
          </View>

          {/* Expanded Detail View */}
          {isExpanded && (
            <Animated.View 
              entering={FadeIn.duration(150)} 
              exiting={FadeOut.duration(150)} 
              style={styles.perkDetailsContainer}
            >
              <View style={styles.detailedHeader}>
                <Text style={styles.detailedTitle}>Perk Details</Text>
                {missedOutValue > 0 ? (
                  <Text style={styles.detailedSubtitle}>
                    Missed out on ${missedOutValue.toFixed(0)} this month
                  </Text>
                ) : (
                  <Text style={styles.detailedSubtitle}>
                    Great! No missed perks this month
                  </Text>
                )}
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
                  {[...monthlyPerkDetails, ...nonMonthlyPerkDetails].some(perk => perk.status === 'missed' || perk.status === 'available') && (
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
                    <View style={styles.perkSection}>
                      <View style={styles.perkSectionHeader}>
                        <Text style={styles.perkSectionTitle}>Monthly Perks</Text>
                        <Text style={styles.perkSectionCount}>({monthlyPerkDetails.length})</Text>
                      </View>
                      {monthlyPerkDetails.map(perk => renderPerkItem(perk, true))}
                    </View>
                  )}

                  {nonMonthlyPerkDetails.length > 0 && (
                    <View style={styles.perkSection}>
                      <View style={styles.perkSectionHeader}>
                        <Text style={styles.perkSectionTitle}>Additional Perks</Text>
                        <Text style={styles.perkSectionCount}>({nonMonthlyPerkDetails.length})</Text>
                      </View>
                      {nonMonthlyPerkDetails.map(perk => renderPerkItem(perk, false))}
                    </View>
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

export default MonthSummaryCard;

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
  monthStats: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  monthContent: {
    flex: 1,
    marginRight: 12,
  },
  monthStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minWidth: 80,
  },
  statText: {
    fontSize: 13,
    color: Colors.light.text,
    opacity: 0.8,
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
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 4,
  },
  detailedSubtitle: {
    fontSize: 15,
    color: Colors.light.text,
    opacity: 0.7,
  },
  perkSection: {
    marginBottom: 20,
  },
  perkSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  perkSectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.light.text,
  },
  perkSectionCount: {
    fontSize: 15,
    color: Colors.light.text,
    opacity: 0.7,
    marginLeft: 4,
  },
  perkDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  missedPerkItem: {
    opacity: 0.6,
  },
  perkStatusIcon: {
    marginRight: 12,
  },
  perkContentContainer: {
    flex: 1,
  },
  perkNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  perkName: {
    fontSize: 16,
    color: Colors.light.text,
    flex: 1,
    marginRight: 8,
  },
  perkValueContainer: {
    alignItems: 'flex-end',
  },
  perkValue: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
  },
  missedPerkText: {
    opacity: 0.6,
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
  expirationText: {
    fontSize: 12,
    color: NEUTRAL_GRAY_COLOR,
    marginTop: 4,
  },
}); 