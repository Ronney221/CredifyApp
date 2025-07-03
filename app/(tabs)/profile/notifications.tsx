//app/(tabs)/profile/notifications.tsx
import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  UIManager
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter, useFocusEffect } from 'expo-router';
import { useNotificationPreferences } from '../../../components/cards/hooks/useNotificationPreferences';
import { useCardManagement } from '../../../components/cards/hooks/useCardManagement';
import { useAuth } from '../../../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../constants/Colors';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface NotificationSectionProps {
  item: {
    key: string;
    href: string;
    iconName: any;
    title: string;
    subtitle: string;
    iconColor: string;
    dimmed?: boolean;
  };
  isLastItem: boolean;
}

const NotificationSection: React.FC<NotificationSectionProps> = ({ item, isLastItem }) => {
  const router = useRouter();
  
  return (
    <View style={[styles.section, isLastItem && styles.noBorder]}>
      <TouchableOpacity 
        activeOpacity={0.8} 
        onPress={() => router.push(item.href as any)}
        disabled={item.dimmed}
        style={[styles.sectionHeader, item.dimmed && styles.dimmed]}
      >
        <View style={[styles.iconContainer, { backgroundColor: item.iconColor }]}>
          <Ionicons name={item.iconName} size={20} color="#ffffff" />
        </View>
        <View style={styles.sectionHeaderText}>
          <Text style={styles.sectionTitle}>{item.title}</Text>
          {item.subtitle && <Text style={styles.sectionDetails}>{item.subtitle}</Text>}
        </View>
        <Ionicons name="chevron-forward" size={22} color="#c7c7cc" />
      </TouchableOpacity>
    </View>
  );
};

export default function NotificationSettingsScreen() {
  const { user } = useAuth();
  const { anyRenewalDateSet, loadExistingCards } = useCardManagement(user?.id);
  // TODO: Once useNotificationPreferences is updated, use it to get dynamic subtitles
  // const { preferences } = useNotificationPreferences();

  useFocusEffect(
    useCallback(() => {
      if (user?.id) {
        loadExistingCards();
      }
    }, [user?.id])
  );
  
  const getPerkExpirySubtitle = () => {
    // Placeholder subtitle
    return `Active: Monthly, Annual`;
  };

  const getCardRenewalSubtitle = () => {
    if (!anyRenewalDateSet) return 'Add a card with a renewal date';
    // Placeholder subtitle
    return `Notify at 90, 30, 7, and 1 day before`;
  };

  const notificationItems = [
    {
      key: 'perk_expiry',
      title: 'Perk Expiry Reminders',
      subtitle: getPerkExpirySubtitle(),
      iconName: 'sparkles-outline' as const,
      iconColor: '#ff9500',
      href: '/(tabs)/profile/reminders/perk-expiry',
      dimmed: false,
    },
    {
      key: 'card_renewal',
      title: 'Card Renewal Reminders',
      subtitle: getCardRenewalSubtitle(),
      iconName: 'card-outline' as const,
      iconColor: '#34c759',
      href: '/(tabs)/profile/reminders/card-renewal',
      dimmed: !anyRenewalDateSet,
    },
    {
      key: 'first_of_month',
      title: 'First of Month Reminders',
      subtitle: 'On', // Placeholder
      iconName: 'calendar-outline' as const,
      iconColor: '#5856d6',
      href: '/(tabs)/profile/reminders/first-of-month',
      dimmed: false,
    },
  ];

  return (
    <>
      <Stack.Screen options={{ title: 'Notification Preferences', headerShown: true }} />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <View style={styles.sectionContainer}>
            {notificationItems.map((item, index) => (
              <NotificationSection
                key={item.key}
                item={item}
                isLastItem={index === notificationItems.length - 1}
              />
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f2f2f7' 
  },
  scrollView: { 
    flex: 1 
  },
  scrollContent: { 
    padding: 20, 
    paddingBottom: 40 
  },
  sectionContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  section: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e5ea',
  },
  noBorder: { 
    borderBottomWidth: 0 
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  dimmed: { 
    opacity: 0.5 
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  sectionHeaderText: { 
    flex: 1 
  },
  sectionTitle: { 
    fontSize: 17, 
    fontWeight: '600', 
    color: '#000000',
    letterSpacing: -0.2,
  },
  sectionDetails: { 
    fontSize: 13, 
    color: '#6e6e73', 
    marginTop: 2,
    letterSpacing: -0.1,
  },
  childTogglesContainer: { 
    paddingLeft: 64, 
    backgroundColor: '#ffffff', 
    borderTopWidth: StyleSheet.hairlineWidth, 
    borderTopColor: '#e5e5ea' 
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e5ea',
  },
  toggleLabel: { 
    fontSize: 16, 
    color: '#000000',
    letterSpacing: -0.2,
  },
  previewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f2f2f7',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e0e0e0',
  },
  previewText: {
    fontSize: 13,
    color: '#6e6e73',
    fontStyle: 'italic',
    letterSpacing: -0.1,
    flex: 1,
  },
  testButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  testButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  testButtonContent: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  testButtonTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.light.tint,
    marginBottom: 2,
    letterSpacing: -0.2,
  },
  testButtonSubtitle: {
    fontSize: 13,
    color: '#6e6e73',
    letterSpacing: -0.1,
  },
  disabledButton: {
    opacity: 0.5,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    width: '80%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  modalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e5ea',
  },
  modalOptionText: {
    fontSize: 17,
    letterSpacing: -0.2,
  }
}); 