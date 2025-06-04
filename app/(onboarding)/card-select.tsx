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
      if (!firstCardAdded) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setFirstCardAdded(true);
      }
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

  const renderCardItem = ({ item: card }: { item: Card }) => {
    const isSelected = selectedCardIds.has(card.id);
    const networkColor = getCardNetworkColor(card);
    const cardScaleAnim = getScaleValue(card.id);

    return (
      <TouchableOpacity 
        key={card.id} 
        style={[styles.cardRow, isSelected && styles.cardRowSelected]}
        onPress={() => handleToggleCard(card.id)}
        activeOpacity={0.7}
      >
        <Animated.View style={[styles.cardImageWrapper, { backgroundColor: networkColor, transform: [{ scale: cardScaleAnim }] }]}>
          <Image source={card.image} style={styles.cardImage} />
        </Animated.View>
        <Text style={styles.cardName}>{card.name}</Text>
        <View style={styles.checkboxContainer}>
          {isSelected ? (
            <LottieView
              source={require('../../assets/animations/checkmark.json')}
              autoPlay={true}
              loop={false}
              style={styles.lottieCheckmarkOnRight}
              speed={1.5} 
            />
          ) : (
            <Ionicons 
              name="square-outline" 
              size={26}
              color={Colors.light.icon} 
              style={styles.checkboxIcon}
            />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const subtitleAnimationDelay = 50;
  const listAnimationDelay = subtitleAnimationDelay + 100;

  return (
    <SafeAreaView style={[styles.container, { paddingTop: WIZARD_HEADER_HEIGHT }]} edges={['bottom']}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.headerContentContainer}> 
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
          {sortedAllCards.map((card) => renderCardItem({ item: card }))}
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
    backgroundColor: '#f2f2f7',
  },
  headerContentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 15,
    backgroundColor: '#ffffff',
    paddingTop: 10,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.light.icon,
    textAlign: 'center',
  },
  scrollContent: {
    paddingBottom: 20, 
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 12,   
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#c7c7cc',
  },
  cardRowSelected: {
    backgroundColor: '#eef7ff', 
  },
  cardImageWrapper: {
    width: 64,  
    height: 40, 
    borderRadius: 5, 
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  cardImage: {
    width: '90%', 
    height: '90%', 
    resizeMode: 'contain',
  },
  cardName: {
    flex: 1, 
    fontSize: 17,
    color: Colors.light.text,
    marginRight: 8, 
  },
  checkboxContainer: {
    width: 28, 
    height: 28, 
    justifyContent: 'center',
    alignItems: 'center',
  },
  lottieCheckmarkOnRight: {
    width: 36, 
    height: 36,
    backgroundColor: 'transparent',
  },
  checkboxIcon: {
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