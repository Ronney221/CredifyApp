import React, { useState, useRef, useEffect } from 'react';
import { 
  TouchableOpacity, 
  StyleSheet, 
  View, 
  Modal, 
  SafeAreaView, 
  Text,
  Animated,
  Platform,
  TouchableWithoutFeedback,
  Dimensions,
} from 'react-native';
import { MotiView } from 'moti';
import { Ionicons } from '@expo/vector-icons';
import AIChat from './AIChat';
import { Colors } from '../../constants/Colors';
import { useOnboardingContext } from '../../app/(onboarding)/_context/OnboardingContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '../../utils/logger';

interface AIChatButtonProps {
  showNotification?: boolean;
  onOpen?: () => void;
  onClose?: () => void;
}

export default function AIChatButton({ showNotification, onOpen, onClose }: AIChatButtonProps) {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [showChatContent, setShowChatContent] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const tooltipOpacity = useRef(new Animated.Value(0)).current;
  const tooltipTimeout = useRef<ReturnType<typeof setTimeout>>();
  const { hasRedeemedFirstPerk } = useOnboardingContext();

  // Add logging for component mount and context value
  useEffect(() => {
    const checkState = async () => {
      const storedValue = await AsyncStorage.getItem('HAS_REDEEMED_FIRST_PERK_KEY');
      logger.log('[AIChatButton] Component mounted:', {
        contextValue: hasRedeemedFirstPerk,
        asyncStorageValue: storedValue,
        timestamp: new Date().toISOString()
      });
    };
    checkState();
  }, []);

  // Add logging for context value changes
  useEffect(() => {
    logger.log('[AIChatButton] hasRedeemedFirstPerk changed:', {
      newValue: hasRedeemedFirstPerk,
      timestamp: new Date().toISOString()
    });
  }, [hasRedeemedFirstPerk]);

  useEffect(() => {
    return () => {
      if (tooltipTimeout.current) {
        clearTimeout(tooltipTimeout.current);
      }
    };
  }, []);

  const showTooltipWithTimeout = () => {
    if (!hasRedeemedFirstPerk) {
      // Clear any existing timeout
      if (tooltipTimeout.current) {
        clearTimeout(tooltipTimeout.current);
      }
      
      setShowTooltip(true);
      Animated.timing(tooltipOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();

      // Hide tooltip after 3 seconds
      tooltipTimeout.current = setTimeout(() => {
        hideTooltip();
      }, 3000);
    }
  };

  const hideTooltip = () => {
    if (tooltipTimeout.current) {
      clearTimeout(tooltipTimeout.current);
    }
    
    Animated.timing(tooltipOpacity, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setShowTooltip(false));
  };

  const handlePress = () => {
    logger.log('[AIChatButton] Button pressed, current state:', {
      hasRedeemedFirstPerk,
      timestamp: new Date().toISOString()
    });
    
    if (!hasRedeemedFirstPerk) {
      logger.log('[AIChatButton] Button locked, showing tooltip');
      showTooltipWithTimeout();
      return;
    }

    if (onOpen) {
      onOpen();
    }
    
    setIsAnimating(true);
    setIsModalVisible(true);
    
    // Delay showing the chat content to sync with animation
    setTimeout(() => {
      setShowChatContent(true);
    }, 300);
  };

  const handleClose = () => {
    setIsModalVisible(false);
    setIsAnimating(false);
    setShowChatContent(false);
    if (onClose) {
      onClose();
    }
  };

  return (
    <>
      <View style={styles.buttonWrapper}>
        {/* Tooltip with click-outside behavior */}
        {showTooltip && (
          <TouchableWithoutFeedback onPress={hideTooltip}>
            <View style={StyleSheet.absoluteFill}>
              <Animated.View 
                style={[
                  styles.tooltip,
                  { opacity: tooltipOpacity }
                ]}
              >
                <Text style={styles.tooltipText}>
                  Redeem your first perk to unlock Credify AI
                </Text>
                <View style={styles.tooltipArrow} />
              </Animated.View>
            </View>
          </TouchableWithoutFeedback>
        )}

        <MotiView
          animate={{
            scale: isAnimating ? 1.1 : 1,
            opacity: isAnimating ? 0.8 : 1,
          }}
          transition={{
            type: 'spring',
            damping: 15,
            stiffness: 200,
          }}
        >
          <TouchableOpacity
            style={[
              styles.container,
              !hasRedeemedFirstPerk && styles.containerDisabled
            ]}
            onPress={handlePress}
            activeOpacity={hasRedeemedFirstPerk ? 0.7 : 1}
            accessibilityRole="button"
            accessibilityLabel={hasRedeemedFirstPerk ? "Open AI Chat" : "AI Chat (Locked)"}
          >
            <View style={styles.iconContainer}>
              <Ionicons 
                name="chatbubble-ellipses" 
                size={20} 
                color={hasRedeemedFirstPerk ? "#007AFF" : "rgba(142, 142, 147, 0.8)"} 
              />
              {!hasRedeemedFirstPerk && (
                <View style={styles.lockOverlay}>
                  <Ionicons name="lock-closed" size={10} color="#8E8E93" />
                </View>
              )}
            </View>
            {showNotification && hasRedeemedFirstPerk && <View style={styles.notificationDot} />}
          </TouchableOpacity>
        </MotiView>
      </View>

      <Modal
        visible={isModalVisible}
        animationType="none"
        onRequestClose={handleClose}
        presentationStyle="fullScreen"
        transparent={false}
      >
        <MotiView
          from={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{
            type: 'spring',
            damping: 20,
            stiffness: 300,
            duration: 300,
          }}
          style={styles.modalContainer}
        >
          <SafeAreaView style={styles.modalContent}>
            {showChatContent ? (
              <AIChat onClose={handleClose} />
            ) : (
              <View style={styles.loadingContainer}>
                {/* Empty placeholder that matches the background */}
              </View>
            )}
          </SafeAreaView>
        </MotiView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  buttonWrapper: {
    position: 'relative',
    zIndex: 1,
  },
  container: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
  },
  containerDisabled: {
    backgroundColor: 'rgba(142, 142, 147, 0.12)',
  },
  iconContainer: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    flex: 1,
  },
  modalContent: {
    flex: 1,
    backgroundColor: '#F8FAFF',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#F8FAFF',
  },
  notificationDot: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 14,
    height: 14,
    borderRadius: 8,
    backgroundColor: 'red',
    borderWidth: 1.5,
    borderColor: '#F4F4F4',
  },
  lockOverlay: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.15,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  tooltip: {
    position: 'absolute',
    bottom: 52, // Position above the button
    right: 0,
    backgroundColor: 'rgba(250, 250, 250, 0.98)', // Lighter, more subtle background
    borderRadius: 12,
    padding: 12,
    width: 220,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  tooltipArrow: {
    position: 'absolute',
    bottom: -8,
    right: 16,
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: 'rgba(250, 250, 250, 0.98)', // Match tooltip background
  },
  tooltipText: {
    color: Colors.light.text, // Use system text color for better contrast
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
    textAlign: 'center',
  },
}); 