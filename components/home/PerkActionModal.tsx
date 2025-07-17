//perk-action-modal.tsx
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
  Platform,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  ScrollView,
  Keyboard,
  InputAccessoryView,
  AppState,
  AppStateStatus,
  KeyboardEventListener,
  KeyboardEvent as RNKeyboardEvent,
  LayoutAnimation,
  UIManager,
  Dimensions,
} from 'react-native';
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Toast from 'react-native-root-toast';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  useAnimatedProps,
  Easing,
  runOnJS,
  Layout,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import Slider from '@react-native-community/slider';
import { CardPerk, APP_SCHEMES, multiChoicePerksConfig } from '../../src/data/card-data';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface PerkActionModalProps {
  visible: boolean;
  perk: CardPerk | null;
  onDismiss: () => void;
  onOpenApp: (targetPerkName?: string) => void;
  onMarkRedeemed: (partialAmount?: number) => void;
  onMarkAvailable: () => void;
  setPendingToast: (toast: { message: string; onUndo?: (() => void) | null } | null) => void;
}

const AnimatedSlider = Animated.createAnimatedComponent(Slider);

// Add a new Tooltip component with smooth animation
const SliderTooltip = ({ value, maxValue }: { value: number; maxValue: number }) => {
  const animatedStyle = useAnimatedStyle(() => {
    const safeValue = value || 0;
    const percentage = (safeValue / maxValue) * 100;
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
      <Text style={styles.tooltipText}>${(value || 0).toFixed(2)}</Text>
    </Animated.View>
  );
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
  const segments: { value: AmountOption; topLabel: string; bottomLabel?: string }[] = [
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

// Get the app name for the CTA button
const getAppName = (perk: CardPerk): string => {
  if (perk.appScheme && typeof perk.appScheme === 'string' && APP_SCHEMES[perk.appScheme as keyof typeof APP_SCHEMES]) {
    // Map app schemes to friendly names
    const appName = perk.appScheme.charAt(0).toUpperCase() + perk.appScheme.slice(1);
    return appName.replace(/([A-Z])/g, ' $1').trim(); // Add spaces before capital letters
  }
  return 'App';
};

const { height: screenHeight } = Dimensions.get('window');

export default function PerkActionModal({
  visible,
  perk,
  onDismiss,
  onOpenApp,
  onMarkRedeemed,
  onMarkAvailable,
  setPendingToast,
}: PerkActionModalProps) {
  // State hooks must be at the top, before any conditional returns
  const [selectedPreset, setSelectedPreset] = useState<AmountOption>('full');
  const [sliderValue, setSliderValue] = useState(0);
  const [showCustomAmount, setShowCustomAmount] = useState(false);
  const [partialAmount, setPartialAmount] = useState('');
  const [isEditingNumber, setIsEditingNumber] = useState(false);
  const [showDescription, setShowDescription] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // Animated values
  const translateY = useSharedValue(screenHeight);
  const context = useSharedValue({ y: 0 });
  const sliderAnimation = useSharedValue(0);
  const sliderPosition = useSharedValue(0);
  const rotation = useSharedValue(0);

  // Animated styles for modal presentation
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
    };
  });

  const animatedChevronStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${rotation.value}deg` }],
    };
  });

  // Animated props for slider
  const animatedSliderProps = useAnimatedProps(() => ({
    value: sliderAnimation.value,
  }));

  // Memoized values
  const yearlyTotal = useMemo(() => calculateYearlyTotal(perk), [perk]);
  const maxValue = useMemo(() => perk?.value || 0, [perk]);
  const appName = useMemo(() => perk ? getAppName(perk) : '', [perk]);

  // Safe calculation of remaining value
  const remainingValueDisplay = useMemo(() => {
    if (!perk || typeof perk.remaining_value !== 'number' || perk.remaining_value < 0) {
      return perk?.value || 0;
    }
    return perk.remaining_value;
  }, [perk]);

  // Safe access to redemption data
  const redemptionData = useMemo(() => {
    if (!perk || !perk.redemptionInstructions) {
      return [];
    }
    return perk.redemptionInstructions;
  }, [perk]);

  // Get the currently redeemed amount if partially redeemed
  const getCurrentRedeemedAmount = useCallback(() => {
    if (!perk) return 0;
    if (perk.status === 'partially_redeemed' && perk.value && perk.remaining_value) {
      return roundToNearestDime(perk.value - perk.remaining_value);
    }
    return 0;
  }, [perk]);

  // Handle slider value change with animation
  const handleSliderChange = useCallback((value: number) => {
    if (!perk) return;
    
    const roundedValue = roundToNearestDime(value);
    const maxValue = perk.value;
    
    // Ensure value doesn't exceed max
    const validatedValue = Math.min(roundedValue, maxValue);
    
    setSliderValue(validatedValue);
    setPartialAmount(validatedValue.toFixed(2));
    
    // Animate the slider
    sliderAnimation.value = withSpring(validatedValue, {
      damping: 15,
      stiffness: 120,
    });
  }, [perk, sliderAnimation]);

  // Handle text input changes
  const handleAmountChange = useCallback((text: string) => {
    if (!perk) return;
    
    // Remove any non-numeric characters except decimal point
    const cleanedText = text.replace(/[^0-9.]/g, '');
    
    // Parse the value
    const parsedValue = parseDecimalInput(cleanedText);
    
    // Validate the value
    if (parsedValue > perk.value) {
      setPartialAmount(perk.value.toFixed(2));
      sliderAnimation.value = withSpring(perk.value);
    } else {
      setPartialAmount(cleanedText);
      if (!isNaN(parsedValue)) {
        sliderAnimation.value = withSpring(parsedValue);
      }
    }
  }, [perk, sliderAnimation]);

  // Handle blur event for text input
  const handleAmountBlur = useCallback(() => {
    if (!perk) return;
    
    const numValue = parseFloat(partialAmount);
    if (isNaN(numValue) || numValue <= 0) {
      setPartialAmount('0.00');
      setSliderValue(0);
      sliderAnimation.value = withSpring(0);
      return;
    }
    
    const maxValue = perk.value;
    const validatedValue = Math.min(roundToNearestDime(numValue), maxValue);
    
    setPartialAmount(validatedValue.toFixed(2));
    setSliderValue(validatedValue);
    sliderAnimation.value = withSpring(validatedValue);
  }, [perk, partialAmount, sliderAnimation]);

  const handleDismiss = useCallback(() => {
    translateY.value = withTiming(screenHeight, { duration: 300 }, isFinished => {
      if (isFinished) {
        runOnJS(onDismiss)();
      }
    });
  }, [onDismiss, translateY]);

  // Handle gesture for swipe-to-close
  const panGesture = Gesture.Pan()
    .onStart(() => {
      context.value = { y: translateY.value };
    })
    .onUpdate(event => {
      translateY.value = event.translationY + context.value.y;
      translateY.value = Math.max(translateY.value, 0); // Prevent swiping up past the top
    })
    .onEnd(() => {
      if (translateY.value > 150) {
        runOnJS(handleDismiss)();
      } else {
        translateY.value = withSpring(0, { damping: 50 });
      }
    });




  useEffect(() => {
    const keyboardWillShow = (e: RNKeyboardEvent) => {
      setKeyboardHeight(e.endCoordinates.height);
      setIsKeyboardVisible(true);
    };

    const keyboardWillHide = () => {
      setKeyboardHeight(0);
      setIsKeyboardVisible(false);
    };

    const showSubscription = Keyboard.addListener('keyboardWillShow', keyboardWillShow);
    const hideSubscription = Keyboard.addListener('keyboardWillHide', keyboardWillHide);

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  // Animate modal in when it becomes visible
  useEffect(() => {
    if (visible) {
      translateY.value = withTiming(0, {
        duration: 240,
        easing: Easing.out(Easing.quad),
      });
    }
  }, [visible]);

  // Reset state when modal becomes visible or perk changes
  useEffect(() => {
    if (!visible || !perk) return;

    // First check if it's partially redeemed and set the correct initial value
    if (perk.status === 'partially_redeemed') {
      const currentRedeemedAmount = getCurrentRedeemedAmount();
      const roundedAmount = roundToNearestDime(currentRedeemedAmount);
      
      // Set all slider-related values to the current redeemed amount
      sliderAnimation.value = roundedAmount;
      sliderPosition.value = roundedAmount;
      setSliderValue(roundedAmount);
      setPartialAmount(formatExactCurrency(roundedAmount).replace(/[^0-9.]/g, ''));
      
      // Set UI state
      setSelectedPreset('custom');
      setShowCustomAmount(true);
    } else {
      // For non-partially redeemed perks, set to max value
      const maxValue = perk.value || 0;
      sliderAnimation.value = maxValue;
      sliderPosition.value = maxValue;
      setSliderValue(maxValue);
      setPartialAmount(formatExactCurrency(maxValue).replace(/[^0-9.]/g, ''));
      
      setSelectedPreset('full');
      setShowCustomAmount(false);
    }
    setIsEditingNumber(false);
  }, [visible, perk, getCurrentRedeemedAmount, sliderAnimation, sliderPosition]);

  useEffect(() => {
    // Log the perk object whenever the modal becomes visible or the perk changes
    if (visible && perk) {
      console.log('[PerkActionModal] Received perk data:', JSON.stringify(perk, null, 2));
    }
  }, [visible, perk]);

  if (!visible || !perk) {
    return null;
  }

  const handleOpenApp = async () => {
    if (!perk || !perk.name) return;

    // Close modal first
    handleDismiss();

    try {
      // Always attempt to open the app target
      await onOpenApp();
      if (Platform.OS === 'ios') {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    } catch (openErrorOrDbError) {
      console.error('Error opening app:', openErrorOrDbError);
      Alert.alert('Error', 'Failed to open the app.');
    }
  };

  const renderActionButton = () => {
    if (!perk) return null;

    // Handle slider-based input
    if (!showCustomAmount) {
      if (sliderValue === 0) return 'Mark as Available';
      if (sliderValue === perk.value) return 'Mark as Redeemed';
      return `Log $${sliderValue.toFixed(2)}`;
    }

    // Handle custom amount input
    if (selectedPreset === 'custom') {
      const amount = parseFloat(partialAmount);
      // If amount is 0 or invalid, and perk is partially redeemed, show "Mark as Available"
      if ((isNaN(amount) || amount === 0) && perk.status === 'partially_redeemed') {
        return 'Mark as Available';
      }
      if (amount === perk.value) return 'Mark as Redeemed';
      return `Log $${amount.toFixed(2)}`;
    }

    // Default case
    return 'Mark as Redeemed';
  };

  const handleMarkRedeemed = async (partialAmount?: number) => {
    if (!perk) return;

    try {
      // Close modal first to prevent state conflicts
      handleDismiss();

      // For partial redemptions, validate the amount
      if (partialAmount !== undefined) {
        if (partialAmount <= 0 || partialAmount > perk.value) {
          Alert.alert('Invalid Amount', 'Please enter a valid amount between 0 and the total credit value.');
          return;
        }
      }

      // Call the parent handler
      await onMarkRedeemed(partialAmount);

      // Show success toast with appropriate message
      if (setPendingToast) {
        const message = partialAmount !== undefined && partialAmount !== perk.value
          ? `${perk.name} partially redeemed ($${partialAmount.toFixed(2)})`
          : `${perk.name} marked as redeemed`;

        // Show toast without undo functionality
        setPendingToast({
          message,
          onUndo: null
        });
      }
    } catch (error) {
      console.error('Error marking perk as redeemed:', error);
      Alert.alert('Error', 'Failed to mark perk as redeemed. Please try again.');
    }
  };

  const handleMarkAvailable = async () => {
    if (!perk) return;

    try {
      // Close modal first to prevent state conflicts
      handleDismiss();

      // Call the parent handler
      await onMarkAvailable();

      // Show success toast without undo functionality
      if (setPendingToast) {
        const message = `${perk.name} marked as available.`;
        setPendingToast({
          message,
          onUndo: null
        });
      }
    } catch (error) {
      console.error('Error marking perk as available:', error);
      Alert.alert('Error', 'Failed to mark perk as available. Please try again.');
    }
  };

  const handleConfirmAction = () => {
    if (!perk) return;
    Keyboard.dismiss();

    // For custom amount input
    if (showCustomAmount && selectedPreset === 'custom') {
      const amount = parseFloat(partialAmount);
      
      // Special case: marking a partially redeemed perk as available
      if ((isNaN(amount) || amount === 0) && perk.status === 'partially_redeemed') {
        handleDismiss();
        handleMarkAvailable();
        return;
      }

      // Validate non-zero amounts
      if (isNaN(amount)) {
        Alert.alert('Invalid Amount', 'Please enter a valid amount.');
        return;
      }
      if (amount < 0 || amount > perk.value) {
        Alert.alert('Invalid Amount', 'Amount cannot exceed the total credit value.');
        return;
      }

      handleDismiss();
      handleMarkRedeemed(amount);
      return;
    }

    // For slider-based input
    handleDismiss();
    if (sliderValue === 0 && perk.status === 'partially_redeemed') {
      handleMarkAvailable();
    } else {
      handleMarkRedeemed(sliderValue);
    }
  };

  // Safely access perk properties with defaults
  const {
    name = '',
    description = '',
    value = 0,
    remaining_value = value,
    status = 'available',
    periodMonths = 1,
  } = perk;

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

  const renderPrimaryButton = () => {
    if (!perk) return null;

    return (
      <TouchableOpacity
        style={[styles.button, styles.secondaryButton]}
        onPress={handleConfirmAction}
      >
        <Text style={[styles.buttonText, styles.secondaryButtonText]}>
          {renderActionButton()}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleDismiss}
    >
      <View style={styles.overlay}>
        <Pressable 
          style={styles.overlayPress} 
          onPress={() => {
            Keyboard.dismiss();
            handleDismiss();
          }} 
        />
      </View>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1, justifyContent: 'flex-end' }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
      >
        <GestureDetector gesture={panGesture}>
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
                </View>

                <View style={styles.valueContainer}>
                  <Text style={styles.remainingValue}>
                    Remaining: {formattedRemainingValue}
                  </Text>
                  <Text style={styles.maxValue}>
                    {perk.period === 'monthly'
                      ? 'Monthly'
                      : perk.period === 'quarterly'
                      ? 'Quarterly'
                      : perk.period === 'semi_annual'
                      ? 'Semi-annual'
                      : perk.period === 'annual'
                      ? 'Annual'
                      : 'Monthly'}{' '}
                    credit: {formattedValue}
                    {'\n'}
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
                            minimumValue={perk?.status === 'partially_redeemed' ? 0 : 0.1}
                            maximumValue={perk?.value || 0}
                            minimumTrackTintColor="#007AFF"
                            maximumTrackTintColor="#E5E5EA"
                            thumbTintColor="#007AFF"
                            onValueChange={handleSliderChange}
                            animatedProps={animatedSliderProps}
                            step={0.1}
                            style={styles.slider}
                          />
                        </View>
                        <Text style={styles.sliderValue}>{formatExactCurrency(perk?.value || 0)}</Text>
                      </View>
                    </View>
                  </>
                )}

                <View style={styles.divider} />

                <View style={styles.sectionHeaderContainer}>
                  <Text style={styles.sectionTitle}>How it Works</Text>
                </View>

                <View style={styles.descriptionContainer}>
                  <Text style={styles.description}>{perk.description}</Text>
                  {perk.redemptionInstructions && (
                    <>
                      <Text style={styles.redemptionTitle}>How to Redeem</Text>
                      <Text style={styles.description}>{perk.redemptionInstructions}</Text>
                    </>
                  )}
                </View>

                <View style={styles.divider} />

                {!isRedeemed && (
                  <>
                    {renderPrimaryButton()}

                    <TouchableOpacity style={[styles.button, styles.primaryButton]} onPress={handleOpenApp}>
                      <Text style={[styles.buttonText, styles.primaryButtonText]}>
                        Open {appName} <Ionicons name="open-outline" size={16} color="#FFFFFF" />
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

                    <TouchableOpacity style={[styles.button, styles.primaryButton]} onPress={handleOpenApp}>
                      <Text style={[styles.buttonText, styles.primaryButtonText]}>
                        Open {appName} <Ionicons name="open-outline" size={16} color="#FFFFFF" />
                      </Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </ScrollView>
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
  container: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
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
    marginBottom: 8,
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
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  description: {
    fontSize: 15,
    fontWeight: '400',
    color: '#666666',
    lineHeight: 20,
    letterSpacing: -0.24,
  },
  redemptionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1C1C1E',
    marginTop: 16,
    marginBottom: 4,
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
  divider: {
    height: 1,
    backgroundColor: '#E5E5EA',
    marginVertical: 16,
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionHeaderContainer: {
    marginBottom: 8,
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