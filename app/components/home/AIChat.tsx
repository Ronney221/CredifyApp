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
  Linking,
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
import { format, differenceInDays, endOfMonth, endOfYear, addMonths, getMonth, getYear } from 'date-fns';
import { CardPerk, openPerkTarget } from '../../../src/data/card-data';

// --- Interfaces ---
type BenefitRecommendationTuple = [string, string, string, number]; // [benefitName, cardName, displayText, remainingValue]

// Reconstructed recommendation object for UI use
interface UIBenefitRecommendation {
  benefitName: string;
  cardName: string;
  displayText: string;
  remainingValue: number;
  perk?: CardPerk;
}

interface AIResponse {
  responseType: 'BenefitRecommendation' | 'NoBenefitFound' | 'Conversational';
  recommendations: BenefitRecommendationTuple[];
}

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
  structuredResponse?: AIResponse;
  uiRecommendations?: UIBenefitRecommendation[];
  remainingUses?: number;
}

interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCost: number;
}

interface AvailablePerk {
  cardName: string;
  annualFee?: number;
  breakEvenProgress?: number;
  perks: {
    name: string;
    totalValue: number;
    remainingValue: number;
    status: string;
    expiry: string | undefined;
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

// Define welcome message as a constant to avoid duplication
const WELCOME_MESSAGE = `Welcome to **Credify AI**, your personal rewards assistant.

I keep track of all your active credit card perks so you don't have to. Just tell me what you're about to buy, and I'll instantly find the best benefit to use.

For example, you could say:

• "I'm booking a trip to New York."
• "I'm about to order dinner."
• "I'm craving a coffee."
How can I help you save?`;

// Helper function to calculate perk cycle end date and days remaining
const calculatePerkCycleDetails = (perk: CardPerk, currentDate: Date): { cycleEndDate: Date; daysRemaining: number } => {
  if (!perk.periodMonths) {
    // Should not happen for perks we are considering for cycles
    return { cycleEndDate: endOfYear(addMonths(currentDate, 24)), daysRemaining: 365 * 2 }; // Far future
  }

  const currentMonth = getMonth(currentDate); // 0-11
  const currentYear = getYear(currentDate);
  let cycleEndDate: Date;

  switch (perk.periodMonths) {
    case 1: // Monthly
      cycleEndDate = endOfMonth(currentDate);
      break;
    case 3: // Quarterly
      const quarter = Math.floor(currentMonth / 3);
      const endMonthOfQuarter = quarter * 3 + 2; // Q1 (0) -> 2 (Mar), Q2 (1) -> 5 (Jun), etc.
      cycleEndDate = endOfMonth(new Date(currentYear, endMonthOfQuarter, 1));
      break;
    case 6: // Bi-Annually
      const half = Math.floor(currentMonth / 6);
      const endMonthOfHalf = half * 6 + 5; // H1 (0) -> 5 (Jun), H2 (1) -> 11 (Dec)
      cycleEndDate = endOfMonth(new Date(currentYear, endMonthOfHalf, 1));
      break;
    case 12: // Annually
      cycleEndDate = endOfYear(currentDate);
      break;
    default:
      // For other uncommon periods, estimate as end of month after periodMonths from start of current month
      // This is a fallback and might need refinement based on specific perk rules
      const startOfCurrentMonth = new Date(currentYear, currentMonth, 1);
      cycleEndDate = endOfMonth(addMonths(startOfCurrentMonth, perk.periodMonths -1));
      // If this calculation results in a date in the past for the current cycle, advance it by periodMonths
      if (cycleEndDate < currentDate) {
         cycleEndDate = endOfMonth(addMonths(cycleEndDate, perk.periodMonths));
      }
      break;
  }

  let daysRemaining = differenceInDays(cycleEndDate, currentDate);
  // Ensure daysRemaining is not negative if cycleEndDate is slightly in the past due to timing.
  daysRemaining = Math.max(0, daysRemaining);

  return { cycleEndDate, daysRemaining };
};

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
const MessageBubble = ({ isAI, text, pending, usage, remainingUses, recommendations }: { 
  isAI: boolean; 
  text: string; 
  pending?: boolean;
  usage?: TokenUsage;
  remainingUses?: number;
  recommendations?: UIBenefitRecommendation[];
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

  // This is a separate function to handle rich text formatting
  const formatTextWithBold = (text: string) => {
    const boldRegex = /(\*\*[^*]+\*\*)/g;
    const parts = text.split(boldRegex);

    return parts.map((part, i) => {
      if (boldRegex.test(part)) {
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
      return part;
    });
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
        {/* Render the main text (which can now be a header) */}
        <Text style={[styles.messageText, isAI ? styles.aiText : styles.userText]}>
          {formatTextWithBold(text)}
        </Text>
  
        {/* NEW: Render the interactive recommendations if they exist */}
        {isAI && recommendations && recommendations.length > 0 && (
          <View style={styles.recommendationsContainer}>
            {recommendations.map((rec, index) => (
              <View
                key={index}
                style={[
                  styles.recommendationBox,
                  // Add a border top to all but the first item
                  index > 0 && styles.recommendationSeparator,
                ]}
              >
                <Text style={styles.recommendationText}>{formatTextWithBold(rec.displayText)}</Text>
                {rec.perk && (
                  <Pressable
                    style={({ pressed }) => [
                      styles.redeemButton,
                      pressed && { opacity: 0.7 },
                    ]}
                    onPress={() => openPerkTarget(rec.perk!)}
                  >
                    <Text style={styles.redeemButtonText}>Use Perk</Text>
                    <Ionicons name="arrow-forward-circle" size={20} color="#FFFFFF" />
                  </Pressable>
                )}
              </View>
            ))}
          </View>
        )}
  
        {/* The debug info remains the same */}
        <View style={styles.debugContainer}>
          {DEBUG_MODE && usage && isAI && (
            <Text style={styles.debugText}>
              Tokens: {usage.promptTokens} + {usage.completionTokens} = {usage.totalTokens} ($
              {usage.estimatedCost.toFixed(5)})
            </Text>
          )}
          {remainingUses !== undefined && isAI && (
            <Text style={styles.usageText}>
              {remainingUses} chats remaining this month
            </Text>
          )}
        </View>
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
            text: WELCOME_MESSAGE,
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

  // Transform the card data to match the new interface
  const transformCardData = (cards: any[]): AvailablePerk[] => {
    const currentDate = new Date();
    return cards.map(card => ({
      cardName: card.card.name,
      annualFee: card.card.annualFee,
      breakEvenProgress: card.card.breakEvenProgress,
      perks: card.perks.map((perk: any) => {
        let expiryDate = perk.expiry;
        if (!expiryDate && perk.periodMonths) {
          const { cycleEndDate } = calculatePerkCycleDetails(perk, currentDate);
          expiryDate = format(cycleEndDate, 'yyyy-MM-dd');
        }
        
        return {
          name: perk.name,
          totalValue: perk.value,
          remainingValue: perk.remaining_value ?? perk.value,
          status: perk.status || 'Available',
          expiry: expiryDate,
        };
      })
    }));
  };

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
      
      // 1. Filter out unusable perks.
      const usablePerksData = processedCards
        .map(card => ({
          ...card,
          perks: card.perks.filter(perk => 
            perk.status === 'available' || perk.status === 'partially_redeemed'
          ),
        }))
        .filter(card => card.perks.length > 0);

      // Tier 3: Pre-sort the data before sending it to the AI
      const currentDate = new Date();
      usablePerksData.forEach(card => {
        card.perks.sort((a, b) => {
          const aDetails = calculatePerkCycleDetails(a, currentDate);
          const bDetails = calculatePerkCycleDetails(b, currentDate);
          if (aDetails.daysRemaining !== bDetails.daysRemaining) {
            return aDetails.daysRemaining - bDetails.daysRemaining;
          }
          return (b.remaining_value ?? b.value) - (a.remaining_value ?? a.value);
        });
      });

      // 2. Now transform the clean, sorted, usable data.
      const transformedCards = transformCardData(usablePerksData);

      if (transformedCards.length === 0) {
        throw new Error('No available perks found');
      }

      console.log('[AIChat] Available perks:', JSON.stringify(transformedCards, null, 2));
      console.log('[AIChat] Calling getBenefitAdvice');
      const result = await getBenefitAdvice(userMessageText, transformedCards);
      console.log('[AIChat] Received advice:', result.response);

      let adviceText = '';
      let uiRecommendations: UIBenefitRecommendation[] = [];

      if (result.response.responseType === 'BenefitRecommendation' && result.response.recommendations.length > 0) {
        console.log('[AIChat] Processing recommendations. Full object:', result.response);
        
        // Let the individual recommendations speak for themselves.
        adviceText = ""; 

        uiRecommendations = result.response.recommendations.map((rec) => {
          const [benefitName, cardName, displayText, remainingValue] = rec;
          
          // Find the original perk to get the actionLink
          let perk: CardPerk | undefined;
          const card = processedCards.find(c => c.card.name === cardName);
          if (card) {
            perk = card.perks.find(p => p.name === benefitName);
          }

          return { benefitName, cardName, displayText, remainingValue, perk };
        });

      } else if (result.response.responseType === 'NoBenefitFound') {
        adviceText = "I couldn't find any relevant benefits for that. Try asking about dining, travel, or shopping benefits!";
      } else if (result.response.responseType === 'Conversational') {
        adviceText = 'How else can I help you maximize your credit card benefits?';
      }

      const aiResponse: Message = {
        _id: Math.random().toString(),
        text: adviceText,
        structuredResponse: result.response,
        uiRecommendations: uiRecommendations,
        createdAt: new Date(),
        user: AI,
        usage: result.usage,
        remainingUses: remainingUses - 1,
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
                text: WELCOME_MESSAGE,
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
      remainingUses={item.remainingUses}
      recommendations={item.uiRecommendations}
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
  recommendationsContainer: {
    marginTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E5EA',
  },
  recommendationBox: {
    paddingTop: 12,
  },
  recommendationSeparator: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E5EA',
    marginTop: 12,
  },
  recommendationText: {
    fontSize: 16,
    lineHeight: 22,
    color: '#000000',
    marginBottom: 8,
  },
  redeemButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  redeemButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    marginRight: 4,
  },
});

export default AIChat;
