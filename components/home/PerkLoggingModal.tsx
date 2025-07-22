//perk-logging-modal.tsx
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Pressable,
  Platform,
  Keyboard,
  KeyboardAvoidingView,
  Dimensions,
  ScrollView,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  Easing,
  runOnJS,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { CardPerk } from '../../src/data/card-data';
import MerchantLogo from './MerchantLogo';

interface PerkLoggingModalProps {
  visible: boolean;
  perk: CardPerk | null;
  onDismiss: () => void;
  onSaveLog: (amount: number) => void;
}

const { height: screenHeight } = Dimensions.get('window');

// Helper to parse decimal input
const parseDecimalInput = (text: string): number => {
  const sanitized = text.replace(/[^0-9.]/g, '');
  const parts = sanitized.split('.');
  const formattedText = parts.length > 1 
    ? `${parts[0]}.${parts[1].slice(0, 2)}`
    : sanitized;
  
  const value = parseFloat(formattedText);
  return isNaN(value) ? 0 : value;
};

// Helper to format currency
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

// Get merchant brand color (reuse logic from PerkInfoSheet)
const getMerchantColor = (perkName: string): string => {
  const lowerName = perkName.toLowerCase();
  
  if (lowerName.includes('uber')) return '#000000';
  if (lowerName.includes('lyft')) return '#FF00BF';
  if (lowerName.includes('doordash')) return '#FF3008';
  if (lowerName.includes('grubhub')) return '#FF8000';
  if (lowerName.includes('netflix')) return '#E50914';
  if (lowerName.includes('walmart')) return '#0071CE';
  if (lowerName.includes('instacart')) return '#43B02A';
  if (lowerName.includes('capital one travel')) return '#004879';
  if (lowerName.includes('chase travel')) return '#117ACA';
  if (lowerName.includes('disney')) return '#0066CC';
  if (lowerName.includes('delta')) return '#003366';
  if (lowerName.includes('united')) return '#002244';
  if (lowerName.includes('american airlines') || lowerName.includes('american credit')) return '#C41E3A';
  if (lowerName.includes('marriott')) return '#003366';
  if (lowerName.includes('hilton')) return '#104C97';
  if (lowerName.includes('clear')) return '#003087';
  if (lowerName.includes('dunkin')) return '#FF671F';
  if (lowerName.includes('starbucks')) return '#00704A';
  if (lowerName.includes('opentable')) return '#DA3743';
  if (lowerName.includes('stubhub')) return '#3B5998';
  
  // Category-based colors
  if (lowerName.includes('airline fee credit') || 
      lowerName.includes('airline incidental') || 
      lowerName.includes('airline flight credit')) return '#1E3A8A';
  if (lowerName.includes('annual travel credit')) return '#6366F1';
  if (lowerName.includes('travel & dining credit')) return '#059669';
  if (lowerName.includes('digital entertainment credit')) return '#7C3AED';
  if (lowerName.includes('apple services credit')) return '#007AFF';
  if (lowerName.includes('disney bundle credit')) return '#0066CC';
  if (lowerName.includes('lifestyle convenience credits')) return '#059669';
  if (lowerName.includes('rideshare credit')) return '#000000';
  if (lowerName.includes('dining credit')) return '#DC2626';
  if (lowerName.includes('uber cash')) return '#000000';
  if (lowerName.includes('travel')) return '#6366F1';
  if (lowerName.includes('dining')) return '#DC2626';
  if (lowerName.includes('hotel')) return '#7C3AED';
  if (lowerName.includes('entertainment')) return '#7C3AED';
  
  return '#007AFF'; // Default iOS blue
};

