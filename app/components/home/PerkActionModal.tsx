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
  Layout,
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
      transform: [
        { translateX: -35 },
        { translateX: -percentage * 0.35 }, // Compensate for drift by scaling with position
        { translateX: 33 } // Initial right offset
      ],
      top: -10, // Start 15 pixels higher (from -8 to -23)
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
  const segments: Array<{ value: AmountOption; topLabel: string; bottomLabel?: string }> = [
    { 
      value: 'full', 
      topLabel: formatCurrency(perk?.value || 0),
      bottomLabel: 'Full'
    },
    { 
      value: 'half', 
      topLabel: formatCurrency((perk?.value || 0) / 2),
      bottomLabel: 'Half'
    },
    { 
      value: 'custom', 
      topLabel: 'Custom'
    },
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
          <View style={styles.segmentContent}>
            <Text style={[
              styles.segmentText,
              value === segment.value && styles.segmentTextSelected
            ]}>
              {segment.topLabel}
            </Text>
            {segment.bottomLabel && (
              <Text style={[
                styles.segmentSubtext,
                value === segment.value && styles.segmentTextSelected
              ]}>
                {segment.bottomLabel}
              </Text>
            )}
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
};

// Input accessory view ID
const INPUT_ACCESSORY_ID = 'amountInputAccessory';

