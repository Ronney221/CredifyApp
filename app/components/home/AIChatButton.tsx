import React, { useState } from 'react';
import { TouchableOpacity, StyleSheet, View, Modal, SafeAreaView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AIChat from './AIChat';

interface AIChatButtonProps {
  hasRedeemedFirstPerk: boolean;
  showNotification?: boolean;
  onOpen?: () => void;
  onClose?: () => void;
}

export default function AIChatButton({ hasRedeemedFirstPerk, showNotification, onOpen, onClose }: AIChatButtonProps) {
  const [isModalVisible, setIsModalVisible] = useState(false);

  const handlePress = () => {
    if (!hasRedeemedFirstPerk) {
      Alert.alert(
        "Unlock Credify AI",
        "Redeem your first perk to unlock your personal AI rewards assistant!"
      );
      return;
    }

    if (onOpen) {
      onOpen();
    }
    setIsModalVisible(true);
  };

  const handleClose = () => {
    setIsModalVisible(false);
    if (onClose) {
      onClose();
    }
  };

  return (
    <>
      <TouchableOpacity
        style={styles.container}
        onPress={handlePress}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="Open AI Chat"
      >
        <View style={styles.iconContainer}>
          <Ionicons name={hasRedeemedFirstPerk ? "sparkles" : "lock-closed"} size={20} color={hasRedeemedFirstPerk ? "#007AFF" : "#8E8E93"} />
        </View>
        {showNotification && hasRedeemedFirstPerk && <View style={styles.notificationDot} />}
      </TouchableOpacity>

      <Modal
        visible={isModalVisible}
        animationType="slide"
        onRequestClose={handleClose}
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <AIChat onClose={handleClose} />
        </SafeAreaView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
  },
  iconContainer: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  notificationDot: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 14,
    height: 14,
    borderRadius: 8,
    backgroundColor: 'red',
    borderWidth: 1.5,
    borderColor: '#F4F4F4',
  },
}); 