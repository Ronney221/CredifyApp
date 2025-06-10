import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeOut, Layout, useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { Colors } from '../../../constants/Colors';
import { MonthlyRedemptionSummary, PerkStatusFilter } from '../../../src/data/dummy-insights';
import { FeeCoverageMeterChip } from './FeeCoverageMeterChip';
import { useRouter } from 'expo-router';

interface MonthSummaryCardProps {
  summary: MonthlyRedemptionSummary;
  isExpanded: boolean;
  onToggleExpand: () => void;
  perkStatusFilter: PerkStatusFilter;
  isFirstOverallCard: boolean;
  isEven: boolean;
}

export const MonthSummaryCard: React.FC<MonthSummaryCardProps> = ({
  summary,
  isExpanded,
  onToggleExpand,
  perkStatusFilter,
  isFirstOverallCard,
  isEven,
}) => {
  const router = useRouter();
  const feeCoveragePercentage = summary.totalPotentialValue > 0 
    ? (summary.totalRedeemedValue / summary.totalPotentialValue) * 100 
    : 0;
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withTiming(isExpanded ? 180 : 0, { duration: 200 });
  }, [isExpanded, rotation]);

  const animatedChevronStyle = useAnimatedStyle(() => {
    return { transform: [{ rotate: `${rotation.value}deg` }] };
  });

  const filteredPerkDetails = summary.perkDetails
    .filter(perk => perkStatusFilter === 'all' ? true : perk.status === perkStatusFilter)
    .sort((a, b) => b.value - a.value); // Sort by value in descending order

  const showCelebratoryEmptyState = perkStatusFilter !== 'all' && filteredPerkDetails.length === 0;

  const handleRemindMe = (perkId: string) => {
    router.push('/profile/notifications');
  };

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
          <Animated.View 
            layout={Layout.springify()} 
            entering={FadeIn.duration(200)} 
            exiting={FadeOut.duration(200)} 
            style={styles.perkDetailsContainer}
          >
            {showCelebratoryEmptyState ? (
              <View style={styles.celebratoryEmptyState}>
                <Text style={styles.celebratoryEmoji}>🎉</Text>
                <Text style={styles.celebratoryText}>
                  Nice! You did not miss any perks for this filter.
                </Text>
              </View>
            ) : filteredPerkDetails.length > 0 ? (
              <>
                {/* Add Remind Me button if there are missed perks */}
                {filteredPerkDetails.some(perk => perk.status !== 'redeemed') && (
                  <TouchableOpacity 
                    onPress={() => handleRemindMe('')}
                    style={styles.monthRemindButton}
                  >
                    <Ionicons name="notifications-outline" size={16} color={Colors.light.tint} />
                    <Text style={styles.monthRemindButtonText}>Set reminders for missed perks</Text>
                    <Ionicons name="chevron-forward" size={16} color={Colors.light.tint} />
                  </TouchableOpacity>
                )}
                
                {/* Perk list */}
                {filteredPerkDetails.map(perk => (
                  <View key={perk.id} style={styles.perkDetailItem}>
                    <Ionicons 
                      name={perk.status === 'redeemed' ? 'checkmark-circle' : 'close-circle'} 
                      size={20} 
                      color={perk.status === 'redeemed' ? SUCCESS_GREEN : ERROR_RED} 
                      style={styles.perkStatusIcon}
                    />
                    <View style={styles.perkContentContainer}>
                      <View style={styles.perkNameRow}>
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
                  </View>
                ))}
              </>
            ) : <Text style={styles.noPerksText}>No perks match current filter.</Text>}
          </Animated.View>
        )}
      </View>
    </Pressable>
  );
};

const SUCCESS_GREEN = '#34C759';
const ERROR_RED = '#FF3B30';
const SUBTLE_GRAY_TEXT = Colors.light.icon;
const SEPARATOR_COLOR = '#E0E0E0';

const styles = StyleSheet.create({
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
  perkDetailsContainer: {
    marginTop: 15,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: SEPARATOR_COLOR,
    overflow: 'hidden',
  },
  perkDetailItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
  },
  perkStatusIcon: {
    marginRight: 10,
    marginTop: 2, // Align with first line of text
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
    fontSize: 15,
    fontWeight: '700',
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
    color: ERROR_RED,
  },
  noPerksText: {
    fontSize: 14,
    color: SUBTLE_GRAY_TEXT,
    textAlign: 'center',
    paddingVertical: 10,
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
  monthRemindButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 12,
  },
  monthRemindButtonText: {
    flex: 1,
    fontSize: 14,
    color: Colors.light.tint,
    marginLeft: 8,
    fontWeight: '500',
  },
}); 