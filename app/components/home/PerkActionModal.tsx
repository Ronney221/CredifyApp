import { View, Text, StyleSheet, TouchableOpacity, Modal, Pressable, Platform, TextInput, Alert, KeyboardAvoidingView, ScrollView, Keyboard, InputAccessoryView, KeyboardAvoidingViewProps } from 'react-native';
import React, { useState, useEffect, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { PanGestureHandler } from 'react-native-gesture-handler';
import Toast from 'react-native-root-toast';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedGestureHandler,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  runOnJS,
  withTiming,
  interpolate,
  useAnimatedProps,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import Slider from '@react-native-community/slider';
import { CardPerk, APP_SCHEMES, multiChoicePerksConfig } from '../../../src/data/card-data';

interface PerkActionModalProps {
  visible: boolean;
  perk: CardPerk | null;
  onDismiss: () => void;
  onOpenApp: (targetPerkName?: string) => void;
  onMarkRedeemed: (partialAmount?: number) => void;
  onMarkAvailable: () => void;
}

const showToast = (message: string, onUndo?: () => void) => {
  const toastMessage = onUndo ? `${message}\nTap to undo` : message;
  const toast = Toast.show(toastMessage, {
    duration: onUndo ? 4000 : 2000,
    position: Toast.positions.BOTTOM,
    shadow: true,
    animation: true,
    hideOnPress: true,
    delay: 0,
    containerStyle: {
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      marginBottom: 64,
      backgroundColor: '#1c1c1e',
    },
    textStyle: {
      fontSize: 14,
      fontWeight: '500',
      textAlign: 'center',
      lineHeight: 20,
    },
    onPress: () => {
      if (onUndo) {
        Toast.hide(toast);
        onUndo();
      }
    },
  });
};

const AnimatedSlider = Animated.createAnimatedComponent(Slider);

// Add a new Tooltip component with smooth animation
const SliderTooltip = ({ value, maxValue }: { value: number; maxValue: number }) => {
  const animatedStyle = useAnimatedStyle(() => {
    const percentage = (value / maxValue) * 100;
    return {
      left: `${percentage}%`,
      transform: [{ translateX: -25 }],
    };
  });

  return (
    <Animated.View style={[styles.tooltip, animatedStyle]}>
      <View style={styles.tooltipArrow} />
      <Text style={styles.tooltipText}>${value.toFixed(2)}</Text>
    </Animated.View>
  );
};

// Helper to format currency
const formatCurrency = (amount: number) => {
  return amount.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

// Helper to calculate yearly total based on frequency
const calculateYearlyTotal = (perk: CardPerk | null): number => {
  if (!perk) return 0;
  
  switch (perk.period) {
    case 'monthly':
      return perk.value * 12;
    case 'quarterly':
      return perk.value * 4;
    case 'semi_annual':
      return perk.value * 2;
    case 'annual':
      return perk.value;
    default:
      return perk.value; // Default to just the value if period is unknown
  }
};

// Helper to format title case
const toTitleCase = (str: string) => {
  return str.split(' ').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  ).join(' ');
};

// Segmented control option type
type AmountOption = 'full' | 'half' | 'custom';

// Segmented control component
const SegmentedControl = ({ 
  value, 
  onChange,
  perk,
}: { 
  value: AmountOption; 
  onChange: (value: AmountOption) => void;
  perk: CardPerk | null;
}) => {
  const segments: Array<{ value: AmountOption; label: string }> = [
    { value: 'full', label: `${perk?.value ? formatCurrency(perk.value) : '$0'} (Full)` },
    { value: 'half', label: `${perk?.value ? formatCurrency(perk.value / 2) : '$0'} (Half)` },
    { value: 'custom', label: 'Custom' },
  ];

  return (
    <View style={styles.segmentedControl}>
      {segments.map((segment, index) => (
        <TouchableOpacity
          key={segment.value}
          style={[
            styles.segment,
            value === segment.value && styles.segmentSelected,
            index === 0 && styles.segmentFirst,
            index === segments.length - 1 && styles.segmentLast,
          ]}
          onPress={() => {
            Haptics.selectionAsync();
            onChange(segment.value);
          }}
        >
          <Text style={[
            styles.segmentText,
            value === segment.value && styles.segmentTextSelected
          ]}>
            {segment.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

// Input accessory view ID
const INPUT_ACCESSORY_ID = 'amountInputAccessory';

// Helper to round to 2 decimal places
const roundToCents = (value: number): number => {
  return Math.round(value * 100) / 100;
};

// Helper to format currency with exactly 2 decimal places
const formatExactCurrency = (amount: number): string => {
  return amount.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

export default function PerkActionModal({
  visible,
  perk,
  onDismiss,
  onOpenApp,
  onMarkRedeemed,
  onMarkAvailable,
}: PerkActionModalProps) {
  const insets = useSafeAreaInsets();
  const [showCustomAmount, setShowCustomAmount] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<'full' | 'half' | 'custom' | null>('full');
  const [partialAmount, setPartialAmount] = useState('');
  const [sliderValue, setSliderValue] = useState(0);
  const [isEditingNumber, setIsEditingNumber] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const translateY = useSharedValue(1000);
  const opacity = useSharedValue(0);
  const sliderPosition = useSharedValue(0);
  
  // Get the currently redeemed amount if partially redeemed
  const getCurrentRedeemedAmount = useCallback(() => {
    if (perk?.status === 'partially_redeemed' && perk.value && perk.remaining_value) {
      return roundToCents(perk.value - perk.remaining_value);
    }
    return 0;
  }, [perk]);

  // Keyboard event handlers
  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
        setIsKeyboardVisible(true);
      }
    );

    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
        setIsKeyboardVisible(false);
      }
    );

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, []);

  // Reset state when modal becomes visible
  useEffect(() => {
    if (visible) {
      translateY.value = withTiming(0, { duration: 300 });
      opacity.value = withTiming(1, { duration: 300 });
      
      // Set initial values based on perk status
      const currentRedeemedAmount = getCurrentRedeemedAmount();
      if (perk?.status === 'partially_redeemed') {
        setSelectedPreset('custom');
        setShowCustomAmount(true);
        const roundedAmount = roundToCents(currentRedeemedAmount);
        setSliderValue(roundedAmount);
        setPartialAmount(formatExactCurrency(roundedAmount).replace(/[^0-9.]/g, ''));
        sliderPosition.value = roundedAmount;
      } else {
        setSelectedPreset('full');
        const roundedAmount = roundToCents(perk?.value || 0);
        setSliderValue(roundedAmount);
        setPartialAmount(formatExactCurrency(roundedAmount).replace(/[^0-9.]/g, ''));
        sliderPosition.value = roundedAmount;
        setShowCustomAmount(false);
      }
      setIsEditingNumber(false);
    } else {
      translateY.value = withTiming(1000, { duration: 300 });
      opacity.value = withTiming(0, { duration: 300 });
    }
  }, [visible, perk, getCurrentRedeemedAmount]);

  const handleSliderChange = useCallback((value: number) => {
    const roundedValue = roundToCents(value);
    
    // Only allow 0 if already partially redeemed
    if (roundedValue === 0 && perk?.status !== 'partially_redeemed') {
      setSliderValue(0.01);
      setPartialAmount('0.01');
      sliderPosition.value = withSpring(0.01);
    } else {
      setSliderValue(roundedValue);
      setPartialAmount(roundedValue.toFixed(2));
      sliderPosition.value = withSpring(roundedValue);
    }
    setIsEditingNumber(false);
  }, [perk?.status]);

  const handlePartialAmountChange = useCallback((text: string) => {
    // Remove any non-numeric characters except decimal point
    const sanitizedText = text.replace(/[^0-9.]/g, '');
    
    // Ensure only one decimal point
    const parts = sanitizedText.split('.');
    const formattedText = parts.length > 1 
      ? `${parts[0]}.${parts[1].slice(0, 2)}`
      : sanitizedText;
    
    setPartialAmount(formattedText);
    
    const numValue = parseFloat(formattedText);
    if (!isNaN(numValue)) {
      const roundedValue = roundToCents(numValue);
      if (roundedValue === 0 && perk?.status !== 'partially_redeemed') {
        setSliderValue(0.01);
        sliderPosition.value = withSpring(0.01);
      } else if (perk && roundedValue > perk.value) {
        setSliderValue(perk.value);
        sliderPosition.value = withSpring(perk.value);
        setPartialAmount(perk.value.toFixed(2));
      } else {
        setSliderValue(roundedValue);
        sliderPosition.value = withSpring(roundedValue);
      }
    }
    setIsEditingNumber(true);
  }, [perk]);

  const handleDoneEditing = useCallback(() => {
    Keyboard.dismiss();
    setIsEditingNumber(false);
    
    // Ensure the value is properly formatted with 2 decimal places
    const numValue = parseFloat(partialAmount);
    if (!isNaN(numValue)) {
      const roundedValue = roundToCents(numValue);
      setPartialAmount(roundedValue.toFixed(2));
      setSliderValue(roundedValue);
      sliderPosition.value = withSpring(roundedValue);
    }
  }, [partialAmount]);

  // Input accessory view for amount input
  const InputAccessory = useCallback(() => (
    <InputAccessoryView nativeID={INPUT_ACCESSORY_ID}>
      <View style={styles.inputAccessory}>
        <View style={styles.presetButtons}>
          <TouchableOpacity
            style={styles.presetButton}
            onPress={() => {
              Haptics.selectionAsync();
              handlePartialAmountChange(String(perk?.value || 0));
            }}
          >
            <Text style={styles.presetButtonText}>Full</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.presetButton}
            onPress={() => {
              Haptics.selectionAsync();
              handlePartialAmountChange(String((perk?.value || 0) / 2));
            }}
          >
            <Text style={styles.presetButtonText}>Half</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={styles.doneButton}
          onPress={handleDoneEditing}
        >
          <Text style={styles.doneButtonText}>Done</Text>
        </TouchableOpacity>
      </View>
    </InputAccessoryView>
  ), [perk?.value, handleDoneEditing, handlePartialAmountChange]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const handleDismiss = () => {
    translateY.value = withTiming(1000, { duration: 300 });
    opacity.value = withTiming(0, { duration: 300 });
    setTimeout(onDismiss, 300);
    setShowCustomAmount(false);
    setSelectedPreset(null);
    setPartialAmount('');
    setSliderValue(0);
    setIsEditingNumber(false);
  };

  const handleOpenApp = () => {
    handleDismiss();
    onOpenApp?.();
  };

  const handleMarkRedeemed = () => {
    handleDismiss();
    const previousStatus = perk?.status;
    const previousValue = perk?.remaining_value;
    const isPartiallyRedeemed = previousStatus === 'partially_redeemed';

    onMarkRedeemed();
    showToast(
      `${perk?.name} marked as redeemed`,
      () => {
        if (isPartiallyRedeemed && previousValue !== undefined) {
          // Restore partial redemption state with the correct amount
          onMarkRedeemed(perk?.value ? perk.value - previousValue : 0);
        } else {
          onMarkAvailable();
        }
      }
    );
  };

  const handleMarkAvailable = () => {
    handleDismiss();
    const previousStatus = perk?.status;
    const previousValue = perk?.remaining_value;
    onMarkAvailable();
    showToast(
      `${perk?.name} marked as available`,
      () => {
        if (previousStatus === 'partially_redeemed' && previousValue !== undefined) {
          // Restore partial redemption
          onMarkRedeemed(perk?.value ? perk.value - previousValue : 0);
        } else if (previousStatus === 'redeemed') {
          onMarkRedeemed();
        }
      }
    );
  };

  const handlePresetSelect = useCallback((type: 'full' | 'half' | 'custom') => {
    setSelectedPreset(type);
    if (type === 'full') {
      setSliderValue(perk?.value || 0);
      setPartialAmount(String(perk?.value || 0));
      setShowCustomAmount(false);
    } else if (type === 'half') {
      const halfValue = (perk?.value || 0) / 2;
      setSliderValue(halfValue);
      setPartialAmount(String(halfValue));
      setShowCustomAmount(false);
    } else if (type === 'custom') {
      setShowCustomAmount(true);
      if (perk?.status === 'partially_redeemed') {
        const currentRedeemedAmount = getCurrentRedeemedAmount();
        setSliderValue(currentRedeemedAmount);
        setPartialAmount(String(currentRedeemedAmount));
      } else {
        // Start at half value for unredeemed perks
        const halfValue = (perk?.value || 0) / 2;
        setSliderValue(halfValue);
        setPartialAmount(String(halfValue));
      }
    }
  }, [perk, getCurrentRedeemedAmount]);

  const handleConfirmAction = () => {
    Keyboard.dismiss();
    const amount = isEditingNumber ? parseFloat(partialAmount) : sliderValue;
    if (isNaN(amount)) {
      Alert.alert('Invalid Amount', 'Please enter a valid number.');
      return;
    }
    
    handleDismiss();
    if (amount === 0 && perk?.status === 'partially_redeemed') {
      onMarkAvailable();
      showToast(`${perk?.name} marked as available`);
    } else {
      onMarkRedeemed(amount);
      showToast(
        amount === perk?.value 
          ? `${perk?.name} fully redeemed` 
          : `${perk?.name} partially redeemed: ${formatCurrency(amount)}`
      );
    }
  };

  // Get the app name for the CTA button
  const getAppName = (perk: CardPerk): string => {
    if (perk.appScheme && APP_SCHEMES[perk.appScheme]) {
      // Map app schemes to friendly names
      const appSchemeMap: Record<string, string> = {
        uber: 'Uber',
        uberEats: 'Uber Eats',
        grubhub: 'Grubhub',
        doordash: 'DoorDash',
        disneyPlus: 'Disney+',
        hulu: 'Hulu',
        espn: 'ESPN',
        peacock: 'Peacock',
        nytimes: 'NY Times',
        dunkin: 'Dunkin',
        instacart: 'Instacart',
        resy: 'Resy',
        walmart: 'Walmart',
        capitalOne: 'Capital One Travel',
        lyft: 'Lyft',
        saks: 'Saks',
        equinox: 'Equinox',
      };
      return appSchemeMap[perk.appScheme] || 'App';
    }

    // Fallback: try to extract from perk name
    const name = perk.name.toLowerCase();
    if (name.includes('uber eats')) return 'Uber Eats';
    if (name.includes('uber')) return 'Uber';
    if (name.includes('doordash')) return 'DoorDash';
    if (name.includes('grubhub')) return 'Grubhub';
    if (name.includes('disney')) return 'Disney+';
    if (name.includes('dunkin')) return 'Dunkin';
    if (name.includes('resy')) return 'Resy';
    if (name.includes('capital one')) return 'Capital One Travel';
    
    return 'App'; // Generic fallback
  };

  if (!perk) return null;

  const isRedeemed = perk.status === 'redeemed';
  const isPartiallyRedeemed = perk.status === 'partially_redeemed';
  const formattedValue = perk.value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
  });

  const formattedRemainingValue = perk.remaining_value ? perk.remaining_value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
  }) : formattedValue;

  const appName = getAppName(perk);

  return (
    <Modal
      transparent
      visible={visible}
      onRequestClose={() => {
        Keyboard.dismiss();
        handleDismiss();
      }}
      animationType="none"
    >
      <Animated.View style={[styles.overlay, overlayStyle]}>
        <Pressable style={styles.overlayPress} onPress={() => {
          Keyboard.dismiss();
          handleDismiss();
        }} />
      </Animated.View>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1, justifyContent: 'flex-end' }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
      >
        <Animated.View style={[styles.container, animatedStyle]}>
          <View style={styles.handle} />
          <ScrollView 
            style={styles.scrollView}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.content}>
              <Text style={styles.title}>{toTitleCase(perk.name)}</Text>
              
              <View style={styles.valueContainer}>
                <Text style={styles.remainingValue}>
                  Remaining: {formattedRemainingValue}
                </Text>
                <Text style={styles.maxValue}>
                  Monthly credit: {formattedValue}{'\n'}
                  (up to {formatCurrency(calculateYearlyTotal(perk))}/year)
                </Text>
              </View>
              
              <Text style={styles.description}>{perk.description}</Text>

              {!isRedeemed && (
                <>
                  <SegmentedControl
                    value={selectedPreset || 'full'}
                    onChange={handlePresetSelect}
                    perk={perk}
                  />

                  {selectedPreset === 'custom' && (
                    <Animated.View 
                      style={styles.customAmountContainer}
                      entering={FadeIn.duration(200)}
                      exiting={FadeOut.duration(200)}
                    >
                      <View style={styles.sliderContainer}>
                        <Text style={styles.sliderValue}>
                          {perk?.status === 'partially_redeemed' ? '$0' : '$1'}
                        </Text>
                        <View style={styles.sliderWrapper}>
                          <SliderTooltip value={sliderValue} maxValue={perk?.value || 0} />
                          <AnimatedSlider
                            style={styles.slider}
                            minimumValue={perk?.status === 'partially_redeemed' ? 0 : 1}
                            maximumValue={perk?.value || 0}
                            value={sliderValue}
                            onValueChange={handleSliderChange}
                            minimumTrackTintColor="#007AFF"
                            maximumTrackTintColor="#E5E5EA"
                            thumbTintColor="#007AFF"
                            step={1}
                          />
                        </View>
                        <Text style={styles.sliderValue}>{formattedValue}</Text>
                      </View>

                      <TouchableOpacity 
                        style={[
                          styles.amountContainer,
                          isKeyboardVisible && styles.amountContainerKeyboard
                        ]} 
                        onPress={() => setIsEditingNumber(true)}
                      >
                        <Text style={styles.amountLabel}>Amount: </Text>
                        {isEditingNumber ? (
                          <TextInput
                            style={styles.amountInput}
                            value={partialAmount}
                            onChangeText={handlePartialAmountChange}
                            keyboardType="decimal-pad"
                            placeholder="Enter amount"
                            autoFocus
                            returnKeyType="done"
                            onSubmitEditing={handleDoneEditing}
                            inputAccessoryViewID={INPUT_ACCESSORY_ID}
                          />
                        ) : (
                          <Text style={styles.amountValue}>
                            {formatExactCurrency(sliderValue)}
                          </Text>
                        )}
                      </TouchableOpacity>
                      
                      {Platform.OS === 'ios' && <InputAccessory />}
                    </Animated.View>
                  )}

                  <TouchableOpacity
                    style={[styles.button, styles.primaryButton]}
                    onPress={handleConfirmAction}
                  >
                    <Text style={[styles.buttonText, styles.primaryButtonText]}>
                      {sliderValue === 0 ? 'Mark as Available' : `Redeem ${formatCurrency(sliderValue)}`}
                    </Text>
                  </TouchableOpacity>
                </>
              )}

              {isRedeemed && (
                <TouchableOpacity
                  style={[styles.button, styles.markAvailableButton]}
                  onPress={() => {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    handleMarkAvailable();
                  }}
                >
                  <Text style={styles.buttonText}>Mark as Available</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.button, styles.openButton]}
                onPress={() => {
                  Haptics.selectionAsync();
                  handleOpenApp();
                }}
              >
                <Text style={[styles.buttonText, styles.openButtonText]}>
                  Open {appName} <Ionicons name="open-outline" size={16} color="#007AFF" />
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </Animated.View>
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
  container: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
    maxHeight: '90%',
  },
  scrollView: {
    flexGrow: 0,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 8,
  },
  content: {
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 12,
  },
  valueContainer: {
    marginBottom: 16,
  },
  remainingValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#007AFF',
    marginBottom: 4,
  },
  maxValue: {
    fontSize: 16,
    color: '#666666',
    lineHeight: 22,
  },
  description: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 24,
    lineHeight: 22,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    padding: 2,
    marginBottom: 24,
  },
  segment: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentSelected: {
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 2,
  },
  segmentFirst: {
    borderTopLeftRadius: 6,
    borderBottomLeftRadius: 6,
  },
  segmentLast: {
    borderTopRightRadius: 6,
    borderBottomRightRadius: 6,
  },
  segmentText: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '500',
  },
  segmentTextSelected: {
    color: '#007AFF',
    fontWeight: '600',
  },
  customAmountContainer: {
    gap: 16,
    marginBottom: 24,
    paddingTop: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#007AFF',
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  primaryButtonText: {
    color: '#FFFFFF',
  },
  secondaryButtonText: {
    color: '#007AFF',
  },
  sliderWrapper: {
    flex: 1,
    paddingTop: 24,
  },
  tooltip: {
    position: 'absolute',
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 4,
    paddingHorizontal: 8,
    top: 0,
  },
  tooltipArrow: {
    position: 'absolute',
    bottom: -4,
    left: '50%',
    marginLeft: -4,
    width: 8,
    height: 8,
    backgroundColor: '#007AFF',
    transform: [{ rotate: '45deg' }],
  },
  tooltipText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 4,
  },
  slider: {
    flex: 1,
    height: 40,
  },
  sliderValue: {
    fontSize: 14,
    color: '#8E8E93',
    minWidth: 40,
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    padding: 12,
    borderRadius: 8,
    marginBottom: 24,
  },
  amountLabel: {
    fontSize: 16,
    color: '#000000',
  },
  amountValue: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  amountInput: {
    flex: 1,
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
    padding: 0,
  },
  openButton: {
    backgroundColor: '#E5F1FF',
    marginTop: 12,
  },
  openButtonText: {
    color: '#007AFF',
  },
  markAvailableButton: {
    backgroundColor: '#F2F2F7',
    marginBottom: 12,
  },
  button: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  inputAccessory: {
    backgroundColor: '#F2F2F7',
    borderTopWidth: 1,
    borderTopColor: '#C7C7CC',
    paddingHorizontal: 8,
    paddingVertical: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  presetButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  presetButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#C7C7CC',
  },
  presetButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#007AFF',
  },
  doneButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  doneButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  amountContainerKeyboard: {
    marginBottom: 16,
  },
}); 