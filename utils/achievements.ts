import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  category: 'streak' | 'value' | 'efficiency' | 'mastery' | 'fee_recovery';
  icon: string; // Ionicons name
  targetValue: number;
  currentValue: number;
  isUnlocked: boolean;
  unlockedAt?: string; // ISO date string
  progress: number; // 0-1
}

export interface AchievementProgress {
  achievements: Achievement[];
  totalUnlocked: number;
  recentlyUnlocked: Achievement[];
}

const ACHIEVEMENTS_STORAGE_KEY = '@achievements_progress';

// Define all available achievements
export const ACHIEVEMENT_DEFINITIONS: Omit<Achievement, 'currentValue' | 'isUnlocked' | 'unlockedAt' | 'progress'>[] = [
  // Streak Achievements
  {
    id: 'streak_3_months',
    title: 'Getting Started',
    description: 'Redeem perks for 3 consecutive months',
    category: 'streak',
    icon: 'flame-outline',
    targetValue: 3,
  },
  {
    id: 'streak_6_months',
    title: 'Consistent Saver',
    description: 'Redeem perks for 6 consecutive months',
    category: 'streak',
    icon: 'trending-up-outline',
    targetValue: 6,
  },
  {
    id: 'streak_12_months',
    title: 'Redemption Master',
    description: 'Redeem perks for 12 consecutive months',
    category: 'streak',
    icon: 'trophy-outline',
    targetValue: 12,
  },

  // Value Milestones
  {
    id: 'value_500',
    title: 'First $500',
    description: 'Save your first $500 in perk value',
    category: 'value',
    icon: 'cash-outline',
    targetValue: 500,
  },
  {
    id: 'value_1000',
    title: 'Grand Saver',
    description: 'Save $1,000 in total perk value',
    category: 'value',
    icon: 'wallet-outline',
    targetValue: 1000,
  },
  {
    id: 'value_2500',
    title: 'Elite Saver',
    description: 'Save $2,500 in total perk value',
    category: 'value',
    icon: 'diamond-outline',
    targetValue: 2500,
  },

  // Efficiency Badges
  {
    id: 'efficiency_80',
    title: 'Efficiency Expert',
    description: 'Achieve 80% perk utilization rate',
    category: 'efficiency',
    icon: 'speedometer-outline',
    targetValue: 80,
  },
  {
    id: 'efficiency_90',
    title: 'Near Perfect',
    description: 'Achieve 90% perk utilization rate',
    category: 'efficiency',
    icon: 'medal-outline',
    targetValue: 90,
  },
  {
    id: 'efficiency_95',
    title: 'Perfection',
    description: 'Achieve 95% perk utilization rate',
    category: 'efficiency',
    icon: 'star-outline',
    targetValue: 95,
  },

  // Fee Recovery
  {
    id: 'fee_recovery_100',
    title: 'Fee Crusher',
    description: 'Cover 100% of your annual fees with perk value',
    category: 'fee_recovery',
    icon: 'shield-checkmark-outline',
    targetValue: 100,
  },
  {
    id: 'fee_recovery_150',
    title: 'Profit Maker',
    description: 'Save 150% of your annual fees in perk value',
    category: 'fee_recovery',
    icon: 'trending-up',
    targetValue: 150,
  },
];

export interface AchievementData {
  totalValueRedeemed: number;
  consecutiveMonthsStreak: number;
  utilizationRate: number; // 0-100
  feeRecoveryRate: number; // 0-100+
  totalAnnualFees: number;
}

export const calculateAchievements = async (data: AchievementData): Promise<AchievementProgress> => {
  try {
    // Load existing progress
    const existingProgressJson = await AsyncStorage.getItem(ACHIEVEMENTS_STORAGE_KEY);
    const existingProgress: Achievement[] = existingProgressJson 
      ? JSON.parse(existingProgressJson)
      : [];

    const achievements: Achievement[] = ACHIEVEMENT_DEFINITIONS.map(def => {
      const existing = existingProgress.find(a => a.id === def.id);
      
      let currentValue = 0;
      switch (def.category) {
        case 'streak':
          currentValue = data.consecutiveMonthsStreak;
          break;
        case 'value':
          currentValue = data.totalValueRedeemed;
          break;
        case 'efficiency':
          currentValue = data.utilizationRate;
          break;
        case 'fee_recovery':
          currentValue = data.feeRecoveryRate;
          break;
      }

      const progress = Math.min(currentValue / def.targetValue, 1);
      const isUnlocked = currentValue >= def.targetValue;
      
      // Check if this is newly unlocked
      const wasUnlocked = existing?.isUnlocked || false;
      const isNewlyUnlocked = isUnlocked && !wasUnlocked;

      return {
        ...def,
        currentValue,
        isUnlocked,
        unlockedAt: isNewlyUnlocked ? new Date().toISOString() : existing?.unlockedAt,
        progress,
      };
    });

    // Find recently unlocked achievements (within last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recentlyUnlocked = achievements.filter(achievement => 
      achievement.unlockedAt && 
      new Date(achievement.unlockedAt) > sevenDaysAgo
    );

    const result: AchievementProgress = {
      achievements,
      totalUnlocked: achievements.filter(a => a.isUnlocked).length,
      recentlyUnlocked,
    };

    // Save updated progress
    await AsyncStorage.setItem(ACHIEVEMENTS_STORAGE_KEY, JSON.stringify(achievements));

    return result;
  } catch (error) {
    console.error('Error calculating achievements:', error);
    // Return default state on error
    return {
      achievements: ACHIEVEMENT_DEFINITIONS.map(def => ({
        ...def,
        currentValue: 0,
        isUnlocked: false,
        progress: 0,
      })),
      totalUnlocked: 0,
      recentlyUnlocked: [],
    };
  }
};

export const getAchievementsByCategory = (achievements: Achievement[]) => {
  return achievements.reduce((acc, achievement) => {
    if (!acc[achievement.category]) {
      acc[achievement.category] = [];
    }
    acc[achievement.category].push(achievement);
    return acc;
  }, {} as Record<Achievement['category'], Achievement[]>);
};

export const getNextMilestone = (achievements: Achievement[]): Achievement | null => {
  const lockedAchievements = achievements
    .filter(a => !a.isUnlocked)
    .sort((a, b) => b.progress - a.progress);
  
  return lockedAchievements[0] || null;
};

export const clearAchievementsProgress = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(ACHIEVEMENTS_STORAGE_KEY);
  } catch (error) {
    console.error('Error clearing achievements progress:', error);
  }
};