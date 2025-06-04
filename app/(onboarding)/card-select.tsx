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
import { useOnboardingContext } from './context/OnboardingContext';
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

export default function OnboardingCardSelectScreen() {
  const router = useRouter();
  const { setStep, setIsHeaderGloballyHidden } = useOnboardingContext();
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

  const [selectedCardIds, setSelectedCardIds] = useState<Set<string>>(new Set());
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
    const newSelectedCardIds = new Set(selectedCardIds);
    const cardScale = getScaleValue(cardId);

    if (newSelectedCardIds.has(cardId)) {
      newSelectedCardIds.delete(cardId);
    } else {
      newSelectedCardIds.add(cardId);
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
    setSelectedCardIds(newSelectedCardIds);
  };

  const handleNext = () => {
    if (selectedCardIds.size === 0) return;
    const idsArray = Array.from(selectedCardIds);
    router.push({
      pathname: '/(onboarding)/renewal-dates',
      params: { selectedCardIds: JSON.stringify(idsArray) }, 
    });
  };

  const sortedAllCards = useMemo(() => 
    [...allCards].sort((a, b) => a.name.localeCompare(b.name)), 
    []
  );

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
              Select Cards{selectedCardIds.size > 0 ? ` (${selectedCardIds.size} selected)` : ''}
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
          {sortedAllCards.map((card) => (
            <CardRow
              key={card.id}
              card={card}
              isSelected={selectedCardIds.has(card.id)}
              onPress={handleToggleCard}
              mode="onboard"
              cardScaleAnim={getScaleValue(card.id)}
            />
          ))}
        </ScrollView>
      </MotiView>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.nextButton, selectedCardIds.size === 0 && styles.nextButtonDisabled]} 
          onPress={handleNext}
          disabled={selectedCardIds.size === 0}
        >
          <Text style={styles.nextButtonText}>Next</Text>
        </TouchableOpacity>
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
  nextButtonText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '600',
  },
}); 