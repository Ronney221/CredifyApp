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
import { format, differenceInDays, endOfMonth, endOfYear, addMonths, getMonth, getYear, differenceInHours } from 'date-fns';
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

interface GroupedRecommendation {
  cardName: string;
  cardId: string;
  perks: UIBenefitRecommendation[];
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
  groupedRecommendations?: GroupedRecommendation[];
  remainingUses?: number;
  isUpsell?: boolean;
  isLimitReached?: boolean;
  suggestedPrompts?: string[];
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
    categories: string[];
  }[];
}

interface ChatUsage {
  remainingUses: number;
  lastResetDate: string;
}

// --- Constants ---
const USER = { _id: 1, name: 'User' };
const AI = { _id: 2, name: 'AI Assistant' };
const CURRENT_CHAT_ID_KEY = '@ai_chat_current_id';
const CHAT_USAGE_KEY = '@ai_chat_usage';
const CHAT_NOTIFICATION_KEY = '@ai_chat_notification_active';
const MONTHLY_CHAT_LIMIT = 30;
const UPSELL_THRESHOLD = 5;

// Debug flag - set to false for production
const DEBUG_MODE = true;

const EXAMPLE_QUERIES = [
  "How should I pay my Disney+ bill?",
  "I'm booking flights for an international trip to Paris.",
  "What's the best card to use for my lunch order?",
  "What credits are expiring for me at the end of this month?",
  "I need some new clothes for summer.",
  "Where should I get takeout from tonight?",
  "I'm planning a weekend trip to Chicago.",
  "I need a ride to the airport.",
  "I need to get groceries for the week.",
  "What are the best perks for my vacation to Hawaii?",
  "I want to treat myself to a nice anniversary dinner.",
  "Which of my perks have I only partially used?",
  "Help me get the most value out of my Amex Platinum this month."
];

const getRandomExamples = (count = 3): string[] => {
  const shuffled = [...EXAMPLE_QUERIES].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};

