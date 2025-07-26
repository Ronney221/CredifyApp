import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { useOnboardingContext } from '../app/(onboarding)/_context/OnboardingContext';
import { getNotificationPermissions, checkNotificationPermissions } from '../utils/notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LAST_PROMPT_DATE_KEY = '@last_notification_prompt_date';
const PROMPT_COOLDOWN_DAYS = 30; // 30 days between prompts

export function useSmartNotificationPrompts() {
  const { 
    notificationChoice, 
    shouldShowNotificationPrompt, 
    setNotificationChoice,
    hasRedeemedFirstPerk 
  } = useOnboardingContext();
  
  const [lastPromptDate, setLastPromptDate] = useState<Date | null>(null);

  // Load last prompt date
  useEffect(() => {
    const loadLastPromptDate = async () => {
      try {
        const dateStr = await AsyncStorage.getItem(LAST_PROMPT_DATE_KEY);
        if (dateStr) {
          setLastPromptDate(new Date(dateStr));
        }
      } catch (error) {
        console.error('Error loading last prompt date:', error);
      }
    };
    loadLastPromptDate();
  }, []);

  const shouldShowPromptNow = useCallback(() => {
    // Don't show if notifications are already enabled
    if (notificationChoice === 'enable') return false;
    
    // Don't show if we shouldn't show notification prompt at all
    if (!shouldShowNotificationPrompt()) return false;
    
    // Check cooldown period
    if (lastPromptDate) {
      const daysSinceLastPrompt = (Date.now() - lastPromptDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceLastPrompt < PROMPT_COOLDOWN_DAYS) return false;
    }
    
    return true;
  }, [notificationChoice, shouldShowNotificationPrompt, lastPromptDate]);

  const updateLastPromptDate = async () => {
    const now = new Date();
    try {
      await AsyncStorage.setItem(LAST_PROMPT_DATE_KEY, now.toISOString());
      setLastPromptDate(now);
    } catch (error) {
      console.error('Error saving last prompt date:', error);
    }
  };

  // Prompt after first perk redemption
  const promptAfterFirstPerk = useCallback(async () => {
    if (!shouldShowPromptNow() || !hasRedeemedFirstPerk) return;
    
    await updateLastPromptDate();
    
    Alert.alert(
      "🎉 You just saved money!",
      "You saved with your first perk! Enable smart reminders so you never miss out on your other benefits worth hundreds more.",
      [
        {
          text: "Not Now",
          style: "cancel",
          onPress: async () => {
            await setNotificationChoice('declined');
          }
        },
        {
          text: "Enable Reminders",
          onPress: async () => {
            try {
              const granted = await getNotificationPermissions();
              await setNotificationChoice(granted ? 'enable' : 'declined');
            } catch (error) {
              console.error('Error requesting permissions:', error);
              await setNotificationChoice('declined');
            }
          }
        }
      ]
    );
  }, [shouldShowPromptNow, hasRedeemedFirstPerk, setNotificationChoice]);

  // Prompt when viewing insights/savings
  const promptAfterViewingSavings = useCallback(async (totalSavings: number) => {
    if (!shouldShowPromptNow()) return;
    
    await updateLastPromptDate();
    
    Alert.alert(
      "💰 You've saved $" + Math.floor(totalSavings) + "!",
      "Enable smart reminders to maximize your remaining perks and never miss out on future savings.",
      [
        {
          text: "Maybe Later",
          style: "cancel",
          onPress: async () => {
            await setNotificationChoice('later');
          }
        },
        {
          text: "Enable Reminders",
          onPress: async () => {
            try {
              const granted = await getNotificationPermissions();
              await setNotificationChoice(granted ? 'enable' : 'declined');
            } catch (error) {
              console.error('Error requesting permissions:', error);
              await setNotificationChoice('declined');
            }
          }
        }
      ]
    );
  }, [shouldShowPromptNow, setNotificationChoice]);

  // Check if user has notifications enabled at OS level
  const checkNotificationStatus = useCallback(async () => {
    const hasPermissions = await checkNotificationPermissions();
    if (hasPermissions && notificationChoice !== 'enable') {
      // User granted permissions outside the app, update our state
      await setNotificationChoice('enable');
    }
    return hasPermissions;
  }, [notificationChoice, setNotificationChoice]);

  return {
    shouldShowPromptNow,
    promptAfterFirstPerk,
    promptAfterViewingSavings,
    checkNotificationStatus,
    notificationChoice,
  };
}