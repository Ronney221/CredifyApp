import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  FadeIn,
  FadeOut,
  Layout,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { MonthlyRedemptionSummary, PerkStatusFilter } from '../../src/data/dummy-insights';
import { calculateRedemptionValues } from '../../utils/insights-calculations';

interface MonthSummaryCardNewProps {
  summary: MonthlyRedemptionSummary;
  isExpanded: boolean;
  onToggleExpand: () => void;
  perkStatusFilter: PerkStatusFilter;
  isFirstOverallCard: boolean;
  isEven: boolean;
}

interface PerkDetail {
  id: string;
  name: string;
  value: number;
  status: 'redeemed' | 'missed' | 'available' | 'partial';
  period: 'monthly' | 'quarterly' | 'semi_annual' | 'annual';
  expiresThisMonth?: boolean;
  expiresNextMonth?: boolean;
  partialValue?: number;
}

// Format currency with proper styling
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// Get status color
const getStatusColor = (status: string) => {
  switch (status) {
    case 'redeemed':
      return '#34C759';
    case 'partial':
      return '#FF9500';
    case 'available':
      return '#007AFF';
    case 'missed':
      return '#FF3B30';
    default:
      return '#8E8E93';
  }
};

// Get status icon
const getStatusIcon = (status: string) => {
  switch (status) {
    case 'redeemed':
      return 'checkmark-circle';
    case 'partial':
      return 'hourglass';
    case 'available':
      return 'ellipse';
    case 'missed':
      return 'close-circle';
    default:
      return 'help-circle';
  }
};

// Get period badge styling
const getPeriodBadge = (period: string) => {
  switch (period) {
    case 'monthly':
      return { color: '#007AFF', text: 'M' };
    case 'quarterly':
      return { color: '#34C759', text: 'Q' };
    case 'semi_annual':
      return { color: '#FF9500', text: 'S' };
    case 'annual':
      return { color: '#5856D6', text: 'A' };
    default:
      return { color: '#8E8E93', text: '?' };
  }
};

