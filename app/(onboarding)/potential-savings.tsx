import React, { useMemo, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  Platform,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors } from '../../constants/Colors';
import { MotiView } from 'moti';
import { useOnboardingContext } from './_context/OnboardingContext';
import { onboardingScreenNames } from './_layout';
import { CardPerks } from '../components/onboarding/CardPerks';
import { allCards } from '../../src/data/card-data';
import * as Haptics from 'expo-haptics';

export default function PotentialSavingsScreen() {
  const router = useRouter();
  const { selectedCards } = useOnboardingContext();
  const [displayValue, setDisplayValue] = useState(0);

  // Get the selected card objects
  const selectedCardObjects = useMemo(() => {
    return selectedCards
      .map(cardId => allCards.find(card => card.id === cardId))
      .filter((card): card is NonNullable<typeof card> => card !== undefined);
  }, [selectedCards]);

  // Calculate total value
  const totalValue = useMemo(() => {
    return selectedCardObjects.reduce((total, card) => {
      const cardValue = card.benefits.reduce((sum, benefit) => {
        const annualValue = benefit.value * (12 / benefit.periodMonths);
        return sum + annualValue;
      }, 0);
      return total + cardValue;
    }, 0);
  }, [selectedCardObjects]);

  // Animate the value counting up
  useEffect(() => {
    const finalValue = Math.round(totalValue);
    const duration = 2000; // 2 seconds
    const steps = 60; // 60 steps for smooth animation
    const stepDuration = duration / steps;
    const increment = finalValue / steps;
    let currentStep = 0;

    const interval = setInterval(() => {
      currentStep++;
      const newValue = Math.round(increment * currentStep);
      setDisplayValue(newValue);

      // Add haptic feedback at certain thresholds
      if (currentStep === 1 || currentStep === steps) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      if (currentStep >= steps) {
        clearInterval(interval);
        setDisplayValue(finalValue);
      }
    }, stepDuration);

    return () => clearInterval(interval);
  }, [totalValue]);

  const handleStartTracking = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.push('/(auth)/register');
  };

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <StatusBar barStyle="dark-content" />
      
      <View style={styles.content}>
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 400 }}
        >
          <View style={styles.heroSection}>
            <Text style={styles.heroLabel}>Your Potential Annual Savings</Text>
            <Text style={styles.heroValue}>${displayValue}</Text>
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

        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 400, delay: 400 }}
          style={styles.footer}
        >
          <TouchableOpacity
            style={styles.ctaButton}
            onPress={handleStartTracking}
            activeOpacity={0.6}
          >
            <Text style={styles.ctaButtonText}>Save and Start Tracking</Text>
          </TouchableOpacity>
        </MotiView>
      </View>
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
  },
  heroSection: {
    alignItems: 'center',
    marginTop: 20,
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
    marginTop: 24,
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
    marginTop: 24,
  },
  cardsListContent: {
    paddingBottom: 16,
  },
  footer: {
    paddingTop: 12,
    paddingBottom: 16,
    paddingHorizontal: 20,
    backgroundColor: 'transparent',
    alignItems: 'center',
    marginBottom: 16,
  },
  ctaButton: {
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
  ctaButtonText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
}); 