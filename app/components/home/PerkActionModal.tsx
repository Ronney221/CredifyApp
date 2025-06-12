import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { PanGestureHandler } from 'react-native-gesture-handler';
import Toast from 'react-native-root-toast';
import Animated, {
  useAnimatedGestureHandler,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  runOnJS,
  withTiming,
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

// Add a new Tooltip component
const SliderTooltip = ({ value, style }: { value: number; style?: any }) => (
  <View style={[styles.tooltip, style]}>
    <View style={styles.tooltipArrow} />
    <Text style={styles.tooltipText}>${value.toFixed(2)}</Text>
  </View>
);

export default function PerkActionModal({
  visible,
  perk,
  onDismiss,
  onOpenApp,
  onMarkRedeemed,
  onMarkAvailable,
}: PerkActionModalProps) {
  const [showPartialRedeem, setShowPartialRedeem] = useState(false);
  const [partialAmount, setPartialAmount] = useState('');
  const [sliderValue, setSliderValue] = useState(0);
  const [isEditingNumber, setIsEditingNumber] = useState(false);
  const translateY = useSharedValue(1000);
  const opacity = useSharedValue(0);
  
  useEffect(() => {
    if (visible) {
      translateY.value = withTiming(0, { duration: 300 });
      opacity.value = withTiming(1, { duration: 300 });
      // Set initial slider value for partial redemptions
      if (perk?.status === 'partially_redeemed' && perk.value && perk.remaining_value) {
        const redeemedAmount = perk.value - perk.remaining_value;
        setSliderValue(redeemedAmount);
        setPartialAmount(redeemedAmount.toFixed(2));
      }
    } else {
      translateY.value = withTiming(1000, { duration: 300 });
      opacity.value = withTiming(0, { duration: 300 });
    }
  }, [visible, perk]);
  
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
    setShowPartialRedeem(false);
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

  const handlePartialRedeem = () => {
    const amount = isEditingNumber ? parseFloat(partialAmount) : sliderValue;
    if (isNaN(amount) || amount <= 0 || amount >= (perk?.value || 0)) {
      Alert.alert(
        'Invalid Amount',
        'Please enter a valid amount that is greater than 0 and less than the total perk value.'
      );
      return;
    }

    handleDismiss();
    const previousStatus = perk?.status;
    const previousValue = perk?.remaining_value;
    const isPartiallyRedeemed = previousStatus === 'partially_redeemed';

    onMarkRedeemed(amount);
    showToast(
      `${perk?.name} partially redeemed: $${amount.toFixed(2)}`,
      () => {
        if (isPartiallyRedeemed && previousValue !== undefined) {
          // Restore previous partial redemption with the correct amount
          onMarkRedeemed(perk?.value ? perk.value - previousValue : 0);
        } else {
          onMarkAvailable();
        }
      }
    );
  };

  const handleSliderChange = (value: number) => {
    setSliderValue(value);
    setPartialAmount(value.toFixed(2));
    setIsEditingNumber(false);
  };

  const handlePartialAmountChange = (text: string) => {
    setPartialAmount(text);
    const numValue = parseFloat(text);
    if (!isNaN(numValue) && numValue >= 0 && numValue < (perk?.value || 0)) {
      setSliderValue(numValue);
    }
    setIsEditingNumber(true);
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
  }) : null;

  const appName = getAppName(perk);

  return (
    <Modal
      transparent
      visible={visible}
      onRequestClose={handleDismiss}
      animationType="none"
    >
      <Animated.View style={[styles.overlay, overlayStyle]}>
        <Pressable style={styles.overlayPress} onPress={handleDismiss} />
      </Animated.View>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1, justifyContent: 'flex-end' }}
      >
        <Animated.View style={[styles.container, animatedStyle]}>
          <View style={styles.handle} />
          <ScrollView style={styles.scrollView}>
            <View style={styles.content}>
              <Text style={styles.title}>{perk.name}</Text>
              <Text style={styles.value}>{formattedValue}</Text>
              {isPartiallyRedeemed && formattedRemainingValue && (
                <Text style={styles.remainingValue}>
                  {formattedRemainingValue} remaining
                </Text>
              )}
              <Text style={styles.description}>{perk.description}</Text>
              
              {!isRedeemed ? (
                <>
                  {/* Redemption Buttons */}
                  <View style={styles.redemptionButtons}>
                    <TouchableOpacity
                      style={[styles.button, styles.fullRedeemButton]}
                      onPress={handleMarkRedeemed}
                    >
                      <Text style={[styles.buttonText, styles.fullRedeemText]}>Full Redemption</Text>
                    </TouchableOpacity>
                    {!showPartialRedeem && (
                      <TouchableOpacity
                        style={[styles.button, styles.partialRedeemButton]}
                        onPress={() => setShowPartialRedeem(true)}
                      >
                        <Text style={[styles.buttonText, styles.partialRedeemText]}>Partial Redemption</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Partial Redemption Section */}
                  {showPartialRedeem && (
                    <View style={styles.partialRedeemContainer}>
                      <Text style={styles.partialRedeemLabel}>Select amount to redeem:</Text>
                      <View style={styles.sliderContainer}>
                        <Text style={styles.sliderValue}>$0</Text>
                        <View style={styles.sliderWrapper}>
                          <SliderTooltip value={sliderValue} style={{ left: `${(sliderValue / (perk?.value || 100)) * 100}%` }} />
                          <Slider
                            style={styles.slider}
                            minimumValue={0}
                            maximumValue={perk?.value || 100}
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
                          />
                        ) : (
                          <Text style={styles.amountValue}>
                            ${sliderValue.toFixed(2)}
                          </Text>
                        )}
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.button, styles.confirmButton]}
                        onPress={handlePartialRedeem}
                      >
                        <Text style={[styles.buttonText, styles.confirmButtonText]}>Confirm Partial Redemption</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </>
              ) : (
                <TouchableOpacity
                  style={[styles.button, styles.markAvailableButton]}
                  onPress={handleMarkAvailable}
                >
                  <Text style={styles.buttonText}>Mark as Available</Text>
                </TouchableOpacity>
              )}

              {/* Open App Button - Always at the bottom */}
              <TouchableOpacity
                style={[styles.button, styles.openButton]}
                onPress={handleOpenApp}
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
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 8,
  },
  value: {
    fontSize: 20,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 8,
  },
  remainingValue: {
    fontSize: 16,
    color: '#FF9500',
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 24,
  },
  redemptionButtons: {
    flexDirection: 'column',
    gap: 12,
    marginBottom: 24,
  },
  button: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullRedeemButton: {
    backgroundColor: '#007AFF',
  },
  partialRedeemButton: {
    backgroundColor: '#E5F1FF',
  },
  markAvailableButton: {
    backgroundColor: '#F2F2F7',
    marginBottom: 12,
  },
  openButton: {
    backgroundColor: '#E5F1FF',
    marginTop: 12,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  fullRedeemText: {
    color: '#FFFFFF',
  },
  partialRedeemText: {
    color: '#007AFF',
  },
  openButtonText: {
    color: '#007AFF',
  },
  partialRedeemContainer: {
    gap: 16,
    marginBottom: 24,
  },
  partialRedeemLabel: {
    fontSize: 16,
    color: '#000000',
    marginBottom: 4,
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
  confirmButton: {
    backgroundColor: '#007AFF',
  },
  confirmButtonText: {
    color: '#FFFFFF',
  },
  sliderWrapper: {
    flex: 1,
    paddingTop: 24, // Make room for the tooltip
  },
  tooltip: {
    position: 'absolute',
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 4,
    paddingHorizontal: 8,
    top: 0,
    transform: [{ translateX: -25 }], // Center the tooltip over the thumb
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
}); 