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

const HEADER_OFFSET = Platform.OS === 'ios' ? 120 : 90; // Offset for transparent header

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
  // Lottie refs map is no longer needed with autoPlay

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
      // Pop animation for the card thumbnail itself
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
    const idsArray = Array.from(selectedCardIds);
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
              size={26} // Slightly larger for a better tap target feel
              color={Colors.light.icon} 
              style={styles.checkboxIcon}
            />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { paddingTop: HEADER_OFFSET }]} edges={['bottom']}>
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
    paddingTop: 4,
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
    paddingHorizontal: 16, // Applied 16px horizontal padding
    paddingVertical: 12,   // Adjusted vertical padding
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
    marginRight: 12, // Adjusted margin
    justifyContent: 'center',
    alignItems: 'center',
    // overflow: 'visible', // Not strictly needed if Lottie is not overlapping here
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
    flex: 1, // Allows text to take available space and wrap
    fontSize: 17,
    color: Colors.light.text,
    marginRight: 8, // Padding between text and checkbox area
  },
  checkboxContainer: {
    width: 28, // Fixed width for consistent alignment
    height: 28, // Fixed height
    justifyContent: 'center',
    alignItems: 'center',
  },
  lottieCheckmarkOnRight: {
    width: 36, // Adjust size as needed for visual balance with checkbox
    height: 36,
    backgroundColor: 'transparent',
  },
  checkboxIcon: {
    // Additional styling for the Ionicons square if needed
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