// Helper to round to nearest 10 cents
const roundToNearestDime = (value: number): number => {
  return Math.round(value * 10) / 10;
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

// Helper to parse decimal input, handling edge cases
const parseDecimalInput = (text: string): number => {
  // Remove all non-numeric characters except decimal point
  const sanitized = text.replace(/[^0-9.]/g, '');
  
  // Ensure only one decimal point
  const parts = sanitized.split('.');
  const formattedText = parts.length > 1 
    ? `${parts[0]}.${parts[1].slice(0, 2)}`
    : sanitized;
  
  const value = parseFloat(formattedText);
  return isNaN(value) ? 0 : value;
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
  const [sliderValue, setSliderValue] = useState<number>(0);
  const [isEditingNumber, setIsEditingNumber] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const translateY = useSharedValue(1000);
  const opacity = useSharedValue(0);
  const sliderPosition = useSharedValue(0);
  const sliderAnimation = useSharedValue<number>(0);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const descriptionHeight = useSharedValue(0);
  const modalHeight = useSharedValue('auto');
  
  // Get the currently redeemed amount if partially redeemed
  const getCurrentRedeemedAmount = useCallback(() => {
    if (perk?.status === 'partially_redeemed' && perk.value && perk.remaining_value) {
      return roundToNearestDime(perk.value - perk.remaining_value);
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

  // Reset state when modal becomes visible or perk changes
  useEffect(() => {
    if (visible && perk) {
      // Immediately set the initial slider value
      const maxValue = perk.value || 0;
      sliderAnimation.value = maxValue;
      sliderPosition.value = maxValue;
      setSliderValue(maxValue);
      setPartialAmount(formatExactCurrency(maxValue).replace(/[^0-9.]/g, ''));

      // Then animate the modal
      translateY.value = withTiming(0, { duration: 300 });
      opacity.value = withTiming(1, { duration: 300 });
      setIsDescriptionExpanded(false);
      
      // Set remaining values based on perk status
      const currentRedeemedAmount = getCurrentRedeemedAmount();
      
      if (perk.status === 'partially_redeemed') {
        setSelectedPreset('custom');
        setShowCustomAmount(true);
        const roundedAmount = roundToNearestDime(currentRedeemedAmount);
        setSliderValue(roundedAmount);
        setPartialAmount(formatExactCurrency(roundedAmount).replace(/[^0-9.]/g, ''));
        sliderPosition.value = roundedAmount;
        sliderAnimation.value = roundedAmount;
      } else {
        setSelectedPreset('full');
        setShowCustomAmount(false);
      }
      setIsEditingNumber(false);
    } else {
      translateY.value = withTiming(1000, { duration: 300 });
      opacity.value = withTiming(0, { duration: 300 });
    }
  }, [visible, perk, getCurrentRedeemedAmount]);

  // Handle slider value change with animation
  const handleSliderChange = useCallback((value: number) => {
    const roundedValue = roundToNearestDime(value);
    
    // Only allow 0 if already partially redeemed
    if (roundedValue === 0 && perk?.status !== 'partially_redeemed') {
      setSliderValue(0.10);
      setPartialAmount('0.10');
      sliderAnimation.value = withSpring(0.10);
    } else if (perk && roundedValue > perk.value) {
      setSliderValue(perk.value);
      setPartialAmount(perk.value.toFixed(2));
      sliderAnimation.value = withSpring(perk.value);
    } else {
      setSliderValue(roundedValue);
      setPartialAmount(roundedValue.toFixed(2));
      sliderAnimation.value = withSpring(roundedValue);
    }
    setIsEditingNumber(false);
  }, [perk?.status, perk?.value]);

  // Handle text input changes
  const handlePartialAmountChange = useCallback((text: string) => {
    setPartialAmount(text);
    const value = parseDecimalInput(text);
    
    if (value === 0 && perk?.status !== 'partially_redeemed') {
      setSliderValue(0.10);
      sliderAnimation.value = withSpring(0.10);
    } else if (perk && value > perk.value) {
      setSliderValue(perk.value);
      sliderAnimation.value = withSpring(perk.value);
      setPartialAmount(perk.value.toFixed(2));
    } else {
      setSliderValue(value);
      sliderAnimation.value = withSpring(value);
    }
    setIsEditingNumber(true);
  }, [perk?.status, perk?.value]);

  // Handle done editing
  const handleDoneEditing = useCallback(() => {
    Keyboard.dismiss();
    setIsEditingNumber(false);
    
    const value = parseDecimalInput(partialAmount);
    const roundedValue = roundToNearestDime(value);
    
    setPartialAmount(roundedValue.toFixed(2));
    setSliderValue(roundedValue);
    sliderAnimation.value = withSpring(roundedValue);
  }, [partialAmount]);


  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const handleDismiss = () => {
    translateY.value = withTiming(1000, { duration: 300 });
    opacity.value = withTiming(0, { duration: 300 });
    setTimeout(() => {
      onDismiss();
      setShowCustomAmount(false);
      setSelectedPreset(null);
      setPartialAmount('');
      setSliderValue(0);
      setIsEditingNumber(false);
      setIsDescriptionExpanded(false);
    }, 300);
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
          ? `${perk?.name} fully logged` 
          : `${perk?.name} partially logged: ${formatCurrency(amount)}`
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

  const toggleDescription = () => {
    Haptics.selectionAsync();
    setIsDescriptionExpanded(!isDescriptionExpanded);
  };

  const animatedDescriptionStyle = useAnimatedStyle(() => {
    return {
      height: withSpring(isDescriptionExpanded ? 'auto' : 0, {
        damping: 20,
        stiffness: 90,
      }),
      opacity: withSpring(isDescriptionExpanded ? 1 : 0, {
        damping: 20,
        stiffness: 90,
      }),
      marginBottom: withSpring(isDescriptionExpanded ? 24 : 0, {
        damping: 20,
        stiffness: 90,
      }),
    };
  });

  // Add animatedSliderProps before the return statement
  const animatedSliderProps = useAnimatedProps(() => {
    return {
      value: sliderAnimation.value,
    };
  });

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
              <View style={styles.titleContainer}>
                <Text style={styles.title}>{toTitleCase(perk.name)}</Text>
                <TouchableOpacity
                  style={styles.infoButton}
                  onPress={toggleDescription}
                  hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
                >
                  <Ionicons name="information-circle-outline" size={24} color="#007AFF" />
                </TouchableOpacity>
              </View>
              
              <Animated.View style={[styles.descriptionContainer, animatedDescriptionStyle]}>
                <Text style={styles.description}>{perk.description}</Text>
              </Animated.View>

              <View style={styles.valueContainer}>
                <Text style={styles.remainingValue}>
                  Remaining: {formattedRemainingValue}
                </Text>
                <Text style={styles.maxValue}>
                  {perk.period === 'monthly' ? 'Monthly' :
                   perk.period === 'quarterly' ? 'Quarterly' :
                   perk.period === 'semi_annual' ? 'Semi-annual' :
                   perk.period === 'annual' ? 'Annual' : 'Monthly'} credit: {formattedValue}{'\n'}
                  (up to {formatCurrency(calculateYearlyTotal(perk))}/year)
                </Text>
              </View>
              
              {!isRedeemed && (
                <>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Log your usage:</Text>
                  </View>

                  <View style={styles.amountSelectorContainer}>
                    <View style={styles.sliderContainer}>
                      <Text style={styles.sliderValue}>
                        {perk?.status === 'partially_redeemed' ? '$0' : '$0'}
                      </Text>
                      <View style={styles.sliderWrapper}>
                        <SliderTooltip value={sliderValue} maxValue={perk?.value || 0} />
                        <AnimatedSlider
                          style={styles.slider}
                          minimumValue={perk?.status === 'partially_redeemed' ? 0 : 0.10}
                          maximumValue={perk?.value || 0}
                          animatedProps={animatedSliderProps}
                          onValueChange={handleSliderChange}
                          minimumTrackTintColor="#007AFF"
                          maximumTrackTintColor="#E5E5EA"
                          thumbTintColor="#007AFF"
                          step={0.10}
                        />
                      </View>
                      <Text style={styles.sliderValue}>{formatExactCurrency(perk?.value || 0)}</Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={[styles.button, styles.primaryButton]}
                    onPress={handleConfirmAction}
                  >
                    <Text style={[styles.buttonText, styles.primaryButtonText]}>
                      {sliderValue === 0 ? 'Mark as Available' : `Log ${formatCurrency(sliderValue)}`}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.button, styles.secondaryButton]}
                    onPress={() => {
                      Haptics.selectionAsync();
                      handleOpenApp();
                    }}
                  >
                    <Text style={[styles.buttonText, styles.secondaryButtonText]}>
                      Open {appName} <Ionicons name="open-outline" size={16} color="#007AFF" />
                    </Text>
                  </TouchableOpacity>
                </>
              )}

              {isRedeemed && (
                <>
                  <TouchableOpacity
                    style={[styles.button, styles.markAvailableButton]}
                    onPress={() => {
                      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                      handleMarkAvailable();
                    }}
                  >
                    <Text style={styles.buttonText}>Mark as Available</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.button, styles.secondaryButton]}
                    onPress={() => {
                      Haptics.selectionAsync();
                      handleOpenApp();
                    }}
                  >
                    <Text style={[styles.buttonText, styles.secondaryButtonText]}>
                      Open {appName} <Ionicons name="open-outline" size={16} color="#007AFF" />
                    </Text>
                  </TouchableOpacity>
                </>
              )}
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
    marginBottom: 16,
  },
  content: {
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1C1C1E',
    letterSpacing: -0.5,
    flex: 1,
  },
  infoButton: {
    padding: 8,
    marginLeft: 8,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  descriptionContainer: {
    overflow: 'hidden',
  },
  description: {
    fontSize: 15,
    fontWeight: '400',
    color: '#666666',
    lineHeight: 20,
    letterSpacing: -0.24,
  },
  valueContainer: {
    marginBottom: 24,
  },
  remainingValue: {
    fontSize: 32,
    fontWeight: '800',
    color: '#007AFF',
    marginBottom: 8,
    letterSpacing: -0.5,
    lineHeight: 38,
  },
  maxValue: {
    fontSize: 15,
    fontWeight: '400',
    color: '#666666',
    lineHeight: 20,
    letterSpacing: -0.24,
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1C1C1E',
    letterSpacing: -0.41,
  },
  amountSelectorContainer: {
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 4,
  },
  sliderWrapper: {
    flex: 1,
    paddingTop: 24,
    height: 48,
  },
  slider: {
    flex: 1,
    height: 40,
  },
  sliderValue: {
    fontSize: 13,
    fontWeight: '500',
    color: '#8E8E93',
    minWidth: 48,
    textAlign: 'center',
  },
  tooltip: {
    position: 'absolute',
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 4,
    paddingHorizontal: 8,
    top: -23,
    zIndex: 1,
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
    letterSpacing: -0.08,
  },
  button: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  buttonText: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.41,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
    marginBottom: 12,
  },
  secondaryButton: {
    backgroundColor: '#F2F2F7',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  primaryButtonText: {
    color: '#FFFFFF',
  },
  secondaryButtonText: {
    color: '#007AFF',
  },
  markAvailableButton: {
    backgroundColor: '#F2F2F7',
    marginBottom: 16,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    padding: 2,
    marginBottom: 32,
    height: 44, // Fixed height for consistency
  },
  segment: {
    flex: 1,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
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
    fontSize: 13,
    fontWeight: '600',
    color: '#666666',
    letterSpacing: -0.08,
    textAlign: 'center',
  },
  segmentSubtext: {
    fontSize: 11,
    fontWeight: '500',
    color: '#666666',
    letterSpacing: -0.08,
    marginTop: 2,
    textAlign: 'center',
  },
  segmentTextSelected: {
    color: '#007AFF',
  },
  customAmountContainer: {
    gap: 16,
    marginBottom: 32,
    paddingTop: 8,
  },
  inputAccessory: {
    backgroundColor: '#F2F2F7',
    borderTopWidth: 1,
    borderTopColor: '#C7C7CC',
    paddingHorizontal: 16,
    paddingVertical: 8,
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
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#C7C7CC',
  },
  doneButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  doneButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#007AFF',
    letterSpacing: -0.41,
  },
}); 