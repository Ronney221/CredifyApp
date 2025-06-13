import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors } from '../../constants/Colors';
import { MotiView } from 'moti';
import { useOnboardingContext } from './_context/OnboardingContext';
import { onboardingScreenNames } from './_layout';
import { CardPerks } from '../components/onboarding/CardPerks';
import { allCards } from '../../src/data/card-data';

export default function PotentialSavingsScreen() {
  const router = useRouter();
  const { selectedCards } = useOnboardingContext();

  // Get the selected card objects
  const selectedCardObjects = useMemo(() => {
    return selectedCards
      .map(cardId => allCards.find(card => card.id === cardId))
      .filter((card): card is NonNullable<typeof card> => card !== undefined);
  }, [selectedCards]);

  // Calculate total value (placeholder - replace with actual calculation)
  const totalValue = useMemo(() => {
    return selectedCardObjects.reduce((total, card) => {
      const cardValue = card.benefits.reduce((sum, benefit) => {
        // Convert benefit value to annual value
        const annualValue = benefit.value * (12 / benefit.periodMonths);
        return sum + annualValue;
      }, 0);
      return total + cardValue;
    }, 0);
  }, [selectedCardObjects]);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <StatusBar barStyle="dark-content" />
      
      <MotiView
        from={{ opacity: 0, translateY: 20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 400 }}
        style={styles.content}
      >
        <View style={styles.heroSection}>
          <Text style={styles.heroLabel}>Your Potential Annual Savings</Text>
          <Text style={styles.heroValue}>${Math.round(totalValue)}</Text>
        </View>

        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 400, delay: 200 }}
          style={styles.detailsSection}
        >
          <Text style={styles.detailsText}>
            Based on your selected cards and typical spending patterns
          </Text>
        </MotiView>

        <ScrollView 
          style={styles.cardsList}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.cardsListContent}
        >
          {selectedCardObjects.map((card, index) => (
            <CardPerks key={card.id} card={card} index={index} />
          ))}
        </ScrollView>
      </MotiView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  heroSection: {
    alignItems: 'center',
    marginTop: 40,
  },
  heroLabel: {
    fontSize: 20,
    color: Colors.light.secondaryLabel,
    marginBottom: 12,
    textAlign: 'center',
  },
  heroValue: {
    fontSize: 72,
    fontWeight: '700',
    color: Colors.light.text,
    textAlign: 'center',
    letterSpacing: -1,
  },
  detailsSection: {
    marginTop: 32,
    alignItems: 'center',
  },
  detailsText: {
    fontSize: 17,
    color: Colors.light.secondaryLabel,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 24,
  },
  cardsList: {
    flex: 1,
    marginTop: 32,
  },
  cardsListContent: {
    paddingBottom: 32,
  },
}); 