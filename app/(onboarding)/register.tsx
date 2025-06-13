import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  StatusBar,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors } from '../../constants/Colors';
import { MotiView } from 'moti';
import { useOnboardingContext } from './_context/OnboardingContext';
import { allCards } from '../../src/data/card-data';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function RegisterScreen() {
  const router = useRouter();
  const { selectedCards } = useOnboardingContext();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);

  // Get the selected card objects with proper typing
  const selectedCardObjects = useMemo(() => {
    return selectedCards
      .map((cardId: string) => allCards.find(card => card.id === cardId))
      .filter((card): card is typeof allCards[0] => card !== undefined);
  }, [selectedCards]);

  // Calculate total value with proper typing
  const totalValue = useMemo(() => {
    return selectedCardObjects.reduce((total: number, card: typeof allCards[0]) => {
      const cardValue = card.benefits.reduce((sum: number, benefit: any) => {
        const annualValue = benefit.value * (12 / benefit.periodMonths);
        return sum + annualValue;
      }, 0);
      return total + cardValue;
    }, 0);
  }, [selectedCardObjects]);

  const handleRegister = async () => {
    if (!email || !password) return;
    
    setIsLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // Simulate registration process
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setIsLoading(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.replace('/home' as any);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" />
      
      {/* Personalized Card Display */}
      <View style={styles.cardsContainer}>
        {selectedCardObjects.map((card, index) => (
          <MotiView
            key={card.id}
            from={{
              opacity: 0,
              translateY: -100,
              scale: 0.8,
              rotate: '-15deg',
            }}
            animate={{
              opacity: 1,
              translateY: 0,
              scale: 1,
              rotate: '0deg',
            }}
            transition={{
              type: 'spring',
              delay: index * 200,
              damping: 12,
              mass: 1,
              stiffness: 100,
            }}
            style={[
              styles.cardWrapper,
              {
                transform: [
                  { translateX: (index - (selectedCardObjects.length - 1) / 2) * 40 },
                ],
              },
            ]}
          >
            <Image
              source={card.image}
              style={styles.cardImage}
              resizeMode="contain"
            />
          </MotiView>
        ))}
      </View>

      <MotiView
        from={{ opacity: 0, translateY: 20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 600, delay: 400 }}
        style={styles.contentContainer}
      >
        <View style={styles.headerContainer}>
          <Text style={styles.title}>
            Save Your ${totalValue} Perk Dashboard
          </Text>
          <Text style={styles.subtitle}>
            Create a free account to get personalized reminders and ensure you never miss a benefit
          </Text>
        </View>

        <View style={styles.formContainer}>
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Create a password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          <TouchableOpacity
            style={[styles.registerButton, (!email || !password) && styles.registerButtonDisabled]}
            onPress={handleRegister}
            disabled={!email || !password || isLoading}
          >
            <Text style={styles.registerButtonText}>
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.loginLink}
            onPress={() => router.push('/login' as any)}
          >
            <Text style={styles.loginLinkText}>
              Already have an account? <Text style={styles.loginLinkTextBold}>Log in</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </MotiView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  cardsContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    marginTop: 20,
  },
  cardWrapper: {
    width: SCREEN_WIDTH * 0.4,
    height: 120,
    marginHorizontal: -20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  cardImage: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.light.text,
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 17,
    color: Colors.light.secondaryLabel,
    textAlign: 'center',
    lineHeight: 22,
    letterSpacing: -0.2,
    paddingHorizontal: 24,
  },
  formContainer: {
    gap: 20,
  },
  inputContainer: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: Colors.light.text,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  registerButton: {
    backgroundColor: Colors.light.tint,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: Colors.light.tint,
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 5,
  },
  registerButtonDisabled: {
    backgroundColor: '#d1d1d6',
    shadowOpacity: 0,
    elevation: 0,
  },
  registerButtonText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  loginLink: {
    alignItems: 'center',
    marginTop: 16,
  },
  loginLinkText: {
    fontSize: 15,
    color: Colors.light.secondaryLabel,
  },
  loginLinkTextBold: {
    color: Colors.light.tint,
    fontWeight: '600',
  },
}); 