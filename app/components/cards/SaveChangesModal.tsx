import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import { Card } from '../../../src/data/card-data';

interface SaveChangesModalProps {
  visible: boolean;
  onSave: () => void;
  onDiscard: () => void;
  isSaving: boolean;
  deletedCard?: { card: Card; renewalDate?: Date } | null;
  hasOtherChanges: boolean;
}

export const SaveChangesModal: React.FC<SaveChangesModalProps> = ({
  visible,
  onSave,
  onDiscard,
  isSaving,
  deletedCard,
  hasOtherChanges,
}) => {
  return (
    <Modal
      animationType="none"
      transparent={true}
      visible={visible}
      onRequestClose={onDiscard}
    >
      <View style={styles.modalOverlay}>
        <MotiView
          style={styles.modalSlideContainer}
          animate={{
            translateY: visible ? 0 : 300,
          }}
          transition={{
            type: 'timing',
            duration: 300,
          }}
        >
          <SafeAreaView style={styles.modalContainer} edges={['bottom']}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Ionicons name="warning-outline" size={24} color="#FF9500" />
                <Text style={styles.modalTitle}>Save Changes?</Text>
              </View>
              
              <Text style={styles.modalDescription}>
                {deletedCard && hasOtherChanges
                  ? `You removed "${deletedCard.card.name}" and made other changes to your card collection.`
                  : deletedCard
                  ? `You removed "${deletedCard.card.name}" from your collection.`
                  : "You've made changes to your card collection."
                }
              </Text>
              
              <View style={styles.buttonContainer}>
                <TouchableOpacity 
                  style={styles.discardButton}
                  onPress={onDiscard}
                  disabled={isSaving}
                >
                  <Text style={styles.discardButtonText}>
                    Discard Changes
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
                  onPress={onSave}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <ActivityIndicator color="#ffffff" size="small" />
                  ) : (
                    <Text style={styles.saveButtonText}>
                      Save Changes
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </SafeAreaView>
        </MotiView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalSlideContainer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  modalContainer: {
    backgroundColor: 'transparent',
  },
  modalContent: {
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
    marginLeft: 12,
  },
  modalDescription: {
    fontSize: 16,
    color: '#666666',
    lineHeight: 22,
    marginBottom: 24,
  },
  buttonContainer: {
    gap: 12,
  },
  discardButton: {
    backgroundColor: '#f2f2f7',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  discardButtonText: {
    fontSize: 16,
    color: '#ff3b30',
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#007aff',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#d3d3d3',
  },
  saveButtonText: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '600',
  },
}); 