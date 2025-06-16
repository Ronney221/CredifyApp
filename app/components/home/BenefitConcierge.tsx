import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  Animated,
  Pressable,
  FlatList,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUserCards } from '../../hooks/useUserCards';
import { usePerkStatus } from '../../hooks/usePerkStatus';
import { getBenefitAdvice } from '../../../lib/openai';
import { Card, CardPerk } from '../../../src/data/card-data';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

interface ChatMessage {
  id: string;
  query: string;
  response: {
    advice: string;
    usage: TokenUsage;
  };
  timestamp: Date;
}

interface BenefitConciergeProps {
  onClose: () => void;
}

interface AvailablePerk {
  cardName: string;
  perks: {
    name: string;
    value: number;
    periodMonths: number;
  }[];
}

interface CardWithPerks {
  cardName: string;
  perks: {
    name: string;
    value: number;
    periodMonths: number;
  }[];
}

interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCost: number;
}

interface ExamplePrompt {
  text: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const EXAMPLE_PROMPTS: ExamplePrompt[] = [
  {
    text: "I'm planning a 3-night weekend trip to New York next month. How can I use my card benefits to save money on flights and my hotel stay?",
    icon: "airplane-outline"
  },
  {
    text: "It's the first week of the month. What are my most time-sensitive monthly credits that I should focus on using first?",
    icon: "time-outline"
  },
  {
    text: "I'm about to buy a new laptop for around $1,200. Which of my cards offers the best warranty and purchase protection for an expensive electronic item like this?",
    icon: "shield-checkmark-outline"
  }
];

const CHAT_HISTORY_KEY = '@benefit_concierge_chat_history';

const TypingIndicator = () => (
  <View style={styles.typingContainer}>
    <View style={styles.typingBubble}>
      <View style={styles.typingDot} />
      <View style={[styles.typingDot, { marginLeft: 4 }]} />
      <View style={[styles.typingDot, { marginLeft: 4 }]} />
    </View>
  </View>
);

export default function BenefitConcierge({ onClose }: BenefitConciergeProps) {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const { userCardsWithPerks } = useUserCards();
  const { userCardsWithPerks: processedCards } = usePerkStatus(userCardsWithPerks);
  const scrollViewRef = useRef<ScrollView>(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const inputRef = useRef<TextInput>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const messageAnimations = useRef<{ [key: string]: Animated.Value }>({}).current;
  const sendButtonScale = useRef(new Animated.Value(0)).current;

  // Load chat history from AsyncStorage on component mount
  useEffect(() => {
    const loadChatHistory = async () => {
      try {
        const savedHistory = await AsyncStorage.getItem(CHAT_HISTORY_KEY);
        if (savedHistory) {
          const parsedHistory = JSON.parse(savedHistory);
          // Convert string dates back to Date objects
          const historyWithDates = parsedHistory.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          }));
          setChatHistory(historyWithDates);
        }
      } catch (error) {
        console.error('[BenefitConcierge] Error loading chat history:', error);
      }
    };
    loadChatHistory();
  }, []);

  // Save chat history to AsyncStorage whenever it changes
  useEffect(() => {
    const saveChatHistory = async () => {
      try {
        await AsyncStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(chatHistory));
      } catch (error) {
        console.error('[BenefitConcierge] Error saving chat history:', error);
      }
    };
    if (chatHistory.length > 0) {
      saveChatHistory();
    }
  }, [chatHistory]);

  // Clear chat history function
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
              setChatHistory([]);
              // Trigger haptic feedback
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (error) {
              console.error('[BenefitConcierge] Error clearing chat history:', error);
              Alert.alert('Error', 'Failed to clear chat history. Please try again.');
            }
          }
        }
      ]
    );
  };

  // Debug logging for component mount and state changes
  useEffect(() => {
    console.log('[BenefitConcierge] Component mounted');
    console.log('[BenefitConcierge] Initial userCardsWithPerks:', JSON.stringify(userCardsWithPerks, null, 2));
    console.log('[BenefitConcierge] Initial processedCards:', JSON.stringify(processedCards, null, 2));
  }, []);

  useEffect(() => {
    console.log('[BenefitConcierge] Query updated:', query);
  }, [query]);

  useEffect(() => {
    console.log('[BenefitConcierge] Loading state changed:', isLoading);
  }, [isLoading]);

  useEffect(() => {
    console.log('[BenefitConcierge] Response updated:', chatHistory);
  }, [chatHistory]);

  // Animation for new messages
  const animateNewMessage = (messageId: string) => {
    if (!messageAnimations[messageId]) {
      messageAnimations[messageId] = new Animated.Value(0);
    }

    Animated.spring(messageAnimations[messageId], {
      toValue: 1,
      useNativeDriver: true,
      tension: 50,
      friction: 7,
    }).start();
  };

  // Animation for send button
  useEffect(() => {
    if (query.trim()) {
      Animated.spring(sendButtonScale, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }).start();
    } else {
      Animated.spring(sendButtonScale, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }).start();
    }
  }, [query]);

  const handleSubmit = async () => {
    if (!query.trim() || isLoading || isSubmitting) {
      console.log('[BenefitConcierge] Submit attempted with empty query or while loading');
      return;
    }

    // Store the current query and clear it immediately
    const currentQuery = query;
    setQuery('');
    
    // Dismiss keyboard immediately
    inputRef.current?.blur();

    // Trigger haptic feedback for sending
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    console.log('[BenefitConcierge] Starting handleSubmit');
    setIsLoading(true);
    setIsSubmitting(true);

    try {
      // Validate processedCards
      if (!processedCards || !Array.isArray(processedCards)) {
        throw new Error('Invalid card data');
      }

      console.log('[BenefitConcierge] Processing available perks');
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

      console.log('[BenefitConcierge] Available perks:', JSON.stringify(availablePerks, null, 2));
      console.log('[BenefitConcierge] Calling getBenefitAdvice');
      const result = await getBenefitAdvice(currentQuery, availablePerks);
      console.log('[BenefitConcierge] Received advice:', result);
      
      const newMessage: ChatMessage = {
        id: Date.now().toString(),
        query: currentQuery,
        response: result,
        timestamp: new Date()
      };
      
      setChatHistory(prev => [...prev, newMessage]);
      setIsSubmitting(false);

      // Animate new message
      animateNewMessage(newMessage.id);

      // Show typing indicator
      setIsTyping(true);

      // Simulate bot thinking time (remove this in production)
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Trigger haptic feedback for bot response
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);

      // Scroll to bottom with animation
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);

    } catch (error) {
      console.error('[BenefitConcierge] Error in handleSubmit:', error);
      // Add error message to chat history with more specific error handling
      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        query: currentQuery,
        response: {
          advice: error instanceof Error 
            ? `Sorry, ${error.message}. Please try again.`
            : 'Sorry, I encountered an error. Please try again.',
          usage: {
            promptTokens: 0,
            completionTokens: 0,
            totalTokens: 0,
            estimatedCost: 0
          }
        },
        timestamp: new Date()
      };
      setChatHistory(prev => [...prev, errorMessage]);
      setIsSubmitting(false);
    } finally {
      setIsTyping(false);
      setIsLoading(false);
    }
  };

  const handleExamplePrompt = (prompt: string) => {
    setQuery(prompt);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    inputRef.current?.focus();
  };

  // Add effect to scroll to bottom when chat history changes
  useEffect(() => {
    if (chatHistory.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [chatHistory]);

  // Add effect to scroll to bottom when component mounts
  useEffect(() => {
    if (chatHistory.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: false });
      }, 100);
    }
  }, []);

  const renderSuggestionChip = ({ item }: { item: ExamplePrompt }) => (
    <TouchableOpacity
      style={styles.suggestionChip}
      onPress={() => handleExamplePrompt(item.text)}
    >
      <Ionicons name={item.icon} size={16} color="#007AFF" style={styles.suggestionIcon} />
      <Text style={styles.suggestionText} numberOfLines={1}>{item.text}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.title}>Benefit Concierge</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity 
            onPress={handleClearChat} 
            style={styles.clearButton}
            disabled={chatHistory.length === 0}
          >
            <Ionicons 
              name="trash-outline" 
              size={20} 
              color={chatHistory.length === 0 ? "#C7C7CC" : "#FF3B30"} 
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="remove-outline" size={24} color="#1C1C1E" />
          </TouchableOpacity>
        </View>
      </View>

      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView 
          ref={scrollViewRef}
          style={styles.content}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <View style={{ flex: 1, justifyContent: 'flex-end' }}>
            {chatHistory.length === 0 && (
              <View style={styles.welcomeContainer}>
                <Text style={styles.welcomeTitle}>Welcome to Benefit Concierge</Text>
                <Text style={styles.welcomeText}>
                  Ask how to make the most of your available benefits for any situation.
                </Text>
                <View style={styles.suggestionsContainer}>
                  <Text style={styles.suggestionsTitle}>Try asking about:</Text>
                  <View style={styles.chipsContainer}>
                    <FlatList
                      data={EXAMPLE_PROMPTS}
                      renderItem={renderSuggestionChip}
                      keyExtractor={(_, index) => index.toString()}
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.suggestionsScrollContent}
                      ItemSeparatorComponent={() => <View style={{ width: 8 }} />}
                    />
                  </View>
                </View>
              </View>
            )}

            {chatHistory.map((message, index) => (
              <Animated.View 
                key={message.id} 
                style={[
                  styles.chatMessageContainer,
                  {
                    opacity: messageAnimations[message.id] || 1,
                    transform: [{
                      translateY: messageAnimations[message.id]?.interpolate({
                        inputRange: [0, 1],
                        outputRange: [20, 0]
                      }) || 0
                    }]
                  }
                ]}
              >
                <View style={styles.queryContainer}>
                  <View style={styles.queryBubble}>
                    <Text style={styles.queryText}>{message.query}</Text>
                  </View>
                </View>
                <View style={styles.chatResponseContainer}>
                  <View style={styles.responseBubble}>
                    <Text style={styles.chatResponseText}>{message.response.advice}</Text>
                  </View>
                </View>
              </Animated.View>
            ))}

            {isTyping && <TypingIndicator />}
          </View>
        </ScrollView>

        <View style={[styles.inputContainer, { paddingBottom: insets.bottom }]}>
          <TextInput
            ref={inputRef}
            style={styles.input}
            value={query}
            onChangeText={setQuery}
            placeholder="Message your concierge..."
            placeholderTextColor="#8E8E93"
            multiline
            maxLength={200}
            returnKeyType="send"
            onSubmitEditing={() => {
              if (query.trim() && !isLoading && !isSubmitting) {
                handleSubmit();
              }
            }}
            blurOnSubmit={false}
            editable={!isSubmitting}
          />
          <Animated.View style={[
            styles.sendButtonContainer,
            {
              opacity: sendButtonScale,
              transform: [{ scale: sendButtonScale }]
            }
          ]}>
            <TouchableOpacity
              style={[
                styles.sendButton, 
                (!query.trim() || isLoading || isSubmitting) && styles.sendButtonDisabled
              ]}
              onPress={handleSubmit}
              disabled={!query.trim() || isLoading || isSubmitting}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Ionicons 
                  name="arrow-up-circle" 
                  size={24} 
                  color="#FFFFFF" 
                />
              )}
            </TouchableOpacity>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
    backgroundColor: '#FFFFFF',
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1C1C1E',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12, // Add consistent spacing between buttons
  },
  clearButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 59, 48, 0.1)', // Light red background
  },
  closeButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.05)', // Light gray background
  },
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 16,
    justifyContent: 'flex-end',
  },
  welcomeContainer: {
    alignItems: 'center',
    paddingVertical: 24,
    width: '100%',
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  welcomeText: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 32,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 8,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
  },
  input: {
    flex: 1,
    backgroundColor: '#F2F2F7',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    paddingTop: 8,
    maxHeight: 100,
    fontSize: 16,
    color: '#1C1C1E',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  sendButtonContainer: {
    marginLeft: 8,
    marginBottom: 4,
  },
  sendButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  chatMessageContainer: {
    marginBottom: 12,
    flexDirection: 'column',
  },
  queryContainer: {
    alignItems: 'flex-end',
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  queryBubble: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 22,
    maxWidth: '85%',
    borderTopRightRadius: 4,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  queryText: {
    fontSize: 16,
    color: '#FFFFFF',
    lineHeight: 22,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    letterSpacing: -0.2,
  },
  chatResponseContainer: {
    alignItems: 'flex-start',
    flexDirection: 'row',
  },
  responseBubble: {
    backgroundColor: '#F2F2F7',
    padding: 12,
    borderRadius: 22,
    maxWidth: '85%',
    borderTopLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  chatResponseText: {
    fontSize: 16,
    color: '#1C1C1E',
    lineHeight: 22,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    letterSpacing: -0.2,
  },
  suggestionsContainer: {
    width: '100%',
    marginTop: 16,
  },
  suggestionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8E8E93',
    marginBottom: 12,
    paddingHorizontal: 16,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  chipsContainer: {
    height: 44, // Fixed height for the chips container
    width: '100%',
  },
  suggestionsScrollContent: {
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  suggestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    minWidth: 200, // Minimum width for each chip
    maxWidth: 300, // Maximum width for each chip
  },
  suggestionIcon: {
    marginRight: 6,
  },
  suggestionText: {
    fontSize: 14,
    color: '#1C1C1E',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    flex: 1,
  },
  typingContainer: {
    padding: 12,
    alignItems: 'flex-start',
  },
  typingBubble: {
    backgroundColor: '#F2F2F7',
    padding: 12,
    borderRadius: 22,
    flexDirection: 'row',
    alignItems: 'center',
    borderTopLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#8E8E93',
    opacity: 0.6,
  },
}); 