export default function PerkLoggingModal({
  visible,
  perk,
  onDismiss,
  onSaveLog,
}: PerkLoggingModalProps) {
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  const translateY = useSharedValue(screenHeight);
  const context = useSharedValue({ y: 0 });
  const overlayOpacity = useSharedValue(0);
  const heroCardScale = useSharedValue(0.95);
  const heroCardRotation = useSharedValue(-2);
  const buttonScale = useSharedValue(1);
  const buttonGlow = useSharedValue(0);
  const rippleScale = useSharedValue(0);
  const rippleOpacity = useSharedValue(0);
  const successCheckScale = useSharedValue(0);
  const successCheckOpacity = useSharedValue(0);
  const insets = useSafeAreaInsets();

  const maxValue = perk?.status === 'partially_redeemed' 
    ? (perk?.remaining_value || 0) 
    : (perk?.value || 0);
  
  const merchantColor = useMemo(() => perk ? getMerchantColor(perk.name) : '#007AFF', [perk]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
    };
  });

  const animatedOverlayStyle = useAnimatedStyle(() => {
    return {
      opacity: overlayOpacity.value,
    };
  });

  const animatedHeroStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: heroCardScale.value },
        { rotateZ: `${heroCardRotation.value}deg` }
      ],
      opacity: withTiming(visible ? 1 : 0, { duration: 300 }),
    };
  });

  const animatedButtonStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: buttonScale.value },
      ],
    };
  });

  const animatedButtonGlowStyle = useAnimatedStyle(() => {
    return {
      shadowOpacity: buttonGlow.value * 0.3,
      shadowRadius: buttonGlow.value * 20,
      elevation: buttonGlow.value * 8,
    };
  });

  const animatedRippleStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: rippleScale.value }],
      opacity: rippleOpacity.value,
    };
  });

  const animatedSuccessStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: successCheckScale.value }],
      opacity: successCheckOpacity.value,
    };
  });

  const handleDismiss = useCallback(() => {
    Keyboard.dismiss();
    overlayOpacity.value = withTiming(0, { duration: 200 });
    heroCardScale.value = withTiming(0.95, { duration: 200 });
    heroCardRotation.value = withTiming(-2, { duration: 200 });
    translateY.value = withTiming(screenHeight, { duration: 300 }, isFinished => {
      if (isFinished) {
        runOnJS(onDismiss)();
      }
    });
  }, [onDismiss, translateY, overlayOpacity, heroCardScale, heroCardRotation]);

  const panGesture = Gesture.Pan()
    .onStart(() => {
      context.value = { y: translateY.value };
    })
    .onUpdate(event => {
      translateY.value = event.translationY + context.value.y;
      translateY.value = Math.max(translateY.value, 0);
    })
    .onEnd(() => {
      if (translateY.value > 150) {
        runOnJS(handleDismiss)();
      } else {
        translateY.value = withSpring(0, { damping: 50 });
      }
    });

  const handleInputChange = useCallback((text: string) => {
    setError('');
    // Allow only numbers and one decimal point
    const cleanedText = text.replace(/[^0-9.]/g, '');
    
    // Ensure only one decimal point
    const parts = cleanedText.split('.');
    const formattedText = parts.length > 1 
      ? `${parts[0]}.${parts[1].slice(0, 2)}`
      : cleanedText;
    
    setInputValue(formattedText);
  }, []);

  const handleLogFullAmount = useCallback(async () => {
    if (isSaving) return;
    setIsSaving(true);
    
    // Epic button animation sequence
    buttonScale.value = withTiming(0.92, { duration: 100 });
    buttonGlow.value = withTiming(1, { duration: 100 });
    
    // Ripple effect
    rippleScale.value = 0;
    rippleOpacity.value = 0.6;
    rippleScale.value = withTiming(3, { duration: 600 });
    rippleOpacity.value = withTiming(0, { duration: 600 });
    
    if (Platform.OS === 'ios') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }
    
    // Bounce back with success indication
    setTimeout(() => {
      buttonScale.value = withSpring(1.05, { damping: 15, stiffness: 300 });
      
      // Success checkmark animation
      successCheckScale.value = withSpring(1, { damping: 12, stiffness: 400 });
      successCheckOpacity.value = withTiming(1, { duration: 200 });
      
      if (Platform.OS === 'ios') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    }, 150);
    
    // Final settle and save
    setTimeout(() => {
      buttonScale.value = withSpring(1, { damping: 20, stiffness: 300 });
      buttonGlow.value = withTiming(0, { duration: 200 });
      
      successCheckOpacity.value = withTiming(0, { duration: 300 });
      successCheckScale.value = withTiming(0, { duration: 300 });
      
      handleDismiss();
      onSaveLog(maxValue);
      setIsSaving(false);
    }, 750);
  }, [maxValue, handleDismiss, onSaveLog, buttonScale, buttonGlow, rippleScale, rippleOpacity, successCheckScale, successCheckOpacity, isSaving]);

  const handleSaveLog = useCallback(async () => {
    if (isSaving) return;
    
    const amount = parseDecimalInput(inputValue);
    
    if (amount <= 0) {
      setError('Please enter a valid amount');
      if (Platform.OS === 'ios') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      return;
    }
    
    if (amount > maxValue) {
      setError(`Entry cannot exceed ${formatCurrency(maxValue)}`);
      if (Platform.OS === 'ios') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      return;
    }

    setIsSaving(true);
    
    // Epic button animation sequence
    buttonScale.value = withTiming(0.92, { duration: 100 });
    buttonGlow.value = withTiming(1, { duration: 100 });
    
    // Ripple effect
    rippleScale.value = 0;
    rippleOpacity.value = 0.6;
    rippleScale.value = withTiming(3, { duration: 600 });
    rippleOpacity.value = withTiming(0, { duration: 600 });
    
    if (Platform.OS === 'ios') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }
    
    // Bounce back with success indication
    setTimeout(() => {
      buttonScale.value = withSpring(1.05, { damping: 15, stiffness: 300 });
      
      // Success checkmark animation
      successCheckScale.value = withSpring(1, { damping: 12, stiffness: 400 });
      successCheckOpacity.value = withTiming(1, { duration: 200 });
      
      if (Platform.OS === 'ios') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    }, 150);
    
    // Final settle and save
    setTimeout(() => {
      buttonScale.value = withSpring(1, { damping: 20, stiffness: 300 });
      buttonGlow.value = withTiming(0, { duration: 200 });
      
      successCheckOpacity.value = withTiming(0, { duration: 300 });
      successCheckScale.value = withTiming(0, { duration: 300 });
      
      handleDismiss();
      onSaveLog(amount);
      setIsSaving(false);
    }, 750);
  }, [inputValue, maxValue, handleDismiss, onSaveLog, buttonScale, buttonGlow, rippleScale, rippleOpacity, successCheckScale, successCheckOpacity, isSaving]);

  // Reset state when modal opens
  useEffect(() => {
    if (visible) {
      // Premium staggered entrance animation
      overlayOpacity.value = withTiming(1, { duration: 300 });
      
      // Sheet slides up with bounce
      translateY.value = withSpring(0, {
        damping: 25,
        stiffness: 400,
        mass: 0.8,
      });
      
      // Hero card dramatic entrance
      setTimeout(() => {
        heroCardScale.value = withSpring(1, {
          damping: 15,
          stiffness: 300,
        });
        heroCardRotation.value = withSpring(0, {
          damping: 20,
          stiffness: 400,
        });
      }, 100);
      
      setInputValue('');
      setError('');
      setIsSaving(false);
      
      // Reset button states
      buttonScale.value = 1;
      buttonGlow.value = 0;
      rippleScale.value = 0;
      rippleOpacity.value = 0;
      successCheckScale.value = 0;
      successCheckOpacity.value = 0;
    } else {
      overlayOpacity.value = withTiming(0, { duration: 200 });
      heroCardScale.value = withTiming(0.95, { duration: 200 });
      heroCardRotation.value = withTiming(-2, { duration: 200 });
    }
  }, [visible, overlayOpacity, heroCardScale, heroCardRotation, buttonScale, buttonGlow, rippleScale, rippleOpacity, successCheckScale, successCheckOpacity]);

  if (!visible || !perk) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleDismiss}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.overlayPress} onPress={handleDismiss} />
      </View>
      
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <GestureDetector gesture={panGesture}>
          <Animated.View style={[styles.container, animatedStyle]}>
            <View style={styles.handle} />
            
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Log Usage</Text>
              <TouchableOpacity onPress={handleDismiss} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#8E8E93" />
              </TouchableOpacity>
            </View>

            {/* Content */}
            <View style={[styles.content, { paddingBottom: insets.bottom + 16 }]}>
              {/* Hero Balance Card */}
              <Animated.View style={[styles.heroCardWrapper, animatedHeroStyle]}>
                <LinearGradient
                  colors={[
                    merchantColor + '15', // 15% opacity
                    merchantColor + '08', // 8% opacity
                    '#FFFFFF'
                  ]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.heroCard}
                >
                  <View style={styles.heroCardContent}>
                    <View style={styles.merchantHeader}>
                      <MerchantLogo perkName={perk.name} size="large" />
                      <View style={styles.merchantInfo}>
                        <Text style={styles.perkName}>{perk.name}</Text>
                        <Text style={[styles.availableBalance, { color: merchantColor }]}>
                          {formatCurrency(maxValue)} available
                        </Text>
                      </View>
                    </View>
                  </View>
                  
                  {/* Decorative elements */}
                  <View style={styles.heroDecoration}>
                    <View style={[styles.decorationCircle, { backgroundColor: merchantColor + '20' }]} />
                    <View style={[styles.decorationCircle, styles.decorationCircleSmall, { backgroundColor: merchantColor + '10' }]} />
                  </View>
                </LinearGradient>
              </Animated.View>

              {/* Premium Input Section */}
              <View style={styles.inputSection}>
                <Text style={styles.inputLabel}>Enter Amount</Text>
                <View style={[styles.inputWrapper, error ? styles.inputWrapperError : null]}>
                  <LinearGradient
                    colors={error ? ['#FFF5F5', '#FFFFFF'] : ['#F9F9F9', '#FFFFFF']}
                    style={styles.inputGradient}
                  >
                    <Text style={styles.currencySymbol}>$</Text>
                    <TextInput
                      style={styles.input}
                      value={inputValue}
                      onChangeText={handleInputChange}
                      placeholder="0.00"
                      placeholderTextColor="#C7C7CC"
                      keyboardType="decimal-pad"
                      autoFocus
                      selectTextOnFocus
                    />
                  </LinearGradient>
                </View>
                {error ? (
                  <Animated.Text 
                    entering={FadeIn.duration(200)}
                    style={styles.errorText}
                  >
                    {error}
                  </Animated.Text>
                ) : (
                  <Text style={styles.helperText}>
                    Maximum amount: {formatCurrency(maxValue)}
                  </Text>
                )}
              </View>

              {/* Action Buttons Row */}
              <View style={styles.actionsRow}>
                {/* Full Amount Button */}
                <View style={styles.actionButtonWrapper}>
                  {/* Ripple Effect */}
                  <Animated.View style={[
                    styles.rippleEffect,
                    { backgroundColor: merchantColor + '30' },
                    animatedRippleStyle
                  ]} />
                  
                  <Animated.View style={[animatedButtonStyle, animatedButtonGlowStyle, styles.flex1]}>
                    <TouchableOpacity 
                      style={[styles.actionButton, { backgroundColor: merchantColor + '10', borderColor: merchantColor + '30' }]} 
                      onPress={handleLogFullAmount}
                      activeOpacity={1}
                      disabled={isSaving}
                    >
                      <View style={styles.actionButtonContent}>
                        <View style={[styles.iconCircle, { backgroundColor: merchantColor + '20' }]}>
                          <Ionicons name="checkmark-circle" size={22} color={merchantColor} />
                        </View>
                        <Text style={[styles.actionButtonText, { color: merchantColor }]}>
                          Full Amount
                        </Text>
                        <Text style={[styles.actionButtonSubtext, { color: merchantColor + 'AA' }]}>
                          {formatCurrency(maxValue)}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  </Animated.View>
                </View>

                {/* Custom Amount Button */}
                <View style={styles.actionButtonWrapper}>
                  <Animated.View style={[animatedButtonStyle, styles.flex1]}>
                    <TouchableOpacity 
                      style={[
                        styles.actionButton, 
                        { 
                          backgroundColor: inputValue ? merchantColor : '#E5E5EA',
                          borderColor: 'transparent'
                        }
                      ]} 
                      onPress={handleSaveLog}
                      disabled={!inputValue || isSaving}
                      activeOpacity={0.8}
                    >
                      <View style={styles.actionButtonContent}>
                        <View style={[styles.iconCircle, { backgroundColor: inputValue ? 'rgba(255,255,255,0.2)' : '#D1D1D6' }]}>
                          <Ionicons 
                            name="calculator" 
                            size={22} 
                            color={inputValue ? '#FFFFFF' : '#8E8E93'} 
                          />
                        </View>
                        <Text style={[styles.actionButtonText, { color: inputValue ? '#FFFFFF' : '#8E8E93' }]}>
                          Custom
                        </Text>
                        <Text style={[styles.actionButtonSubtext, { color: inputValue ? 'rgba(255,255,255,0.8)' : '#8E8E93' }]}>
                          {inputValue && parseDecimalInput(inputValue) > 0 
                            ? formatCurrency(parseDecimalInput(inputValue))
                            : 'Enter amount'
                          }
                        </Text>
                      </View>
                    </TouchableOpacity>
                  </Animated.View>
                </View>
              </View>
              
              {/* Success Checkmark Overlay */}
              <Animated.View style={[
                styles.successOverlay,
                animatedSuccessStyle
              ]}>
                <View style={[styles.successCircle, { backgroundColor: merchantColor }]}>
                  <Ionicons name="checkmark" size={24} color="#FFFFFF" />
                </View>
              </Animated.View>
            </View>
          </Animated.View>
        </GestureDetector>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  overlayPress: {
    flex: 1,
  },
  keyboardAvoid: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '65%',
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: '#D1D1D6',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1C1C1E',
    flex: 1,
    letterSpacing: -0.5,
  },
  closeButton: {
    padding: 8,
    marginRight: -8,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  heroCardWrapper: {
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 8,
  },
  heroCard: {
    borderRadius: 20,
    padding: 20,
    minHeight: 120,
    overflow: 'hidden',
    position: 'relative',
  },
  heroCardContent: {
    flex: 1,
    zIndex: 2,
  },
  merchantHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  merchantInfo: {
    flex: 1,
  },
  perkName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 4,
    letterSpacing: -0.41,
  },
  availableBalance: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  heroDecoration: {
    position: 'absolute',
    top: -20,
    right: -20,
    zIndex: 1,
  },
  decorationCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    position: 'absolute',
  },
  decorationCircleSmall: {
    width: 60,
    height: 60,
    borderRadius: 30,
    top: 40,
    right: 40,
  },
  inputSection: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 12,
    letterSpacing: -0.41,
  },
  inputWrapper: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  inputGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    height: 64,
  },
  inputWrapperError: {
    borderWidth: 2,
    borderColor: '#FF3B30',
  },
  currencySymbol: {
    fontSize: 32,
    fontWeight: '300',
    color: '#8E8E93',
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 32,
    fontWeight: '500',
    color: '#1C1C1E',
    letterSpacing: -0.8,
  },
  helperText: {
    fontSize: 14,
    fontWeight: '400',
    color: '#8E8E93',
    marginTop: 8,
    letterSpacing: -0.24,
  },
  errorText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FF3B30',
    marginTop: 8,
    letterSpacing: -0.24,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButtonWrapper: {
    flex: 1,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex1: {
    flex: 1,
  },
  rippleEffect: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    zIndex: 1,
  },
  successOverlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -25,
    marginLeft: -25,
    zIndex: 3,
  },
  successCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  actionButton: {
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  actionButtonContent: {
    alignItems: 'center',
    gap: 8,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.32,
  },
  actionButtonSubtext: {
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: -0.24,
  },
});