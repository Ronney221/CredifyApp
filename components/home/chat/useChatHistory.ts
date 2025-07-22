// useChatHistory.ts
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { differenceInHours } from 'date-fns';
import { Message } from './ChatTypes';
import { 
  CURRENT_CHAT_ID_KEY, 
  CHAT_NOTIFICATION_KEY, 
  AI, 
  getOnboardingMessages, 
  getRandomExamples 
} from './ChatConstants';
import { logger } from '../../../utils/logger';

export const useChatHistory = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);

  // Load/set the current chat ID on mount
  useEffect(() => {
    const getChatId = async () => {
      logger.log('[useChatHistory] Getting chat ID.');
      let chatId = await AsyncStorage.getItem(CURRENT_CHAT_ID_KEY);
      if (!chatId) {
        chatId = `chat_${Date.now()}`;
        logger.log('[useChatHistory] No chat ID found, creating new one:', chatId);
        await AsyncStorage.setItem(CURRENT_CHAT_ID_KEY, chatId);
      } else {
        logger.log('[useChatHistory] Found existing chat ID:', chatId);
      }
      setCurrentChatId(chatId);
    };
    getChatId();
  }, []);

  // Load chat history when the chat ID changes
  useEffect(() => {
    if (!currentChatId) return;
    let isMounted = true;

    const loadChatHistory = async () => {
      // Add delay to prevent double load animation
      await new Promise(resolve => setTimeout(resolve, 100));
      
      logger.log('[useChatHistory] Attempting to load chat history for chat ID:', currentChatId);
      try {
        const savedHistory = await AsyncStorage.getItem(`@ai_chat_history_${currentChatId}`);
        if (!isMounted) return;
        
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
            if (isMounted) {
              setMessages([inactivityMessage, ...historyWithDates]);
              // Set the notification flag
              await AsyncStorage.setItem(CHAT_NOTIFICATION_KEY, 'true');
            }
          } else if (isMounted) {
            setMessages(historyWithDates);
          }
          logger.log('[useChatHistory] Successfully loaded', historyWithDates.length, 'messages from history.');
        } else if (isMounted) {
          // Set initial greeting message for a new chat with a small delay
          setTimeout(() => {
            if (isMounted) {
              setMessages(getOnboardingMessages());
              logger.log('[useChatHistory] No chat history found, setting onboarding messages.');
            }
          }, 200);
        }
      } catch (error) {
        console.error('[useChatHistory] Error loading chat history:', error);
      }
    };
    loadChatHistory();

    return () => {
      isMounted = false;
    };
  }, [currentChatId]);

  // Save chat history to AsyncStorage when messages or chat ID change
  useEffect(() => {
    if (!currentChatId || messages.length === 0) return;

    const saveChatHistory = async () => {
      logger.log('[useChatHistory] Attempting to save', messages.length, 'messages to history for chat ID:', currentChatId);
      try {
        // Don't save history until the user has sent their first message
        const userHasSentMessage = messages.some(m => m.user._id === 1); // USER._id
        if (!userHasSentMessage) {
          logger.log('[useChatHistory] User has not sent a message yet, skipping save.');
          return;
        }
        await AsyncStorage.setItem(`@ai_chat_history_${currentChatId}`, JSON.stringify(messages));
        logger.log('[useChatHistory] Successfully saved chat history.');
      } catch (error) {
        console.error('[useChatHistory] Error saving chat history:', error);
      }
    };
    saveChatHistory();
  }, [messages, currentChatId]);

  return {
    messages,
    setMessages,
    currentChatId,
  };
};