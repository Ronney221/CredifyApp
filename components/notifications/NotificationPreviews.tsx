// components/notifications/NotificationPreviews.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { NotificationPreferences } from '../../types/notification-types';
import { generateNotificationPreviews, NotificationPreview } from '../../utils/notification-preview';
import { schedulePerkExpiryNotifications } from '../../services/notification-perk-expiry';
import { scheduleCardRenewalNotifications, scheduleFirstOfMonthReminder, schedulePerkResetNotification } from '../../utils/notifications';

interface NotificationPreviewsProps {
  userId: string;
  preferences: NotificationPreferences;
}

const NotificationPreviewCard: React.FC<{ 
  preview: NotificationPreview; 
  onPress: (preview: NotificationPreview) => void; 
}> = ({ preview, onPress }) => {
  const getCategoryInfo = (category: string) => {
    switch (category) {
      case 'perk_expiry':
        return { color: '#FF6B35', bgColor: '#FF6B3515' };
      case 'renewal':
        return { color: '#007AFF', bgColor: '#007AFF15' };
      case 'first_of_month':
        return { color: '#34C759', bgColor: '#34C75915' };
      case 'perk_reset':
        return { color: '#AF52DE', bgColor: '#AF52DE15' };
      default:
        return { color: Colors.light.tint, bgColor: Colors.light.tint + '15' };
    }
  };

  const categoryInfo = getCategoryInfo(preview.category);

  return (
    <TouchableOpacity 
      style={[styles.previewCard, { borderLeftColor: categoryInfo.color }]}
      onPress={() => onPress(preview)}
      activeOpacity={0.7}
    >
      <View style={styles.previewHeader}>
        <View style={styles.previewTitleRow}>
          {/* Only show emoji separately if it's not already in the title */}
          {!preview.title.includes(preview.emoji) && (
            <Text style={styles.previewEmoji}>{preview.emoji}</Text>
          )}
          <Text style={[styles.previewTitle, preview.title.includes(preview.emoji) && styles.previewTitleWithEmoji]} numberOfLines={2}>
            {preview.title}
          </Text>
        </View>
        <View style={styles.timingContainer}>
          <View style={[styles.timingBadge, { backgroundColor: categoryInfo.bgColor }]}>
            <Text style={[styles.timingText, { color: categoryInfo.color }]}>
              {preview.timing}
            </Text>
          </View>
          {preview.scheduledDate && (
            <Text style={styles.scheduledDate}>
              {preview.scheduledDate.toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit'
              })}
            </Text>
          )}
        </View>
      </View>
      
      <Text style={styles.previewBody} numberOfLines={3}>
        {preview.body}
      </Text>
      
      {preview.value && (
        <View style={styles.valueContainer}>
          <Ionicons name="cash-outline" size={12} color={Colors.light.tint} />
          <Text style={styles.valueText}>${preview.value.toFixed(0)} value</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

export const NotificationPreviews: React.FC<NotificationPreviewsProps> = ({ 
  userId, 
  preferences 
}) => {
  const [previews, setPreviews] = useState<NotificationPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [testingNotifications, setTestingNotifications] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);
  const [selectedPreview, setSelectedPreview] = useState<NotificationPreview | null>(null);

  // Memoize preferences to prevent unnecessary re-renders
  const preferencesKey = useMemo(() => JSON.stringify(preferences), [preferences]);

  const loadPreviews = useCallback(async () => {
    if (!userId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const generatedPreviews = await generateNotificationPreviews(userId, preferences);
      setPreviews(generatedPreviews);
    } catch (err) {
      console.error('Error loading notification previews:', err);
      setError('Failed to load notification previews');
    } finally {
      setLoading(false);
    }
  }, [userId, preferencesKey]);

  useEffect(() => {
    loadPreviews();
  }, [loadPreviews]);

  const handleTestNotifications = useCallback(async () => {
    if (!userId || testingNotifications) return;

    setTestingNotifications(true);
    setShowTestModal(false);

    try {
      console.log('🔔 Starting test notifications...');

      // Test perk expiry notifications
      const perkExpiryPromises = [
        schedulePerkExpiryNotifications(userId, preferences, 1, true),
        schedulePerkExpiryNotifications(userId, preferences, 3, true),
        schedulePerkExpiryNotifications(userId, preferences, 6, true),
        schedulePerkExpiryNotifications(userId, preferences, 12, true),
      ];

      // Test other notifications
      const otherPromises = [
        scheduleCardRenewalNotifications(userId, preferences, true),
        scheduleFirstOfMonthReminder(userId, preferences, true),
        schedulePerkResetNotification(userId, preferences),
      ];

      const [perkExpiryResults, otherResults] = await Promise.all([
        Promise.all(perkExpiryPromises),
        Promise.all(otherPromises),
      ]);

      const totalScheduled = [
        ...perkExpiryResults.flat(),
        ...otherResults,
      ].filter(id => id !== null).length;

      Alert.alert(
        "🎉 Test Notifications Sent!",
        `Successfully scheduled ${totalScheduled} test notifications. You should receive them shortly.\n\n` +
        "These include perk expiry reminders, renewal notifications, and more based on your current settings.",
        [{ text: "Got it!" }]
      );
    } catch (error) {
      console.error('Error testing notifications:', error);
      Alert.alert(
        "❌ Error", 
        "Failed to schedule test notifications. Please try again.",
        [{ text: "OK" }]
      );
    } finally {
      setTestingNotifications(false);
    }
  }, [userId, preferences, testingNotifications]);

  const showTestConfirmation = useCallback(() => {
    setShowTestModal(true);
  }, []);

  const handlePreviewPress = useCallback((preview: NotificationPreview) => {
    setSelectedPreview(preview);
  }, []);

  const closePreviewModal = useCallback(() => {
    setSelectedPreview(null);
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={Colors.light.tint} />
        <Text style={styles.loadingText}>Loading notification previews...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={20} color={Colors.light.error} />
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (previews.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="notifications-off-outline" size={24} color={Colors.light.tertiaryLabel} />
        <Text style={styles.emptyTitle}>No Notifications to Preview</Text>
        <Text style={styles.emptySubtitle}>
          Enable notification categories above to see how we'll remind you about your perks.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="eye-outline" size={16} color={Colors.light.tint} />
          <Text style={styles.headerTitle}>Notification Previews</Text>
        </View>
        
        <TouchableOpacity 
          style={styles.testIconButton}
          onPress={showTestConfirmation}
          disabled={testingNotifications}
        >
          <Text style={styles.testIconEmoji}>
            {testingNotifications ? "⏳" : "🧪"}
          </Text>
        </TouchableOpacity>
      </View>
      
      <Text style={styles.headerSubtitle}>
        {previews.some(p => p.id.startsWith('example_')) 
          ? "Here are examples of the notifications you'll receive:" 
          : "Here's how we'll remind you about your perks based on your current settings:"
        }
      </Text>

      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        style={styles.scrollView}
      >
        {previews.map((preview) => (
          <NotificationPreviewCard 
            key={preview.id} 
            preview={preview} 
            onPress={handlePreviewPress}
          />
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          💡 Tip: {previews.some(p => p.id.startsWith('example_')) 
            ? "Add your credit cards to see personalized notification previews based on your actual perks."
            : "These are real examples based on your cards and current notification settings."
          }
        </Text>
      </View>
      
      {/* Test Notification Confirmation Modal */}
      <Modal
        visible={showTestModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowTestModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>🧪 Send Test Notifications</Text>
            </View>
            
            <Text style={styles.modalDescription}>
              This will send actual test notifications to your device based on your current notification settings and available perks.
            </Text>
            
            <Text style={styles.modalSubDescription}>
              You'll receive notifications for:
              • Perk expiry reminders
              • Card renewal notifications
              • First-of-month benefit resets
            </Text>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.modalCancelButton}
                onPress={() => setShowTestModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalConfirmButton, testingNotifications && styles.modalConfirmButtonDisabled]}
                onPress={handleTestNotifications}
                disabled={testingNotifications}
              >
                <Text style={[styles.modalConfirmText, testingNotifications && styles.modalConfirmTextDisabled]}>
                  {testingNotifications ? "Sending..." : "Send Tests"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      
      {/* Notification Preview Detail Modal */}
      <Modal
        visible={selectedPreview !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={closePreviewModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.previewModalContent}>
            {selectedPreview && (
              <>
                <View style={styles.previewModalHeader}>
                  <View style={styles.previewModalTitleRow}>
                    <Text style={styles.previewModalEmoji}>{selectedPreview.emoji}</Text>
                    <Text style={styles.previewModalTitle} numberOfLines={3}>
                      {selectedPreview.title}
                    </Text>
                  </View>
                  <TouchableOpacity 
                    style={styles.previewModalCloseButton}
                    onPress={closePreviewModal}
                  >
                    <Ionicons name="close" size={20} color={Colors.light.tertiaryLabel} />
                  </TouchableOpacity>
                </View>
                
                <View style={styles.previewModalBody}>
                  <Text style={styles.previewModalBodyText}>
                    {selectedPreview.body}
                  </Text>
                </View>
                
                <View style={styles.previewModalMeta}>
                  {selectedPreview.scheduledDate && (
                    <View style={styles.previewModalMetaRow}>
                      <Ionicons name="time-outline" size={16} color={Colors.light.tertiaryLabel} />
                      <Text style={styles.previewModalMetaText}>
                        Scheduled for {selectedPreview.scheduledDate.toLocaleDateString('en-US', { 
                          weekday: 'long',
                          month: 'long', 
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit'
                        })}
                      </Text>
                    </View>
                  )}
                  
                  {selectedPreview.value && (
                    <View style={styles.previewModalMetaRow}>
                      <Ionicons name="cash-outline" size={16} color={Colors.light.tertiaryLabel} />
                      <Text style={styles.previewModalMetaText}>
                        ${selectedPreview.value.toFixed(0)} value
                      </Text>
                    </View>
                  )}
                  
                  <View style={styles.previewModalMetaRow}>
                    <Ionicons name="tag-outline" size={16} color={Colors.light.tertiaryLabel} />
                    <Text style={styles.previewModalMetaText}>
                      {selectedPreview.category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} notification
                    </Text>
                  </View>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.light.text,
    marginLeft: 8,
    letterSpacing: -0.2,
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.light.secondaryLabel,
    marginBottom: 16,
    lineHeight: 20,
  },
  scrollView: {
    marginHorizontal: -16,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  previewCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 14,
    width: 280,
    borderLeftWidth: 3,
    marginRight: 12,
  },
  previewHeader: {
    marginBottom: 8,
  },
  previewTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  previewEmoji: {
    fontSize: 16,
    marginRight: 8,
    marginTop: 1,
  },
  previewTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.light.text,
    flex: 1,
    lineHeight: 20,
    letterSpacing: -0.1,
  },
  previewTitleWithEmoji: {
    marginLeft: 0, // Remove left margin when emoji is in title
  },
  timingBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  timingText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  previewBody: {
    fontSize: 14,
    color: Colors.light.secondaryLabel,
    lineHeight: 19,
    marginBottom: 8,
    letterSpacing: -0.1,
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  valueText: {
    fontSize: 12,
    color: Colors.light.tint,
    fontWeight: '500',
    marginLeft: 4,
  },
  footer: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.light.separator,
  },
  testIconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.light.tint + '10',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.light.tint + '20',
  },
  testIconEmoji: {
    fontSize: 16,
  },
  footerText: {
    fontSize: 13,
    color: Colors.light.tertiaryLabel,
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 18,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginVertical: 12,
  },
  loadingText: {
    fontSize: 14,
    color: Colors.light.secondaryLabel,
    marginLeft: 8,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginVertical: 12,
  },
  errorText: {
    fontSize: 14,
    color: Colors.light.error,
    marginLeft: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginVertical: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginTop: 8,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.light.secondaryLabel,
    textAlign: 'center',
    lineHeight: 20,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 340,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
    textAlign: 'center',
  },
  modalDescription: {
    fontSize: 15,
    color: Colors.light.secondaryLabel,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 12,
  },
  modalSubDescription: {
    fontSize: 14,
    color: Colors.light.tertiaryLabel,
    lineHeight: 20,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: Colors.light.secondarySystemGroupedBackground,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
  },
  modalConfirmButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: Colors.light.tint,
    alignItems: 'center',
  },
  modalConfirmButtonDisabled: {
    opacity: 0.6,
  },
  modalConfirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  modalConfirmTextDisabled: {
    color: '#ffffff80',
  },
  // Preview detail modal styles
  previewModalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 380,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  previewModalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  previewModalTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    marginRight: 12,
  },
  previewModalEmoji: {
    fontSize: 24,
    marginRight: 12,
    marginTop: 2,
  },
  previewModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
    flex: 1,
    lineHeight: 24,
    letterSpacing: -0.2,
  },
  previewModalCloseButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.light.secondarySystemGroupedBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewModalBody: {
    marginBottom: 20,
  },
  previewModalBodyText: {
    fontSize: 16,
    color: Colors.light.secondaryLabel,
    lineHeight: 24,
    letterSpacing: -0.1,
  },
  previewModalMeta: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.light.separator,
    paddingTop: 16,
    gap: 12,
  },
  previewModalMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  previewModalMetaText: {
    fontSize: 14,
    color: Colors.light.tertiaryLabel,
    marginLeft: 8,
    flex: 1,
  },
});