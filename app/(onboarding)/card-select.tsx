import React, { useState, useMemo, useRef, useEffect } from 'react';
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

const getCardNetworkColor = (card: Card) => {
  switch (card.network?.toLowerCase()) {
    case 'amex':
    case 'american express':
      if (card.name?.toLowerCase().includes('platinum')) return '#E5E4E2';
      if (card.name?.toLowerCase().includes('gold')) return '#B08D57';
      return '#007bc1';
    case 'chase':
      return '#124A8D';
    default:
      return '#F0F0F0';
  }
};

const ISSUER_NAME_MAP: { [key: string]: string } = {
  amex: 'American Express',
  chase: 'Chase',
  citi: 'Citi',
  capone: 'Capital One',
  boa: 'Bank of America',
  usbank: 'U.S. Bank',
  delta: 'Delta',
  hilton: 'Hilton',
  marriott: 'Marriott',
};

// Define a custom sort order for Amex cards
const AMEX_SORT_ORDER = [
  'amex_blue_cash_preferred',
  'amex_green',
  'amex_gold',
  'amex_platinum',
];

// Define a custom sort order for issuer groups
const GROUP_SORT_ORDER = [
  'American Express',
  'Chase',
  'Bank of America',
  'Other Issuers',
];

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

      return () => {
      };
    }, [route.name, setStep, setIsHeaderGloballyHidden])
  );

  const selectedCardIds = useMemo(() => new Set(selectedCards), [selectedCards]);
  const [firstCardAdded, setFirstCardAdded] = useState(false);
  const scaleValues = useRef(new Map<string, Animated.Value>()).current;

  // Get the header text based on selected cards
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
    // Clear any selections just in case, then navigate
    setSelectedCards([]);
    router.push('/(onboarding)/onboarding-complete');
  };

  const groupedCards = useMemo(() => {
    // 1. Group all cards by their issuer name.
    const issuerCardMap: { [key: string]: Card[] } = {};
    allCards.forEach(card => {
      const issuerKey = card.id.split('_')[0];
      const issuerName = ISSUER_NAME_MAP[issuerKey] || issuerKey;
      if (!issuerCardMap[issuerName]) {
        issuerCardMap[issuerName] = [];
      }
      issuerCardMap[issuerName].push(card);
    });

    // 2. Separate multi-card issuers from single-card issuers.
    const multiCardIssuers: { [key: string]: Card[] } = {};
    const otherIssuers: Card[] = [];
    for (const issuerName in issuerCardMap) {
      if (issuerCardMap[issuerName].length > 1) {
        multiCardIssuers[issuerName] = issuerCardMap[issuerName];
      } else {
        otherIssuers.push(...issuerCardMap[issuerName]);
      }
    }

    // 3. Assemble the final groups in the desired order.
    const finalGroups: { [key: string]: Card[] } = {};
    GROUP_SORT_ORDER.forEach(groupName => {
      if (groupName === 'Other Issuers') {
        if (otherIssuers.length > 0) {
          finalGroups['Other Issuers'] = otherIssuers.sort((a, b) => a.name.localeCompare(b.name));
        }
      } else if (multiCardIssuers[groupName]) {
        const cards = multiCardIssuers[groupName];
        if (groupName === 'American Express') {
          // Apply custom sort for Amex
          finalGroups[groupName] = cards.sort((a, b) => {
            const indexA = AMEX_SORT_ORDER.indexOf(a.id);
            const indexB = AMEX_SORT_ORDER.indexOf(b.id);
            if (indexA === -1) return 1; // Put unsorted items at the end
            if (indexB === -1) return -1;
            return indexA - indexB;
          });
        } else {
          // Default sort for other multi-card groups
          finalGroups[groupName] = cards.sort((a, b) => a.name.localeCompare(b.name));
        }
      }
    });

    return finalGroups;
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
        style={{flex: 1}}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {Object.entries(groupedCards).map(([issuerName, cards]) => (
            <View key={issuerName} style={styles.issuerGroup}>
              <Text style={styles.issuerName}>{issuerName}</Text>
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
    shadowOffset: {width:0, height:2},
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