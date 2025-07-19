//welcome-back-snackbar.tsx
import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { CardPerk } from '../../src/data/card-data';

interface WelcomeBackSnackbarProps {
  visible: boolean;
  perk: CardPerk | null;
  onLogUsage: () => void;
  onDismiss: () => void;
  autoHideDuration?: number; // Duration in ms before auto-hide (default: 8000)
}

const { width: screenWidth } = Dimensions.get('window');

export default function WelcomeBackSnackbar({
  visible,
  perk,
  onLogUsage,
  onDismiss,
  autoHideDuration = 8000,
}: WelcomeBackSnackbarProps) {
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(100);
  const opacity = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
      opacity: opacity.value,
    };
  });

  const hideSnackbar = useCallback(() => {
    translateY.value = withTiming(100, { duration: 300 });
    opacity.value = withTiming(0, { duration: 300 }, isFinished => {
      if (isFinished) {
        runOnJS(onDismiss)();
      }
    });
  }, [onDismiss, translateY, opacity]);

  const handleLogUsage = useCallback(() => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    hideSnackbar();
    // Small delay to ensure snackbar animation completes before showing modal
    setTimeout(() => {
      onLogUsage();
    }, 100);
  }, [hideSnackbar, onLogUsage]);

  const handleDismiss = useCallback(() => {
    if (Platform.OS === 'ios') {
      Haptics.selectionAsync();
    }
    hideSnackbar();
  }, [hideSnackbar]);

  useEffect(() => {
    if (visible && perk) {
      // Show animation
      translateY.value = withSpring(0, {
        damping: 20,
        stiffness: 300,
      });
      opacity.value = withTiming(1, {
        duration: 300,
        easing: Easing.out(Easing.quad),
      });

      // Auto-hide after specified duration
      const autoHideTimeout = setTimeout(() => {
        hideSnackbar();
      }, autoHideDuration);

      return () => {
        clearTimeout(autoHideTimeout);
      };
    } else {
      // Hide immediately if not visible
      translateY.value = 100;
      opacity.value = 0;
    }
  }, [visible, perk, autoHideDuration, hideSnackbar]);

  if (!visible || !perk) {
    return null;
  }

  // Get app name for the message
  const getAppName = (perk: CardPerk): string => {
    if (perk.appScheme) {
      switch (perk.appScheme) {
        case 'dunkin': return 'Dunkin\'';
        case 'resy': return 'Resy';
        case 'uber': return 'Uber';
        case 'uberEats': return 'Uber Eats';
        case 'doordash': return 'DoorDash';
        case 'grubhub': return 'Grubhub';
        case 'disneyPlus': return 'Disney+';
        case 'hulu': return 'Hulu';
        case 'espn': return 'ESPN';
        case 'peacock': return 'Peacock';
        case 'nytimes': return 'NY Times';
        case 'instacart': return 'Instacart';
        case 'walmart': return 'Walmart';
        case 'capitalOne': return 'Capital One';
        case 'lyft': return 'Lyft';
        case 'saks': return 'Saks';
        case 'equinox': return 'Equinox';
        case 'soulcycle': return 'SoulCycle';
        case 'shoprunner': return 'ShopRunner';
        case 'wegmans': return 'Wegmans';
        default: return perk.appScheme.charAt(0).toUpperCase() + perk.appScheme.slice(1);
      }
    }
    return 'the app';
  };

  const appName = getAppName(perk);

  return (
    <Animated.View 
      style={[
        styles.container,
        { bottom: insets.bottom + 50 }, // Position higher above tab bar
        animatedStyle
      ]}
    >
      <View style={styles.content}>
        {/* Icon */}
        <View style={styles.iconContainer}>
          <Ionicons name="return-down-back-outline" size={20} color="#007AFF" />
        </View>

        {/* Message */}
        <View style={styles.messageContainer}>
          <Text style={styles.message}>
            Welcome back from {appName}! Ready to log your credit?
          </Text>
        </View>

        {/* Actions */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity 
            style={styles.logButton} 
            onPress={handleLogUsage}
            activeOpacity={0.8}
          >
            <Text style={styles.logButtonText}>Log Usage</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.dismissButton} 
            onPress={handleDismiss}
            activeOpacity={0.8}
          >
            <Ionicons name="close" size={20} color="#8E8E93" />
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 9999, // Ensure it appears above tab navigation
  },
  content: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  iconContainer: {
    marginRight: 12,
  },
  messageContainer: {
    flex: 1,
    marginRight: 12,
  },
  message: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1C1C1E',
    lineHeight: 20,
    letterSpacing: -0.24,
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  logButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: -0.24,
  },
  dismissButton: {
    padding: 8,
  },
});