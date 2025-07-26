import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Platform,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../constants/Colors';
import { useOnboardingContext } from './_context/OnboardingContext';
import { getNotificationPermissions } from '../../utils/notifications';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Sample notification data with real perk values from benefit_definitions_rows.sql
const sampleNotifications = [
  {
    id: '1',
    icon: '🍩',
    title: '🚨 LAST DAY for your Dunkin\' Credit',
    subtitle: 'Your monthly Dunkin\' credit is here to make your day sweeter. You literally can\'t say no.',
    amount: '$7',
    timeLeft: 'Today',
    type: 'urgent'
  },
  {
    id: '2', 
    icon: '🚗',
    title: 'Don\'t Forget Your Uber Credit!',
    subtitle: 'Fueling your boba cravings or a late-night snack run. Your Uber Cash is about to vanish.',
    amount: '$15',
    timeLeft: '3 days left',
    type: 'warning'
  },
  {
    id: '3',
    icon: '💳',
    title: 'Card Review Time',
    subtitle: 'Your Chase Sapphire annual fee of $95 is due in 3 months. You\'ve redeemed $325 in benefits (342% ROI)! 🎯',
    amount: '$95 fee',
    timeLeft: '90 days',
    type: 'info'
  },
  {
    id: '4',
    icon: '🎉',
    title: 'New Month, Fresh Benefits!',
    subtitle: 'Your monthly perks worth $189 have reset. Start the month right by planning how to use your benefits!',
    amount: '$189',
    timeLeft: 'Available now',
    type: 'success'
  },
  {
    id: '5',
    icon: '🍽️',
    title: 'Your Grubhub Credit is Expiring',
    subtitle: 'Sushi, tacos, or boba? Your $10 Grubhub credit is getting cold. Order something delicious tonight!',
    amount: '$10',
    timeLeft: '1 week left',
    type: 'warning'
  },
  {
    id: '6',
    icon: '✈️',
    title: 'CLEAR Plus Renewal Due',
    subtitle: 'Your $189 CLEAR credit covers the full membership. Skip the security lines all year - renew today!',
    amount: '$189',
    timeLeft: '2 weeks',
    type: 'info'
  }
].sort(() => Math.random() - 0.5); // Randomize order each time

const NotificationCard = ({ notification, isVisible }: { notification: any, isVisible: boolean }) => {
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'urgent': return '#FF3B30';
      case 'warning': return '#FF9500';
      case 'success': return '#34C759';
      default: return '#007AFF';
    }
  };

  const getBackgroundColor = (type: string) => {
    switch (type) {
      case 'urgent': return '#FFF5F5';
      case 'warning': return '#FFF8F0';
      case 'success': return '#F0FFF4';
      default: return '#F0F8FF';
    }
  };

  return (
    <View 
      style={[
        styles.notificationCard,
        { 
          backgroundColor: getBackgroundColor(notification.type),
          opacity: isVisible ? 1 : 0.3,
          transform: [{ scale: isVisible ? 1 : 0.95 }]
        }
      ]}
    >
      <View style={styles.notificationHeader}>
        <View style={styles.iconContainer}>
          <Text style={styles.notificationIcon}>{notification.icon}</Text>
        </View>
        <View style={styles.notificationContent}>
          <Text style={[styles.notificationTitle, { color: getTypeColor(notification.type) }]}>
            {notification.title}
          </Text>
          <Text style={styles.notificationTime}>{notification.timeLeft}</Text>
        </View>
        <View style={styles.amountContainer}>
          <Text style={[styles.notificationAmount, { color: getTypeColor(notification.type) }]}>
            {notification.amount}
          </Text>
        </View>
      </View>
      <Text style={styles.notificationSubtitle}>{notification.subtitle}</Text>
    </View>
  );
};

