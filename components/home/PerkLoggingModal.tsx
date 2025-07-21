//perk-logging-modal.tsx
import React, { useState, useCallback, useEffect } from 'react';
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
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { CardPerk } from '../../src/data/card-data';

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

export default function PerkLoggingModal({
  visible,
  perk,
  onDismiss,
  onSaveLog,
}: PerkLoggingModalProps) {
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState('');
  
  const translateY = useSharedValue(screenHeight);
  const context = useSharedValue({ y: 0 });
  const insets = useSafeAreaInsets();

  const maxValue = perk?.status === 'partially_redeemed' 
    ? (perk?.remaining_value || 0) 
    : (perk?.value || 0);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
    };
  });

  const handleDismiss = useCallback(() => {
    Keyboard.dismiss();
    translateY.value = withTiming(screenHeight, { duration: 300 }, isFinished => {
      if (isFinished) {
        runOnJS(onDismiss)();
      }
    });
  }, [onDismiss, translateY]);

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

  const handleLogFullAmount = useCallback(() => {
    // Instant log full amount without needing to click save
    if (Platform.OS === 'ios') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    
    handleDismiss();
    onSaveLog(maxValue);
  }, [maxValue, handleDismiss, onSaveLog]);

  const handleSaveLog = useCallback(() => {
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

    if (Platform.OS === 'ios') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    
    handleDismiss();
    onSaveLog(amount);
  }, [inputValue, maxValue, handleDismiss, onSaveLog]);

  // Reset state when modal opens
  useEffect(() => {
    if (visible) {
      translateY.value = withTiming(0, {
        duration: 240,
        easing: Easing.out(Easing.quad),
      });
      setInputValue('');
      setError('');
    }
  }, [visible]);

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
        behavior={Platform.OS === 'ios' ? 'position' : 'height'}
        style={styles.keyboardAvoid}
      >
        <GestureDetector gesture={panGesture}>
          <Animated.View style={[styles.container, animatedStyle]}>
            <View style={styles.handle} />
            
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Log {perk.name} Usage</Text>
              <TouchableOpacity onPress={handleDismiss} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#8E8E93" />
              </TouchableOpacity>
            </View>

            {/* Content */}
            <View style={[styles.content, { paddingBottom: insets.bottom + 24 }]}>
              {/* Amount Input */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Amount Used</Text>
                <View style={[styles.inputWrapper, error ? styles.inputWrapperError : null]}>
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
                </View>
                {error ? (
                  <Text style={styles.errorText}>{error}</Text>
                ) : (
                  <Text style={styles.helperText}>
                    Maximum: {formatCurrency(maxValue)}
                  </Text>
                )}
              </View>

              {/* Quick Action Button */}
              <TouchableOpacity 
                style={styles.fullAmountButton} 
                onPress={handleLogFullAmount}
              >
                <Text style={styles.fullAmountText}>
                  Log Full Amount ({formatCurrency(maxValue)})
                </Text>
              </TouchableOpacity>

              {/* Save Button */}
              <TouchableOpacity 
                style={[styles.saveButton, !inputValue && styles.saveButtonDisabled]} 
                onPress={handleSaveLog}
                disabled={!inputValue}
              >
                <Text style={[styles.saveButtonText, !inputValue && styles.saveButtonTextDisabled]}>
                  {inputValue && parseDecimalInput(inputValue) > 0 
                    ? `Save Log (${formatCurrency(parseDecimalInput(inputValue))})`
                    : 'Save Log'
                  }
                </Text>
              </TouchableOpacity>
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
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    minHeight: 380,
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 24,
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
    paddingHorizontal: 24,
  },
  inputContainer: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 12,
    letterSpacing: -0.32,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  inputWrapperError: {
    borderColor: '#FF3B30',
  },
  currencySymbol: {
    fontSize: 24,
    fontWeight: '400',
    color: '#8E8E93',
    marginRight: 4,
  },
  input: {
    flex: 1,
    fontSize: 24,
    fontWeight: '400',
    color: '#1C1C1E',
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
    fontWeight: '400',
    color: '#FF3B30',
    marginTop: 8,
    letterSpacing: -0.24,
  },
  fullAmountButton: {
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  fullAmountText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
    letterSpacing: -0.32,
  },
  saveButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  saveButtonDisabled: {
    backgroundColor: '#E5E5EA',
  },
  saveButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: -0.41,
  },
  saveButtonTextDisabled: {
    color: '#8E8E93',
  },
});