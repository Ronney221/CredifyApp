import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useSmartNotificationPrompts } from '../../hooks/useSmartNotificationPrompts';

interface NotificationPromptBannerProps {
  totalSavings?: number;
  context?: 'profile' | 'savings' | 'insights';
  onDismiss?: () => void;
}

export default function NotificationPromptBanner({ 
  totalSavings = 0, 
  context = 'profile',
  onDismiss 
}: NotificationPromptBannerProps) {
  const { shouldShowPromptNow, promptAfterViewingSavings, notificationChoice } = useSmartNotificationPrompts();
  const [isVisible, setIsVisible] = useState(true);
  const [fadeAnim] = useState(new Animated.Value(1));

  // Don't show if notifications are already enabled or if we shouldn't prompt
  if (notificationChoice === 'enable' || !shouldShowPromptNow() || !isVisible) {
    return null;
  }

  const handleEnableNotifications = async () => {
    if (Platform.OS === 'ios') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    
    await promptAfterViewingSavings(totalSavings);
  };

  const handleDismiss = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setIsVisible(false);
      onDismiss?.();
    });
  };

  const getBannerContent = () => {
    switch (context) {
      case 'savings':
      case 'insights':
        return {
          icon: '💰',
          title: `You've saved $${Math.floor(totalSavings)}!`,
          subtitle: 'Enable reminders to maximize your remaining perks'
        };
      default:
        return {
          icon: '🔔',
          title: 'Missing out on savings?',
          subtitle: 'Get smart reminders for your unused perks'
        };
    }
  };

  const content = getBannerContent();

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.content}>
          <View style={styles.leftContent}>
            <View style={styles.iconContainer}>
              <Text style={styles.icon}>{content.icon}</Text>
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.title}>{content.title}</Text>
              <Text style={styles.subtitle}>{content.subtitle}</Text>
            </View>
          </View>
          
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.enableButton}
              onPress={handleEnableNotifications}
              activeOpacity={0.8}
            >
              <Ionicons name="notifications" size={16} color="#667eea" />
              <Text style={styles.enableButtonText}>Enable</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.dismissButton}
              onPress={handleDismiss}
              activeOpacity={0.8}
            >
              <Ionicons name="close" size={18} color="rgba(255, 255, 255, 0.7)" />
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  gradient: {
    flex: 1,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  leftContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  icon: {
    fontSize: 20,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 18,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  enableButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 4,
  },
  enableButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#667eea',
  },
  dismissButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});