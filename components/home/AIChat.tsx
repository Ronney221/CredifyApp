// AIChat.tsx
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
  useColorScheme,
  InteractionManager,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';
import { FlatList } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUserCards } from '../../hooks/useUserCards';
import { usePerkStatus } from '../../hooks/usePerkStatus';
import { getBenefitAdvice } from '../../lib/openai';
import { format, differenceInDays, endOfMonth, endOfYear, addMonths, getMonth, getYear, differenceInHours } from 'date-fns';
import { CardPerk, openPerkTarget, allCards } from '../../src/data/card-data';
import { getRelevantPerks, MinifiedCard, MinifiedPerk } from '../../utils/perk-matcher';

import { useAuth } from '../../contexts/AuthContext';
import { logger } from '../../utils/logger';

// Import new components and hooks
import { ChatInput } from './chat/ChatInput';
import { ChatTypingIndicator } from './chat/ChatTypingIndicator';
import { useChatHistory } from './chat/useChatHistory';
import { useChatUsage } from './chat/useChatUsage';
import {
  Message,
  UIBenefitRecommendation,
  GroupedRecommendation,
  ProcessedCard,
  CardData,
  TokenUsage,
  BenefitRecommendationTuple,
  AIResponse,
} from './chat/ChatTypes';
import {
  USER,
  AI,
  MONTHLY_CHAT_LIMIT,
  UPSELL_THRESHOLD,
  performanceMonitor,
  getRandomExamples,
  PERFORMANCE_THRESHOLDS,
} from './chat/ChatConstants';

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

// Helper function to minify card data for the AI prompt
const minifyCardData = (cards: ProcessedCard[]): MinifiedCard[] => {
  logger.log('[AIChat][minifyCardData] Starting data minification for', cards.length, 'cards.');
  const currentDate = new Date();
  const minified = cards.map(card => {
      const minifiedPerks = card.perks.map((perk: CardPerk) => {
          let expiryDate: string | null = perk.endDate || null;
          if (!expiryDate && perk.periodMonths) {
              const { cycleEndDate } = calculatePerkCycleDetails(perk, currentDate);
              expiryDate = format(cycleEndDate, 'yyyy-MM-dd');
          }

          let status_min: 'a' | 'p' | 'r';
          switch (perk.status) {
              case 'available':
                  status_min = 'a';
                  break;
              case 'partially_redeemed':
                  status_min = 'p';
                  break;
              case 'redeemed':
                  status_min = 'r';
                  break;
              default:
                  status_min = 'a';
          }
          
          return {
              i: perk.id,
              n: perk.name,
              rv: perk.remaining_value ?? perk.value,
              s: status_min,
              e: expiryDate,
              c: perk.categories || [],
          };
      });
      return {
          cn: card.name,
          p: minifiedPerks
      };
  });
  logger.log('[AIChat][minifyCardData] Minification complete.');
  return minified;
};

