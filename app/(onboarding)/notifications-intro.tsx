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

// Sample notification data based on your SQL file
const sampleNotifications = [
  {
    id: '1',
    icon: '🍩',
    title: '🚨 LAST DAY for your Dunkin\' Credit',
    subtitle: 'Your monthly Dunkin\' credit is here to make your day sweeter. You literally can\'t say no.',
    amount: '$15',
    timeLeft: 'Today',
    type: 'urgent'
  },
  {
    id: '2', 
    icon: '🚗',
    title: 'Don\'t Forget Your Uber Credit!',
    subtitle: 'Fueling your boba cravings or a late-night snack run. Your Uber Cash is about to vanish.',
    amount: '$25',
    timeLeft: '3 days left',
    type: 'warning'
  },
  {
    id: '3',
    icon: '💳',
    title: 'Card Review Time',
    subtitle: 'Your Chase Sapphire annual fee of $95 is due in 3 months. You\'ve redeemed $180 in benefits (189% ROI)! 🎯',
    amount: '$95 fee',
    timeLeft: '90 days',
    type: 'info'
  },
  {
    id: '4',
    icon: '🎉',
    title: 'New Month, Fresh Benefits!',
    subtitle: 'Your monthly perks worth $150 have reset. Start the month right by planning how to use your benefits!',
    amount: '$150',
    timeLeft: 'Available now',
    type: 'success'
  },
  {
    id: '5',
    icon: '🍽️',
    title: 'Your Monthly Food Perk is Expiring',
    subtitle: 'Sushi, tacos, or boba? Your DoorDash restaurant credit is getting cold. Order something delicious tonight!',
    amount: '$30',
    timeLeft: '1 week left',
    type: 'warning'
  }
];

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
      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section */}
        <View style={styles.header}>
          <LinearGradient
            colors={['#667eea', '#764ba2']}
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

        {/* Sample Notifications Carousel */}
        <View style={styles.notificationsSection}>
          <ScrollView
            ref={scrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            contentContainerStyle={styles.notificationsContainer}
          >
            {sampleNotifications.map((notification, index) => (
              <View key={notification.id} style={styles.notificationSlide}>
                <NotificationCard 
                  notification={notification} 
                  isVisible={index === currentIndex}
                />
              </View>
            ))}
          </ScrollView>
          
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
            <Ionicons name="time-outline" size={24} color="#667eea" />
            <Text style={styles.valueText}>Perfect timing for each perk</Text>
          </View>
          <View style={styles.valueItem}>
            <Ionicons name="cash-outline" size={24} color="#667eea" />
            <Text style={styles.valueText}>Save $100s in unused benefits</Text>
          </View>
          <View style={styles.valueItem}>
            <Ionicons name="checkmark-circle-outline" size={24} color="#667eea" />
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
              colors={choice === 'enable' ? ['#4CAF50', '#45a049'] : ['#667eea', '#764ba2']}
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
      </ScrollView>
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
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
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
  notificationsContainer: {
    paddingHorizontal: 0,
  },
  notificationSlide: {
    width: screenWidth - 40,
    paddingHorizontal: 5,
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
    backgroundColor: '#667eea',
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