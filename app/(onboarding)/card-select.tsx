import React, { useMemo, useRef } from 'react';
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
import { Card } from '../../src/data/card-data';
import { getAllCardsData } from '../../lib/database';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import LottieView from 'lottie-react-native';
import * as Haptics from 'expo-haptics';
import { MotiView } from 'moti';
import { useOnboardingContext } from './_context/OnboardingContext';
import { onboardingScreenNames } from './_layout';
import { WIZARD_HEADER_HEIGHT } from './WizardHeader';
import { CardRow } from '../../components/manage/CardRow';

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
  const { setStep, setIsHeaderGloballyHidden, selectedCards, toggleCard, hasCard } = useOnboardingContext();
  const route = useRoute();
  const scaleValues = useRef(new Map<string, Animated.Value>()).current;
  const [allCards, setAllCards] = useState<Card[]>([]);
  const [isLoadingCards, setIsLoadingCards] = useState(true);

  useEffect(() => {
    const loadCards = async () => {
      try {
        const cards = await getAllCardsData();
        setAllCards(cards);
      } catch (error) {
        console.error('Error loading cards:', error);
      } finally {
        setIsLoadingCards(false);
      }
    };
    
    loadCards();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      const screenName = route.name.split('/').pop() || 'card-select';
      const stepIndex = onboardingScreenNames.indexOf(screenName as typeof onboardingScreenNames[number]);
      if (stepIndex !== -1) {
        setStep(stepIndex);
      }
      setIsHeaderGloballyHidden(false);

      return () => {};
    }, [route.name, setStep, setIsHeaderGloballyHidden])
  );

  const headerText = useMemo(() => {
    return "What's In Your Wallet? \nPick your cards.";
  }, []);

  const getScaleValue = (cardId: string) => {
    if (!scaleValues.has(cardId)) {
      scaleValues.set(cardId, new Animated.Value(1));
    }
    return scaleValues.get(cardId)!;
  };

  const handleToggleCard = (cardId: string) => {
    const cardScale = getScaleValue(cardId);
    const isCurrentlySelected = hasCard(cardId);

    if (isCurrentlySelected) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Animated.timing(cardScale, {
        toValue: 1,
        duration: 200,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        useNativeDriver: true,
      }).start();
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Animated.sequence([
        Animated.timing(cardScale, {
          toValue: 1.1,
          duration: 150,
          easing: Easing.bezier(0.25, 0.1, 0.25, 1),
          useNativeDriver: true,
        }),
        Animated.timing(cardScale, {
          toValue: 1,
          duration: 200,
          easing: Easing.bezier(0.25, 0.1, 0.25, 1),
          useNativeDriver: true,
        }),
      ]).start();
    }
    toggleCard(cardId);
  };

  const handleNext = () => {
    if (selectedCards.length === 0) return;
    router.push('/(onboarding)/potential-savings');
  };


  const groupedCards = useMemo(() => {
    if (isLoadingCards || allCards.length === 0) {
      return { frequentlyOwned: [], allCardsByIssuer: {} };
    }
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
  }, [allCards, isLoadingCards]);

  const subtitleAnimationDelay = 50;
  const listAnimationDelay = subtitleAnimationDelay + 100;

  if (isLoadingCards) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle="dark-content" />
        <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
          <Text style={styles.subtitle}>Loading cards...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.headerContentContainer}>
        <MotiView
          from={{ opacity: 0, translateY: 8 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 400 }}
          style={styles.headerWrapper}
        >
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerText}>{headerText}</Text>
          </View>
        </MotiView>
        <MotiView
          from={{ opacity: 0, translateY: 8 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 400, delay: subtitleAnimationDelay }}
        >
          <Text style={styles.subtitle}>
            We do the math. You just tap.
          </Text>
        </MotiView>
      </View>

      <MotiView
        from={{ opacity: 0, translateY: 12 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 400, delay: listAnimationDelay }}
        style={{ flex: 1 }}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={true}
          overScrollMode="never"
        >
          <View style={styles.issuerGroup}>
            <Text style={styles.issuerName}>Frequently Owned</Text>
            {groupedCards.frequentlyOwned.map(card => (
              <CardRow
                key={card.id}
                card={card}
                isSelected={hasCard(card.id)}
                onPress={handleToggleCard}
                mode="onboard"
                cardScaleAnim={getScaleValue(card.id)}
              />
            ))}
          </View>
          
          <View style={styles.issuerGroup}>
            <Text style={styles.issuerName}>Browse All Cards</Text>
            {Object.entries(groupedCards.allCardsByIssuer).map(([issuerName, cards]) => (
              <View key={issuerName} style={styles.subIssuerGroup}>
                <Text style={styles.subIssuerName}>{issuerName}</Text>
                {cards.map(card => (
                  <CardRow
                    key={card.id}
                    card={card}
                    isSelected={hasCard(card.id)}
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

      <MotiView
        from={{ opacity: 0, translateY: 20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 400 }}
        style={styles.footer}
      >
        <TouchableOpacity
          style={[
            styles.nextButton,
            selectedCards.length === 0 && styles.nextButtonDisabled
          ]}
          onPress={handleNext}
          disabled={selectedCards.length === 0}
          activeOpacity={0.6}
        >
          <Text style={styles.nextButtonText}>Crunch My Numbers</Text>
        </TouchableOpacity>
      </MotiView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingTop: 16,
  },
  headerContentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: '#ffffff',
  },
  headerWrapper: {
    paddingTop: 8,
  },
  headerTextContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 6,
  },
  headerText: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.light.text,
    textAlign: 'center',
    letterSpacing: -0.5,
    lineHeight: 34,
  },
  subtitle: {
    fontSize: 17,
    color: Colors.light.secondaryLabel,
    textAlign: 'center',
    lineHeight: 22,
    letterSpacing: -0.2,
    paddingHorizontal: 24,
    paddingBottom: 24
  },
  scrollContent: {
  },
  issuerGroup: {
    marginBottom: 24,
  },
  issuerName: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.light.text,
    paddingHorizontal: 20,
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  subIssuerGroup: {
    marginBottom: 20,
    paddingLeft: 20,
  },
  subIssuerName: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.light.secondaryLabel,
    paddingHorizontal: 20,
    marginBottom: 12,
    letterSpacing: -0.2,
  },
  footer: {
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: 32,
    backgroundColor: 'transparent',
    alignItems: 'center',
  },
  nextButton: {
    backgroundColor: Colors.light.tint,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    width: '100%',
    shadowColor: Colors.light.tint,
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 5,
  },
  nextButtonDisabled: {
    backgroundColor: '#d1d1d6',
    shadowOpacity: 0,
    elevation: 0,
  },
  nextButtonText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  cardContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    transform: [{ perspective: 1000 }, { rotateY: '-5deg' }],
  },
  cardImage: {
    width: 60,
    height: 40,
    borderRadius: 8,
    marginRight: 12,
  },
  cardNetworkLogo: {
    width: 24,
    height: 24,
    marginRight: 8,
  },
}); 