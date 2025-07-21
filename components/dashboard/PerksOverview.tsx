import React, { useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import PerkDonutDisplayManager from '../home/PerkDonutDisplayManager';
import AIChatButton from '../home/AIChatButton';
import ActionHintPill from '../home/ActionHintPill';
import { Card, CardPerk } from '../../src/data/card-data';

interface PeriodAggregate {
  redeemedValue: number;
  possibleValue: number;
  redeemedCount: number;
  totalCount: number;
  partiallyRedeemedCount: number;
}

interface PerksOverviewProps {
  userCardsWithPerks: { card: Card; perks: CardPerk[] }[];
  periodAggregates: Record<number, PeriodAggregate>;
  redeemedInCurrentCycle: Record<string, boolean>;
  uniquePerkPeriods: number[];
  showAiChatNotification: boolean;
  onOpenAiChat: () => void;
  onCheckNotificationStatus: () => void;
  headerPillContent?: (CardPerk & { cardId: string; cardName: string; cycleEndDate: Date; daysRemaining: number }) | null;
  onActionHintPress: (perk: any) => void;
  onListHeaderLayout: (height: number) => void;
}

export default function PerksOverview({
  userCardsWithPerks,
  periodAggregates,
  redeemedInCurrentCycle,
  uniquePerkPeriods,
  showAiChatNotification,
  onOpenAiChat,
  onCheckNotificationStatus,
  headerPillContent,
  onActionHintPress,
  onListHeaderLayout,
}: PerksOverviewProps) {
  const donutDisplayRef = useRef<{ refresh: () => void }>(null);

  // Expose the donut refresh method to parent
  React.useImperativeHandle(React.forwardRef(() => donutDisplayRef), () => ({
    refresh: () => {
      if (donutDisplayRef.current?.refresh) {
        donutDisplayRef.current.refresh();
      }
    }
  }));

  return (
    <View 
      onLayout={(event) => {
        const { height } = event.nativeEvent.layout;
        if (height > 0) {
          onListHeaderLayout(height);
        }
      }}
    >
      {headerPillContent && (
        <ActionHintPill 
          perk={headerPillContent} 
          onPress={() => onActionHintPress(headerPillContent)} 
          daysRemaining={headerPillContent.daysRemaining} 
        />
      )}
      
      <View style={styles.summarySection}>
        <PerkDonutDisplayManager
          ref={donutDisplayRef}
          userCardsWithPerks={userCardsWithPerks}
          periodAggregates={periodAggregates}
          redeemedInCurrentCycle={redeemedInCurrentCycle}
          uniquePerkPeriods={uniquePerkPeriods}
          backgroundColor="#FAFAFE"
        />
      </View>
      
      <View style={styles.cardsSectionHeader}>
        <Text style={styles.sectionTitle}>Your Cards</Text>
        <AIChatButton
          showNotification={showAiChatNotification}
          onOpen={onOpenAiChat}
          onClose={onCheckNotificationStatus}
        />
      </View>
    </View>
  );
}

// Forward ref for donut display manager access
export const PerksOverviewWithRef = React.forwardRef<
  { refresh: () => void }, 
  PerksOverviewProps
>((props, ref) => {
  const donutDisplayRef = useRef<{ refresh: () => void }>(null);

  React.useImperativeHandle(ref, () => ({
    refresh: () => {
      if (donutDisplayRef.current?.refresh) {
        donutDisplayRef.current.refresh();
      }
    }
  }));

  return (
    <View 
      onLayout={(event) => {
        const { height } = event.nativeEvent.layout;
        if (height > 0) {
          props.onListHeaderLayout(height);
        }
      }}
    >
      {props.headerPillContent && (
        <ActionHintPill 
          perk={props.headerPillContent} 
          onPress={() => props.onActionHintPress(props.headerPillContent)} 
          daysRemaining={props.headerPillContent.daysRemaining} 
        />
      )}
      
      <View style={styles.summarySection}>
        <PerkDonutDisplayManager
          ref={donutDisplayRef}
          userCardsWithPerks={props.userCardsWithPerks}
          periodAggregates={props.periodAggregates}
          redeemedInCurrentCycle={props.redeemedInCurrentCycle}
          uniquePerkPeriods={props.uniquePerkPeriods}
          backgroundColor="#FAFAFE"
        />
      </View>
      
      <View style={styles.cardsSectionHeader}>
        <Text style={styles.sectionTitle}>Your Cards</Text>
        <AIChatButton
          showNotification={props.showAiChatNotification}
          onOpen={props.onOpenAiChat}
          onClose={props.onCheckNotificationStatus}
        />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  summarySection: {
    paddingTop: 0,
    backgroundColor: '#FAFAFE',
  },
  cardsSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 20,
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 20,
    paddingHorizontal: 16,
    fontWeight: '600',
    color: '#1c1c1e',
  },
});