//perk-donut-display-manager.tsx
import React, { useState, useMemo, useEffect, useCallback, useImperativeHandle, forwardRef, useRef } from 'react';
import { View, StyleSheet, Platform, Text, ActivityIndicator } from 'react-native';
import { PerksToggle, Segment } from './PerksToggle';
import ProgressDonut from './ProgressDonut';
import { Card, CardPerk } from '../../src/data/card-data';
import { useAuth } from '../../hooks/useAuth';
import { Colors } from '../../constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { logger } from '../../utils/logger';

type SegmentKey = number;
type ImperativeHandle = { refresh: () => void };

// Updated interface from usePerkStatus
interface PeriodAggregate {
  redeemedValue: number;
  possibleValue: number;
  redeemedCount: number;
  totalCount: number;
  partiallyRedeemedCount: number; // Added to track partial redemptions
}

// TODO: [PARENT OPTIMIZATION NOTES]
// When using PerkDonutDisplayManager as a ListHeaderComponent in a FlatList:
// 1. Wrap the `renderListHeader` function passed to FlatList's `ListHeaderComponent` prop in `useCallback`.
//    Dependencies for `useCallback` should include all values that `renderListHeader` closes over AND that might change,
//    such as `userCardsWithPerks`, `periodAggregates`, `redeemedInCurrentCycle`, `uniquePerkPeriodsForToggle`,
//    and any handlers like `handleActionHintPress` if they are defined in the parent scope.
// 2. For FlatList's `extraData` prop, only include state that directly influences the rendering of list *items* or the list itself
//    (outside of header/footer, which are handled by `ListHeaderComponent` / `ListFooterComponent` prop stability).
//    If `renderListHeader` depends on data that also affects list items (e.g., `activeCardId` in some scenarios),
//    then `activeCardId` might be a valid candidate for `extraData`. Avoid passing down large, frequently changing objects
//    in `extraData` if they don't affect item rendering, as it can cause unnecessary re-renders of the entire list.
// 3. Ensure that props passed to PerkDonutDisplayManager (like `periodAggregates`, `redeemedInCurrentCycle`, `uniquePerkPeriods`,
//    and `userCardsWithPerks`) are stable. If these are derived or created fresh in the parent's render cycle,
//    memoize them using `useMemo` in the parent component to prevent unnecessary re-renders of PerkDonutDisplayManager.

interface PerkDonutDisplayManagerProps {
  userCardsWithPerks: { card: Card; perks: CardPerk[] }[]; // TODO: [OPTIMIZATION] Memoize this prop in the parent component (Dashboard) using useMemo if its reference changes unnecessarily.
  periodAggregates: Record<number, PeriodAggregate>; // TODO: [OPTIMIZATION] Memoize this prop in the parent component (Dashboard) using useMemo if its reference changes unnecessarily.
  redeemedInCurrentCycle: Record<string, boolean>; // TODO: [OPTIMIZATION] Memoize this prop in the parent component (Dashboard) using useMemo if its reference changes unnecessarily.
  uniquePerkPeriods: number[]; // TODO: [OPTIMIZATION] Memoize this prop in the parent component (Dashboard) using useMemo if its reference changes unnecessarily.
  backgroundColor?: string;
}

// Updated helper to get user-friendly display name for a period
const getPeriodDisplayName = (periodMonths: number): string => {
  switch (periodMonths) {
    case 1:
      return 'Month';
    case 3:
      return '3 Month';
    case 6:
      return '6 Month';
    case 12:
      return 'Year';
    default:
      return `${periodMonths}M`;
  }
};

// New function for donut display labels
const getDonutDisplayName = (periodMonths: number): string => {
  switch (periodMonths) {
    case 1:
      return 'This Month';
    case 3:
      return 'This Quarter';
    case 6:
      return 'This Half-Year';
    case 12:
      return 'This Year';
    default:
      return `This ${periodMonths}-Month Period`;
  }
};

