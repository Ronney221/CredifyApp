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
  Alert,
} from 'react-native';
import { FlatList } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUserCards } from '../../hooks/useUserCards';
import { usePerkStatus } from '../../hooks/usePerkStatus';
import { getBenefitAdvice } from '../../../lib/openai';

// --- Interfaces ---
interface Message {
  _id: string | number;
  text: string;
  createdAt: Date;
  user: {
    _id: string | number;
    name: string;
  };
  pending?: boolean;
  usage?: TokenUsage;
}

interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCost: number;
}

interface AvailablePerk {
  cardName: string;
  perks: {
    name: string;
    value: number;
    periodMonths: number;
  }[];
}

interface ChatUsage {
  remainingUses: number;
  lastResetDate: string;
}

// --- Constants ---
const USER = { _id: 1, name: 'User' };
const AI = { _id: 2, name: 'AI Assistant' };
const CHAT_HISTORY_KEY = '@ai_chat_history';
const CHAT_USAGE_KEY = '@ai_chat_usage';
const MONTHLY_CHAT_LIMIT = 30;

// Debug flag - set to false for production
const DEBUG_MODE = true;

// --- Header Component ---
const ChatHeader = ({ onClose, onClear, hasMessages }: { 
  onClose: () => void;
  onClear: () => void;
  hasMessages: boolean;
}) => (
  <BlurView intensity={50} tint="light" style={styles.headerBlur}>
    <View style={styles.header}>
      <Text style={styles.headerTitle}>Credify AI</Text>
      <View style={styles.headerButtons}>
        <Pressable 
          onPress={onClear}
          hitSlop={10}
          style={({ pressed }) => [
            styles.headerButton,
            pressed && { opacity: 0.7 }
          ]}
          disabled={!hasMessages}
        >
          <Ionicons 
            name="trash-outline" 
            size={20} 
            color={hasMessages ? "#FF3B30" : "#C7C7CC"} 
          />
        </Pressable>
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
    </View>
  </BlurView>
);

// --- Message Bubble Component ---
const MessageBubble = ({ isAI, text, pending, usage, remainingUses }: { 
  isAI: boolean; 
  text: string; 
  pending?: boolean;
  usage?: TokenUsage;
  remainingUses?: number;
}) => {
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

  const formatText = (input: string) => {
    // First split on **bold** text
    const boldRegex = /(\*\*[^*]+\*\*)/g;
    const parts = input.split(boldRegex);

    return (
      <View>
        <Text style={[styles.messageText, isAI ? styles.aiText : styles.userText]}>
          {parts.map((part, i) => {
            if (boldRegex.test(part)) {
              // Strip the ** wrappers
              const clean = part.slice(2, -2);
              return (
                <Text 
                  key={i} 
                  style={[
                    styles.boldText,
                    { color: isAI ? '#0A84FF' : '#FFFFFF' }
                  ]}
                >
                  {clean}
                </Text>
              );
            }
            
            // For non-bold text, check for card names
            const cardNameRegex = /(\b[A-Z][a-z]+(\s[A-Z][a-z]+)+\b)/g;
            const cardParts = part.split(cardNameRegex);
            
            return cardParts.map((cardPart, j) => 
              cardNameRegex.test(cardPart) ? 
                <Text 
                  key={`${i}-${j}`} 
                  style={[
                    styles.boldText,
                    { color: isAI ? '#0A84FF' : '#FFFFFF' }
                  ]}
                >
                  {cardPart}
                </Text> : 
                cardPart
            );
          })}
        </Text>
        <View style={styles.debugContainer}>
          {DEBUG_MODE && usage && isAI && (
            <Text style={styles.debugText}>
              Tokens: {usage.promptTokens} + {usage.completionTokens} = {usage.totalTokens} (${usage.estimatedCost.toFixed(4)})
            </Text>
          )}
          {remainingUses !== undefined && isAI && (
            <Text style={styles.usageText}>
              {remainingUses} chats remaining this month
            </Text>
          )}
        </View>
      </View>
    );
  };

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
        {formatText(text)}
      </View>
    </Animated.View>
  );
};

