import React, { useState, useMemo, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Image,
  TouchableOpacity,
  Platform,
  StatusBar,
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { useRoute } from '@react-navigation/native';
import { Card, allCards } from '../../src/data/card-data';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import LottieView from 'lottie-react-native';
import * as Haptics from 'expo-haptics';
import { MotiView } from 'moti';
import { useOnboardingContext } from './_context/OnboardingContext';
import { onboardingScreenNames } from './_layout';
import { WIZARD_HEADER_HEIGHT } from './WizardHeader';
import { CardRow } from '../components/manage/CardRow';

const FREQUENTLY_OWNED_IDS = [
  'chase_sapphire_preferred',
  'amex_gold',
  'blue_cash_preferred',
  'chase_sapphire_reserve',
  'amex_platinum',
  'capital_one_venture_x',
  'boa_premium_rewards',
];

const ISSUER_ORDER = [
  "American Express",
  "Bank of America",
  "Capital One",
  "Chase",
];

function getIssuer(card: Card): string {
  const id = card.id.toLowerCase();
  const name = card.name.toLowerCase();

  if (id.startsWith('amex_') || id.startsWith('blue_cash_') || id.startsWith('delta_') || name.includes('(amex)') || name.includes('american express')) return "American Express";
  if (id.startsWith('chase_')) return "Chase";
  if (id.startsWith('boa_')) return "Bank of America";
  if (id.startsWith('capital_one_')) return "Capital One";
  if (id.startsWith('citi_')) return "Citi";
  if (id.startsWith('usb_')) return "U.S. Bank";
  if (id.startsWith('marriott_')) return "Marriott";
  if (id.startsWith('hilton_')) return "Hilton";
  
  return "Other";
}

export default function OnboardingCardSelectScreen() {
  const router = useRouter();
  const { setStep, setIsHeaderGloballyHidden, selectedCards, setSelectedCards } = useOnboardingContext();
  const route = useRoute();

  useFocusEffect(
    React.useCallback(() => {
      const screenName = route.name.split('/').pop() || 'card-select';
      const stepIndex = onboardingScreenNames.indexOf(screenName);
      if (stepIndex !== -1) {
        setStep(stepIndex);
      }
      setIsHeaderGloballyHidden(false);

      return () => {};
    }, [route.name, setStep, setIsHeaderGloballyHidden])
  );

  const selectedCardIds = useMemo(() => new Set(selectedCards), [selectedCards]);
  const scaleValues = useRef(new Map<string, Animated.Value>()).current;

  const headerText = useMemo(() => {
    const count = selectedCardIds.size;
    return count > 0 ? `Select Cards (${count} selected)` : 'Select Cards';
  }, [selectedCardIds.size]);

  const getScaleValue = (cardId: string) => {
    if (!scaleValues.has(cardId)) {
      scaleValues.set(cardId, new Animated.Value(1));
    }
    return scaleValues.get(cardId)!;
  };

  const handleToggleCard = (cardId: string) => {
    const newSelectedIds = new Set(selectedCardIds);
    const cardScale = getScaleValue(cardId);

    if (newSelectedIds.has(cardId)) {
      newSelectedIds.delete(cardId);
    } else {
      newSelectedIds.add(cardId);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      Animated.sequence([
        Animated.timing(cardScale, {
          toValue: 1.05,
          duration: 100,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(cardScale, {
          toValue: 1,
          duration: 100,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start();
    }
    setSelectedCards(Array.from(newSelectedIds));
  };

  const handleNext = () => {
    if (selectedCardIds.size === 0) return;
    router.push('/(onboarding)/renewal-dates');
  };

  const handleSkip = () => {
    setSelectedCards([]);
    router.push('/(onboarding)/onboarding-complete');
  };

  const groupedCards = useMemo(() => {
    const frequentlyOwnedIdsSet = new Set(FREQUENTLY_OWNED_IDS);
    
    const frequentlyOwned = FREQUENTLY_OWNED_IDS
      .map(id => allCards.find(c => c.id === id))
      .filter((c): c is Card => c !== undefined);
    
    const remainingCards = allCards.filter(c => !frequentlyOwnedIdsSet.has(c.id));
    
    const allRemainingGroups: { [key: string]: Card[] } = {};
    remainingCards.forEach(card => {
      const issuer = getIssuer(card);
      if (!allRemainingGroups[issuer]) {
        allRemainingGroups[issuer] = [];
      }
      allRemainingGroups[issuer].push(card);
    });

    const allCardsByIssuer: { [key: string]: Card[] } = {};
    const mainIssuerSet = new Set(ISSUER_ORDER);
    const otherIssuersList: Card[] = [];
    const nonMainMultiCardIssuers: { [key: string]: Card[] } = {};

    for (const issuerName in allRemainingGroups) {
        const cards = allRemainingGroups[issuerName];
        if (mainIssuerSet.has(issuerName)) {
            continue;
        }
        if (cards.length > 1) {
            nonMainMultiCardIssuers[issuerName] = cards;
        } else {
            otherIssuersList.push(...cards);
        }
    }
    
    ISSUER_ORDER.forEach(issuerName => {
        if (allRemainingGroups[issuerName]) {
            allCardsByIssuer[issuerName] = allRemainingGroups[issuerName].sort((a,b) => a.name.localeCompare(b.name));
        }
    });
    
    Object.keys(nonMainMultiCardIssuers).sort().forEach(issuerName => {
        allCardsByIssuer[issuerName] = nonMainMultiCardIssuers[issuerName].sort((a,b) => a.name.localeCompare(b.name));
    });
    
    if (otherIssuersList.length > 0) {
        allCardsByIssuer["Other Issuers"] = otherIssuersList.sort((a, b) => a.name.localeCompare(b.name));
    }
    
    return { frequentlyOwned, allCardsByIssuer };
  }, []);

  const subtitleAnimationDelay = 50;
  const listAnimationDelay = subtitleAnimationDelay + 100;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.headerContentContainer}>
        <MotiView
          from={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ type: 'timing', duration: 150 }}
          style={styles.headerWrapper}
        >
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerText}>
              {headerText}
            </Text>
          </View>
        </MotiView>
        <MotiView
          from={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ type: 'timing', duration: 150, delay: subtitleAnimationDelay }}
        >
          <Text style={styles.subtitle}>
            Choose the credit cards you own. You can add more later.
          </Text>
        </MotiView>
      </View>

      <MotiView
        from={{ opacity: 0, translateY: 12 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 200, delay: listAnimationDelay }}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.issuerGroup}>
            <Text style={styles.issuerName}>Frequently Owned</Text>
            {groupedCards.frequentlyOwned.map(card => (
              <CardRow
                key={card.id}
                card={card}
                isSelected={selectedCardIds.has(card.id)}
                onPress={handleToggleCard}
                mode="onboard"
                cardScaleAnim={getScaleValue(card.id)}
              />
            ))}
          </View>
          
          <View style={styles.issuerGroup}>
            <Text style={styles.issuerName}>All Cards by Issuer</Text>
            {Object.entries(groupedCards.allCardsByIssuer).map(([issuerName, cards]) => (
              <View key={issuerName} style={styles.subIssuerGroup}>
                <Text style={styles.subIssuerName}>{issuerName}</Text>
                {cards.map(card => (
                  <CardRow
                    key={card.id}
                    card={card}
                    isSelected={selectedCardIds.has(card.id)}
                    onPress={handleToggleCard}
                    mode="onboard"
                    cardScaleAnim={getScaleValue(card.id)}
                  />
                ))}
              </View>
            ))}
          </View>
        </ScrollView>
      </MotiView>

      <View style={styles.footer}>
        {selectedCardIds.size > 0 ? (
          <TouchableOpacity
            style={styles.nextButton}
            onPress={handleNext}
          >
            <Text style={styles.nextButtonText}>Next</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.nextButton, styles.skipButton]}
            onPress={handleSkip}
          >
            <Text style={[styles.nextButtonText, styles.skipButtonText]}>Skip for now</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  headerContentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 15,
    backgroundColor: '#ffffff',
  },
  headerWrapper: {
    paddingTop: 10,
  },
  headerTextContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerText: {
    fontSize: 24,
    fontWeight: '600',
    color: Colors.light.text,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: Colors.light.icon,
    textAlign: 'center',
  },
  scrollContent: {
    paddingBottom: 20,
  },
  issuerGroup: {
    marginBottom: 16,
  },
  issuerName: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  subIssuerGroup: {
    marginBottom: 16,
    paddingLeft: 20,
  },
  subIssuerName: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.light.text,
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  footer: {
    padding: 20,
    backgroundColor: '#f2f2f7',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#c7c7cc',
  },
  nextButton: {
    backgroundColor: Colors.light.tint,
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  nextButtonDisabled: {
    backgroundColor: Colors.light.icon,
    opacity: 0.5,
    shadowOpacity: 0,
    elevation: 0,
  },
  skipButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.light.tint,
    elevation: 0,
    shadowOpacity: 0,
  },
  skipButtonText: {
    color: Colors.light.tint,
  },
  nextButtonText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '600',
  },
}); 