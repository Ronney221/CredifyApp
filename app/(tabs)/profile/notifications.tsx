//app/(tabs)/profile/notifications.tsx
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  UIManager,
  LayoutAnimation,
  Platform,
  Modal,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter, useFocusEffect } from 'expo-router';
import { useNotificationPreferences } from '../../../components/cards/hooks/useNotificationPreferences';
import { useCardManagement } from '../../../components/cards/hooks/useCardManagement';
import { useAuth } from '../../../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../constants/Colors';
import { BlurView } from 'expo-blur';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface NotificationSectionProps {
  item: {
    key: string;
    isExpanded?: boolean;
    onToggleExpand?: () => void;
    iconName: any;
    title: string;
    details?: string[];
    toggles?: any[];
    iconColor: string;
    dimmed?: boolean;
    renewalOptions?: {
      current: number;
      setter: (value: number) => void;
      options: { label: string; value: number }[];
    };
  };
  isLastItem: boolean;
}

interface RenewalModalProps {
  visible: boolean;
  onClose: () => void;
  options: { label: string; value: number }[];
  onSelect: (value: number) => void;
  currentValue: number;
}

const RenewalOptionModal: React.FC<RenewalModalProps> = ({ visible, onClose, options, onSelect, currentValue }) => {
  return (
    <Modal
      transparent={true}
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={onClose}>
        <View style={styles.modalContent}>
          {options.map((option, index) => (
            <TouchableOpacity 
              key={index} 
              style={[
                styles.modalOption, 
                index === options.length - 1 && styles.noBorder
              ]} 
              onPress={() => {
                onSelect(option.value);
                onClose();
              }}
            >
              <Text style={styles.modalOptionText}>{option.label}</Text>
              {currentValue === option.value && <Ionicons name="checkmark" size={20} color={Colors.light.tint} />}
            </TouchableOpacity>
          ))}
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const NotificationSection: React.FC<NotificationSectionProps> = ({ item, isLastItem }) => {
  const router = useRouter();
  const [isRenewalModalVisible, setRenewalModalVisible] = useState(false);
  
  const toggle = item.toggles?.[0];
  const isPerkExpirySection = item.key === 'perk_expiry';

  const handleToggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (item.onToggleExpand) {
      item.onToggleExpand();
    }
  };

  return (
    <View style={[styles.section, isLastItem && styles.noBorder]}>
      <TouchableOpacity 
        activeOpacity={0.8} 
        onPress={handleToggle} 
        disabled={!item.onToggleExpand || item.dimmed}
        style={[styles.sectionHeader, item.dimmed && styles.dimmed]}
      >
        <View style={[styles.iconContainer, { backgroundColor: item.iconColor }]}>
          <Ionicons name={item.iconName} size={20} color="#ffffff" />
        </View>
        <View style={styles.sectionHeaderText}>
          <Text style={styles.sectionTitle}>{item.title}</Text>
          {item.details && <Text style={styles.sectionDetails}>{item.details.join(', ')}</Text>}
        </View>
        {isPerkExpirySection ? (
          <Ionicons name="chevron-forward" size={22} color="#c7c7cc" />
        ) : (
          toggle && (
            <Switch
              value={toggle.value}
              onValueChange={toggle.onValueChange}
              disabled={item.dimmed}
              trackColor={{ false: '#e9e9ea', true: Colors.light.tint }}
              thumbColor={'#ffffff'}
              ios_backgroundColor="#e9e9ea"
            />
          )
        )}
      </TouchableOpacity>

      {item.isExpanded && isPerkExpirySection && item.toggles && (
        <View style={styles.childTogglesContainer}>
          {item.toggles.map((toggle, index) => (
            <View key={index} style={[styles.toggleRow, index === item.toggles!.length - 1 && styles.noBorder]}>
              <Text style={styles.toggleLabel}>{toggle.label}</Text>
              <Switch
                value={toggle.value}
                onValueChange={toggle.onValueChange}
                disabled={toggle.disabled}
                trackColor={{ false: '#e9e9ea', true: Colors.light.tint }}
                thumbColor={'#ffffff'}
                ios_backgroundColor="#e9e9ea"
              />
            </View>
          ))}
        </View>
      )}

      {item.isExpanded && !isPerkExpirySection && item.toggles && item.toggles.length > 1 && (
        <View style={styles.childTogglesContainer}>
          {item.toggles.slice(1).map((toggle, index) => (
            <View key={index} style={[styles.toggleRow, index === item.toggles!.length - 2 && styles.noBorder]}>
              <Text style={styles.toggleLabel}>{toggle.label}</Text>
              <Switch
                value={toggle.value}
                onValueChange={toggle.onValueChange}
                disabled={toggle.disabled}
                trackColor={{ false: '#e9e9ea', true: Colors.light.tint }}
                thumbColor={'#ffffff'}
                ios_backgroundColor="#e9e9ea"
              />
            </View>
          ))}
        </View>
      )}

      {item.isExpanded && (
        <View style={styles.previewContainer}>
          <Ionicons name="notifications-outline" size={16} color="#6e6e73" style={{ marginRight: 8 }} />
          <Text style={styles.previewText}>
            {item.details ? item.details.join(', ') : 'Notification preview will appear here.'}
          </Text>
        </View>
      )}
    </View>
  );
};

export default function NotificationSettingsScreen() {
  const { user } = useAuth();
  const { anyRenewalDateSet, loadExistingCards } = useCardManagement(user?.id);
  const { buildNotificationItems } = useNotificationPreferences();

  useFocusEffect(
    useCallback(() => {
      if (user?.id) {
        console.log('[NotificationsScreen] Focussed, reloading card data.');
        loadExistingCards();
      }
    }, [user?.id])
  );
  
  const notificationItems = buildNotificationItems(anyRenewalDateSet);

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