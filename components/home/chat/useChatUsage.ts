// useChatUsage.ts
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ChatUsage } from './ChatTypes';
import { CHAT_USAGE_KEY, MONTHLY_CHAT_LIMIT } from './ChatConstants';
import { logger } from '../../../utils/logger';

export const useChatUsage = () => {
  const [remainingUses, setRemainingUses] = useState(MONTHLY_CHAT_LIMIT);

  // Load chat usage from AsyncStorage
  useEffect(() => {
    const loadChatUsage = async () => {
      logger.log('[useChatUsage] Loading chat usage stats.');
      try {
        const savedUsage = await AsyncStorage.getItem(CHAT_USAGE_KEY);
        if (savedUsage) {
          const usage: ChatUsage = JSON.parse(savedUsage);
          const lastReset = new Date(usage.lastResetDate);
          const now = new Date();
          
          // Check if we need to reset the counter (new month)
          if (lastReset.getMonth() !== now.getMonth() || lastReset.getFullYear() !== now.getFullYear()) {
            logger.log('[useChatUsage] New month detected. Resetting chat usage limit.');
            setRemainingUses(MONTHLY_CHAT_LIMIT);
            await AsyncStorage.setItem(CHAT_USAGE_KEY, JSON.stringify({
              remainingUses: MONTHLY_CHAT_LIMIT,
              lastResetDate: now.toISOString()
            }));
          } else {
            setRemainingUses(usage.remainingUses);
            logger.log('[useChatUsage] Loaded remaining uses:', usage.remainingUses);
          }
        } else {
          // First time user
          logger.log('[useChatUsage] No usage stats found. Initializing for first-time user.');
          setRemainingUses(MONTHLY_CHAT_LIMIT);
          await AsyncStorage.setItem(CHAT_USAGE_KEY, JSON.stringify({
            remainingUses: MONTHLY_CHAT_LIMIT,
            lastResetDate: new Date().toISOString()
          }));
        }
      } catch (error) {
        console.error('[useChatUsage] Error loading chat usage:', error);
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
      console.error('[useChatUsage] Error updating chat usage:', error);
    }
  };

  return {
    remainingUses,
    updateChatUsage,
  };
};