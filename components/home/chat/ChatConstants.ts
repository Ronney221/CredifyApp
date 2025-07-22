// ChatConstants.ts
import { Message } from './ChatTypes';

// --- Constants ---
export const USER = { _id: 1, name: 'User' };
export const AI = { _id: 2, name: 'AI Assistant' };
export const CURRENT_CHAT_ID_KEY = '@ai_chat_current_id';
export const CHAT_USAGE_KEY = '@ai_chat_usage';
export const CHAT_NOTIFICATION_KEY = '@ai_chat_notification_active';
export const MONTHLY_CHAT_LIMIT = 30;
export const UPSELL_THRESHOLD = 5;

// Debug flag - set to false for production
export const DEBUG_MODE = true;

export const EXAMPLE_QUERIES = [
  "How should I pay my Disney+ bill?",
  "I'm booking flights for an international trip to Paris.",
  "What's the best card to use for my lunch order?",
  "I need some new clothes for summer.",
  "Where should I order takeout from tonight?",
  "I'm planning a weekend trip to Chicago.",
  "I need a ride to the airport.",
  "What are the best perks for my vacation to Hawaii?",
  "I want to treat myself to a nice anniversary dinner.",
];

// Performance monitoring constants
export const PERFORMANCE_THRESHOLDS = {
  messageProcessing: 500, // ms
  renderTime: 16, // ms (targeting 60fps)
  memoryCleanup: 30000, // 30 seconds
} as const;

export type PerformanceOperation = keyof typeof PERFORMANCE_THRESHOLDS;

export const performanceMonitor = {
  startTime: 0,
  start() {
    this.startTime = performance.now();
  },
  end(operation: PerformanceOperation) {
    const duration = performance.now() - this.startTime;
    if (duration > PERFORMANCE_THRESHOLDS[operation]) {
      console.warn(`Performance warning: ${operation} took ${duration}ms`);
    }
  }
};

// Export for external use
export { PERFORMANCE_THRESHOLDS };

export const getRandomExamples = (count = 3): string[] => {
  const shuffled = [...EXAMPLE_QUERIES].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};

export const getOnboardingMessages = (): Message[] => {
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