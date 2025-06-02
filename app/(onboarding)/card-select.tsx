import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Image,
  TouchableOpacity,
  Platform,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Card, allCards } from '../../src/data/card-data';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors'; // Assuming Colors constant

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

  const handleToggleCard = (cardId: string) => {
    setSelectedCardIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(cardId)) {
        newSet.delete(cardId);
      } else {
        newSet.add(cardId);
      }
      return newSet;
    });
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

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.headerContainer}>
        <Text style={styles.title}>Select Your Cards</Text>
        <Text style={styles.subtitle}>Choose the credit cards you own. You can add more later.</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {sortedAllCards.map((card) => {
          const isSelected = selectedCardIds.has(card.id);
          const networkColor = getCardNetworkColor(card);
          return (
            <TouchableOpacity 
              key={card.id} 
              style={[styles.cardRow, isSelected && styles.cardRowSelected]}
              onPress={() => handleToggleCard(card.id)}
              activeOpacity={0.7}
            >
              <View style={[styles.cardImageWrapper, { backgroundColor: networkColor }]}>
                <Image source={card.image} style={styles.cardImage} />
              </View>
              <Text style={styles.cardName}>{card.name}</Text>
              <Ionicons 
                name={isSelected ? 'checkmark-circle' : 'ellipse-outline'} 
                size={24} 
                color={isSelected ? Colors.light.tint : '#c7c7cc'} 
              />
            </TouchableOpacity>
          );
        })}
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
    paddingTop: Platform.OS === 'ios' ? 20 : StatusBar.currentHeight || 20 + 10,
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
    overflow: 'hidden',
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