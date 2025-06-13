import React, { useMemo, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  Platform,
  ScrollView,
  TouchableOpacity,
  Modal,
  Pressable,
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
import { Ionicons } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';

export default function PotentialSavingsScreen() {
  const router = useRouter();
  const { selectedCards } = useOnboardingContext();
  const [displayValue, setDisplayValue] = useState(0);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [isCountingComplete, setIsCountingComplete] = useState(false);

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
        // Set both states at once to prevent multiple re-renders
        setIsCountingComplete(true);
        setShowCelebration(true);
        
        // Hide celebration after 3 seconds
        setTimeout(() => {
          setShowCelebration(false);
        }, 3000);
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
      
      {showCelebration && (
        <View style={styles.celebrationContainer}>
          <LottieView
            source={require('@/assets/animations/celebration.json')}
            autoPlay
            loop={false}
            style={styles.celebrationAnimation}
          />
        </View>
      )}

      <View style={styles.content}>
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 400 }}
        >
          <View style={styles.heroSection}>
            <Text style={styles.heroLabel}>Your Potential Annual Savings</Text>
            <View style={styles.valueContainer}>
              <MotiView
                animate={isCountingComplete ? {
                  scale: [1, 1.7, 1.2],
                } : {
                  scale: 1,
                }}
                transition={{
                  type: 'timing',
                  duration: 100,
                  scale: {
                    type: 'spring',
                    damping: 10,
                    stiffness: 20,
                    mass: 1,
                  },
                }}
              >
                <Text style={styles.heroValue}>${displayValue}</Text>
              </MotiView>
              <TouchableOpacity 
                style={styles.infoButton}
                onPress={() => {
                  Haptics.selectionAsync();
                  setShowInfoModal(true);
                }}
              >
                <Ionicons name="information-circle-outline" size={24} color={Colors.light.secondaryLabel} />
              </TouchableOpacity>
            </View>
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

      <Modal
        animationType="fade"
        transparent={true}
        visible={showInfoModal}
        onRequestClose={() => setShowInfoModal(false)}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={() => setShowInfoModal(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>How is this calculated?</Text>
            <Text style={styles.modalText}>
              We sum the face value of the major annual statement credits and benefits for your selected cards. This is the potential value you can get if you maximize your perks each year.
            </Text>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowInfoModal(false)}
            >
              <Text style={styles.modalCloseButtonText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
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
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroValue: {
    fontSize: 72,
    fontWeight: '700',
    color: Colors.light.text,
    textAlign: 'center',
    letterSpacing: -1,
    transform: [{ scale: 1 }],
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
  infoButton: {
    marginLeft: 8,
    padding: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    width: '85%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  modalText: {
    fontSize: 16,
    color: Colors.light.secondaryLabel,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 24,
  },
  modalCloseButton: {
    backgroundColor: Colors.light.tint,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalCloseButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  celebrationContainer: {
    position: 'absolute',
    top: -420,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    pointerEvents: 'none',
    justifyContent: 'center',
    alignItems: 'center',
  },
  celebrationAnimation: {
    width: '150%',
    height: '150%',
  },
}); 