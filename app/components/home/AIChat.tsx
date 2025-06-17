import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Platform,
  SafeAreaView,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  ActivityIndicator,
  Animated,
  Easing,
} from 'react-native';
import { FlatList } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';

// --- Interface for a single message ---
interface Message {
  _id: string | number;
  text: string;
  createdAt: Date;
  user: {
    _id: string | number;
    name: string;
  };
  pending?: boolean;
}

// --- Define User and AI objects ---
const USER = { _id: 1, name: 'User' };
const AI = { _id: 2, name: 'AI Assistant' };

// --- Header Component ---
const ChatHeader = ({ onClose }: { onClose: () => void }) => (
  <BlurView intensity={50} tint="light" style={styles.headerBlur}>
    <View style={styles.header}>
      <Text style={styles.headerTitle}>Credify AI</Text>
      <Pressable 
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onClose();
        }} 
        hitSlop={10}
        style={({ pressed }) => [
          styles.headerButton,
          pressed && { opacity: 0.7 }
        ]}
      >
        <Text style={styles.headerButtonText}>Done</Text>
      </Pressable>
    </View>
  </BlurView>
);

// --- Message Bubble Component ---
const MessageBubble = ({ isAI, text, pending }: { isAI: boolean; text: string; pending?: boolean }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 300,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.messageRow,
        { justifyContent: isAI ? 'flex-start' : 'flex-end' },
        { opacity: fadeAnim, transform: [{ translateY }] },
        pending && { opacity: 0.7 },
      ]}
    >
      <View style={[styles.messageBubble, isAI ? styles.aiBubble : styles.userBubble]}>
        <Text style={[styles.messageText, isAI ? styles.aiText : styles.userText]}>{text}</Text>
      </View>
    </Animated.View>
  );
};

// --- Main Chat Component ---
const AIChat = ({ onClose }: { onClose: () => void }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);
  const sendButtonScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    setMessages([
      {
        _id: 1,
        text: "Hello! I'm your AI assistant. How can I help you today?",
        createdAt: new Date(),
        user: AI,
      },
    ]);
  }, []);

  useEffect(() => {
    // Animate send button based on input text
    Animated.spring(sendButtonScale, {
      toValue: inputText.trim().length > 0 ? 1 : 0,
      tension: 50,
      friction: 7,
      useNativeDriver: true,
    }).start();
  }, [inputText]);

  const handleAIResponse = (userMessageText: string) => {
    setIsTyping(true);
    setTimeout(() => {
      let responseText = '';
      if (userMessageText.toLowerCase().includes('fact')) {
        responseText = 'The heart of a shrimp is located in its head.';
      } else {
        responseText = `I received your message: "${userMessageText}".`;
      }

      const aiResponse: Message = {
        _id: Math.random().toString(),
        text: responseText,
        createdAt: new Date(),
        user: AI,
      };
      setIsTyping(false);
      setMessages((previousMessages) => [aiResponse, ...previousMessages]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }, 1500);
  };

  const onSend = () => {
    const trimmedText = inputText.trim();
    if (trimmedText.length === 0) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const newMessage: Message = {
      _id: Math.random().toString(),
      text: trimmedText,
      createdAt: new Date(),
      user: USER,
      pending: true,
    };

    setMessages((previousMessages) => [newMessage, ...previousMessages]);
    setInputText('');
    handleAIResponse(trimmedText);
  };

  const renderItem = ({ item }: { item: Message }) => (
    <MessageBubble
      isAI={item.user._id === AI._id}
      text={item.text}
      pending={item.pending}
    />
  );

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <ChatHeader onClose={onClose} />
        <KeyboardAvoidingView
          style={styles.flex_1}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
          enabled
        >
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderItem}
            keyExtractor={(item) => item._id.toString()}
            style={styles.messageList}
            contentContainerStyle={styles.messageListContent}
            inverted
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          />

          {isTyping && (
            <View style={styles.typingContainer}>
              <BlurView intensity={50} tint="light" style={styles.typingBlur}>
                <View style={styles.typingContent}>
                  <ActivityIndicator size="small" color="#007AFF" style={styles.typingIndicator} />
                  <Text style={styles.typingText}>AI is thinking...</Text>
                </View>
              </BlurView>
            </View>
          )}

          <BlurView intensity={50} tint="light" style={styles.inputBlur}>
            <View style={styles.inputContainer}>
              <TextInput
                ref={inputRef}
                style={styles.textInput}
                value={inputText}
                onChangeText={setInputText}
                placeholder="Message"
                placeholderTextColor="rgba(60, 60, 67, 0.6)"
                multiline
                maxLength={200}
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
        </KeyboardAvoidingView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  flex_1: {
    flex: 1,
  },
  headerBlur: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
    letterSpacing: -0.5,
  },
  headerButton: {
    padding: 8,
  },
  headerButtonText: {
    fontSize: 17,
    color: '#007AFF',
    fontWeight: '400',
  },
  messageList: {
    flex: 1,
  },
  messageListContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
  },
  messageRow: {
    marginVertical: 4,
    flexDirection: 'row',
  },
  messageBubble: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 20,
    maxWidth: '75%',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
    letterSpacing: -0.2,
  },
  userBubble: {
    backgroundColor: '#007AFF',
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  userText: {
    color: '#FFFFFF',
  },
  aiText: {
    color: '#000000',
  },
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

export default AIChat;
