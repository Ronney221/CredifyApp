import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Dimensions,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { PerkStatusFilter } from '../../src/data/dummy-insights';

const { height: screenHeight } = Dimensions.get('window');

interface CardWithActivity {
  id: string;
  name: string;
  activityCount: number;
}

interface GroupedCards {
  [issuer: string]: CardWithActivity[];
}

interface InsightsFilterSheetProps {
  isVisible: boolean;
  onClose: () => void;
  perkStatusFilter: PerkStatusFilter;
  setPerkStatusFilter: (filter: PerkStatusFilter) => void;
  selectedCardIds: string[];
  setSelectedCardIds: (ids: string[]) => void;
  groupedCards: GroupedCards;
  availableCardsForFilter: CardWithActivity[];
  toggleCardSelection: (cardId: string) => void;
  activeFilterCount: number;
}

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

export default function InsightsFilterSheet({
  isVisible,
  onClose,
  perkStatusFilter,
  setPerkStatusFilter,
  selectedCardIds,
  setSelectedCardIds,
  groupedCards,
  availableCardsForFilter,
  toggleCardSelection,
  activeFilterCount,
}: InsightsFilterSheetProps) {
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(screenHeight);
  const opacity = useSharedValue(0);
  const scrollViewRef = useRef<ScrollView>(null);

  React.useEffect(() => {
    if (isVisible) {
      opacity.value = withTiming(1, { duration: 200 });
      translateY.value = withSpring(0, {
        damping: 20,
        stiffness: 300,
      });
    } else {
      opacity.value = withTiming(0, { duration: 150 });
      translateY.value = withTiming(screenHeight, { duration: 200 });
    }
  }, [isVisible]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const handleClose = useCallback(async () => {
    if (Platform.OS === 'ios') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onClose();
  }, [onClose]);

  const handlePerkStatusChange = useCallback(async (status: PerkStatusFilter) => {
    if (Platform.OS === 'ios') {
      await Haptics.selectionAsync();
    }
    setPerkStatusFilter(status);
  }, [setPerkStatusFilter]);

  const handleCardToggle = useCallback(async (cardId: string) => {
    if (Platform.OS === 'ios') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    toggleCardSelection(cardId);
  }, [toggleCardSelection]);

  const handleSelectAll = useCallback(async () => {
    if (Platform.OS === 'ios') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setSelectedCardIds(availableCardsForFilter.map(c => c.id));
  }, [setSelectedCardIds, availableCardsForFilter]);

  const handleDeselectAll = useCallback(async () => {
    if (Platform.OS === 'ios') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setSelectedCardIds([]);
  }, [setSelectedCardIds]);

  const handleScroll = useCallback((event: any) => {
    // Optional: Add any scroll handling logic here if needed
  }, []);

  const panGesture = Gesture.Pan()
    .enableTrackpadTwoFingerGesture(true)
    .shouldCancelWhenOutside(false)
    .onUpdate((event) => {
      if (event.translationY > 0) {
        translateY.value = event.translationY;
        opacity.value = 1 - event.translationY / (screenHeight * 0.3);
      }
    })
    .onEnd((event) => {
      if (event.translationY > 100 || event.velocityY > 500) {
        runOnJS(handleClose)();
      } else {
        translateY.value = withSpring(0);
        opacity.value = withTiming(1);
      }
    })
    .simultaneousWithExternalGesture();

  if (!isVisible) return null;

  return (
    <View style={styles.overlay}>
      <Animated.View style={[styles.backdrop, backdropStyle]}>
        <TouchableOpacity 
          style={StyleSheet.absoluteFill} 
          activeOpacity={1} 
          onPress={handleClose}
        />
      </Animated.View>

      <Animated.View style={[styles.sheet, sheetStyle]}>
        <BlurView intensity={95} style={styles.blurContainer}>
          <LinearGradient
            colors={['rgba(255, 255, 255, 0.95)', 'rgba(248, 248, 252, 0.98)']}
            style={[styles.sheetContent, { paddingBottom: insets.bottom + 20 }]}
          >
            {/* Handle bar with gesture */}
            <GestureDetector gesture={panGesture}>
              <View style={styles.dragHandle}>
                <View style={styles.handleBar} />
              </View>
            </GestureDetector>

              {/* Header */}
              <View style={styles.header}>
                <View style={styles.headerLeft}>
                  <Text style={styles.title}>Filter Insights</Text>
                  {activeFilterCount > 0 && (
                    <View style={styles.filterBadge}>
                      <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
                    </View>
                  )}
                </View>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={handleClose}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close" size={24} color="#1C1C1E" />
                </TouchableOpacity>
              </View>

              <ScrollView 
                ref={scrollViewRef}
                style={styles.scrollContent}
                showsVerticalScrollIndicator={true}
                bounces={true}
                contentContainerStyle={styles.scrollContentContainer}
                onScroll={handleScroll}
                scrollEventThrottle={16}
                keyboardShouldPersistTaps="handled"
                scrollIndicatorInsets={{ right: 1 }}
              >
                {/* Perk Status Section */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Perk Status</Text>
                  <View style={styles.chipContainer}>
                    {(['all', 'redeemed', 'partial', 'missed'] as PerkStatusFilter[]).map(status => (
                      <TouchableOpacity
                        key={status}
                        style={[
                          styles.statusChip,
                          perkStatusFilter === status && styles.statusChipSelected
                        ]}
                        onPress={() => handlePerkStatusChange(status)}
                        activeOpacity={0.7}
                      >
                        <Animated.View
                          entering={FadeIn.duration(200)}
                          style={styles.chipContent}
                        >
                          {perkStatusFilter === status && (
                            <Ionicons 
                              name="checkmark" 
                              size={16} 
                              color="#FFFFFF" 
                              style={styles.chipIcon}
                            />
                          )}
                          <Text style={[
                            styles.chipText,
                            perkStatusFilter === status && styles.chipTextSelected
                          ]}>
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                          </Text>
                        </Animated.View>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Cards Section */}
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Cards</Text>
                    <Text style={styles.sectionSubtitle}>
                      {selectedCardIds.length} of {availableCardsForFilter.length} selected
                    </Text>
                  </View>

                  {/* Select All/None buttons */}
                  <View style={styles.selectButtons}>
                    <TouchableOpacity
                      style={styles.selectButton}
                      onPress={handleSelectAll}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="checkmark-circle" size={16} color="#007AFF" />
                      <Text style={styles.selectButtonText}>Select All</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.selectButton}
                      onPress={handleDeselectAll}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="close-circle" size={16} color="#8E8E93" />
                      <Text style={[styles.selectButtonText, { color: '#8E8E93' }]}>
                        Clear All
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Card list */}
                  <View style={styles.cardsList}>
                    {ISSUER_ORDER.map(issuer => {
                      const cards = groupedCards[issuer] || [];
                      if (cards.length === 0) return null;

                      return (
                        <View key={issuer} style={styles.issuerGroup}>
                          <Text style={styles.issuerTitle}>{issuer}</Text>
                          {cards.map((card, index) => {
                            const isSelected = selectedCardIds.includes(card.id);
                            return (
                              <Animated.View
                                key={card.id}
                                entering={FadeIn.delay(index * 50).duration(300)}
                              >
                                <TouchableOpacity
                                  style={[
                                    styles.cardRow,
                                    isSelected && styles.cardRowSelected
                                  ]}
                                  onPress={() => handleCardToggle(card.id)}
                                  activeOpacity={0.7}
                                >
                                  <View style={styles.cardInfo}>
                                    <Text style={styles.cardName} numberOfLines={2}>
                                      {card.name}
                                    </Text>
                                    {card.activityCount > 0 && (
                                      <Text style={styles.cardActivity}>
                                        {card.activityCount} redemption{card.activityCount > 1 ? 's' : ''}
                                      </Text>
                                    )}
                                  </View>
                                  <View style={[
                                    styles.checkbox,
                                    isSelected && styles.checkboxSelected
                                  ]}>
                                    {isSelected && (
                                      <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                                    )}
                                  </View>
                                </TouchableOpacity>
                              </Animated.View>
                            );
                          })}
                        </View>
                      );
                    })}
                  </View>
                </View>
              </ScrollView>
            </LinearGradient>
          </BlurView>
        </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: screenHeight * 0.9,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  blurContainer: {
    flex: 1,
  },
  sheetContent: {
    flex: 1,
    paddingTop: 8,
    maxHeight: '100%',
  },
  dragHandle: {
    paddingTop: 8,
    paddingBottom: 16,
    alignItems: 'center',
  },
  handleBar: {
    width: 36,
    height: 4,
    backgroundColor: 'rgba(142, 142, 147, 0.3)',
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1C1C1E',
    letterSpacing: -0.6,
  },
  filterBadge: {
    backgroundColor: '#007AFF',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  filterBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(142, 142, 147, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    flex: 1,
    maxHeight: '100%',
  },
  scrollContentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    letterSpacing: -0.36,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '500',
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
  },
  statusChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(142, 142, 147, 0.12)',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  statusChipSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  chipContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  chipIcon: {
    marginRight: 2,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  chipTextSelected: {
    color: '#FFFFFF',
  },
  selectButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(142, 142, 147, 0.08)',
    gap: 6,
  },
  selectButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#007AFF',
  },
  cardsList: {
    gap: 8,
  },
  issuerGroup: {
    marginBottom: 20,
  },
  issuerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 12,
    letterSpacing: -0.32,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
  },
  cardRowSelected: {
    backgroundColor: 'rgba(0, 122, 255, 0.08)',
    borderColor: 'rgba(0, 122, 255, 0.2)',
  },
  cardInfo: {
    flex: 1,
    marginRight: 12,
  },
  cardName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1C1C1E',
    marginBottom: 2,
    lineHeight: 20,
  },
  cardActivity: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '500',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#D1D1D6',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
});