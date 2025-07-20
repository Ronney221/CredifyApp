import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  StatusBar,
  Animated,
  useWindowDimensions,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MotiView } from 'moti';
import { Colors } from '../../constants/Colors';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useOnboardingContext } from './_context/OnboardingContext';

// Design tokens
const TOKENS = {
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  typography: {
    largeTitle: {
      fontSize: 32,
      lineHeight: 38,
      letterSpacing: -1,
      fontWeight: '800' as const,
    },
    title1: {
      fontSize: 28,
      lineHeight: 34,
      letterSpacing: -0.5,
      fontWeight: '700' as const,
    },
    headline: {
      fontSize: 17,
      lineHeight: 22,
      letterSpacing: -0.2,
      fontWeight: '600' as const,
    },
    body: {
      fontSize: 17,
      lineHeight: 24,
      letterSpacing: -0.2,
      fontWeight: '400' as const,
    },
    statNumber: {
      fontSize: 36,
      lineHeight: 40,
      letterSpacing: -1,
      fontWeight: '800' as const,
    },
  },
  colors: {
    text: {
      primary: '#0B1B3F',
      secondary: Colors.light.secondaryLabel,
    },
    background: {
      card: '#F9FAFB',
    },
  },
  animation: {
    spring: {
      type: 'spring' as const,
      damping: 15,
      mass: 1,
      stiffness: 120,
    },
    timing: {
      type: 'timing' as const,
      duration: 400,
    },
  },
};

export default function WhyThisMattersScreen() {
  const router = useRouter();
  const { selectedCards } = useOnboardingContext();
  const { width: SCREEN_WIDTH } = useWindowDimensions();

  const handleContinue = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.push('/(onboarding)/potential-savings');
  };


  const statistics = [
    {
      icon: 'trending-down',
      number: '23%',
      title: 'Benefits Missed',
      description: 'Credit card users miss 23% of their available benefits on average',
      color: '#FF6B6B',
    },
    {
      icon: 'cash-outline',
      number: '$15B',
      title: 'Left Unclaimed',
      description: '$15 billion in rewards go unclaimed annually across all cardholders',
      color: '#4ECDC4',
    },
    {
      icon: 'time-outline',
      number: `${selectedCards.length}`,
      title: 'Cards Selected',
      description: `You've selected ${selectedCards.length} card${selectedCards.length !== 1 ? 's' : ''} - let's see what you might be missing`,
      color: Colors.light.tint,
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" />
      
      <LinearGradient
        colors={['#ffffff', '#f9fafb']}
        style={styles.gradient}
      >
        <View style={styles.scrollContent}>
          <MotiView
            from={{ opacity: 0, translateY: 30 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={TOKENS.animation.timing}
            style={styles.headerContainer}
          >
            <Text style={[TOKENS.typography.largeTitle, styles.title]}>
              Why This{' '}
              <Text style={styles.titleHighlight}>Matters</Text>
            </Text>
            <Text style={[TOKENS.typography.body, styles.subtitle]}>
              Most people are leaving money on the table without realizing it
            </Text>
          </MotiView>

          <View style={styles.statisticsContainer}>
            {statistics.map((stat, index) => (
              <MotiView
                key={index}
                from={{ opacity: 0, translateY: 20, scale: 0.9 }}
                animate={{ opacity: 1, translateY: 0, scale: 1 }}
                transition={{
                  ...TOKENS.animation.spring,
                  delay: 200 + (index * 150),
                }}
                style={styles.statisticCard}
              >
                <View style={[styles.iconContainer, { backgroundColor: stat.color + '15' }]}>
                  <Ionicons 
                    name={stat.icon as any} 
                    size={28} 
                    color={stat.color} 
                  />
                </View>
                <View style={styles.statisticContent}>
                  <Text style={[TOKENS.typography.statNumber, styles.statNumber, { color: stat.color }]}>
                    {stat.number}
                  </Text>
                  <Text style={[TOKENS.typography.headline, styles.statTitle]}>
                    {stat.title}
                  </Text>
                  <Text style={[TOKENS.typography.body, styles.statDescription]}>
                    {stat.description}
                  </Text>
                </View>
              </MotiView>
            ))}
          </View>

          <MotiView
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ ...TOKENS.animation.timing, delay: 800 }}
            style={styles.urgencyContainer}
          >
            <View style={styles.urgencyCard}>
              <Ionicons name="warning" size={24} color="#FF8C42" style={styles.urgencyIcon} />
              <Text style={styles.urgencyText}>
                <Text style={styles.urgencyHighlight}>Don't be part of the statistic.</Text>
                {'\n'}Let's calculate exactly what your cards can do for you.
              </Text>
            </View>
          </MotiView>

          <MotiView
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ ...TOKENS.animation.timing, delay: 1000 }}
            style={styles.footer}
          >
            <TouchableOpacity
              style={styles.continueButton}
              onPress={handleContinue}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Calculate My Potential"
              accessibilityHint="Proceeds to calculate your potential savings"
            >
              <Text style={styles.continueButtonText}>Calculate My Potential</Text>
              <Ionicons name="arrow-forward" size={20} color="#ffffff" style={styles.buttonIcon} />
            </TouchableOpacity>
          </MotiView>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  gradient: {
    flex: 1,
  },
  scrollContent: {
    flex: 1,
    paddingHorizontal: TOKENS.spacing.lg,
    paddingTop: TOKENS.spacing.lg,
    paddingBottom: TOKENS.spacing.lg,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: TOKENS.spacing.xl,
  },
  title: {
    color: TOKENS.colors.text.primary,
    textAlign: 'center',
    marginBottom: TOKENS.spacing.sm,
  },
  titleHighlight: {
    color: Colors.light.tint,
  },
  subtitle: {
    color: TOKENS.colors.text.secondary,
    textAlign: 'center',
    paddingHorizontal: TOKENS.spacing.md,
    opacity: 0.8,
  },
  statisticsContainer: {
    gap: TOKENS.spacing.md,
    marginBottom: TOKENS.spacing.lg,
  },
  statisticCard: {
    flexDirection: 'row',
    backgroundColor: TOKENS.colors.background.card,
    padding: TOKENS.spacing.lg,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: TOKENS.spacing.md,
    flexShrink: 0,
  },
  statisticContent: {
    flex: 1,
  },
  statNumber: {
    marginBottom: TOKENS.spacing.xs,
  },
  statTitle: {
    color: TOKENS.colors.text.primary,
    marginBottom: TOKENS.spacing.xs,
  },
  statDescription: {
    color: TOKENS.colors.text.secondary,
    fontSize: 15,
    lineHeight: 20,
  },
  urgencyContainer: {
    marginBottom: TOKENS.spacing.lg,
  },
  urgencyCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF8F0',
    padding: TOKENS.spacing.lg,
    borderRadius: 14,
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: '#FFE4CC',
  },
  urgencyIcon: {
    marginRight: TOKENS.spacing.sm,
    marginTop: 2,
  },
  urgencyText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
    color: TOKENS.colors.text.primary,
  },
  urgencyHighlight: {
    fontWeight: '600',
    color: '#FF8C42',
  },
  footer: {
    marginTop: TOKENS.spacing.md,
    paddingBottom: Platform.OS === 'ios' ? 20 : 16,
  },
  continueButton: {
    backgroundColor: Colors.light.tint,
    paddingVertical: 18,
    paddingHorizontal: TOKENS.spacing.lg,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    shadowColor: Colors.light.tint,
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  continueButtonText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.3,
    marginRight: TOKENS.spacing.sm,
  },
  buttonIcon: {
    marginTop: 1,
  },
});