// --- Header Component ---
const ChatHeader = ({ onClose, onStartOver, hasMessages, isTyping, remainingUses }: { 
  onClose: () => void;
  onStartOver: () => void;
  hasMessages: boolean;
  isTyping?: boolean;
  remainingUses?: number;
}) => {
  const [contextText, setContextText] = useState<string>('');

  useEffect(() => {
    if (isTyping) {
      setContextText('AI is thinking...');
    } else if (remainingUses !== undefined) {
      setContextText(`${remainingUses} queries remaining`);
    } else {
      setContextText('Your AI assistant');
    }
  }, [isTyping, remainingUses]);

  return (
    <BlurView intensity={80} tint="systemUltraThinMaterialLight" style={styles.headerBlur}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Credify AI</Text>
            <View style={styles.contextContainer}>
              {isTyping && (
                <View style={styles.typingDots}>
                  <Animated.View style={[styles.dot, styles.dot1]} />
                  <Animated.View style={[styles.dot, styles.dot2]} />
                  <Animated.View style={[styles.dot, styles.dot3]} />
                </View>
              )}
              <Text style={styles.contextText}>{contextText}</Text>
            </View>
          </View>
        </View>
        <View style={styles.headerButtons}>
          <Pressable 
            onPress={onStartOver}
            hitSlop={10}
            style={({ pressed }) => [
              styles.headerButton,
              pressed && { opacity: 0.7 }
            ]}
            accessibilityLabel="Get suggested prompts"
            accessibilityHint="Shows a list of example questions you can ask"
          >
            <Ionicons 
              name="bulb-outline" 
              size={22} 
              color="#007AFF" 
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
};

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
    <MotiView
      from={{ opacity: 0, translateY: 20, scale: 0.95 }}
      animate={{ opacity: pending ? 0.7 : 1, translateY: 0, scale: 1 }}
      transition={{
        type: 'spring',
        damping: 20,
        stiffness: 300,
        mass: 0.8,
      }}
      style={[
        styles.messageRow,
        { justifyContent: isAI ? 'flex-start' : 'flex-end' },
      ]}
    >
      {isAI ? (
        <View style={[styles.messageBubble, styles.aiBubble]}>
          <LinearGradient
            colors={['#F8FAFF', '#F0F4FF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradientBackground}
          />
          {/* Render the main text */}
          {text && text.length > 0 && (
            <Text style={[styles.messageText, styles.aiText]}>
              {formatTextWithBold(text)}
            </Text>
          )}
  
          {/* Render the interactive recommendations if they exist */}
          {groupedRecommendations && groupedRecommendations.length > 0 && (
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
    
          {/* Clickable Suggested Prompts */}
          {suggestedPrompts && onPromptPress && (
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
    
          {/* Upsell and Limit Reached CTAs */}
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
    
          {/* Debug info */}
          <View style={styles.debugContainer}>
            {remainingUses !== undefined && (
              <Text style={styles.usageText}>
                {remainingUses} chats remaining this month
              </Text>
            )}
          </View>
        </View>
      ) : (
        <LinearGradient
          colors={['#007AFF', '#0051D5']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.messageBubble, styles.userBubble]}
        >
          {/* Render the main text */}
          {text && text.length > 0 && (
            <Text style={[styles.messageText, styles.userText]}>
              {formatTextWithBold(text)}
            </Text>
          )}
        </LinearGradient>
      )}
    </MotiView>
  );
};


// --- Main Chat Component ---
const AIChat = ({ onClose }: { onClose: () => void }) => {
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);
  const sendButtonScale = useRef(new Animated.Value(0)).current;
  
  // Use custom hooks
  const { messages, setMessages, currentChatId } = useChatHistory();
  const { remainingUses, updateChatUsage } = useChatUsage();
  const { userCardsWithPerks } = useUserCards();
  const { userCardsWithPerks: rawCardData } = usePerkStatus(userCardsWithPerks);
  const [processedCards, setProcessedCards] = useState<ProcessedCard[]>([]);

  // Update processedCards when rawCardData changes
  useEffect(() => {
    if (rawCardData) {
      setProcessedCards(rawCardData.map((cardData: CardData) => ({
        id: cardData.card.id,
        name: cardData.card.name,
        perks: cardData.perks,
        card: cardData.card
      })));
    }
  }, [rawCardData]);

  const handleUpgrade = () => {
    logger.log('[AIChat][handleUpgrade] Upgrade button pressed.');
    // For now, show an alert. Later, this could navigate to a paywall.
    Alert.alert(
      "Upgrade to Pro",
      "Unlock unlimited insights and chat history for just $2.99/month.",
      [
        { text: "Maybe Later", style: "cancel" },
        { text: "Upgrade Now", onPress: () => logger.log("Navigate to paywall") }
      ]
    );
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

  // Memory management
  useEffect(() => {
    let isSubscribed = true;
    let cleanupTimer: ReturnType<typeof setInterval>;

    const setupMemoryManagement = () => {
      cleanupTimer = setInterval(() => {
        if (!isSubscribed) return;

        InteractionManager.runAfterInteractions(() => {
          // Clear old messages beyond a certain limit
          setMessages(prev => prev.slice(0, 50)); // Keep last 50 messages
          
          // Clear large data structures that are no longer needed
          setProcessedCards(prev => prev.length > 20 ? prev.slice(0, 20) : prev);

          // Force garbage collection if available
          if (global.gc) {
            try {
              global.gc();
            } catch (e) {
              logger.warn('Failed to run garbage collection:', e);
            }
          }
        });
      }, PERFORMANCE_THRESHOLDS.memoryCleanup);
    };

    setupMemoryManagement();

    return () => {
      isSubscribed = false;
      if (cleanupTimer) {
        clearInterval(cleanupTimer);
      }
      // Clear data on unmount
      setMessages([]);
      setProcessedCards([]);
    };
  }, []);

  // Enhanced error handling for API calls
  const handleAIResponse = async (userMessageText: string) => {
    performanceMonitor.start();
    logger.log(`[AIChat][handleAIResponse] Starting AI response flow for query: "${userMessageText}"`);

    if (remainingUses <= 0) {
      logger.log('[AIChat][handleAIResponse] User has reached their monthly limit.');
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
      // Validate input data
      if (!processedCards?.length) {
        throw new Error('No card data available');
      }

      // Memory-efficient processing
      const currentDate = new Date();
      const usablePerksData = processedCards.reduce<ProcessedCard[]>((acc, cardData) => {
        const validPerks = cardData.perks.filter(perk => 
          perk.status === 'available' || perk.status === 'partially_redeemed'
        );
        
        if (validPerks.length) {
          acc.push({
            id: cardData.id,
            name: cardData.name,
            perks: validPerks,
            card: cardData.card
          });
        }
        return acc;
      }, []);

      logger.log(`[AIChat][handleAIResponse] Found ${usablePerksData.length} cards with usable perks.`);

      // Batch processing for better memory usage
      const batchSize = 5;
      const processedResults: ProcessedCard[] = [];
      
      for (let i = 0; i < usablePerksData.length; i += batchSize) {
        const batch = usablePerksData.slice(i, i + batchSize);
        const batchResults = batch.map(card => {
          const perks = card.perks.sort((a: CardPerk, b: CardPerk) => {
            const aDetails = calculatePerkCycleDetails(a, currentDate);
            const bDetails = calculatePerkCycleDetails(b, currentDate);
            return (aDetails.daysRemaining - bDetails.daysRemaining) || 
                   ((b.remaining_value ?? b.value) - (a.remaining_value ?? a.value));
          });
          return { ...card, perks } as ProcessedCard;
        });
        processedResults.push(...batchResults);
      }

      // 2. Now transform the clean, sorted, usable data.
      const minifiedCards = minifyCardData(processedResults);

      if (minifiedCards.length === 0) {
        throw new Error('No available perks found after minification.');
      }
      
      logger.log('[AIChat][handleAIResponse] Minified data prepared. Calling getBenefitAdvice.');
      // STAGE 1: LOCAL PRE-FILTERING to find all potentially relevant perks
      const allMinifiedCards = minifyCardData(processedCards);
      const relevantCards = getRelevantPerks(userMessageText, allMinifiedCards);

      // STAGE 2: FINAL FILTERING to only send perks the user can actually use
      const usableRelevantCards = relevantCards.map((card: MinifiedCard) => ({
          ...card,
          p: card.p.filter((perk: MinifiedPerk) => perk.s === 'a' || perk.s === 'p')
      })).filter((card: MinifiedCard) => card.p.length > 0);


      // If our local search finds nothing usable, we don't need to call the AI at all.
      if (usableRelevantCards.length === 0) {
        logger.log('[AIChat][handleAIResponse] No usable perks found after all filtering. Returning NoBenefitFound.');
        // This is a special case where we generate the response locally
        const noBenefitMessage: Message = {
          _id: Math.random().toString(),
          text: "I couldn't find any relevant benefits for that. Try asking about dining, travel, or shopping benefits!",
          createdAt: new Date(),
          user: AI,
          responseType: 'NoBenefitFound'
        };
        
        setMessages(previousMessages => {
          const newMessages = previousMessages.map(m => m.pending ? { ...m, pending: false } : m);
          return [noBenefitMessage, ...newMessages];
        });
        setIsTyping(false);
        return; // Stop execution here
      }

      logger.log('[AIChat][handleAIResponse] Usable, relevant cards prepared. Calling getBenefitAdvice.');
      const result = await getBenefitAdvice(userMessageText, usableRelevantCards);
      logger.log('[AIChat][handleAIResponse] Received advice from OpenAI:', result.response.responseType);

      let adviceText = '';
      let uiRecommendations: UIBenefitRecommendation[] = [];
      let groupedRecommendations: GroupedRecommendation[] = [];

      if (result.response.responseType === 'BenefitRecommendation' && Array.isArray(result.response.recommendations) && result.response.recommendations.length > 0) {
        logger.log('[AIChat][handleAIResponse] Processing recommendations. Full object:', JSON.stringify(result.response, null, 2));
        
        adviceText = "Here are a few perks that could help:"; 

        const validRecommendations = result.response.recommendations
          .filter(rec => {
            try {
              return Array.isArray(rec) && rec.length === 4 && 
                     rec.every(item => item !== null && item !== undefined);
            } catch (err) {
              logger.warn('[AIChat] Error filtering recommendation:', err);
              return false;
            }
          })
          .map((rec): UIBenefitRecommendation | null => {
            try {
            const [benefitName, cardName, displayText, remainingValue] = rec;
            
            if (!benefitName || !cardName || !displayText || typeof remainingValue !== 'number') {
              return null;
            }

              // Safer string manipulation
              let cleanedDisplayText = displayText;
              try {
                if (typeof cardName === 'string' && cardName.length > 0) {
                  // Expanded list of phrases to handle more variations
                  const phrases = [
                    // Basic card references
                    ` on your ${cardName}`,
                    ` from your ${cardName}`,
                    ` on the ${cardName}`,
                    ` from the ${cardName}`,
                    ` with your ${cardName}`,
                    ` with the ${cardName}`,
                    ` using your ${cardName}`,
                    ` using the ${cardName}`,
                    ` through your ${cardName}`,
                    ` through the ${cardName}`,
                    
                    // Markdown variations
                    ` on your **${cardName}**`,
                    ` from your **${cardName}**`,
                    ` on the **${cardName}**`,
                    ` from the **${cardName}**`,
                    ` with your **${cardName}**`,
                    ` with the **${cardName}**`,
                    ` using your **${cardName}**`,
                    ` using the **${cardName}**`,
                    ` through your **${cardName}**`,
                    ` through the **${cardName}**`,

                    // Card-specific variations
                    ` on ${cardName}`,
                    ` from ${cardName}`,
                    ` with ${cardName}`,
                    ` using ${cardName}`,
                    ` through ${cardName}`,
                    
                    // Possessive variations
                    ` on ${cardName}'s`,
                    ` from ${cardName}'s`,
                    ` with ${cardName}'s`,
                    ` using ${cardName}'s`,
                    ` through ${cardName}'s`,

                    // Handle variations with no space prefix
                    `on your ${cardName}`,
                    `from your ${cardName}`,
                    `with your ${cardName}`,
                    `using your ${cardName}`,
                    `through your ${cardName}`
                  ];

                  // First try exact matches
                  phrases.forEach(phrase => {
                    cleanedDisplayText = cleanedDisplayText.replace(phrase, '');
                  });

                  // Then try case-insensitive matches for any remaining instances
                  phrases.forEach(phrase => {
                    const lowerPhrase = phrase.toLowerCase();
                    const lowerText = cleanedDisplayText.toLowerCase();
                    if (lowerText.includes(lowerPhrase)) {
                      // Find the actual case in the original text
                      const startIndex = lowerText.indexOf(lowerPhrase);
                      if (startIndex !== -1) {
                        const before = cleanedDisplayText.slice(0, startIndex);
                        const after = cleanedDisplayText.slice(startIndex + phrase.length);
                        cleanedDisplayText = before + after;
                      }
                    }
                  });

                  // Clean up any double spaces that might have been created
                  cleanedDisplayText = cleanedDisplayText.replace(/\s+/g, ' ').trim();
                }
              } catch (err) {
                logger.warn('[AIChat] Error cleaning display text:', err);
                cleanedDisplayText = displayText; // Fallback to original
              }
            
            let perk: CardPerk | undefined;
            const matchedCard = processedCards?.find(c => c.name === cardName);
            if (matchedCard) {
              perk = matchedCard.perks?.find(p => p?.name === benefitName);
            }

            return { benefitName, cardName, displayText: cleanedDisplayText, remainingValue, perk };
            } catch (err) {
              logger.warn('[AIChat] Error mapping recommendation:', err);
              return null;
            }
          })
          .filter((rec): rec is UIBenefitRecommendation => rec !== null);

        uiRecommendations = validRecommendations;

        const grouped = validRecommendations.reduce<{ [key: string]: GroupedRecommendation }>((acc, rec) => {
          const matchedCard = processedCards?.find(c => c.name === rec.cardName);
          if (!matchedCard) return acc;
      
          if (!acc[rec.cardName]) {
              acc[rec.cardName] = {
                  cardName: rec.cardName,
                  cardId: matchedCard.id,
                  perks: []
              };
          }
          acc[rec.cardName].perks.push(rec);
          return acc;
        }, {});
      
        groupedRecommendations = Object.values(grouped);
        logger.log(`[AIChat][handleAIResponse] Created ${groupedRecommendations.length} UI groups for recommendations.`);
      
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
      logger.log(`[AIChat][handleAIResponse] Final AI response text: "${adviceText}"`);

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
      logger.log(`[AIChat][handleAIResponse] Chat usage updated. Remaining uses: ${remainingUses - 1}`);

      // Check for upsell opportunity AFTER setting the main response
      if (remainingUses - 1 > 0 && remainingUses - 1 <= UPSELL_THRESHOLD) {
        logger.log('[AIChat][handleAIResponse] User has entered the upsell threshold.');
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
      console.error('[AIChat][handleAIResponse] Error:', error);
      const errorMessage = {
        _id: Math.random().toString(),
        text: "I encountered an error processing your request. Please try again.",
        createdAt: new Date(),
        user: AI,
      };
      setMessages(prev => [errorMessage, ...prev.filter(m => !m.pending)]);
    } finally {
      setIsTyping(false);
      performanceMonitor.end('messageProcessing');
    }
  };

  const handleSendQuery = (queryText: string) => {
    const trimmedText = queryText.trim();
    if (trimmedText.length === 0) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    logger.log(`[AIChat][handleSendQuery] User sent new query: "${trimmedText}"`);

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
    // Keep input focused after sending
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  const handleStartOver = () => {
    logger.log('[AIChat][handleStartOver] User requested suggested prompts.');
    const suggestedPrompts = getRandomExamples(3);
    const suggestedPromptsMessage: Message = {
      _id: `suggestions_${Date.now()}`,
      text: "Here are some things you can ask me about:",
      createdAt: new Date(),
      user: AI,
      suggestedPrompts,
    };
    setMessages(prev => [suggestedPromptsMessage, ...prev]);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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
      <StatusBar 
        style="dark"
        backgroundColor="transparent"
        translucent={true}
      />
      <SafeAreaView style={styles.container} edges={['right', 'left']}>
        <ChatHeader 
          onClose={onClose} 
          onStartOver={handleStartOver}
          hasMessages={messages.length > 1}
          isTyping={isTyping}
          remainingUses={remainingUses}
        />
        <KeyboardAvoidingView
          style={styles.flex_1}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
          enabled
          keyboardShouldPersistTaps="always"
        >
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderItem}
            keyExtractor={(item) => item._id.toString()}
            style={styles.messageList}
            contentContainerStyle={styles.messageListContent}
            inverted
            keyboardShouldPersistTaps="always"
            showsVerticalScrollIndicator={false}
          />

          <ChatTypingIndicator isVisible={isTyping} />

          <ChatInput
            inputText={inputText}
            onChangeText={setInputText}
            onSend={onSend}
            sendButtonScale={sendButtonScale}
            inputRef={inputRef}
          />
        </KeyboardAvoidingView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFE',
  },
  flex_1: {
    flex: 1,
  },
  headerBlur: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0, 0, 0, 0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerLeft: {
    flex: 1,
  },
  headerTitleContainer: {
    flexDirection: 'column',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: -0.6,
    marginBottom: 2,
  },
  contextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contextText: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '500',
  },
  typingDots: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 6,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#007AFF',
    marginHorizontal: 1,
  },
  dot1: {
    opacity: 0.4,
  },
  dot2: {
    opacity: 0.7,
  },
  dot3: {
    opacity: 1,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  headerButton: {
    padding: 8,
    borderRadius: 8,
  },
  headerButtonText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
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
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 22,
    maxWidth: '80%',
    position: 'relative',
    overflow: 'hidden',
  },
  gradientBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 22,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
    letterSpacing: -0.3,
    fontWeight: '500',
  },
  userBubble: {
    borderBottomRightRadius: 8,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  aiBubble: {
    borderBottomLeftRadius: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(0, 122, 255, 0.1)',
  },
  userText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  aiText: {
    color: '#1D1D1F',
    fontWeight: '500',
  },
  boldText: {
    fontWeight: '600',
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
