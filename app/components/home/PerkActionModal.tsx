import { View, Text, StyleSheet, TouchableOpacity, Modal, Pressable, Platform, TextInput, Alert, KeyboardAvoidingView, ScrollView, Keyboard } from 'react-native';
import React, { useState, useEffect, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { PanGestureHandler } from 'react-native-gesture-handler';
import Toast from 'react-native-root-toast';
import * as Haptics from 'expo-haptics';
import Animated, {
  useAnimatedGestureHandler,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  runOnJS,
  withTiming,
  interpolate,
  useAnimatedProps,
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

// Quick select chip component
const QuickSelectChip = ({ label, onPress, isSelected }: { label: string; onPress: () => void; isSelected: boolean }) => (
  <TouchableOpacity 
    style={[
      styles.quickSelectChip,
      isSelected && styles.quickSelectChipSelected
    ]} 
    onPress={onPress}
  >
    <Text style={[
      styles.quickSelectChipText,
      isSelected && styles.quickSelectChipTextSelected
    ]}>
      {label}
    </Text>
  </TouchableOpacity>
);

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
  
  // If no frequency is specified in the perk data, default to monthly
  const frequency = perk.type?.toLowerCase() || 'monthly';
  
  switch (frequency) {
    case 'monthly':
      return perk.value * 12;
    case 'quarterly':
      return perk.value * 4;
    case 'biannual':
    case 'semi-annual':
      return perk.value * 2;
    case 'annual':
    case 'yearly':
      return perk.value;
    default:
      return perk.value * 12; // Default to monthly if frequency not specified
  }
};

// Helper to format title case
const toTitleCase = (str: string) => {
  return str.split(' ').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  ).join(' ');
};

export default function PerkActionModal({
  visible,
  perk,
  onDismiss,
  onOpenApp,
  onMarkRedeemed,
  onMarkAvailable,
}: PerkActionModalProps) {
  const [showCustomAmount, setShowCustomAmount] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<'full' | 'half' | 'custom' | null>('full');
  const [partialAmount, setPartialAmount] = useState('');
  const [sliderValue, setSliderValue] = useState(0);
  const [isEditingNumber, setIsEditingNumber] = useState(false);
  const translateY = useSharedValue(1000);
  const opacity = useSharedValue(0);
  
  // Get the currently redeemed amount if partially redeemed
  const getCurrentRedeemedAmount = useCallback(() => {
    if (perk?.status === 'partially_redeemed' && perk.value && perk.remaining_value) {
      return perk.value - perk.remaining_value;
    }
    return 0;
  }, [perk]);

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
        setSliderValue(currentRedeemedAmount);
        setPartialAmount(String(currentRedeemedAmount));
      } else {
        setSelectedPreset('full');
        setSliderValue(perk?.value || 0);
        setPartialAmount(String(perk?.value || 0));
        setShowCustomAmount(false);
      }
      setIsEditingNumber(false);
    } else {
      translateY.value = withTiming(1000, { duration: 300 });
      opacity.value = withTiming(0, { duration: 300 });
    }
  }, [visible, perk, getCurrentRedeemedAmount]);
  
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

  const handleSliderChange = (value: number) => {
    // Round to nearest dollar
    const roundedValue = Math.round(value);
    
    // Only allow 0 if already partially redeemed
    if (roundedValue === 0 && perk?.status !== 'partially_redeemed') {
      setSliderValue(1);
      setPartialAmount('1.00');
    } else {
      setSliderValue(roundedValue);
      setPartialAmount(roundedValue.toFixed(2));
    }
    setIsEditingNumber(false);
  };

  const handlePartialAmountChange = (text: string) => {
    setPartialAmount(text);
    const numValue = Math.round(parseFloat(text)); // Round to nearest dollar
    
    if (!isNaN(numValue)) {
      if (numValue === 0 && perk?.status !== 'partially_redeemed') {
        setSliderValue(1);
        setPartialAmount('1.00');
      } else if (perk && numValue > perk.value) {
        setSliderValue(perk.value);
        setPartialAmount(perk.value.toFixed(2));
      } else {
        setSliderValue(numValue);
      }
    }
    setIsEditingNumber(true);
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
                  <View style={styles.quickSelectContainer}>
                    <QuickSelectChip 
                      label={`${formattedValue} (Full)`}
                      onPress={() => handlePresetSelect('full')}
                      isSelected={selectedPreset === 'full'}
                    />
                    <QuickSelectChip 
                      label={`${formatCurrency(perk.value / 2)} (Half)`}
                      onPress={() => handlePresetSelect('half')}
                      isSelected={selectedPreset === 'half'}
                    />
                    <QuickSelectChip 
                      label="Custom"
                      onPress={() => handlePresetSelect('custom')}
                      isSelected={selectedPreset === 'custom'}
                    />
                  </View>

                  {showCustomAmount && (
                    <View style={styles.customAmountContainer}>
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
                        style={styles.amountContainer} 
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
                            onSubmitEditing={Keyboard.dismiss}
                          />
                        ) : (
                          <Text style={styles.amountValue}>
                            {formatCurrency(sliderValue)}
                          </Text>
                        )}
                      </TouchableOpacity>
                    </View>
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
  quickSelectContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  quickSelectChip: {
    flex: 1,
    marginHorizontal: 4,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#007AFF',
    backgroundColor: 'transparent',
    alignItems: 'center',
  },
  quickSelectChipSelected: {
    backgroundColor: '#007AFF',
  },
  quickSelectChipText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  quickSelectChipTextSelected: {
    color: '#FFFFFF',
  },
  customAmountContainer: {
    gap: 16,
    marginBottom: 24,
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
}); 