const PerkDonutDisplayManagerInner = (
  props: PerkDonutDisplayManagerProps,
  ref: React.Ref<ImperativeHandle>
) => {
  const {
    userCardsWithPerks,
    periodAggregates,
    redeemedInCurrentCycle,
    uniquePerkPeriods,
    backgroundColor = '#FAFAFE', // Default background color
  } = props;

  // logger.log("DEBUG_PDM_INNER: Component body START. Props:", { periodAggregatesIsPresent: !!periodAggregates, uniquePerkPeriodsCount: uniquePerkPeriods?.length, userCardsWithPerksCount: userCardsWithPerks?.length });

  const { user } = useAuth();
  const [activeSegmentKey, setActiveSegmentKey] = useState<SegmentKey>(() => uniquePerkPeriods?.[0] || 1);
  // Removed: const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(Date.now());
  // Removed: const navigation = useNavigation();
  const [totalAnnualFees, setTotalAnnualFees] = useState(0);
  
  const debounceTimeoutRef = useRef<number | null>(null); // Changed type to number for RN

  const refreshData = useCallback(() => {
    if (debounceTimeoutRef.current !== null) { // Check for null explicitly
      clearTimeout(debounceTimeoutRef.current);
    }
    debounceTimeoutRef.current = setTimeout(() => {
      setLastRefresh(Date.now());
      // logger.log('PDM Refreshed:', Date.now());
    }, 16); // Debounce for 16ms
  }, []);

  useImperativeHandle(ref, () => ({
    refresh: refreshData,
  }), [refreshData]);

  useEffect(() => {
    // Cleanup debounce timer on unmount
    return () => {
      if (debounceTimeoutRef.current !== null) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (uniquePerkPeriods && uniquePerkPeriods.length > 0) {
      // Don't reset if we're on the 'All' tab (activeSegmentKey === -1)
      if (activeSegmentKey !== -1 && !uniquePerkPeriods.includes(activeSegmentKey)) {
        setActiveSegmentKey(uniquePerkPeriods[0]);
      }
    } else if (activeSegmentKey !== 1 && activeSegmentKey !== -1) { // Only set if not already the default or 'All'
      setActiveSegmentKey(1);
    }
  }, [uniquePerkPeriods, activeSegmentKey]);

  useEffect(() => {
    if (!user || !Array.isArray(userCardsWithPerks)) return;
    let fees = 0;
    userCardsWithPerks.forEach(cardData => {
      if (cardData && cardData.card) {
        fees += (cardData.card.annualFee || 0);
      }
    });
    setTotalAnnualFees(fees);
  }, [user, userCardsWithPerks]);

  const toggleSegments = useMemo((): Segment[] => {
    logger.log('PDM: Recalculating toggleSegments. uniquePerkPeriods:', uniquePerkPeriods);
    if (!uniquePerkPeriods || uniquePerkPeriods.length === 0) {
      logger.log('PDM: No unique periods, defaulting to monthly');
      return [{ key: '1', title: getPeriodDisplayName(1) }];
    }
    const segments = uniquePerkPeriods.map(period => ({
      key: period.toString(),
      title: getPeriodDisplayName(period),
    }));
    // Add 'All' tab at the end
    segments.push({ key: 'all', title: 'All' });
    logger.log('PDM: Generated segments:', segments);
    return segments;
  }, [uniquePerkPeriods]);
  
  const handleModeChange = useCallback((key: string) => {
    if (key === 'all') {
      setActiveSegmentKey(-1); // Use -1 to represent 'all' internally
    } else {
      setActiveSegmentKey(Number(key));
    }
  }, []); // No dependencies, as setActiveSegmentKey is stable

  // Helper function to calculate days until reset - MOVED BEFORE activeData useMemo
  const calculateDaysUntilReset = useCallback((periodMonths: number) => {
    const today = new Date();
    let resetDate = new Date();

    switch (periodMonths) {
      case 1: // Monthly
        resetDate = new Date(today.getFullYear(), today.getMonth() + 1, 1);
        break;
      case 3: // Quarterly
        resetDate = new Date(today.getFullYear(), Math.floor(today.getMonth() / 3) * 3 + 3, 1);
        break;
      case 6: // Semi-annual
        resetDate = new Date(today.getFullYear(), Math.floor(today.getMonth() / 6) * 6 + 6, 1);
        break;
      case 12: // Annual
        resetDate = new Date(today.getFullYear() + 1, 0, 1);
        break;
      default:
        resetDate = new Date(today.getFullYear(), today.getMonth() + periodMonths, 1);
    }

    const daysUntilReset = Math.ceil((resetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilReset;
  }, []);

  const activeData = useMemo(() => {
    if (!periodAggregates || typeof periodAggregates !== 'object' || Object.keys(periodAggregates).length === 0) {
      const defaultDisplayName = activeSegmentKey === -1 ? 'All Time' : getDonutDisplayName(activeSegmentKey || 1);
      return {
        value: 0,
        total: 0,
        progress: 0,
        amount: '$0',
        label: String(defaultDisplayName).toUpperCase(),
        combinedStatsText: '0 of 0 • $0 / $0 • Resets in 0 days',
        progressPercentageText: '0% Used',
        color: Colors.light.tint,
        displayName: String(defaultDisplayName)
      };
    }

    let currentAggregates;
    
    if (activeSegmentKey === -1) {
      // Calculate combined aggregates for 'All' tab
      currentAggregates = Object.values(periodAggregates).reduce((combined, aggregate) => ({
        redeemedValue: combined.redeemedValue + aggregate.redeemedValue,
        possibleValue: combined.possibleValue + aggregate.possibleValue,
        redeemedCount: combined.redeemedCount + aggregate.redeemedCount,
        totalCount: combined.totalCount + aggregate.totalCount,
        partiallyRedeemedCount: combined.partiallyRedeemedCount + aggregate.partiallyRedeemedCount
      }), {
        redeemedValue: 0,
        possibleValue: 0,
        redeemedCount: 0,
        totalCount: 0,
        partiallyRedeemedCount: 0
      });
    } else {
      currentAggregates = periodAggregates[activeSegmentKey] || { 
        redeemedValue: 0, 
        possibleValue: 0, 
        redeemedCount: 0, 
        totalCount: 0,
        partiallyRedeemedCount: 0
      };
    }

    // Calculate progress based on monetary values, ensuring we don't exceed 100%
    const progress = Math.min(
      currentAggregates.possibleValue > 0 
        ? currentAggregates.redeemedValue / currentAggregates.possibleValue 
        : 0,
      1 // Cap at 100%
    );

    // Calculate percentage used based on monetary values, ensuring we don't exceed 100%
    const percentageUsed = Math.min(
      currentAggregates.possibleValue > 0
        ? Math.round((currentAggregates.redeemedValue / currentAggregates.possibleValue) * 100)
        : 0,
      100 // Cap at 100%
    );
    
    const displayName = activeSegmentKey === -1 ? 'All Time' : getDonutDisplayName(activeSegmentKey);

    // Format currency values
    const redeemedValueFormatted = currentAggregates.redeemedValue.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });

    const possibleValueFormatted = currentAggregates.possibleValue.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });

    // Calculate days until reset based on period
    const daysUntilReset = activeSegmentKey === -1 ? 0 : calculateDaysUntilReset(activeSegmentKey);

    // Only count fully redeemed perks in the X of Y count
    const fullyRedeemedCount = currentAggregates.redeemedCount;

    // Format the combined stats text with proper currency formatting and non-breaking spaces
    const combinedStatsText = activeSegmentKey === -1 
      ? `${redeemedValueFormatted} of ${possibleValueFormatted} used • ${fullyRedeemedCount} of ${currentAggregates.totalCount} perks\nAll time periods`
      : `${redeemedValueFormatted} of ${possibleValueFormatted} used • ${fullyRedeemedCount} of ${currentAggregates.totalCount} perks\nResets in ${daysUntilReset}\u00A0days`;

    return {
      value: currentAggregates.redeemedValue,
      total: currentAggregates.possibleValue,
      progress,
      amount: redeemedValueFormatted,
      label: String(displayName).toUpperCase(),
      combinedStatsText,
      progressPercentageText: `${percentageUsed}% Used`,
      color: activeSegmentKey === -1 ? '#8A2BE2' : (activeSegmentKey === 1 ? '#007A7F' : (activeSegmentKey === 12 ? '#FFC107' : (activeSegmentKey === 6 ? '#4CAF50' : '#2196F3'))),
      displayName: String(displayName)
    };
  }, [activeSegmentKey, periodAggregates, calculateDaysUntilReset]);

  if (!user) {
    return (
      <View style={[styles.metricsContainer, { justifyContent: 'center', alignItems: 'center', backgroundColor }]}>
        <ActivityIndicator size="large" color={Colors.light.tint} />
      </View>
    );
  }

  // TEST: If userCardsWithPerks is empty, render placeholder
  if (!userCardsWithPerks || userCardsWithPerks.length === 0) {
    return (
      <View style={[styles.metricsContainer, { backgroundColor, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: Colors.light.text, fontSize: 14 }}>No card data for donut display.</Text>
      </View>
    );
  }

  // logger.log("DEBUG_PDM_INNER: Component body END - Before JSX. Calculated values:", { activeSegmentKey, activeDataIsPresent: !!activeData, toggleSegmentsCount: toggleSegments?.length, totalAnnualFees });

  return (
    <View style={[styles.metricsContainer, { backgroundColor /* opacity: isRefreshing ? 0.6 : 1 <- removed */ }]}>
      <PerksToggle
        segments={toggleSegments}
        selectedMode={activeSegmentKey === -1 ? 'all' : activeSegmentKey.toString()}
        onModeChange={handleModeChange}
      />

      <ProgressDonut
        size={160}
        strokeWidth={12}
        progress={activeData.progress}
        amount={activeData.amount}
        label={activeData.label}
        combinedStatsText={activeData.combinedStatsText}
        color={activeData.color}
      />
      
      {/* Enhanced Annual Fees with better styling */}
      <View style={styles.feesContainer}>
        <Ionicons name="card" size={14} color="#6B7280" style={styles.feesIcon} />
        <Text style={styles.annualFeesText}>
          Annual Fees: ${totalAnnualFees.toFixed(0)}
        </Text>
      </View>
    </View>
  );
};

