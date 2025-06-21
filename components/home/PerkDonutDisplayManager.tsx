//perk-donut-display-manager.tsx
import React, { useState, useMemo, useEffect, useCallback, useImperativeHandle, forwardRef, useRef } from 'react';
import { View, StyleSheet, Platform, Text, ActivityIndicator } from 'react-native';
import { PerksToggle, Segment } from './PerksToggle';
import ProgressDonut from './ProgressDonut';
import { Card, CardPerk } from '../../src/data/card-data';
import { useAuth } from '../../hooks/useAuth';
import { Colors } from '../../constants/Colors';

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
      return '1 M';
    case 3:
      return '3 M';
    case 6:
      return '6 M';
    case 12:
      return '1 Y';
    default:
      return `${periodMonths} M`;
  }
};

// New function for donut display labels
const getDonutDisplayName = (periodMonths: number): string => {
  switch (periodMonths) {
    case 1:
      return 'Monthly Redeemed';
    case 3:
      return 'Quarterly Redeemed';
    case 6:
      return 'Semi-Annual Redeemed';
    case 12:
      return 'Annual Redeemed';
    default:
      return `${periodMonths}-Month Redeemed`;
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

  // console.log("DEBUG_PDM_INNER: Component body START. Props:", { periodAggregatesIsPresent: !!periodAggregates, uniquePerkPeriodsCount: uniquePerkPeriods?.length, userCardsWithPerksCount: userCardsWithPerks?.length });

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
      // console.log('PDM Refreshed:', Date.now());
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
      if (!uniquePerkPeriods.includes(activeSegmentKey)) {
        setActiveSegmentKey(uniquePerkPeriods[0]);
      }
    } else if (activeSegmentKey !== 1) { // Only set if not already the default
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
    console.log('PDM: Recalculating toggleSegments. uniquePerkPeriods:', uniquePerkPeriods);
    if (!uniquePerkPeriods || uniquePerkPeriods.length === 0) {
      console.log('PDM: No unique periods, defaulting to monthly');
      return [{ key: '1', title: getPeriodDisplayName(1) }];
    }
    const segments = uniquePerkPeriods.map(period => ({
      key: period.toString(),
      title: getPeriodDisplayName(period),
    }));
    console.log('PDM: Generated segments:', segments);
    return segments;
  }, [uniquePerkPeriods]);
  
  const handleModeChange = useCallback((key: string) => {
    setActiveSegmentKey(Number(key));
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
      const defaultDisplayName = getDonutDisplayName(activeSegmentKey || 1);
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

    const currentAggregates = periodAggregates[activeSegmentKey] || { 
      redeemedValue: 0, 
      possibleValue: 0, 
      redeemedCount: 0, 
      totalCount: 0,
      partiallyRedeemedCount: 0
    };

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
    
    const displayName = getDonutDisplayName(activeSegmentKey);

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
    const daysUntilReset = calculateDaysUntilReset(activeSegmentKey);

    // Only count fully redeemed perks in the X of Y count
    const fullyRedeemedCount = currentAggregates.redeemedCount;

    // Format the combined stats text with proper currency formatting
    const combinedStatsText = `${redeemedValueFormatted} of ${possibleValueFormatted} used • ${fullyRedeemedCount} of ${currentAggregates.totalCount} perks • Resets in ${daysUntilReset} days`;

    return {
      value: currentAggregates.redeemedValue,
      total: currentAggregates.possibleValue,
      progress,
      amount: redeemedValueFormatted,
      label: String(displayName).toUpperCase(),
      combinedStatsText,
      progressPercentageText: `${percentageUsed}% Used`,
      color: activeSegmentKey === 1 ? '#007A7F' : (activeSegmentKey === 12 ? '#FFC107' : (activeSegmentKey === 6 ? '#4CAF50' : '#2196F3')),
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

  // console.log("DEBUG_PDM_INNER: Component body END - Before JSX. Calculated values:", { activeSegmentKey, activeDataIsPresent: !!activeData, toggleSegmentsCount: toggleSegments?.length, totalAnnualFees });

  return (
    <View style={[styles.metricsContainer, { backgroundColor /* opacity: isRefreshing ? 0.6 : 1 <- removed */ }]}>
      <PerksToggle
        segments={toggleSegments}
        selectedMode={activeSegmentKey.toString()}
        onModeChange={handleModeChange}
      />

      <ProgressDonut
        size={150}
        strokeWidth={10}
        progress={activeData.progress}
        amount={activeData.amount}
        label={activeData.label}
        combinedStatsText={activeData.combinedStatsText}
      />
      <Text style={styles.annualFeesText}>
        {`Total Annual Card Fees: $${totalAnnualFees.toFixed(0)}`}
      </Text>
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
    paddingTop: 12,
    paddingBottom: 8,
    paddingHorizontal: 16,
    // backgroundColor: '#ffffff', // Removed as per Task 4
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  annualFeesText: {
    marginTop: 10,
    fontSize: 13,
    color: '#4A4A4A',
    fontWeight: '500',
  },
});

export default PerkDonutDisplayManager; 