export default function MonthSummaryCardNew({
  summary,
  isExpanded,
  onToggleExpand,
  perkStatusFilter,
  isFirstOverallCard,
  isEven,
}: MonthSummaryCardNewProps) {
  const [isPressed, setIsPressed] = useState(false);
  const scale = useSharedValue(1);
  const chevronRotation = useSharedValue(0);

  // Determine if this is the current month
  const isCurrentMonth = useMemo(() => {
    const now = new Date();
    const [monthStr, yearStr] = summary.monthYear.split(' ');
    return monthStr === now.toLocaleString('default', { month: 'long' }) &&
           yearStr === now.getFullYear().toString();
  }, [summary.monthYear]);

  // Helper function to determine if a perk was actionable this month
  const isPerkActionableThisMonth = (perk: PerkDetail) => {
    // Monthly perks are always actionable
    if (perk.period === 'monthly') return true;
    
    // Non-monthly perks are only actionable if they were expiring this month
    if (perk.expiresThisMonth === true) return true;
    
    // For current month, also include perks expiring next month as "actionable" for awareness
    if (isCurrentMonth && perk.expiresNextMonth === true) return true;
    
    return false;
  };

  // Get actionable perks (the ones that mattered for this month's completion)
  const actionablePerks = useMemo(() => {
    return summary.perkDetails.filter(isPerkActionableThisMonth);
  }, [summary.perkDetails]);

  // Calculate completion based only on actionable perks
  const actionableCalculations = useMemo(() => {
    const redeemedValue = actionablePerks
      .filter(perk => perk.status === 'redeemed')
      .reduce((sum, perk) => sum + perk.value, 0);

    const partialValue = actionablePerks
      .filter(perk => perk.status === 'partial')
      .reduce((sum, perk) => sum + (perk.partialValue || 0), 0);

    const availableValue = actionablePerks
      .filter(perk => perk.status === 'available')
      .reduce((sum, perk) => sum + perk.value, 0);

    const missedValue = actionablePerks
      .filter(perk => perk.status === 'missed')
      .reduce((sum, perk) => sum + perk.value, 0);

    const totalActionableValue = actionablePerks
      .reduce((sum, perk) => sum + perk.value, 0);

    return {
      redeemedValue,
      partialValue,
      totalRedeemedValue: redeemedValue + partialValue,
      availableValue,
      missedValue,
      totalActionableValue,
    };
  }, [actionablePerks]);

  // Filter perks for display based on status filter
  const displayPerks = useMemo(() => {
    // For display, we want to show different categories:
    // 1. Actionable perks (monthly + expiring non-monthly)
    // 2. Bonus redemptions (non-monthly perks redeemed early)
    
    const actionableForDisplay = actionablePerks.filter(perk => {
      if (perkStatusFilter === 'all') return true;
      return perk.status === perkStatusFilter;
    });

    const bonusRedemptions = summary.perkDetails.filter(perk => {
      // Non-monthly perks that were redeemed but didn't expire this month
      return perk.period !== 'monthly' && 
             !perk.expiresThisMonth && 
             (perk.status === 'redeemed' || perk.status === 'partial') &&
             (perkStatusFilter === 'all' || perk.status === perkStatusFilter);
    });

    return { actionableForDisplay, bonusRedemptions };
  }, [actionablePerks, summary.perkDetails, perkStatusFilter]);

  // Performance metrics based on actionable perks only
  const performanceScore = useMemo(() => {
    const totalActionable = actionablePerks.length;
    if (totalActionable === 0) return 100; // No actionable perks = perfect month
    
    const redeemedCount = actionablePerks.filter(p => p.status === 'redeemed').length;
    const partialCount = actionablePerks.filter(p => p.status === 'partial').length;
    
    return Math.round(((redeemedCount + (partialCount * 0.5)) / totalActionable) * 100);
  }, [actionablePerks]);

  const getPerformanceStatus = () => {
    if (performanceScore >= 90) return { text: 'Excellent', color: '#34C759', icon: 'trophy' };
    if (performanceScore >= 70) return { text: 'Good', color: '#007AFF', icon: 'thumbs-up' };
    if (performanceScore >= 50) return { text: 'Fair', color: '#FF9500', icon: 'trending-up' };
    return { text: 'Needs Work', color: '#FF3B30', icon: 'warning' };
  };

  const performanceStatus = getPerformanceStatus();

  // Animation handlers
  const handlePressIn = async () => {
    setIsPressed(true);
    scale.value = withSpring(0.97, { damping: 20, stiffness: 400 });
    
    if (Platform.OS === 'ios') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handlePressOut = () => {
    setIsPressed(false);
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  const handlePress = () => {
    chevronRotation.value = withTiming(isExpanded ? 0 : 90, { duration: 200 });
    onToggleExpand();
  };

  // Animated styles
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${chevronRotation.value}deg` }],
  }));

  // Progress calculation based on actionable perks only
  const getProgressData = () => {
    const totalValue = actionableCalculations.totalActionableValue;
    
    if (totalValue === 0) return { redeemed: 1, partial: 0, available: 0, missed: 0 };
    
    return {
      redeemed: actionableCalculations.redeemedValue / totalValue,
      partial: actionableCalculations.partialValue / totalValue,
      available: actionableCalculations.availableValue / totalValue,
      missed: actionableCalculations.missedValue / totalValue,
    };
  };

  const progressData = getProgressData();

  // Render perk item
  const renderPerkItem = (perk: PerkDetail, index: number) => {
    const periodBadge = getPeriodBadge(perk.period);
    const statusColor = getStatusColor(perk.status);
    
    return (
      <Animated.View
        key={perk.id}
        entering={FadeIn.delay(index * 50).duration(300)}
        layout={Layout.springify().damping(15).stiffness(300)}
        style={styles.perkItem}
      >
        <View style={styles.perkHeader}>
          <View style={styles.perkIconContainer}>
            <Ionicons 
              name={getStatusIcon(perk.status) as any} 
              size={16} 
              color={statusColor} 
            />
          </View>
          
          <View style={styles.perkDetails}>
            <Text style={styles.perkName} numberOfLines={2}>
              {perk.name}
            </Text>
            
            <View style={styles.perkMetadata}>
              {perk.period !== 'monthly' && (
                <View style={[styles.periodBadge, { backgroundColor: periodBadge.color }]}>
                  <Text style={styles.periodBadgeText}>{periodBadge.text}</Text>
                </View>
              )}
              
              {(perk.expiresThisMonth || perk.expiresNextMonth) && (
                <View style={styles.urgencyBadge}>
                  <Ionicons name="alarm" size={10} color="#FF3B30" />
                  <Text style={styles.urgencyText}>
                    {perk.expiresThisMonth ? 'This month' : 'Next month'}
                  </Text>
                </View>
              )}
            </View>
          </View>
          
          <View style={styles.perkValue}>
            {perk.status === 'partial' && perk.partialValue ? (
              <>
                <Text style={[styles.valueText, { color: statusColor }]}>
                  {formatCurrency(perk.partialValue)}
                </Text>
                <Text style={styles.totalValueText}>
                  / {formatCurrency(perk.value)}
                </Text>
              </>
            ) : (
              <Text style={[styles.valueText, { color: statusColor }]}>
                {formatCurrency(perk.value)}
              </Text>
            )}
          </View>
        </View>
      </Animated.View>
    );
  };

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      style={styles.container}
    >
      <Animated.View style={[styles.card, animatedStyle]}>
        <LinearGradient
          colors={isCurrentMonth 
            ? ['#FFFFFF', '#FAFAFE', '#F5F5FA'] 
            : ['#FDFDFD', '#FAFAFE']
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.cardGradient}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.monthContainer}>
                <Text style={styles.monthText}>{summary.monthYear}</Text>
                {isCurrentMonth && (
                  <View style={styles.currentBadge}>
                    <Text style={styles.currentBadgeText}>Current</Text>
                  </View>
                )}
              </View>
              
              <View style={styles.performanceContainer}>
                <View style={[styles.performanceBadge, { backgroundColor: performanceStatus.color + '15' }]}>
                  <Ionicons 
                    name={performanceStatus.icon as any} 
                    size={12} 
                    color={performanceStatus.color} 
                  />
                  <Text style={[styles.performanceText, { color: performanceStatus.color }]}>
                    {performanceStatus.text}
                  </Text>
                </View>
                <Text style={styles.scoreText}>{performanceScore}% complete</Text>
              </View>
            </View>
            
            <View style={styles.headerRight}>
              <Text style={styles.totalSaved}>
                {formatCurrency(actionableCalculations.totalRedeemedValue)}
              </Text>
              <Text style={styles.totalLabel}>
                {actionablePerks.length > 0 ? 'Saved' : 'No Action Needed'}
              </Text>
            </View>
          </View>

          {/* Progress bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressTrack}>
              {progressData.redeemed > 0 && (
                <View 
                  style={[
                    styles.progressSegment, 
                    { 
                      backgroundColor: '#34C759',
                      width: `${progressData.redeemed * 100}%`
                    }
                  ]} 
                />
              )}
              {progressData.partial > 0 && (
                <View 
                  style={[
                    styles.progressSegment, 
                    { 
                      backgroundColor: '#FF9500',
                      width: `${progressData.partial * 100}%`
                    }
                  ]} 
                />
              )}
              {progressData.available > 0 && (
                <View 
                  style={[
                    styles.progressSegment, 
                    { 
                      backgroundColor: '#E5E5EA',
                      width: `${progressData.available * 100}%`
                    }
                  ]} 
                />
              )}
            </View>
            
            <Animated.View style={[styles.chevronContainer, chevronStyle]}>
              <Ionicons name="chevron-forward" size={16} color="#8E8E93" />
            </Animated.View>
          </View>

          {/* Stats row */}
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>
                {actionablePerks.filter(p => p.status === 'redeemed').length}
              </Text>
              <Text style={styles.statLabel}>Redeemed</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>
                {actionablePerks.filter(p => p.status === 'partial').length}
              </Text>
              <Text style={styles.statLabel}>Partial</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>
                {isCurrentMonth 
                  ? actionablePerks.filter(p => p.status === 'available').length
                  : actionablePerks.filter(p => p.status === 'missed').length
                }
              </Text>
              <Text style={styles.statLabel}>
                {isCurrentMonth ? 'Available' : 'Missed'}
              </Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>
                {actionablePerks.length}
              </Text>
              <Text style={styles.statLabel}>
                {actionablePerks.length === 0 ? 'None Due' : 'Actionable'}
              </Text>
            </View>
          </View>

          {/* Expanded content */}
          {isExpanded && (
            <Animated.View
              entering={FadeIn.duration(300)}
              exiting={FadeOut.duration(200)}
              style={styles.expandedContent}
            >
              {/* Show explanation when no actionable perks */}
              {actionablePerks.length === 0 && (
                <View style={styles.noActionSection}>
                  <Ionicons name="checkmark-circle" size={32} color="#34C759" />
                  <Text style={styles.noActionTitle}>Perfect Month!</Text>
                  <Text style={styles.noActionText}>
                    No perks were expiring this month, so there was nothing urgent to redeem.
                  </Text>
                </View>
              )}

              {/* Actionable perks that were due this month */}
              {displayPerks.actionableForDisplay.length > 0 && (
                <View style={styles.perkSection}>
                  <Text style={styles.sectionTitle}>
                    {isCurrentMonth ? 'Due This Month' : 'Were Due This Month'} ({displayPerks.actionableForDisplay.length})
                  </Text>
                  <Text style={styles.sectionSubtitle}>
                    {isCurrentMonth 
                      ? 'Monthly perks + perks expiring this month'
                      : 'Monthly perks + perks that expired this month'
                    }
                  </Text>
                  {displayPerks.actionableForDisplay.map((perk, index) => renderPerkItem(perk, index))}
                </View>
              )}

              {/* Bonus redemptions (early non-monthly perks) */}
              {displayPerks.bonusRedemptions.length > 0 && (
                <View style={styles.perkSection}>
                  <Text style={styles.sectionTitle}>
                    Bonus Redemptions ({displayPerks.bonusRedemptions.length})
                  </Text>
                  <Text style={styles.sectionSubtitle}>
                    {isCurrentMonth 
                      ? 'Non-monthly perks redeemed early (not expiring yet)'
                      : 'Non-monthly perks redeemed (were not expiring this month)'
                    }
                  </Text>
                  {displayPerks.bonusRedemptions.map((perk, index) => 
                    renderPerkItem(perk, index + displayPerks.actionableForDisplay.length)
                  )}
                </View>
              )}

              {displayPerks.actionableForDisplay.length === 0 && displayPerks.bonusRedemptions.length === 0 && actionablePerks.length > 0 && (
                <View style={styles.emptyState}>
                  <Ionicons name="filter" size={24} color="#8E8E93" />
                  <Text style={styles.emptyText}>No perks match your current filter</Text>
                </View>
              )}
            </Animated.View>
          )}

          {/* Decorative elements for current month */}
          {isCurrentMonth && (
            <View style={styles.decoration}>
              <View style={styles.decorationCircle} />
              <View style={styles.decorationCircleSmall} />
            </View>
          )}
        </LinearGradient>
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 12,
  },
  card: {
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    overflow: 'hidden',
  },
  cardGradient: {
    padding: 20,
    position: 'relative',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  headerLeft: {
    flex: 1,
  },
  monthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  monthText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1C1C1E',
    letterSpacing: -0.5,
  },
  currentBadge: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  currentBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  performanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  performanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  performanceText: {
    fontSize: 12,
    fontWeight: '600',
  },
  scoreText: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '500',
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  totalSaved: {
    fontSize: 24,
    fontWeight: '700',
    color: '#34C759',
    letterSpacing: -0.8,
  },
  totalLabel: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '500',
    marginTop: 2,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  progressTrack: {
    flex: 1,
    height: 6,
    backgroundColor: '#F2F2F7',
    borderRadius: 3,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  progressSegment: {
    height: '100%',
  },
  chevronContainer: {
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stat: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: '#8E8E93',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  expandedContent: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E5EA',
  },
  perkSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 4,
    letterSpacing: -0.32,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#8E8E93',
    marginBottom: 12,
    lineHeight: 18,
  },
  noActionSection: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  noActionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#34C759',
  },
  noActionText: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 20,
  },
  perkItem: {
    marginBottom: 12,
  },
  perkHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  perkIconContainer: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  perkDetails: {
    flex: 1,
  },
  perkName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1C1C1E',
    marginBottom: 4,
    lineHeight: 20,
  },
  perkMetadata: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  periodBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  periodBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  urgencyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 2,
  },
  urgencyText: {
    fontSize: 10,
    fontWeight: '500',
    color: '#FF3B30',
  },
  perkValue: {
    alignItems: 'flex-end',
  },
  valueText: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.24,
  },
  totalValueText: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '500',
    marginTop: 1,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '500',
  },
  decoration: {
    position: 'absolute',
    top: -30,
    right: -30,
    zIndex: 1,
  },
  decorationCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0, 122, 255, 0.06)',
  },
  decorationCircleSmall: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 122, 255, 0.04)',
    position: 'absolute',
    top: 30,
    right: 30,
  },
});