import React, { useState } from 'react';
import { TouchableOpacity, StyleSheet, View, Modal, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AIChat from './AIChat';

interface AIChatButtonProps {
  onPress?: () => void;
}

export default function AIChatButton({ onPress }: AIChatButtonProps) {
  const [isModalVisible, setIsModalVisible] = useState(false);

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      setIsModalVisible(true);
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
          <Ionicons name="sparkles" size={20} color="#007AFF" />
        </View>
      </TouchableOpacity>

      <Modal
        visible={isModalVisible}
        animationType="slide"
        onRequestClose={() => setIsModalVisible(false)}
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <AIChat onClose={() => setIsModalVisible(false)} />
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
}); 