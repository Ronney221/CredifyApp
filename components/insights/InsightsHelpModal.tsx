import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';

interface InsightsHelpModalProps {
  isVisible: boolean;
  onClose: () => void;
}

const InsightsHelpModal: React.FC<InsightsHelpModalProps> = ({ isVisible, onClose }) => {
  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={isVisible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <BlurView intensity={90} tint="light" style={StyleSheet.absoluteFill} />
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>How Insights Work</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={Colors.light.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Overall Return on Investment (ROI)</Text>
              <Text style={styles.sectionText}>
                This shows how much value you've redeemed compared to your total annual fees for all cards combined. An ROI of 100% means you've broken even for the year.
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Card ROI</Text>
              <Text style={styles.sectionText}>
                This shows the specific ROI for each card, comparing the value you've redeemed from its benefits to that card's annual fee. Cards are ranked by their ROI percentage to help you identify your best performers.
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Monthly Performance</Text>
              <Text style={styles.sectionText}>
                This chart visualizes your progress by showing the total savings you've earned from redeemed perks each month. The trend line helps you track your redemption patterns over time.
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Tips for Maximizing Value</Text>
              <View style={styles.tipContainer}>
                <Ionicons name="checkmark-circle" size={20} color={Colors.light.tint} style={styles.tipIcon} />
                <Text style={styles.tipText}>Track all redemptions to get accurate ROI calculations</Text>
              </View>
              <View style={styles.tipContainer}>
                <Ionicons name="trending-up" size={20} color={Colors.light.tint} style={styles.tipIcon} />
                <Text style={styles.tipText}>Focus on high-value perks to boost your ROI quickly</Text>
              </View>
              <View style={styles.tipContainer}>
                <Ionicons name="calendar" size={20} color={Colors.light.tint} style={styles.tipIcon} />
                <Text style={styles.tipText}>Set reminders for recurring benefits to avoid missing value</Text>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FAFAFE',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.light.text,
  },
  closeButton: {
    padding: 4,
  },
  scrollContent: {
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 8,
  },
  sectionText: {
    fontSize: 15,
    color: Colors.light.text,
    lineHeight: 22,
  },
  tipContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  tipIcon: {
    marginRight: 12,
  },
  tipText: {
    flex: 1,
    fontSize: 15,
    color: Colors.light.text,
    lineHeight: 20,
  },
});

export default InsightsHelpModal; 