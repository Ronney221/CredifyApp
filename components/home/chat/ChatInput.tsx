// ChatInput.tsx
import React, { useRef } from 'react';
import {
  View,
  TextInput,
  Pressable,
  StyleSheet,
  Animated,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';

interface ChatInputProps {
  inputText: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  sendButtonScale: Animated.Value;
  inputRef: React.RefObject<TextInput>;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  inputText,
  onChangeText,
  onSend,
  sendButtonScale,
  inputRef,
}) => {
  return (
    <BlurView intensity={80} tint="systemUltraThinMaterialLight" style={styles.inputBlur}>
      <View style={styles.inputContainer}>
        <TextInput
          ref={inputRef}
          style={styles.textInput}
          value={inputText}
          onChangeText={onChangeText}
          placeholder="Message"
          placeholderTextColor="rgba(60, 60, 67, 0.6)"
          multiline
          maxLength={200}
          blurOnSubmit={false}
          returnKeyType="send"
          onSubmitEditing={onSend}
        />
        <Animated.View style={{ transform: [{ scale: sendButtonScale }] }}>
          <Pressable
            onPress={onSend}
            style={({ pressed }) => [
              styles.sendButton,
              pressed && { opacity: 0.7 }
            ]}
            disabled={!inputText.trim()}
            hitSlop={8}
          >
            <Ionicons
              name="arrow-up"
              size={24}
              color="#FFFFFF"
            />
          </Pressable>
        </Animated.View>
      </View>
    </BlurView>
  );
};

const styles = StyleSheet.create({
  inputBlur: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 17,
    lineHeight: 22,
    paddingHorizontal: 16,
    paddingVertical: 8,
    paddingTop: 8,
    minHeight: 36,
    maxHeight: 100,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
});