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
import { useRouter } from 'expo-router';
import { Card, allCards } from '../../src/data/card-data';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import LottieView from 'lottie-react-native';
import * as Haptics from 'expo-haptics';

// Helper to get card network color (can be moved to a utility if used elsewhere)
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
      return '#F0F0F0'; // A light gray for others
  }
};

export default function OnboardingCardSelectScreen() {
  const router = useRouter();
  const [selectedCardIds, setSelectedCardIds] = useState<Set<string>>(new Set());
  const [firstCardAdded, setFirstCardAdded] = useState(false);

  const scaleValues = useRef(new Map<string, Animated.Value>()).current;
  const lottieRefs = useRef(new Map<string, LottieView | null>()).current;

  const getScaleValue = (cardId: string) => {
    if (!scaleValues.has(cardId)) {
      scaleValues.set(cardId, new Animated.Value(1));
    }
    return scaleValues.get(cardId)!;
  };

  const handleToggleCard = (cardId: string) => {
    const newSelectedCardIds = new Set(selectedCardIds);
    const cardScale = getScaleValue(cardId);
    const lottieRef = lottieRefs.get(cardId);

    if (newSelectedCardIds.has(cardId)) {
      newSelectedCardIds.delete(cardId);
      Animated.timing(cardScale, {
        toValue: 1,
        duration: 200,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start();
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
      
      // Play Lottie animation from the beginning
      lottieRef?.play(0); // Play from frame 0 to end
    }
    setSelectedCardIds(newSelectedCardIds);
  };

  const handleNext = () => {
    const idsArray = Array.from(selectedCardIds);
    if (idsArray.length === 0) {
        // Optionally, show an alert or message if no cards are selected
        // For now, we allow proceeding without cards.
    }
    router.push({
      pathname: '/(onboarding)/notification-prefs',
      params: { selectedCardIds: JSON.stringify(idsArray) }, 
    });
  };

  // Memoize sorted cards to prevent re-sorting on every render
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
          {isSelected && (
            <LottieView
              ref={r => { lottieRefs.set(card.id, r); }}
              source={require('../../assets/animations/checkmark.json')}
              autoPlay={false}
              loop={false}
              style={styles.lottieCheckmark}
              speed={1.5}
            />
          )}
        </Animated.View>
        <Text style={styles.cardName}>{card.name}</Text>
        {!isSelected && (
          <Ionicons 
            name={'ellipse-outline'} 
            size={24} 
            color={'#c7c7cc'} 
          />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.headerContainer}>
        <Text style={styles.title}>Select Your Cards</Text>
        <Text style={styles.subtitle}>Choose the credit cards you own. You can add more later.</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {sortedAllCards.map((card) => renderCardItem({ item: card }))}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
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
  headerContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 15,
    backgroundColor: '#ffffff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#c7c7cc',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.light.text,
    textAlign: 'center',
    marginBottom: 5,
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
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#c7c7cc',
  },
  cardRowSelected: {
    backgroundColor: '#eef7ff', // A light blue tint for selected rows
  },
  cardImageWrapper: {
    width: 50, // Slightly larger for better visibility
    height: 32, // Maintain aspect ratio
    borderRadius: 4,
    marginRight: 15,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'visible',
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
  },
  lottieCheckmark: {
    position: 'absolute',
    width: 36,
    height: 36,
    right: -8,
    top: -8,
    backgroundColor: 'transparent',
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
    borderRadius: 10,
    alignItems: 'center',
  },
  nextButtonText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '600',
  },
}); 