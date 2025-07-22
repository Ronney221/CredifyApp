import React, { useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Animated,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import ExpandableCard from '../home/ExpandableCard';
import { Card, CardPerk } from '../../src/data/card-data';
import { PERFORMANCE_CONFIGS, keyExtractors } from '../../utils/performance';
import { Colors } from '../../constants/Colors';

// Use optimized performance constants
const { CARD_LIST } = PERFORMANCE_CONFIGS;

// Define the type for a single item in the cards list
interface CardListItem {
  card: Card;
  perks: CardPerk[];
  cumulativeSavedValue: number;
  onTapPerk: (cardId: string, perkId: string, perk: CardPerk) => Promise<void>;
  onExpandChange: (cardId: string, isExpanded: boolean, index: number) => void;
  onPerkStatusChange: () => void;
  setPerkStatus: (cardId: string, perkId: string, status: 'available' | 'redeemed' | 'partially_redeemed', remainingValue?: number) => void;
  isActive: boolean;
  sortIndex: number;
  userHasSeenSwipeHint: boolean;
  onHintDismissed: () => Promise<void>;
  setPendingToast: (toast: { message: string; onUndo?: (() => void) | null } | null) => void;
  renewalDate?: Date | null;
  onRenewalDatePress?: () => void;
  onOpenLoggingModal: (perk: CardPerk) => void;
  onInstantLog?: (perk: CardPerk, amount: number) => void;
  onSaveLog?: (amount: number) => void;
  onInstantMarkAvailable?: (perk: CardPerk) => void;
}

interface CardsGridProps {
  cardListItems: CardListItem[];
  scrollY: Animated.Value;
  activeCardId: string | null;
  onCardExpandChange: (cardId: string, isExpanded: boolean, index: number) => void;
  listHeaderElement: React.ReactElement | null;
  scrollViewPaddingTop: number;
}

// Constants for tab bar offset
const TAB_BAR_OFFSET = Platform.OS === 'ios' ? 120 : 80;

export default function CardsGrid({
  cardListItems,
  scrollY,
  activeCardId,
  onCardExpandChange,
  listHeaderElement,
  scrollViewPaddingTop,
}: CardsGridProps) {
  const router = useRouter();
  const flatListRef = useRef<FlatList<CardListItem>>(null);

  // renderItem function for the FlatList
  const renderExpandableCardItem = ({ item, index }: { item: CardListItem, index: number }) => (
    <ExpandableCard
      key={item.card.id}
      card={item.card}
      perks={item.perks}
      cumulativeSavedValue={item.cumulativeSavedValue}
      onTapPerk={item.onTapPerk}
      onExpandChange={item.onExpandChange}
      onPerkStatusChange={item.onPerkStatusChange}
      setPerkStatus={item.setPerkStatus}
      isActive={item.isActive}
      sortIndex={index}
      userHasSeenSwipeHint={item.userHasSeenSwipeHint}
      onHintDismissed={item.onHintDismissed}
      setPendingToast={item.setPendingToast}
      renewalDate={item.renewalDate}
      onRenewalDatePress={item.onRenewalDatePress}
      onOpenLoggingModal={item.onOpenLoggingModal}
      onInstantLog={item.onInstantLog}
      onSaveLog={item.onSaveLog}
      onInstantMarkAvailable={item.onInstantMarkAvailable}
    />
  );

  const handleManageCards = () => {
    router.push('/(tabs)/profile/manage_cards');
  };

  // Create the ListFooterElement using useMemo for stability
  const listFooterElement = React.useMemo(() => (
    <View style={styles.manageCardsContainer}>
      <TouchableOpacity
        style={styles.manageCardsFooter}
        onPress={handleManageCards}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel="Manage & Reorder Cards"
        accessibilityHint="Opens the card management interface"
      >
        <Ionicons 
          name="card-outline" 
          size={18} 
          color={Colors.light.textSecondary} 
          style={{ marginRight: 8 }} 
        />
        <Text style={styles.manageCardsText}>Manage & Reorder Cards</Text>
      </TouchableOpacity>
    </View>
  ), [handleManageCards]);

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    {
      useNativeDriver: false,
      listener: (event: { nativeEvent: { contentOffset: { y: number } } }) => {
        // Any additional scroll handling can go here
      }
    }
  );

  // Track previous activeCardId to only scroll when it actually changes
  const prevActiveCardId = React.useRef<string | null>(null);
  
  // Scroll to expanded card only when activeCardId actually changes (not on data updates)
  React.useEffect(() => {
    if (activeCardId && activeCardId !== prevActiveCardId.current && flatListRef.current) {
      const index = cardListItems.findIndex(item => item.card.id === activeCardId);
      if (index !== -1) {
        // Use a timeout to ensure the scroll happens after the card's expand animation
        setTimeout(() => {
          flatListRef.current?.scrollToIndex({
            animated: true,
            index,
            viewPosition: 0.15 // Scrolls the item to the top of the list view
          });
        }, 100);
      }
    }
    prevActiveCardId.current = activeCardId;
  }, [activeCardId, cardListItems]);

  if (cardListItems.length === 0) {
    return (
      <ScrollView 
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: scrollViewPaddingTop }
        ]}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        <View style={styles.noCardsContainer}>
          <Ionicons name="card-outline" size={48} color="#8e8e93" />
          <Text style={styles.noCardsText}>
            No cards selected. Add your first card to start tracking rewards!
          </Text>
          <TouchableOpacity
            style={styles.addFirstCardButton}
            onPress={() => router.push('/(tabs)/profile/manage_cards')}
          >
            <Text style={styles.addFirstCardButtonText}>Add Your First Card</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  return (
    <Animated.FlatList
      ref={flatListRef}
      data={cardListItems}
      renderItem={renderExpandableCardItem}
      keyExtractor={keyExtractors.cardList}
      ListHeaderComponent={listHeaderElement}
      ListFooterComponent={listFooterElement}
      contentContainerStyle={[
        styles.flatListContent,
        { paddingTop: scrollViewPaddingTop }
      ]}
      style={styles.flatListOverallStyle}
      showsVerticalScrollIndicator={false}
      onScroll={handleScroll}
      scrollEventThrottle={16}
      extraData={activeCardId}
      // Performance optimizations
      removeClippedSubviews={CARD_LIST.REMOVE_CLIPPED_SUBVIEWS}
      maxToRenderPerBatch={CARD_LIST.MAX_TO_RENDER_PER_BATCH}
      windowSize={CARD_LIST.WINDOW_SIZE}
      initialNumToRender={CARD_LIST.INITIAL_NUM_TO_RENDER}
      updateCellsBatchingPeriod={CARD_LIST.UPDATE_CELLS_BATCH_PERIOD}
    />
  );
}

const styles = StyleSheet.create({
  flatListOverallStyle: {
    flex: 1,
  },
  flatListContent: {
    flexGrow: 1,
    paddingBottom: TAB_BAR_OFFSET,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: TAB_BAR_OFFSET,
  },
  noCardsContainer: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#FAFAFE',
    margin: 20,
    borderRadius: 16,
  },
  noCardsText: {
    fontSize: 16,
    color: '#8e8e93',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  addFirstCardButton: {
    backgroundColor: '#007aff',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  addFirstCardButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  manageCardsContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
  },
  manageCardsFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    backgroundColor: Colors.light.secondarySystemGroupedBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.light.separator,
  },
  manageCardsText: {
    fontSize: 15,
    color: Colors.light.text,
    fontWeight: '500',
  },
});