export default function NotificationsIntro() {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [choice, setChoice] = useState<'enable' | 'later' | null>(null);
  const { setNotificationChoice } = useOnboardingContext();

  // Auto-scroll through notifications
  React.useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % sampleNotifications.length);
    }, 3000); // Change every 3 seconds

    return () => clearInterval(interval);
  }, []);

  const handleScroll = (event: any) => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollPosition / (screenWidth - 40));
    setCurrentIndex(index);
  };

  const handleChoice = async (choiceType: 'enable' | 'later') => {
    if (Platform.OS === 'ios') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    
    setChoice(choiceType);
    
    try {
      if (choiceType === 'enable') {
        // Request permissions immediately and store the result
        const granted = await getNotificationPermissions();
        await setNotificationChoice(granted ? 'enable' : 'declined');
      } else {
        // User chose "later" - store this choice
        await setNotificationChoice('later');
      }
    } catch (error) {
      console.error('Error handling notification choice:', error);
      await setNotificationChoice('declined');
    }
    
    setTimeout(() => {
      router.push('/(onboarding)/register');
    }, 300);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header Section */}
        <View style={styles.header}>
          <LinearGradient
            colors={['#007AFF', '#0051D5']}
            style={styles.iconBackground}
          >
            <Ionicons name="notifications" size={32} color="#FFFFFF" />
          </LinearGradient>
          
          <Text style={styles.title}>Never Miss Your Benefits</Text>
          <Text style={styles.subtitle}>
            Get personalized reminders so you never lose money on unused perks. 
            See what your notifications would look like:
          </Text>
        </View>

        {/* Single Notification Display with Auto-Change */}
        <View style={styles.notificationsSection}>
          <View style={styles.notificationContainer}>
            <NotificationCard 
              notification={sampleNotifications[currentIndex]} 
              isVisible={true}
            />
          </View>
          
          {/* Pagination Dots */}
          <View style={styles.pagination}>
            {sampleNotifications.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.paginationDot,
                  index === currentIndex && styles.paginationDotActive
                ]}
              />
            ))}
          </View>
        </View>

        {/* Value Proposition */}
        <View style={styles.valueSection}>
          <View style={styles.valueItem}>
            <Ionicons name="time-outline" size={24} color="#007AFF" />
            <Text style={styles.valueText}>Perfect timing for each perk</Text>
          </View>
          <View style={styles.valueItem}>
            <Ionicons name="cash-outline" size={24} color="#007AFF" />
            <Text style={styles.valueText}>Save $100s in unused benefits</Text>
          </View>
          <View style={styles.valueItem}>
            <Ionicons name="checkmark-circle-outline" size={24} color="#007AFF" />
            <Text style={styles.valueText}>Smart, non-spammy reminders</Text>
          </View>
        </View>

        {/* Choice Buttons */}
        <View style={styles.choiceSection}>
          <TouchableOpacity
            style={[
              styles.primaryButton,
              choice === 'enable' && styles.primaryButtonPressed
            ]}
            onPress={() => handleChoice('enable')}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={choice === 'enable' ? ['#34C759', '#28A745'] : ['#007AFF', '#0051D5']}
              style={styles.buttonGradient}
            >
              <Ionicons name="notifications" size={20} color="#FFFFFF" style={styles.buttonIcon} />
              <Text style={styles.primaryButtonText}>Enable Smart Reminders</Text>
            </LinearGradient>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.secondaryButton,
              choice === 'later' && styles.secondaryButtonPressed
            ]}
            onPress={() => handleChoice('later')}
            activeOpacity={0.8}
          >
            <Text style={styles.secondaryButtonText}>Maybe Later</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFE',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 40,
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
    paddingTop: 20,
  },
  iconBackground: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1C1C1E',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 10,
  },
  notificationsSection: {
    marginBottom: 32,
  },
  notificationContainer: {
    paddingHorizontal: 0,
    marginBottom: 20,
  },
  notificationCard: {
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 5,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationIcon: {
    fontSize: 20,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  notificationTime: {
    fontSize: 12,
    color: '#666666',
  },
  amountContainer: {
    alignItems: 'flex-end',
  },
  notificationAmount: {
    fontSize: 16,
    fontWeight: '700',
  },
  notificationSubtitle: {
    fontSize: 14,
    color: '#333333',
    lineHeight: 20,
    marginLeft: 52,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D1D1D6',
    marginHorizontal: 4,
  },
  paginationDotActive: {
    backgroundColor: '#007AFF',
    width: 20,
  },
  valueSection: {
    marginBottom: 32,
  },
  valueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  valueText: {
    fontSize: 16,
    color: '#333333',
    marginLeft: 12,
    fontWeight: '500',
  },
  choiceSection: {
    gap: 16,
  },
  primaryButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  primaryButtonPressed: {
    transform: [{ scale: 0.98 }],
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  buttonIcon: {
    marginRight: 8,
  },
  primaryButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  secondaryButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#D1D1D6',
  },
  secondaryButtonPressed: {
    backgroundColor: '#F2F2F7',
    transform: [{ scale: 0.98 }],
  },
  secondaryButtonText: {
    fontSize: 17,
    fontWeight: '500',
    color: '#666666',
    textAlign: 'center',
  },
});