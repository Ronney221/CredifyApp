// ChatTypingIndicator.tsx
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { BlurView } from 'expo-blur';

interface ChatTypingIndicatorProps {
  isVisible: boolean;
}

export const ChatTypingIndicator: React.FC<ChatTypingIndicatorProps> = ({
  isVisible,
}) => {
  if (!isVisible) return null;

  return (
    <View style={styles.typingContainer}>
      <BlurView intensity={20} tint="systemMaterialLight" style={styles.typingBlur}>
        <View style={styles.typingContent}>
          <ActivityIndicator size="small" color="#007AFF" style={styles.typingIndicator} />
          <Text style={styles.typingText}>AI is thinking...</Text>
        </View>
      </BlurView>
    </View>
  );
};

const styles = StyleSheet.create({
  typingContainer: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    alignItems: 'center',
  },
  typingBlur: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  typingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  typingIndicator: {
    marginRight: 8,
  },
  typingText: {
    fontSize: 15,
    color: '#3C3C43',
    opacity: 0.6,
  },
});