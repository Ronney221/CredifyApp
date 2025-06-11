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
  const toastMessage = onUndo 
    ? `${message}\nTap to undo`
    : message;

  const toast = Toast.show(toastMessage, {
    duration: onUndo ? 4000 : 2000,
    position: Toast.positions.BOTTOM - 80, // Move up by 80 pixels from bottom
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

export default function PerkActionModal({
  visible,
  perk,
  onDismiss,
  onOpenApp,
  onMarkRedeemed,
  onMarkAvailable,
}: PerkActionModalProps) {
  const [showChoices, setShowChoices] = useState(false);
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
    setShowChoices(false);
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

  // Check if this is a multi-choice perk
  const choices = multiChoicePerksConfig[perk.name];
  const isMultiChoice = choices && choices.length > 0;

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
          <View style={styles.content}>
            <Text style={styles.title}>{perk.name}</Text>
            <Text style={styles.value}>{formattedValue}</Text>
            {isPartiallyRedeemed && formattedRemainingValue && (
              <Text style={styles.remainingValue}>
                {formattedRemainingValue} remaining
              </Text>
            )}
            <Text style={styles.description}>{perk.description}</Text>
            {showPartialRedeem ? (
              <View style={styles.partialRedeemContainer}>
                <Text style={styles.partialRedeemLabel}>Select amount to redeem:</Text>
                <View style={styles.sliderContainer}>
                  <Text style={styles.sliderValue}>$0</Text>
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
                <View style={styles.partialRedeemButtons}>
                  <TouchableOpacity
                    style={[styles.button, styles.cancelButton]}
                    onPress={() => {
                      setShowPartialRedeem(false);
                      setSliderValue(0);
                      setPartialAmount('');
                      setIsEditingNumber(false);
                    }}
                  >
                    <Text style={styles.buttonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.button, styles.confirmButton]}
                    onPress={handlePartialRedeem}
                  >
                    <Text style={[styles.buttonText, styles.confirmButtonText]}>Confirm</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : showChoices ? (
              <View style={styles.choicesContainer}>
                <TouchableOpacity
                  testID="full-redemption-button"
                  style={[styles.button, styles.choiceButton]}
                  onPress={handleMarkRedeemed}
                >
                  <Text style={styles.buttonText}>Full Redemption</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  testID="partial-redemption-button"
                  style={[styles.button, styles.choiceButton]}
                  onPress={() => setShowPartialRedeem(true)}
                >
                  <Text style={styles.buttonText}>Partial Redemption</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  testID="cancel-button"
                  style={[styles.button, styles.cancelButton]}
                  onPress={() => setShowChoices(false)}
                >
                  <Text style={styles.buttonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.buttons}>
                {!isRedeemed && (
                  <TouchableOpacity
                    testID="continue-redemption-button"
                    style={[styles.button, styles.primaryButton]}
                    onPress={() => setShowChoices(true)}
                  >
                    <Text style={[styles.buttonText, styles.primaryButtonText]}>
                      {isPartiallyRedeemed ? 'Continue Redemption' : 'Mark as Redeemed'}
                    </Text>
                  </TouchableOpacity>
                )}
                {isRedeemed && (
                  <TouchableOpacity
                    testID="mark-available-button"
                    style={[styles.button, styles.secondaryButton]}
                    onPress={handleMarkAvailable}
                  >
                    <Text style={styles.buttonText}>Mark as Available</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  testID="open-app-button"
                  style={[styles.button, styles.openButton]}
                  onPress={handleOpenApp}
                >
                  <Text style={[styles.buttonText, styles.openButtonText]}>
                    Open {appName} <Ionicons name="open-outline" size={16} color="#007AFF" />
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
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
  buttons: {
    gap: 12,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: '#007AFF',
  },
  secondaryButton: {
    backgroundColor: '#F2F2F7',
  },
  openButton: {
    backgroundColor: '#E5F1FF',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  primaryButtonText: {
    color: '#FFFFFF',
  },
  openButtonText: {
    color: '#007AFF',
  },
  choicesContainer: {
    gap: 12,
  },
  choiceButton: {
    backgroundColor: '#F2F2F7',
  },
  cancelButton: {
    backgroundColor: '#F2F2F7',
  },
  partialRedeemContainer: {
    gap: 16,
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
  partialRedeemButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  confirmButton: {
    flex: 1,
    backgroundColor: '#007AFF',
  },
  confirmButtonText: {
    color: '#FFFFFF',
  },
}); 