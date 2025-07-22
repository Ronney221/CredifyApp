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
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [successButtonType, setSuccessButtonType] = useState<'full' | 'custom'>('full');
  
  const translateY = useSharedValue(screenHeight);
  const context = useSharedValue({ y: 0 });
  const overlayOpacity = useSharedValue(0);
  const heroCardScale = useSharedValue(0.95);
  const heroCardRotation = useSharedValue(-2);
  
  // Separate animation values for each button
  const fullButtonScale = useSharedValue(1);
  const fullButtonGlow = useSharedValue(0);
  const fullRippleScale = useSharedValue(0);
  const fullRippleOpacity = useSharedValue(0);
  
  const customButtonScale = useSharedValue(1);
  const customButtonGlow = useSharedValue(0);
  const customRippleScale = useSharedValue(0);
  const customRippleOpacity = useSharedValue(0);
  
  const successCheckScale = useSharedValue(0);
  const successCheckOpacity = useSharedValue(0);
  const insets = useSafeAreaInsets();

  const maxValue = perk?.status === 'partially_redeemed' 
    ? (perk?.remaining_value || 0) 
    : (perk?.value || 0);
  
  const merchantColor = useMemo(() => perk ? getMerchantColor(perk.name) : '#007AFF', [perk]);
  
  // Memoized color variations for performance
  const merchantColors = useMemo(() => ({
    base: merchantColor,
    opacity10: merchantColor + '10',
    opacity15: merchantColor + '15',
    opacity08: merchantColor + '08',
    opacity20: merchantColor + '20',
    opacity30: merchantColor + '30',
    opacityAA: merchantColor + 'AA',
  }), [merchantColor]);

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

  const animatedFullButtonGlowStyle = useAnimatedStyle(() => {
    return {
      shadowOpacity: fullButtonGlow.value * 0.3,
      shadowRadius: fullButtonGlow.value * 20,
      elevation: fullButtonGlow.value * 8,
    };
  });

  const animatedFullRippleStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: fullRippleScale.value }],
      opacity: fullRippleOpacity.value,
    };
  });

  const animatedCustomButtonGlowStyle = useAnimatedStyle(() => {
    return {
      shadowOpacity: customButtonGlow.value * 0.3,
      shadowRadius: customButtonGlow.value * 20,
      elevation: customButtonGlow.value * 8,
    };
  });

  const animatedCustomRippleStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: customRippleScale.value }],
      opacity: customRippleOpacity.value,
    };
  });

  const animatedSuccessStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: successCheckScale.value }],
      opacity: successCheckOpacity.value,
    };
  });

  const animatedFullButtonStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: fullButtonScale.value }],
    };
  });

  const animatedCustomButtonStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: customButtonScale.value }],
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
    setSuccessButtonType('full');
    
    // Epic button animation sequence
    fullButtonScale.value = withTiming(0.92, { duration: 100 });
    fullButtonGlow.value = withTiming(1, { duration: 100 });
    
    // Ripple effect
    fullRippleScale.value = 0;
    fullRippleOpacity.value = 0.6;
    fullRippleScale.value = withTiming(3, { duration: 600 });
    fullRippleOpacity.value = withTiming(0, { duration: 600 });
    
    if (Platform.OS === 'ios') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }
    
    // Bounce back with success indication
    setTimeout(() => {
      fullButtonScale.value = withSpring(1.05, { damping: 15, stiffness: 300 });
      
      // Success checkmark animation
      successCheckScale.value = withSpring(1, { damping: 12, stiffness: 400 });
      successCheckOpacity.value = withTiming(1, { duration: 200 });
      
      if (Platform.OS === 'ios') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    }, 150);
    
    // Final settle and save
    setTimeout(() => {
      fullButtonScale.value = withSpring(1, { damping: 20, stiffness: 300 });
      fullButtonGlow.value = withTiming(0, { duration: 200 });
      
      successCheckOpacity.value = withTiming(0, { duration: 300 });
      successCheckScale.value = withTiming(0, { duration: 300 });
      
      handleDismiss();
      onSaveLog(maxValue);
      setIsSaving(false);
    }, 750);
  }, [maxValue, handleDismiss, onSaveLog, fullButtonScale, fullButtonGlow, fullRippleScale, fullRippleOpacity, successCheckScale, successCheckOpacity, isSaving]);

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
    setSuccessButtonType('custom');
    
    // Epic button animation sequence
    customButtonScale.value = withTiming(0.92, { duration: 100 });
    customButtonGlow.value = withTiming(1, { duration: 100 });
    
    // Ripple effect
    customRippleScale.value = 0;
    customRippleOpacity.value = 0.6;
    customRippleScale.value = withTiming(3, { duration: 600 });
    customRippleOpacity.value = withTiming(0, { duration: 600 });
    
    if (Platform.OS === 'ios') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }
    
    // Bounce back with success indication
    setTimeout(() => {
      customButtonScale.value = withSpring(1.05, { damping: 15, stiffness: 300 });
      
      // Success checkmark animation
      successCheckScale.value = withSpring(1, { damping: 12, stiffness: 400 });
      successCheckOpacity.value = withTiming(1, { duration: 200 });
      
      if (Platform.OS === 'ios') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    }, 150);
    
    // Final settle and save
    setTimeout(() => {
      customButtonScale.value = withSpring(1, { damping: 20, stiffness: 300 });
      customButtonGlow.value = withTiming(0, { duration: 200 });
      
      successCheckOpacity.value = withTiming(0, { duration: 300 });
      successCheckScale.value = withTiming(0, { duration: 300 });
      
      handleDismiss();
      onSaveLog(amount);
      setIsSaving(false);
    }, 750);
  }, [inputValue, maxValue, handleDismiss, onSaveLog, customButtonScale, customButtonGlow, customRippleScale, customRippleOpacity, successCheckScale, successCheckOpacity, isSaving]);

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
      
      // Hero card dramatic entrance (faster timing)
      setTimeout(() => {
        heroCardScale.value = withSpring(1, {
          damping: 12,
          stiffness: 400,
        });
        heroCardRotation.value = withSpring(0, {
          damping: 15,
          stiffness: 500,
        });
      }, 50);
      
      setInputValue('');
      setError('');
      setIsSaving(false);
      setSuccessButtonType('full');
      
      // Reset button states
      fullButtonScale.value = 1;
      fullButtonGlow.value = 0;
      fullRippleScale.value = 0;
      fullRippleOpacity.value = 0;
      
      customButtonScale.value = 1;
      customButtonGlow.value = 0;
      customRippleScale.value = 0;
      customRippleOpacity.value = 0;
      
      successCheckScale.value = 0;
      successCheckOpacity.value = 0;
    } else {
      overlayOpacity.value = withTiming(0, { duration: 200 });
      heroCardScale.value = withTiming(0.95, { duration: 200 });
      heroCardRotation.value = withTiming(-2, { duration: 200 });
    }
  }, [visible, overlayOpacity, heroCardScale, heroCardRotation, fullButtonScale, fullButtonGlow, fullRippleScale, fullRippleOpacity, customButtonScale, customButtonGlow, customRippleScale, customRippleOpacity, successCheckScale, successCheckOpacity]);

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
        <Pressable style={StyleSheet.absoluteFill} onPress={handleDismiss} />
      </View>
      
      <KeyboardAvoidingView
        style={styles.modalWrapper}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
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

            {/* ScrollView Content */}
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
            >
              {/* Hero Balance Card */}
              <Animated.View style={[styles.heroCardWrapper, animatedHeroStyle]}>
                <LinearGradient
                  colors={[
                    merchantColors.opacity15, // 15% opacity
                    merchantColors.opacity08, // 8% opacity
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
                        <Text style={[styles.availableBalance, { color: merchantColors.base }]}>
                          {formatCurrency(maxValue)} available
                        </Text>
                      </View>
                    </View>
                  </View>
                  
                  {/* Decorative elements */}
                  <View style={styles.heroDecoration}>
                    <View style={[styles.decorationCircle, { backgroundColor: merchantColors.opacity20 }]} />
                    <View style={[styles.decorationCircle, styles.decorationCircleSmall, { backgroundColor: merchantColors.opacity10 }]} />
                  </View>
                </LinearGradient>
              </Animated.View>

              {/* Premium Input Section */}
              <View style={styles.inputSection}>
                <Text style={styles.inputLabel}>Enter Amount</Text>
                <View style={[
                  styles.inputWrapper, 
                  error ? styles.inputWrapperError : null,
                  isInputFocused ? { ...styles.inputWrapperFocused, borderColor: merchantColors.base } : null
                ]}>
                  <LinearGradient
                    colors={error ? ['#FFF5F5', '#FFFFFF'] : ['#F9F9F9', '#FFFFFF']}
                    style={styles.inputGradient}
                  >
                    <Text style={styles.currencySymbol}>$</Text>
                    <TextInput
                      style={styles.input}
                      value={inputValue}
                      onChangeText={handleInputChange}
                      onFocus={() => setIsInputFocused(true)}
                      onBlur={() => setIsInputFocused(false)}
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
                    { backgroundColor: merchantColors.opacity30 },
                    animatedFullRippleStyle
                  ]} />
                  
                  <Animated.View style={[animatedFullButtonGlowStyle, animatedFullButtonStyle, styles.flex1]}>
                    <TouchableOpacity 
                      style={[styles.actionButton, { backgroundColor: merchantColors.opacity10, borderColor: merchantColors.opacity30 }]} 
                      onPress={handleLogFullAmount}
                      onPressIn={() => { fullButtonScale.value = withSpring(0.95, { damping: 20, stiffness: 400 }); }}
                      onPressOut={() => { fullButtonScale.value = withSpring(1, { damping: 20, stiffness: 400 }); }}
                      activeOpacity={1}
                      disabled={isSaving}
                    >
                      <View style={styles.actionButtonContent}>
                        <View style={[styles.iconCircle, { backgroundColor: merchantColors.opacity20 }]}>
                          <Ionicons name="checkmark-circle" size={22} color={merchantColors.base} />
                        </View>
                        <Text style={[styles.actionButtonText, { color: merchantColors.base }]}>
                          Full Amount
                        </Text>
                        <Text style={[styles.actionButtonSubtext, { color: merchantColors.opacityAA }]}>
                          {formatCurrency(maxValue)}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  </Animated.View>
                </View>

                {/* Custom Amount Button */}
                <View style={styles.actionButtonWrapper}>
                  {/* Ripple Effect */}
                  <Animated.View style={[
                    styles.rippleEffect,
                    { backgroundColor: merchantColors.opacity30 },
                    animatedCustomRippleStyle
                  ]} />
                  
                  <Animated.View style={[animatedCustomButtonGlowStyle, animatedCustomButtonStyle, styles.flex1]}>
                    <TouchableOpacity 
                      style={[
                        styles.actionButton, 
                        { 
                          backgroundColor: inputValue ? merchantColors.base : '#E5E5EA',
                          borderColor: 'transparent'
                        }
                      ]} 
                      onPress={handleSaveLog}
                      onPressIn={() => { customButtonScale.value = withSpring(0.95, { damping: 20, stiffness: 400 }); }}
                      onPressOut={() => { customButtonScale.value = withSpring(1, { damping: 20, stiffness: 400 }); }}
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
            </ScrollView>
            
            {/* Success Checkmark Overlay */}
            <Animated.View style={[
              successButtonType === 'full' ? styles.successOverlayFull : styles.successOverlayCustom,
              { bottom: 85 + insets.bottom / 4 }, // Responsive adjustment based on safe area
              animatedSuccessStyle
            ]}>
              <View style={[styles.successCircle, { backgroundColor: merchantColors.base }]}>
                <Ionicons name="checkmark" size={24} color="#FFFFFF" />
              </View>
            </Animated.View>
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
  modalWrapper: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    overflow: 'hidden',
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
    paddingHorizontal: 16,
    paddingBottom: 12,
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
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
  },
  heroCardWrapper: {
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  heroCard: {
    borderRadius: 12,
    padding: 12,
    minHeight: 80,
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
    marginBottom: 12,
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
    paddingHorizontal: 16,
    height: 52,
  },
  inputWrapperError: {
    borderWidth: 2,
    borderColor: '#FF3B30',
  },
  inputWrapperFocused: {
    borderWidth: 2,
    shadowOpacity: 0.12,
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
  successOverlayFull: {
    position: 'absolute',
    left: 16,
    right: '50%',
    marginRight: 6, // Half of gap between buttons
    alignItems: 'center',
    zIndex: 3,
  },
  successOverlayCustom: {
    position: 'absolute',
    left: '50%',
    right: 16,
    marginLeft: 6, // Half of gap between buttons
    alignItems: 'center',
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
    paddingVertical: 12,
    paddingHorizontal: 12,
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
    minWidth: 110,
    textAlign: 'center',
  },
});