// --- Main Chat Component ---
const AIChat = ({ onClose }: { onClose: () => void }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [remainingUses, setRemainingUses] = useState<number>(MONTHLY_CHAT_LIMIT);
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);
  const sendButtonScale = useRef(new Animated.Value(0)).current;
  const { userCardsWithPerks } = useUserCards();
  const { userCardsWithPerks: processedCards } = usePerkStatus(userCardsWithPerks);

  // Load chat history from AsyncStorage
  useEffect(() => {
    const loadChatHistory = async () => {
      try {
        const savedHistory = await AsyncStorage.getItem(CHAT_HISTORY_KEY);
        if (savedHistory) {
          const parsedHistory = JSON.parse(savedHistory);
          // Convert string dates back to Date objects
          const historyWithDates = parsedHistory.map((msg: any) => ({
            ...msg,
            createdAt: new Date(msg.createdAt)
          }));
          setMessages(historyWithDates);
        } else {
          // Set initial greeting message
          setMessages([{
            _id: 1,
            text: `Welcome to Credify AI, your personal rewards assistant.

I keep track of all your active credit card perks so you don't have to. Just tell me what you're about to buy, and I'll instantly find the best benefit to use.

For example, you could say:

• "I'm booking a trip to New York."
• "I'm about to order dinner."
• "I'm craving a coffee."
How can I help you save?`,
            createdAt: new Date(),
            user: AI,
          }]);
        }
      } catch (error) {
        console.error('[AIChat] Error loading chat history:', error);
      }
    };
    loadChatHistory();
  }, []);

  // Save chat history to AsyncStorage
  useEffect(() => {
    const saveChatHistory = async () => {
      try {
        await AsyncStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(messages));
      } catch (error) {
        console.error('[AIChat] Error saving chat history:', error);
      }
    };
    if (messages.length > 0) {
      saveChatHistory();
    }
  }, [messages]);

  // Load chat usage from AsyncStorage
  useEffect(() => {
    const loadChatUsage = async () => {
      try {
        const savedUsage = await AsyncStorage.getItem(CHAT_USAGE_KEY);
        if (savedUsage) {
          const usage: ChatUsage = JSON.parse(savedUsage);
          const lastReset = new Date(usage.lastResetDate);
          const now = new Date();
          
          // Check if we need to reset the counter (new month)
          if (lastReset.getMonth() !== now.getMonth() || lastReset.getFullYear() !== now.getFullYear()) {
            setRemainingUses(MONTHLY_CHAT_LIMIT);
            await AsyncStorage.setItem(CHAT_USAGE_KEY, JSON.stringify({
              remainingUses: MONTHLY_CHAT_LIMIT,
              lastResetDate: now.toISOString()
            }));
          } else {
            setRemainingUses(usage.remainingUses);
          }
        } else {
          // First time user
          setRemainingUses(MONTHLY_CHAT_LIMIT);
          await AsyncStorage.setItem(CHAT_USAGE_KEY, JSON.stringify({
            remainingUses: MONTHLY_CHAT_LIMIT,
            lastResetDate: new Date().toISOString()
          }));
        }
      } catch (error) {
        console.error('[AIChat] Error loading chat usage:', error);
      }
    };
    loadChatUsage();
  }, []);

  // Update chat usage after each message
  const updateChatUsage = async () => {
    try {
      const newRemaining = remainingUses - 1;
      setRemainingUses(newRemaining);
      await AsyncStorage.setItem(CHAT_USAGE_KEY, JSON.stringify({
        remainingUses: newRemaining,
        lastResetDate: new Date().toISOString()
      }));
    } catch (error) {
      console.error('[AIChat] Error updating chat usage:', error);
    }
  };

  useEffect(() => {
    // Animate send button based on input text
    Animated.spring(sendButtonScale, {
      toValue: inputText.trim().length > 0 ? 1 : 0,
      tension: 50,
      friction: 7,
      useNativeDriver: true,
    }).start();
  }, [inputText]);

  const handleAIResponse = async (userMessageText: string) => {
    if (remainingUses <= 0) {
      const errorMessage: Message = {
        _id: Math.random().toString(),
        text: "You've reached your monthly chat limit. Please try again next month.",
        createdAt: new Date(),
        user: AI,
      };
      setMessages(previousMessages => [errorMessage, ...previousMessages]);
      return;
    }

    setIsTyping(true);
    try {
      // Validate processedCards
      if (!processedCards || !Array.isArray(processedCards)) {
        throw new Error('Invalid card data');
      }

      console.log('[AIChat] Processing available perks');
      const availablePerks: AvailablePerk[] = processedCards
        .filter(card => card && card.card && card.perks)
        .map(card => ({
          cardName: card.card.name,
          perks: card.perks
            .filter(perk => perk && perk.status === 'available')
            .map(perk => ({
              name: perk.name,
              value: perk.value,
              periodMonths: perk.periodMonths || 12
            }))
        }))
        .filter(card => card.perks.length > 0);

      if (availablePerks.length === 0) {
        throw new Error('No available perks found');
      }

      console.log('[AIChat] Available perks:', JSON.stringify(availablePerks, null, 2));
      console.log('[AIChat] Calling getBenefitAdvice');
      const result = await getBenefitAdvice(userMessageText, availablePerks);
      console.log('[AIChat] Received advice:', result);

      const aiResponse: Message = {
        _id: Math.random().toString(),
        text: result.advice,
        createdAt: new Date(),
        user: AI,
        usage: result.usage
      };

      setMessages(previousMessages => [aiResponse, ...previousMessages]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      await updateChatUsage();
    } catch (error) {
      console.error('[AIChat] Error in handleAIResponse:', error);
      const errorMessage: Message = {
        _id: Math.random().toString(),
        text: error instanceof Error 
          ? `Sorry, ${error.message}. Please try again.`
          : 'Sorry, I encountered an error. Please try again.',
        createdAt: new Date(),
        user: AI,
      };
      setMessages(previousMessages => [errorMessage, ...previousMessages]);
    } finally {
      setIsTyping(false);
    }
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

  const handleClearChat = () => {
    Alert.alert(
      "Clear Chat History",
      "Are you sure you want to clear all chat history?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Clear",
          style: "destructive",
          onPress: async () => {
            try {
              await AsyncStorage.removeItem(CHAT_HISTORY_KEY);
              setMessages([{
                _id: 1,
                text: `Welcome to Credify AI, your personal rewards assistant.

I keep track of all your active credit card perks so you don't have to. Just tell me what you're about to buy, and I'll instantly find the best benefit to use.

For example, you could say:

• "I'm booking a trip to New York."
• "I'm about to order dinner."
• "I'm craving a coffee."
How can I help you save?`,
                createdAt: new Date(),
                user: AI,
              }]);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (error) {
              console.error('[AIChat] Error clearing chat history:', error);
              Alert.alert('Error', 'Failed to clear chat history. Please try again.');
            }
          }
        }
      ]
    );
  };

  const renderItem = ({ item }: { item: Message }) => (
    <MessageBubble
      isAI={item.user._id === AI._id}
      text={item.text}
      pending={item.pending}
      usage={item.usage}
      remainingUses={remainingUses}
    />
  );

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <ChatHeader 
          onClose={onClose} 
          onClear={handleClearChat}
          hasMessages={messages.length > 1}
        />
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
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
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
  boldText: {
    fontWeight: '600',
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
  debugContainer: {
    marginTop: 4,
  },
  debugText: {
    fontSize: 12,
    color: '#8E8E93',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'monospace',
  },
  usageText: {
    fontSize: 12,
    color: '#8E8E93',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
});

export default AIChat;
