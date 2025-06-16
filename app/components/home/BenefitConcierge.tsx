import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUserCards } from '../../hooks/useUserCards';
import { usePerkStatus } from '../../hooks/usePerkStatus';
import { getBenefitAdvice } from '../../../lib/openai';
import { Card, CardPerk } from '../../../src/data/card-data';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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

export default function BenefitConcierge({ onClose }: BenefitConciergeProps) {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const { userCardsWithPerks } = useUserCards();
  const { userCardsWithPerks: processedCards } = usePerkStatus(userCardsWithPerks);

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
  const clearChatHistory = async () => {
    try {
      await AsyncStorage.removeItem(CHAT_HISTORY_KEY);
      setChatHistory([]);
    } catch (error) {
      console.error('[BenefitConcierge] Error clearing chat history:', error);
    }
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

  const handleSubmit = async () => {
    if (!query.trim()) {
      console.log('[BenefitConcierge] Submit attempted with empty query');
      return;
    }

    console.log('[BenefitConcierge] Starting handleSubmit');
    setIsLoading(true);

    try {
      // Validate processedCards
      if (!processedCards || !Array.isArray(processedCards)) {
        throw new Error('Invalid card data');
      }

      console.log('[BenefitConcierge] Processing available perks');
      const availablePerks: AvailablePerk[] = processedCards
        .filter(card => card && card.card && card.perks) // Validate card structure
        .map(card => ({
          cardName: card.card.name,
          perks: card.perks
            .filter(perk => perk && perk.status === 'available')
            .map(perk => ({
              name: perk.name,
              value: perk.value,
              periodMonths: perk.periodMonths || 12 // Default to annual if not specified
            }))
        }))
        .filter(card => card.perks.length > 0);

      if (availablePerks.length === 0) {
        throw new Error('No available perks found');
      }

      console.log('[BenefitConcierge] Available perks:', JSON.stringify(availablePerks, null, 2));
      console.log('[BenefitConcierge] Calling getBenefitAdvice');
      const result = await getBenefitAdvice(query, availablePerks);
      console.log('[BenefitConcierge] Received advice:', result);
      
      // Add to chat history
      const newMessage: ChatMessage = {
        id: Date.now().toString(),
        query: query,
        response: result,
        timestamp: new Date()
      };
      
      setChatHistory(prev => [...prev, newMessage]);
      setQuery(''); // Clear input after successful submission
    } catch (error) {
      console.error('[BenefitConcierge] Error in handleSubmit:', error);
      // Add error message to chat history with more specific error handling
      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        query: query,
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
    } finally {
      console.log('[BenefitConcierge] Finishing handleSubmit');
      setIsLoading(false);
    }
  };

  const handleExamplePrompt = (prompt: string) => {
    setQuery(prompt);
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Benefit Concierge</Text>
        <View style={styles.headerButtons}>
          {chatHistory.length > 0 && (
            <TouchableOpacity onPress={clearChatHistory} style={styles.clearButton}>
              <Ionicons name="trash-outline" size={20} color="#FF3B30" />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="remove-outline" size={24} color="#1C1C1E" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom }
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.description}>
          Ask how to make the most of your available benefits for any situation.
        </Text>

        {/* Chat History */}
        {chatHistory.map((message) => (
          <View key={message.id} style={styles.chatMessageContainer}>
            <View style={styles.queryContainer}>
              <Text style={styles.queryText}>{message.query}</Text>
            </View>
            <View style={styles.chatResponseContainer}>
              <Text style={styles.chatResponseText}>{message.response.advice}</Text>
              <View style={styles.chatUsageContainer}>
                <Text style={styles.chatUsageText}>
                  Tokens used: {message.response.usage.totalTokens} (${message.response.usage.estimatedCost.toFixed(4)})
                </Text>
              </View>
            </View>
          </View>
        ))}

        <View style={styles.examplePromptsContainer}>
          <Text style={styles.examplePromptsTitle}>Try asking about:</Text>
          {EXAMPLE_PROMPTS.map((prompt, index) => (
            <TouchableOpacity
              key={index}
              style={styles.examplePromptButton}
              onPress={() => handleExamplePrompt(prompt.text)}
            >
              <Ionicons name={prompt.icon} size={20} color="#007AFF" style={styles.examplePromptIcon} />
              <Text style={styles.examplePromptText} numberOfLines={2}>{prompt.text}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <View style={[styles.inputContainer, {}]}>
        <TextInput
          style={styles.input}
          value={query}
          onChangeText={setQuery}
          placeholder="e.g., I'm booking a trip to New York for 3 nights..."
          placeholderTextColor="#8E8E93"
          multiline
          maxLength={200}
        />
        <TouchableOpacity
          style={[styles.submitButton, (!query.trim() || isLoading) && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={!query.trim() || isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.submitButtonText}>Get Advice</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
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
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 16,
  },
  description: {
    fontSize: 15,
    color: '#8E8E93',
    marginBottom: 16,
  },
  inputContainer: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
    backgroundColor: '#FFFFFF',
    padding: 8,
    paddingBottom: 0,
  },
  input: {
    backgroundColor: '#F2F2F7',
    borderRadius: 20,
    padding: 12,
    fontSize: 16,
    color: '#1C1C1E',
    minHeight: 40,
    maxHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 8,
  },
  submitButton: {
    backgroundColor: '#007AFF',
    borderRadius: 20,
    padding: 12,
    alignItems: 'center',
    marginBottom: 0,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  chatMessageContainer: {
    marginBottom: 12,
  },
  queryContainer: {
    backgroundColor: '#E5E5EA',
    padding: 12,
    borderRadius: 20,
    marginBottom: 8,
    alignSelf: 'flex-end',
    maxWidth: '85%',
  },
  queryText: {
    fontSize: 16,
    color: '#1C1C1E',
    lineHeight: 20,
  },
  chatResponseContainer: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 20,
    alignSelf: 'flex-start',
    maxWidth: '85%',
  },
  chatResponseText: {
    fontSize: 16,
    color: '#FFFFFF',
    lineHeight: 20,
  },
  chatUsageContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
  },
  chatUsageText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'left',
  },
  examplePromptsContainer: {
    marginTop: 16,
    marginBottom: 16,
  },
  examplePromptsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8E8E93',
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  examplePromptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  examplePromptIcon: {
    marginRight: 12,
  },
  examplePromptText: {
    flex: 1,
    fontSize: 14,
    color: '#007AFF',
    lineHeight: 20,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clearButton: {
    padding: 4,
    marginRight: 8,
  },
}); 