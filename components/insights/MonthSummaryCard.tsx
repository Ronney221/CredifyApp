import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, GestureResponderEvent } from 'react-native';
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
import { MonthStats } from './MonthStats';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { calculateRedemptionValues, calculateMonthlyPerksOnly } from '../../utils/insights-calculations';

// Constants - Updated color scheme for better meaning
const SUCCESS_GREEN = '#34C759';        // Fully redeemed
const WARNING_ORANGE = '#FF9500';       // Partially redeemed (incomplete)
const AVAILABLE_BLUE = '#007AFF';       // Available to redeem
const MISSED_RED = '#FF3B30';           // Missed/expired
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
  
  // Track touch start position to detect scroll vs tap
  const [touchStart, setTouchStart] = React.useState<{x: number, y: number} | null>(null);

  // Calculate fee coverage based on only monthly perks (memoized)
  const monthlyCalculations = useMemo(() => 
    calculateMonthlyPerksOnly(summary), 
    [summary]
  );
  
  const feeCoveragePercentage = useMemo(() => 
    monthlyCalculations.potentialValue > 0 
      ? (monthlyCalculations.totalRedeemedValue / monthlyCalculations.potentialValue) * 100 
      : 0,
    [monthlyCalculations.totalRedeemedValue, monthlyCalculations.potentialValue]
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

  // Update calculations for the summary view using shared calculation function
  const relevantCalculations = useMemo(() => 
    calculateRedemptionValues(summary, true, isCurrentMonth), 
    [summary, isCurrentMonth]
  );
  
  const relevantPerks = useMemo(() => 
    summary.perkDetails.filter(isPerkRelevantToMonth), 
    [summary.perkDetails, isPerkRelevantToMonth]
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

  // Use values from shared calculation function
  const missedOutValue = relevantCalculations.missedValue;
  const redeemedValue = relevantCalculations.redeemedValue;
  const availableValue = relevantCalculations.availableValue;
  const partialRedeemedValue = relevantCalculations.partialValue;

  // Calculate value-weighted progress bar
  const getValueWeightedProgress = () => {
    // If it's current month and we have no perks, show empty progress
    if (isCurrentMonth && !hasAnyPerks) {
      return { redeemedPercentage: 0, partialPercentage: 0, availablePercentage: 1 };
    }

    // Use the already calculated values
    const partialValue = partialRedeemedValue;
    const missedValue = missedOutValue;
    
    // Calculate total potential value for the month (all perks that could have been redeemed)
    const totalPotentialValue = summary.totalPotentialValue;
    
    // For current month, use total potential value to show full width
    // For historical months, use the total potential value as the denominator
    const totalValue = totalPotentialValue > 0 ? totalPotentialValue : (redeemedValue + partialValue + availableValue + missedValue);
    
    if (totalValue === 0) {
      return { redeemedPercentage: 0, partialPercentage: 0, availablePercentage: 1 };
    }
    
    // For current month, calculate available percentage as remaining potential
    const calculatedAvailablePercentage = isCurrentMonth 
      ? (totalPotentialValue - redeemedValue - partialValue) / totalPotentialValue
      : availableValue / totalValue;
    
    // Calculate percentages and cap them to prevent overflow
    const redeemedPercentage = Math.min(1, redeemedValue / totalValue);
    const partialPercentage = Math.min(1, partialValue / totalValue);
    const availablePercentage = Math.max(0, Math.min(1, calculatedAvailablePercentage));
    const missedPercentage = Math.min(1, missedValue / totalValue);
    
    // Normalize percentages to ensure they don't exceed 100% total
    const totalPercentage = redeemedPercentage + partialPercentage + availablePercentage + missedPercentage;
    const normalizeFactor = totalPercentage > 1 ? 1 / totalPercentage : 1;
    
    return {
      redeemedPercentage: redeemedPercentage * normalizeFactor,
      partialPercentage: partialPercentage * normalizeFactor,
      availablePercentage: availablePercentage * normalizeFactor,
      missedPercentage: missedPercentage * normalizeFactor
    };
  };

  const progressData = getValueWeightedProgress();

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

  const handlePressIn = (event: GestureResponderEvent) => {
    const { pageX, pageY } = event.nativeEvent;
    setTouchStart({ x: pageX, y: pageY });
    scale.value = withSpring(0.98, { damping: 15, stiffness: 120 });
  };

  const handlePressOut = (event: GestureResponderEvent) => {
    // Always reset scale regardless of movement
    scale.value = withSpring(1, { damping: 15, stiffness: 120 });
    setTouchStart(null);
  };

  const handlePress = (event: GestureResponderEvent) => {
    if (!touchStart) {
      onToggleExpand();
      return;
    }

    const { pageX, pageY } = event.nativeEvent;
    const deltaX = Math.abs(pageX - touchStart.x);
    const deltaY = Math.abs(pageY - touchStart.y);
    
    // Only trigger toggle if touch didn't move much (not a scroll)
    if (deltaX < 10 && deltaY < 10) {
      onToggleExpand();
    }
  };

  // Update the perk details filtering
  const monthlyPerkDetails = summary.perkDetails
    .filter(perk => perk.period === 'monthly')
    .filter(perk => {
      if (perkStatusFilter === 'all') return true;
      return perk.status === perkStatusFilter;
    })
    .sort((a, b) => b.value - a.value);

  // Split non-monthly perks into meaningful categories
  const nonMonthlyPerks = summary.perkDetails.filter(perk => perk.period !== 'monthly');
  
  // Perks that expire in this specific month
  const expiringThisMonthPerks = nonMonthlyPerks
    .filter(perk => perk.expiresThisMonth === true)
    .filter(perk => {
      if (perkStatusFilter === 'all') return true;
      return perk.status === perkStatusFilter;
    })
    .sort((a, b) => b.value - a.value);
  
  // Perks that expire next month (only show for current month)
  const expiringNextMonthPerks = isCurrentMonth ? nonMonthlyPerks
    .filter(perk => perk.expiresNextMonth === true && !perk.expiresThisMonth)
    .filter(perk => {
      if (perkStatusFilter === 'all') return true;
      return perk.status === perkStatusFilter;
    })
    .sort((a, b) => b.value - a.value) : [];
  
  // Early redemptions (only show for current month - proactive redemptions)
  const earlyRedemptionPerks = isCurrentMonth ? nonMonthlyPerks
    .filter(perk => 
      (perk.status === 'redeemed' || perk.status === 'partial') && 
      !perk.expiresThisMonth && 
      !perk.expiresNextMonth
    )
    .filter(perk => {
      if (perkStatusFilter === 'all') return true;
      return perk.status === perkStatusFilter;
    })
    .sort((a, b) => b.value - a.value) : [];

  // For historical months: all redeemed/partial non-monthly perks that don't expire this specific month
  const successfulRedemptionsPerks = !isCurrentMonth ? nonMonthlyPerks
    .filter(perk => 
      (perk.status === 'redeemed' || perk.status === 'partial') && 
      !perk.expiresThisMonth
    )
    .filter(perk => {
      if (perkStatusFilter === 'all') return true;
      return perk.status === perkStatusFilter;
    })
    .sort((a, b) => b.value - a.value) : [];

  const showCelebratoryEmptyState = perkStatusFilter === 'redeemed' && 
    monthlyPerkDetails.length === 0 && 
    expiringThisMonthPerks.length === 0 && 
    expiringNextMonthPerks.length === 0 && 
    earlyRedemptionPerks.length === 0 &&
    successfulRedemptionsPerks.length === 0;

  const handleRemindMe = (perkId: string) => {
    router.push('/profile/notifications');
  };

  // Add a helper function to get expiration status text with correct tense
  const getExpirationStatus = (perk: PerkDetail) => {
    if (perk.expiresNextMonth) {
      return isCurrentMonth ? 'Expires Next Month' : 'Was Set to Expire Next Month';
    }
    if (perk.expiresThisMonth) {
      return isCurrentMonth ? 'Expires This Month' : 'Expired This Month';
    }
    return '';
  };

  const renderPerkItem = (perk: PerkDetail, isMonthly: boolean) => (
    <View key={perk.id} style={[
      styles.perkDetailItem,
      perk.status === 'missed' && styles.missedPerkItem
    ]}>
      <View style={[
        styles.statusIndicator,
        {
          backgroundColor: 
            perk.status === 'redeemed' 
              ? SUCCESS_GREEN 
              : perk.status === 'partial'
              ? WARNING_ORANGE
              : perk.status === 'available'
              ? AVAILABLE_BLUE
              : MISSED_RED
        }
      ]}>
        <Ionicons 
          name={
            perk.status === 'redeemed' 
              ? 'checkmark' 
              : perk.status === 'partial'
              ? 'remove'
              : perk.status === 'available'
              ? 'ellipse'
              : 'close'
          }
          size={12} 
          color="#FFFFFF"
        />
      </View>
      <View style={styles.perkContentContainer}>
        <View style={styles.perkNameRow}>
          <View style={styles.perkNameAndBadgeContainer}>
            <Text style={[
              styles.perkName,
              perk.status === 'missed' && styles.missedPerkText
            ]}>{perk.name}</Text>
            {!isMonthly && (
              <View style={[
                styles.periodBadge,
                { backgroundColor: getPeriodBadgeColor(perk.period) }
              ]}>
                <Text style={styles.periodBadgeText}>
                  {getPeriodBadgeText(perk.period)}
                </Text>
              </View>
            )}
          </View>
          <View style={styles.perkValueContainer}>
            {perk.status === 'partial' && perk.partialValue ? (
              <Text style={[styles.perkValue, { color: WARNING_ORANGE }]}>
                ${perk.partialValue.toFixed(0)} / ${perk.value.toFixed(0)}
              </Text>
            ) : (
              <Text style={[
                styles.perkValue,
                { color: 
                  perk.status === 'redeemed' 
                    ? SUCCESS_GREEN 
                    : perk.status === 'available'
                    ? AVAILABLE_BLUE
                    : perk.status === 'missed'
                    ? MISSED_RED
                    : Colors.light.text
                }
              ]}>${perk.value.toFixed(0)}</Text>
            )}
          </View>
        </View>
        {!isMonthly && (perk.expiresThisMonth || perk.expiresNextMonth) && (
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

  const renderVisualMeter = () => {
    // For current month, show a different approach
    if (isCurrentMonth) {
      const hasRedeemedPerks = progressData.redeemedPercentage > 0 || progressData.partialPercentage > 0;
      
      return (
        <View style={styles.visualMeter}>
          {/* Show redeemed/partial progress if any exists */}
          {hasRedeemedPerks ? (
            <>
              {progressData.redeemedPercentage > 0 && (
                <View
                  style={[
                    styles.meterSegment,
                    { 
                      backgroundColor: SUCCESS_GREEN,
                      flex: progressData.redeemedPercentage
                    }
                  ]}
                />
              )}
              
              {progressData.partialPercentage > 0 && (
                <View
                  style={[
                    styles.meterSegment,
                    { 
                      backgroundColor: WARNING_ORANGE,
                      flex: progressData.partialPercentage
                    }
                  ]}
                />
              )}
              
              {/* Show gray bar for remaining potential value */}
              {progressData.availablePercentage > 0 && (
                <View
                  style={[
                    styles.meterSegment,
                    { 
                      backgroundColor: NEUTRAL_GRAY_COLOR,
                      flex: progressData.availablePercentage
                    }
                  ]}
                />
              )}
              
              {/* Show additional gray segments for unredeemed monthly perks even when over 100% */}
              {progressData.redeemedPercentage + progressData.partialPercentage >= 1 && (
                // Calculate how many unredeemed monthly perks we have
                monthlyPerkDetails
                  .filter(perk => perk.status === 'available')
                  .map((perk, index) => (
                    <View
                      key={`unredeemed-${index}`}
                      style={[
                        styles.meterSegment,
                        { 
                          backgroundColor: NEUTRAL_GRAY_COLOR,
                          flex: 0.1 // Small segment for each unredeemed perk
                        }
                      ]}
                    />
                  ))
              )}
            </>
          ) : (
            /* Show empty state if no perks redeemed yet */
            <View
              style={[
                styles.meterSegment,
                { 
                  backgroundColor: NEUTRAL_GRAY_COLOR,
                  flex: 1
                }
              ]}
            />
          )}
        </View>
      );
    }
    
    // For historical months, show the full value-weighted progress
    return (
      <View style={styles.visualMeter}>
        {/* Redeemed segment */}
        {progressData.redeemedPercentage > 0 && (
          <View
            style={[
              styles.meterSegment,
              { 
                backgroundColor: SUCCESS_GREEN,
                flex: progressData.redeemedPercentage
              }
            ]}
          />
        )}
        
        {/* Partial segment */}
        {progressData.partialPercentage > 0 && (
          <View
            style={[
              styles.meterSegment,
              { 
                backgroundColor: WARNING_ORANGE,
                flex: progressData.partialPercentage
              }
            ]}
          />
        )}
        
        {/* Missed segment */}
        {(progressData.missedPercentage || 0) > 0 && (
          <View
            style={[
              styles.meterSegment,
              { 
                backgroundColor: NEUTRAL_GRAY_COLOR,
                flex: progressData.missedPercentage || 0
              }
            ]}
          />
        )}
      </View>
    );
  };

  return (
    <TouchableOpacity 
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
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
                  {isCurrentMonth ? (
                    `$${summary.totalRedeemedValue.toFixed(0)} Saved So Far`
                  ) : (
                    `You Saved $${summary.totalRedeemedValue.toFixed(0)}`
                  )}
                </Text>
              </View>

              <View style={styles.monthStats}>
                <View style={styles.monthContent}>
                  {renderVisualMeter()}
                  <MonthStats 
                    data={{
                      redeemedCount: redeemedPerks,
                      redeemedValue: redeemedValue,
                      missedCount: isCurrentMonth ? availablePerks : missedPerks,
                      missedValue: isCurrentMonth ? availableValue : missedOutValue,
                      ...(partialPerks > 0 && {
                        partialCount: partialPerks,
                        partialValue: partialRedeemedValue
                      })
                    }}
                    isCurrentMonth={isCurrentMonth}
                  />
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
              {/* Show positive reinforcement for good performance */}
              {!isCurrentMonth && missedOutValue === 0 && redeemedValue > 0 && (
                <View style={styles.successHeader}>
                  <View style={[styles.statusIndicator, { backgroundColor: SUCCESS_GREEN, marginBottom: 8 }]}>
                    <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                  </View>
                  <Text style={styles.successTitle}>
                    Perfect month!
                  </Text>
                  <Text style={styles.successSubtitle}>
                    You maximized your card perks without leaving money on the table.
                  </Text>
                </View>
              )}

              {/* Show learning tips for missed opportunities */}
              {!isCurrentMonth && missedOutValue > 0 && (
                <View style={styles.missedOpportunityHeader}>
                  <Text style={styles.missedOpportunityTitle}>
                    ${missedOutValue.toFixed(0)} left unused
                  </Text>
                  <Text style={styles.missedOpportunitySubtitle}>
                    {missedOutValue > 50 
                      ? 'This was free money that expired unutilized' 
                      : 'Small opportunity to learn from for next time'
                    }
                  </Text>
                </View>
              )}

              {showCelebratoryEmptyState ? (
                <View style={styles.celebratoryEmptyState}>
                  <View style={[styles.statusIndicator, { backgroundColor: SUCCESS_GREEN, marginBottom: 12 }]}>
                    <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                  </View>
                  <Text style={styles.celebratoryText}>
                    Nice! You did not miss any perks for this filter.
                  </Text>
                </View>
              ) : (monthlyPerkDetails.length > 0 || 
                   expiringThisMonthPerks.length > 0 || 
                   expiringNextMonthPerks.length > 0 || 
                   earlyRedemptionPerks.length > 0 ||
                   successfulRedemptionsPerks.length > 0) ? (
                <>
                  
                  {monthlyPerkDetails.length > 0 && (
                    <View style={styles.perkSection}>
                      <View style={styles.perkSectionHeader}>
                        <View style={styles.sectionTitleContainer}>
                          <Text style={styles.perkSectionTitle}>Monthly Perks</Text>
                          <Text style={styles.perkSectionCount}>({monthlyPerkDetails.length})</Text>
                        </View>
                        <View style={styles.sectionDivider} />
                      </View>
                      {monthlyPerkDetails.map(perk => renderPerkItem(perk, true))}
                    </View>
                  )}

                  {/* Perks expiring this month */}
                  {expiringThisMonthPerks.length > 0 && (
                    <View style={styles.perkSection}>
                      <View style={styles.perkSectionHeader}>
                        <View style={styles.sectionTitleContainer}>
                          <Text style={styles.perkSectionTitle}>
                            {isCurrentMonth ? 'Expiring This Month' : 'Expired This Month'}
                          </Text>
                          <Text style={styles.perkSectionCount}>({expiringThisMonthPerks.length})</Text>
                        </View>
                        <View style={styles.sectionDivider} />
                      </View>
                      {expiringThisMonthPerks.map(perk => renderPerkItem(perk, false))}
                    </View>
                  )}

                  {/* Perks expiring next month (only for current month) */}
                  {expiringNextMonthPerks.length > 0 && (
                    <View style={styles.perkSection}>
                      <View style={styles.perkSectionHeader}>
                        <View style={styles.sectionTitleContainer}>
                          <Text style={styles.perkSectionTitle}>Expiring Next Month</Text>
                          <Text style={styles.perkSectionCount}>({expiringNextMonthPerks.length})</Text>
                        </View>
                        <View style={styles.sectionDivider} />
                      </View>
                      {expiringNextMonthPerks.map(perk => renderPerkItem(perk, false))}
                    </View>
                  )}

                  {/* Early redemptions (current month only) */}
                  {earlyRedemptionPerks.length > 0 && (
                    <View style={styles.perkSection}>
                      <View style={styles.perkSectionHeader}>
                        <View style={styles.sectionTitleContainer}>
                          <Text style={styles.perkSectionTitle}>Early Redemptions</Text>
                          <Text style={styles.perkSectionCount}>({earlyRedemptionPerks.length})</Text>
                        </View>
                        <View style={styles.sectionDivider} />
                      </View>
                      {earlyRedemptionPerks.map(perk => renderPerkItem(perk, false))}
                    </View>
                  )}

                  {/* Successful redemptions (historical months only) */}
                  {successfulRedemptionsPerks.length > 0 && (
                    <View style={styles.perkSection}>
                      <View style={styles.perkSectionHeader}>
                        <View style={styles.sectionTitleContainer}>
                          <Text style={styles.perkSectionTitle}>Successfully Redeemed</Text>
                          <Text style={styles.perkSectionCount}>({successfulRedemptionsPerks.length})</Text>
                        </View>
                        <View style={styles.sectionDivider} />
                      </View>
                      {successfulRedemptionsPerks.map(perk => renderPerkItem(perk, false))}
                    </View>
                  )}
                </>
              ) : <Text style={styles.noPerksText}>No perks match current filter.</Text>}
            </Animated.View>
          )}
        </LinearGradient>
      </Animated.View>
    </TouchableOpacity>
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
  successHeader: {
    paddingHorizontal: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: SUCCESS_GREEN,
    textAlign: 'center',
    marginBottom: 4,
  },
  successSubtitle: {
    fontSize: 15,
    color: Colors.light.text,
    opacity: 0.8,
    textAlign: 'center',
  },
  missedOpportunityHeader: {
    paddingHorizontal: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  missedOpportunityTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.light.tint,
    textAlign: 'center',
    marginBottom: 4,
  },
  missedOpportunitySubtitle: {
    fontSize: 16,
    color: Colors.light.text,
    opacity: 0.8,
    textAlign: 'center',
    marginBottom: 16,
  },
  learningTipsContainer: {
    alignItems: 'flex-start',
    paddingHorizontal: 16,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  tipBullet: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.light.tint,
    marginRight: 12,
  },
  tipText: {
    fontSize: 14,
    color: Colors.light.text,
    opacity: 0.7,
    flex: 1,
  },
  perkSection: {
    marginBottom: 20,
  },
  perkSectionHeader: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
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
  sectionDivider: {
    height: 1,
    backgroundColor: SEPARATOR_COLOR,
    opacity: 0.6,
  },
  statusIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
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
  perkContentContainer: {
    flex: 1,
  },
  perkNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  perkNameAndBadgeContainer: {
    flex: 1,
    marginRight: 8,
  },
  perkName: {
    fontSize: 16,
    color: Colors.light.text,
    marginBottom: 4,
  },
  periodBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginTop: 4,
  },
  periodBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
  celebratoryText: {
    fontSize: 15,
    color: Colors.light.icon,
    textAlign: 'center',
    lineHeight: 22,
  },
  expirationText: {
    fontSize: 12,
    color: NEUTRAL_GRAY_COLOR,
    marginTop: 4,
  },
}); 