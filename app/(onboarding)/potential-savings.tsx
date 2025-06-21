import React, { useMemo, useEffect, useState, useRef } from 'react';
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
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors } from '../../constants/Colors';
import { MotiView } from 'moti';
import { useOnboardingContext } from './_context/OnboardingContext';
import { onboardingScreenNames } from './_layout';
import { CardPerks } from '../../components/onboarding/CardPerks';
import { allCards, Card, Benefit } from '../../src/data/card-data';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';

export default function PotentialSavingsScreen() {
  const router = useRouter();
  const { selectedCards } = useOnboardingContext();
  const [displayValue, setDisplayValue] = useState(0);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [isCountingComplete, setIsCountingComplete] = useState(false);
  const hasAnimated = useRef(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Get the selected card objects with proper typing
  const selectedCardObjects = useMemo(() => {
    return selectedCards
      .map((cardId: string) => allCards.find(card => card.id === cardId))
      .filter((card): card is Card => card !== undefined)
      .map(card => ({
        ...card,
        benefits: [...card.benefits].sort((a, b) => {
          const annualValueA = a.value * (12 / a.periodMonths);
          const annualValueB = b.value * (12 / b.periodMonths);
          return annualValueB - annualValueA; // Sort in descending order
        })
      }));
  }, [selectedCards]);

  // Calculate total value with proper typing
  const totalValue = useMemo(() => {
    return selectedCardObjects.reduce((total: number, card: Card) => {
      const cardValue = card.benefits.reduce((sum: number, benefit: Benefit) => {
        // Convert benefit value to annual value by multiplying by (12/periodMonths)
        // For example: $100 quarterly benefit = $100 * (12/3) = $400 annual value
        const annualValue = benefit.value * (12 / benefit.periodMonths);
        return sum + annualValue;
      }, 0);
      return total + cardValue;
    }, 0);
  }, [selectedCardObjects]);

  // Calculate total fees
  const totalFees = useMemo(() => {
    return selectedCardObjects.reduce((total: number, card: Card) => {
      return total + (card.annualFee || 0);
    }, 0);
  }, [selectedCardObjects]);

  // Calculate net value
  const netValue = useMemo(() => {
    return totalValue - totalFees;
  }, [totalValue, totalFees]);

  // Animate the value counting up
  useEffect(() => {
    const finalValue = Math.round(totalValue);
    const finalFees = Math.round(totalFees);
    const finalNetValue = Math.round(netValue);
    const duration = 2000; // 2 seconds
    const steps = 60; // 60 steps for smooth animation
    const stepDuration = duration / steps;
    const increment = finalValue / steps;
    const feeIncrement = finalFees / steps;
    const netIncrement = finalNetValue / steps;
    let currentStep = 0;

    const interval = setInterval(() => {
      currentStep++;
      const newValue = Math.round(increment * currentStep);
      const newFees = Math.round(feeIncrement * currentStep);
      const newNetValue = Math.round(netIncrement * currentStep);
      setDisplayValue(newValue);
      setDisplayFees(newFees);
      setDisplayNetValue(newNetValue);

      // Add haptic feedback at certain thresholds
      if (currentStep === 1 || currentStep === steps) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      if (currentStep >= steps) {
        clearInterval(interval);
        setDisplayValue(finalValue);
        setDisplayFees(finalFees);
        setDisplayNetValue(finalNetValue);
        
        // Only trigger animations if we haven't already
        if (!hasAnimated.current) {
          hasAnimated.current = true;
          setIsCountingComplete(true);
          setShowCelebration(true);
          
          // Animate the scale
          Animated.sequence([
            // First expand outward
            Animated.spring(scaleAnim, {
              toValue: 1.4,
              useNativeDriver: true,
              damping: 7,
              stiffness: 350,
              mass: 1,
              velocity: 3,
            }),
          ]).start();
          
          // Hide celebration after 3 seconds
          setTimeout(() => {
            setShowCelebration(false);
          }, 2000);
        }
      }
    }, stepDuration);

    return () => clearInterval(interval);
  }, [totalValue, totalFees, netValue]);

  const [displayFees, setDisplayFees] = useState(0);
  const [displayNetValue, setDisplayNetValue] = useState(0);

  const handleStartTracking = async () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.push('/(onboarding)/register');
    } catch (e) {
      console.error("Failed to navigate", e);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
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
            <View style={styles.labelContainer}>
              <Text style={styles.heroLabel}>Your Annual Perk Paycheck</Text>
              <TouchableOpacity 
                style={styles.infoButton}
                onPress={() => {
                  Haptics.selectionAsync();
                  setShowInfoModal(true);
                }}
              >
                <Ionicons name="information-circle-outline" size={18} color={Colors.light.secondaryLabel + '80'} />
              </TouchableOpacity>
            </View>
            <View style={styles.valueContainer}>
              <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
                <Text style={styles.heroValue}>
                  {displayNetValue > 0 ? `$${displayNetValue}` : `$${displayValue}`}
                </Text>
              </Animated.View>
              <Text style={styles.extraValueText}>
                {displayNetValue > 0 
                  ? "Extra Cash After Covering Your Fees"
                  : "Total Perks Value"
                }
              </Text>
            </View>
          </View>

          <MotiView
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 400, delay: 400 }}
            style={styles.subheadContainer}
          >
            <Text style={styles.subheadText}>
              {displayNetValue > 0 ? (
                <>
                  Your <Text style={styles.subheadHighlight}>${displayValue}</Text> in total perks covers your <Text style={styles.subheadHighlight}>${displayFees}</Text> in fees and leave you with <Text style={styles.subheadHighlight}>${displayNetValue}</Text> to claim.
                </>
              ) : (
                <>
                  Your <Text style={styles.subheadHighlight}>${displayValue}</Text> in total perks helps offset your <Text style={styles.subheadHighlight}>${displayFees}</Text> in fees. Let&apos;s track your perks to maximize their value.
                </>
              )}
            </Text>
          </MotiView>
        </MotiView>

        <ScrollView 
          style={styles.cardsList}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.cardsListContent}
        >
          {selectedCardObjects.map((card: Card, index: number) => (
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
            <Text style={styles.ctaButtonText}>Start Tracking My Perks</Text>
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
            <Text style={styles.modalTitle}>Annual Perk Paycheck</Text>
            <Text style={styles.modalText}>
              This is the estimated net value of your card perks after subtracting annual fees. It represents the potential value you can get by maximizing your card benefits throughout the year.
            </Text>
            <Text style={styles.modalSubtext}>
              Note: This is not actual cash you can withdraw, but rather the total value of statement credits, travel benefits, and other perks available to you.
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
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  heroLabel: {
    fontSize: 20,
    color: Colors.light.secondaryLabel,
    textAlign: 'center',
  },
  infoButton: {
    marginLeft: 6,
    padding: 2,
  },
  valueContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 0,
  },
  heroValue: {
    fontSize: 72,
    fontWeight: '700',
    color: Colors.light.text,
    textAlign: 'center',
    letterSpacing: -1,
    transform: [{ scale: 1 }],
  },
  extraValueText: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.light.text,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
    letterSpacing: -0.3,
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
    marginBottom: 16,
  },
  modalSubtext: {
    fontSize: 14,
    color: Colors.light.secondaryLabel,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 24,
    opacity: 0.8,
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
    top: -465,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
    pointerEvents: 'none',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 9999,
  },
  celebrationAnimation: {
    width: '200%',
    height: '200%',
  },
  netValueContainer: {
    marginTop: 8,
    alignItems: 'center',
  },
  netGainText: {
    fontSize: 16,
    color: Colors.light.tint,
    textAlign: 'center',
    fontWeight: '600',
    marginBottom: 4,
  },
  savingsBreakdownText: {
    fontSize: 14,
    color: Colors.light.secondaryLabel,
    textAlign: 'center',
    opacity: 0.8,
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  subheadContainer: {
    paddingHorizontal: 24,
  },
  subheadText: {
    fontSize: 16,
    color: Colors.light.secondaryLabel,
    textAlign: 'center',
    lineHeight: 22,
  },
  subheadHighlight: {
    color: Colors.light.tint,
    fontWeight: '600',
  },
}); 