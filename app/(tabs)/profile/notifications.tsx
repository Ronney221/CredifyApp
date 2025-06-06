import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  UIManager,
  LayoutAnimation,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { useNotificationPreferences } from '../../components/cards/hooks/useNotificationPreferences';
import { useCardManagement } from '../../components/cards/hooks/useCardManagement';
import { useAuth } from '../../../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../constants/Colors';

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
  };
  isLastItem: boolean;
}

const NotificationSection: React.FC<NotificationSectionProps> = ({ item, isLastItem }) => {
  const router = useRouter();
  
  const masterToggle = item.toggles?.find(t => t.isMaster);
  const childToggles = item.toggles?.filter(t => !t.isMaster);

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
        disabled={!item.onToggleExpand}
        style={[styles.sectionHeader, item.dimmed && styles.dimmed]}
      >
        <View style={[styles.iconContainer, { backgroundColor: item.iconColor }]}>
          <Ionicons name={item.iconName} size={20} color="#ffffff" />
        </View>
        <View style={styles.sectionHeaderText}>
          <Text style={styles.sectionTitle}>{item.title}</Text>
          {item.details && <Text style={styles.sectionDetails}>{item.details.join(', ')}</Text>}
        </View>
        {item.onToggleExpand && (
          <Ionicons name={item.isExpanded ? "chevron-up-outline" : "chevron-down-outline"} size={22} color="#c7c7cc" />
        )}
        {!item.onToggleExpand && masterToggle && (
            <Switch
              value={masterToggle.value}
              onValueChange={masterToggle.onValueChange}
              trackColor={{ false: '#767577', true: Colors.light.tint }}
              thumbColor={'#ffffff'}
              ios_backgroundColor="#3e3e3e"
            />
        )}
      </TouchableOpacity>

      {item.isExpanded && childToggles && childToggles.length > 0 && (
        <View style={styles.childTogglesContainer}>
          {childToggles.map((toggle, index) => (
            <View key={index} style={[styles.toggleRow, index === childToggles.length - 1 && styles.noBorder]}>
              <Text style={styles.toggleLabel}>{toggle.label}</Text>
              <Switch
                value={toggle.value}
                onValueChange={toggle.onValueChange}
                disabled={toggle.disabled}
                trackColor={{ false: '#767577', true: Colors.light.tint }}
                thumbColor={toggle.disabled ? '#f4f3f4' : '#ffffff'}
                ios_backgroundColor="#3e3e3e"
              />
            </View>
          ))}
        </View>
      )}
       {item.isExpanded && masterToggle && (
         <View style={styles.masterToggleContainer}>
            <View style={[styles.toggleRow, styles.noBorder]}>
              <Text style={styles.toggleLabel}>{masterToggle.label}</Text>
              <Switch
                value={masterToggle.value}
                onValueChange={masterToggle.onValueChange}
                trackColor={{ false: '#767577', true: Colors.light.tint }}
                thumbColor={'#ffffff'}
                ios_backgroundColor="#3e3e3e"
              />
            </View>
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
  const { anyRenewalDateSet } = useCardManagement(user?.id);
  const { buildNotificationItems, sendTestNotification } = useNotificationPreferences();
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
           <TouchableOpacity 
              onPress={() => user?.id && sendTestNotification(user.id)} 
              style={[styles.testButton, !user?.id && styles.disabledButton]}
              disabled={!user?.id}
            >
              <Ionicons name="paper-plane-outline" size={20} color={!user?.id ? '#c7c7cc' : Colors.light.tint} />
              <Text style={[styles.testButtonText, !user?.id && styles.disabledButtonText]}>Test Perk Reminders</Text>
            </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f2f2f7' },
  scrollView: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  sectionContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 20,
  },
  section: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#c7c7cc',
  },
  noBorder: { borderBottomWidth: 0 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  dimmed: { opacity: 0.5 },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  sectionHeaderText: { flex: 1 },
  sectionTitle: { fontSize: 17, fontWeight: '600', color: '#000000' },
  sectionDetails: { fontSize: 13, color: '#6e6e73', marginTop: 2 },
  childTogglesContainer: { paddingLeft: 64, backgroundColor: '#ffffff', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#e8e8e8' },
  masterToggleContainer: { paddingLeft: 16 },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e8e8e8',
  },
  toggleLabel: { fontSize: 16, color: '#000000' },
  previewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e0e0e0',
  },
  previewText: {
    fontSize: 13,
    color: '#6e6e73',
    fontStyle: 'italic',
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginTop: 20,
  },
  testButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.tint,
    marginLeft: 8,
  },
  disabledButton: {
    backgroundColor: '#f0f0f0',
  },
  disabledButtonText: {
    color: '#c7c7cc',
  },
}); 