const getOnboardingMessages = (): Message[] => {
  const now = new Date();
  const onboardingMessages: Message[] = [
    {
      _id: `onboarding_1_${now.getTime()}`,
      text: `Welcome to **Credify AI**! I'm your personal assistant for maximizing credit card rewards.`,
      createdAt: now,
      user: AI,
    },
    {
      _id: `onboarding_2_${now.getTime()}`,
      text: `I keep track of all your active perks so you don't have to. Just tell me what you're about to buy, and I'll instantly find the best benefit to use.`,
      createdAt: new Date(now.getTime() + 100), // slightly later
      user: AI,
    },
    {
      _id: `onboarding_3_${now.getTime()}`,
      text: `You get **30 free queries** every month. For unlimited insights, you can upgrade to **Credify Pro** for just $2.99/month.`,
      createdAt: new Date(now.getTime() + 200),
      user: AI,
    },
    {
      _id: `onboarding_4_${now.getTime()}`,
      text: `Here are a few things you can ask:`,
      createdAt: new Date(now.getTime() + 300),
      user: AI,
      suggestedPrompts: getRandomExamples(3),
    },
  ];
  // Return in reverse order for the inverted FlatList
  return onboardingMessages.reverse();
};

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
const ChatHeader = ({ onClose, onStartOver, hasMessages }: { 
  onClose: () => void;
  onStartOver: () => void;
  hasMessages: boolean;
}) => (
  <BlurView intensity={50} tint="light" style={styles.headerBlur}>
    <View style={styles.header}>
      <Text style={styles.headerTitle}>Credify AI</Text>
      <View style={styles.headerButtons}>
        <Pressable 
          onPress={onStartOver}
          hitSlop={10}
          style={({ pressed }) => [
            styles.headerButton,
            pressed && { opacity: 0.7 }
          ]}
          disabled={!hasMessages}
        >
          <Ionicons 
            name="sparkles-outline" 
            size={22} 
            color={hasMessages ? "#007AFF" : "#C7C7CC"} 
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
const MessageBubble = ({ isAI, text, pending, usage, remainingUses, groupedRecommendations, isUpsell, isLimitReached, onUpgrade, suggestedPrompts, onPromptPress }: { 
  isAI: boolean; 
  text: string; 
  pending?: boolean;
  usage?: TokenUsage;
  remainingUses?: number;
  groupedRecommendations?: GroupedRecommendation[];
  isUpsell?: boolean;
  isLimitReached?: boolean;
  onUpgrade?: () => void;
  suggestedPrompts?: string[];
  onPromptPress?: (prompt: string) => void;
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

  const getButtonText = (rec: UIBenefitRecommendation) => {
    if (!rec.perk) return "Use Perk";
    
    // Use remainingValue for partially redeemed, otherwise use the total value.
    const value = rec.perk.status === 'partially_redeemed' ? rec.remainingValue : rec.perk.value;
    const action = rec.perk.status === 'partially_redeemed' ? 'Apply' : 'Redeem';
    
    // Format to currency, removing trailing .00 for whole numbers
    const formattedValue = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);

    return `${action} ${formattedValue}`;
  }

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
              { color: isAI ? '#007AFF' : '#FFFFFF' }
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
        {text && text.length > 0 && (
          <Text style={[styles.messageText, isAI ? styles.aiText : styles.userText]}>
            {formatTextWithBold(text)}
          </Text>
        )}
  
        {/* NEW: Render the interactive recommendations if they exist */}
        {isAI && groupedRecommendations && groupedRecommendations.length > 0 && (
          <View style={styles.recommendationsContainer}>
            {groupedRecommendations.map((group, groupIndex) => (
              <View key={group.cardId} style={groupIndex > 0 ? styles.cardGroup : {}}>
                <Text style={styles.cardHeader}>{group.cardName}</Text>
                {group.perks.map((rec, recIndex) => (
                  <View
                    key={recIndex}
                    style={[
                      styles.recommendationBox,
                      recIndex > 0 && styles.recommendationSeparator,
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
                        <Text style={styles.redeemButtonText}>{getButtonText(rec)}</Text>
                        <Ionicons name="arrow-forward-circle" size={20} color="#FFFFFF" />
                      </Pressable>
                    )}
                  </View>
                ))}
              </View>
            ))}
          </View>
        )}
  
        {/* NEW: Clickable Suggested Prompts */}
        {isAI && suggestedPrompts && onPromptPress && (
          <View style={styles.promptsContainer}>
            {suggestedPrompts.map((prompt, index) => (
              <Pressable
                key={index}
                style={({ pressed }) => [
                  styles.promptButton,
                  pressed && { opacity: 0.7 }
                ]}
                onPress={() => onPromptPress(prompt)}
              >
                <Text style={styles.promptButtonText}>{prompt}</Text>
              </Pressable>
            ))}
          </View>
        )}
  
        {/* NEW: Upsell and Limit Reached CTAs */}
        {(isUpsell || isLimitReached) && onUpgrade && (
            <View style={styles.ctaContainer}>
                <Pressable
                    style={({ pressed }) => [
                        styles.upgradeButton,
                        pressed && { opacity: 0.8 },
                    ]}
                    onPress={onUpgrade}
                >
                    <Ionicons name="sparkles" size={18} color="#FFFFFF" />
                    <Text style={styles.upgradeButtonText}>
                        {isLimitReached ? "Upgrade to Pro" : "Unlock Unlimited"}
                    </Text>
                </Pressable>
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
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);
  const sendButtonScale = useRef(new Animated.Value(0)).current;
  const { userCardsWithPerks } = useUserCards();
  const { userCardsWithPerks: processedCards } = usePerkStatus(userCardsWithPerks);

  const handleUpgrade = () => {
    // For now, show an alert. Later, this could navigate to a paywall.
    Alert.alert(
      "Upgrade to Pro",
      "Unlock unlimited insights and chat history for just $2.99/month.",
      [
        { text: "Maybe Later", style: "cancel" },
        { text: "Upgrade Now", onPress: () => console.log("Navigate to paywall") }
      ]
    );
  };

  // Load/set the current chat ID on mount
  useEffect(() => {
    const getChatId = async () => {
      let chatId = await AsyncStorage.getItem(CURRENT_CHAT_ID_KEY);
      if (!chatId) {
        chatId = `chat_${Date.now()}`;
        await AsyncStorage.setItem(CURRENT_CHAT_ID_KEY, chatId);
      }
      setCurrentChatId(chatId);
    };
    getChatId();
  }, []);

  // Load chat history when the chat ID changes
  useEffect(() => {
    if (!currentChatId) return;

    const loadChatHistory = async () => {
      try {
        const savedHistory = await AsyncStorage.getItem(`@ai_chat_history_${currentChatId}`);
        if (savedHistory) {
          const parsedHistory = JSON.parse(savedHistory);
          // Convert string dates back to Date objects
          const historyWithDates: Message[] = parsedHistory.map((msg: any) => ({
            ...msg,
            createdAt: new Date(msg.createdAt)
          }));

          // Check for inactivity
          const lastMessage = historyWithDates[0];
          const now = new Date();
          if (lastMessage && differenceInHours(now, lastMessage.createdAt) > 48) {
            const inactivityMessage: Message = {
              _id: `re-engagement_${Date.now()}`,
              text: `Ready to find more savings? Here are a few ideas:`,
              createdAt: new Date(),
              user: AI,
              suggestedPrompts: getRandomExamples(3),
            };
            setMessages([inactivityMessage, ...historyWithDates]);
            // Set the notification flag
            await AsyncStorage.setItem(CHAT_NOTIFICATION_KEY, 'true');
          } else {
            setMessages(historyWithDates);
          }
        } else {
          // Set initial greeting message for a new chat
          setMessages(getOnboardingMessages());
        }
      } catch (error) {
        console.error('[AIChat] Error loading chat history:', error);
      }
    };
    loadChatHistory();
  }, [currentChatId]);

  // Save chat history to AsyncStorage when messages or chat ID change
  useEffect(() => {
    if (!currentChatId || messages.length === 0) return;

    const saveChatHistory = async () => {
      try {
        // Don't save history until the user has sent their first message
        const userHasSentMessage = messages.some(m => m.user._id === USER._id);
        if (!userHasSentMessage) {
          return;
        }
        await AsyncStorage.setItem(`@ai_chat_history_${currentChatId}`, JSON.stringify(messages));
      } catch (error) {
        console.error('[AIChat] Error saving chat history:', error);
      }
    };
    saveChatHistory();
  }, [messages, currentChatId]);

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
          categories: perk.categories || [],
        };
      })
    }));
  };

  const handleAIResponse = async (userMessageText: string) => {
    if (remainingUses <= 0) {
      const errorMessage: Message = {
        _id: Math.random().toString(),
        text: "You've reached your monthly chat limit. Upgrade to continue getting tailored advice, or check back next month!",
        createdAt: new Date(),
        user: AI,
        isLimitReached: true,
      };
      setMessages(previousMessages => {
        const newMessages = previousMessages.map(m => m.pending ? { ...m, pending: false } : m);
        return [errorMessage, ...newMessages];
      });
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
      let groupedRecommendations: GroupedRecommendation[] = [];

      if (result.response.responseType === 'BenefitRecommendation' && result.response.recommendations.length > 0) {
        console.log('[AIChat] Processing recommendations. Full object:', result.response);
        
        adviceText = "Here are a few perks that could help:"; 

        uiRecommendations = result.response.recommendations.map((rec) => {
          const [benefitName, cardName, displayText, remainingValue] = rec;

          // Create a regex to find and remove phrases like "on your [Card Name]"
          const escapedCardName = cardName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
          const cardRemovalRegex = new RegExp(`\\s+(on|from)\\s+(your|the)\\s+(\\*\\*)?${escapedCardName}(\\*\\*)?`, 'gi');
          const cleanedDisplayText = displayText.replace(cardRemovalRegex, '');
          
          let perk: CardPerk | undefined;
          const card = processedCards.find(c => c.card.name === cardName);
          if (card) {
            perk = card.perks.find(p => p.name === benefitName);
          }

          return { benefitName, cardName, displayText: cleanedDisplayText, remainingValue, perk };
        });

        const grouped = uiRecommendations.reduce((acc, rec) => {
          const card = processedCards.find(c => c.card.name === rec.cardName);
          if (!card) return acc;
      
          if (!acc[rec.cardName]) {
              acc[rec.cardName] = {
                  cardName: rec.cardName,
                  cardId: card.card.id,
                  perks: []
              };
          }
          acc[rec.cardName].perks.push(rec);
          return acc;
        }, {} as { [key: string]: GroupedRecommendation });
      
        groupedRecommendations = Object.values(grouped);
      
        // Sort perks within each group by urgency then value
        groupedRecommendations.forEach(group => {
            group.perks.sort((a, b) => {
                const aExpiry = a.perk ? calculatePerkCycleDetails(a.perk, new Date()).daysRemaining : 999;
                const bExpiry = b.perk ? calculatePerkCycleDetails(b.perk, new Date()).daysRemaining : 999;
                if (aExpiry !== bExpiry) {
                    return aExpiry - bExpiry;
                }
                return b.remainingValue - a.remainingValue;
            });
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
        groupedRecommendations: groupedRecommendations,
        createdAt: new Date(),
        user: AI,
        usage: result.usage,
        remainingUses: remainingUses - 1,
      };
      
      setMessages(previousMessages => {
        const newMessages = previousMessages.map(m => m.pending ? { ...m, pending: false } : m);
        return [aiResponse, ...newMessages];
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      await updateChatUsage();

      // Check for upsell opportunity AFTER setting the main response
      if (remainingUses - 1 > 0 && remainingUses - 1 <= UPSELL_THRESHOLD) {
        const upsellMessage: Message = {
            _id: `upsell_${Date.now()}`,
            text: `Heads-up: You have ${remainingUses - 1} free AI queries remaining this month.`,
            createdAt: new Date(new Date().getTime() + 100), // slightly later
            user: AI,
            isUpsell: true,
        };
        // Add the upsell message as a separate bubble
        setMessages(previousMessages => [upsellMessage, ...previousMessages]);
      }

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

  const handleSendQuery = (queryText: string) => {
    const trimmedText = queryText.trim();
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
    setInputText(''); // Clear input field regardless
    handleAIResponse(trimmedText);
  };

  const onSend = () => {
    handleSendQuery(inputText);
  };

  const handleStartOver = () => {
    Alert.alert(
      "Start New Conversation",
      "This will archive your current chat and start a new one. Are you sure?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Start Over",
          style: "default",
          onPress: async () => {
            try {
              const newChatId = `chat_${Date.now()}`;
              // Set the UI first to give immediate feedback
              setMessages(getOnboardingMessages());
              setCurrentChatId(newChatId);
              // Then update storage
              await AsyncStorage.setItem(CURRENT_CHAT_ID_KEY, newChatId);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (error) {
              console.error('[AIChat] Error starting new chat:', error);
              Alert.alert('Error', 'Failed to start a new conversation. Please try again.');
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
      groupedRecommendations={item.groupedRecommendations}
      isUpsell={item.isUpsell}
      isLimitReached={item.isLimitReached}
      onUpgrade={handleUpgrade}
      suggestedPrompts={item.suggestedPrompts}
      onPromptPress={handleSendQuery}
    />
  );

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <ChatHeader 
          onClose={onClose} 
          onStartOver={handleStartOver}
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
    backgroundColor: '#E5F3FF',
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    backgroundColor: '#F7F7F7',
    borderBottomLeftRadius: 4,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  userText: {
    color: '#000000',
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
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E5EA',
  },
  cardHeader: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6D6D72',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingBottom: 4,
  },
  cardGroup: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E5EA',
  },
  recommendationBox: {
    paddingTop: 8,
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
    marginBottom: 10,
  },
  redeemButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 10,
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
  ctaContainer: {
    marginTop: 12,
  },
  upgradeButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  upgradeButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 6,
  },
  promptsContainer: {
    marginTop: 12,
    gap: 8,
  },
  promptButton: {
    backgroundColor: '#E5E5EA',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignSelf: 'flex-start',
  },
  promptButtonText: {
    color: '#000000',
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 20,
  },
});

export default AIChat;