// Custom comparison function for React.memo
const areEqual = (prevProps: Readonly<PerkDonutDisplayManagerProps>, nextProps: Readonly<PerkDonutDisplayManagerProps>): boolean => {
  // Compare critical props. Using JSON.stringify for deep comparison of objects/arrays.
  // This is generally okay for props that are not excessively large or complex.
  // For very performance-sensitive scenarios with large objects, a more granular check might be needed.
  const criticalPropsChanged = 
    JSON.stringify(prevProps.periodAggregates) !== JSON.stringify(nextProps.periodAggregates) ||
    JSON.stringify(prevProps.redeemedInCurrentCycle) !== JSON.stringify(nextProps.redeemedInCurrentCycle) ||
    JSON.stringify(prevProps.uniquePerkPeriods) !== JSON.stringify(nextProps.uniquePerkPeriods);

  // Also compare backgroundColor if it's provided
  const backgroundColorChanged = prevProps.backgroundColor !== nextProps.backgroundColor;

  return !criticalPropsChanged && !backgroundColorChanged;
};

const PerkDonutDisplayManager = React.memo(
  React.forwardRef<ImperativeHandle, PerkDonutDisplayManagerProps>(PerkDonutDisplayManagerInner),
  areEqual
);

PerkDonutDisplayManager.displayName = 'PerkDonutDisplayManager';

const styles = StyleSheet.create({
  metricsContainer: {
    alignItems: 'center',
    width: '100%',
    paddingTop: 20,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.12,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  // Enhanced Annual Fees styling
  feesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 0,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(107, 114, 128, 0.08)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(107, 114, 128, 0.15)',
  },
  feesIcon: {
    marginRight: 8,
    opacity: 0.8,
  },
  annualFeesText: {
    fontSize: 14,
    color: '#4B5563',
    fontWeight: '600',
    letterSpacing: -0.2,
    lineHeight: 18,
  },
});

export default PerkDonutDisplayManager;