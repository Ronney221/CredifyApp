import AsyncStorage from '@react-native-async-storage/async-storage';

interface MonthlyRedemption {
  year: number;
  month: number;
  hadRedemption: boolean;
  valueRedeemed: number;
}

const STREAK_STORAGE_KEY = '@redemption_streak_history';

export const updateMonthlyStreak = async (hasRedemption: boolean, valueRedeemed: number = 0): Promise<void> => {
  try {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 1-based month

    // Get existing streak data
    const existingDataJson = await AsyncStorage.getItem(STREAK_STORAGE_KEY);
    const existingData: MonthlyRedemption[] = existingDataJson ? JSON.parse(existingDataJson) : [];

    // Check if we already have an entry for this month
    const existingEntryIndex = existingData.findIndex(
      entry => entry.year === currentYear && entry.month === currentMonth
    );

    const newEntry: MonthlyRedemption = {
      year: currentYear,
      month: currentMonth,
      hadRedemption: hasRedemption,
      valueRedeemed: valueRedeemed
    };

    if (existingEntryIndex >= 0) {
      // Update existing entry
      existingData[existingEntryIndex] = {
        ...existingData[existingEntryIndex],
        hadRedemption: existingData[existingEntryIndex].hadRedemption || hasRedemption,
        valueRedeemed: existingData[existingEntryIndex].valueRedeemed + valueRedeemed
      };
    } else {
      // Add new entry
      existingData.push(newEntry);
    }

    // Sort by year and month (most recent first)
    existingData.sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.month - a.month;
    });

    // Keep only last 24 months to prevent storage bloat
    const trimmedData = existingData.slice(0, 24);

    await AsyncStorage.setItem(STREAK_STORAGE_KEY, JSON.stringify(trimmedData));
  } catch (error) {
    console.error('Error updating monthly streak:', error);
  }
};

export const calculateCurrentStreak = async (): Promise<number> => {
  try {
    const existingDataJson = await AsyncStorage.getItem(STREAK_STORAGE_KEY);
    if (!existingDataJson) return 0;

    const streakData: MonthlyRedemption[] = JSON.parse(existingDataJson);
    if (streakData.length === 0) return 0;

    // Sort by year and month (most recent first)
    streakData.sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.month - a.month;
    });

    let consecutiveMonths = 0;
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    // Start from current month and work backwards
    let checkYear = currentYear;
    let checkMonth = currentMonth;

    for (let i = 0; i < streakData.length; i++) {
      const entry = streakData.find(e => e.year === checkYear && e.month === checkMonth);
      
      if (entry && entry.hadRedemption) {
        consecutiveMonths++;
      } else if (checkYear === currentYear && checkMonth === currentMonth) {
        // Current month hasn't had redemptions yet, but don't break streak
        // Continue to previous month
      } else {
        // Break in streak found
        break;
      }

      // Move to previous month
      checkMonth--;
      if (checkMonth === 0) {
        checkMonth = 12;
        checkYear--;
      }
    }

    return consecutiveMonths;
  } catch (error) {
    console.error('Error calculating current streak:', error);
    return 0;
  }
};

export const getStreakHistory = async (): Promise<MonthlyRedemption[]> => {
  try {
    const existingDataJson = await AsyncStorage.getItem(STREAK_STORAGE_KEY);
    return existingDataJson ? JSON.parse(existingDataJson) : [];
  } catch (error) {
    console.error('Error getting streak history:', error);
    return [];
  }
};

export const clearStreakHistory = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(STREAK_STORAGE_KEY);
  } catch (error) {
    console.error('Error clearing streak history:', error);
  }
};

// Helper function to initialize streak from existing redemption data
export const initializeStreakFromRedemptions = async (redemptions: any[]): Promise<void> => {
  try {
    // Clear existing data
    await clearStreakHistory();

    // Group redemptions by month/year
    const monthlyData: Record<string, MonthlyRedemption> = {};

    redemptions.forEach(redemption => {
      const date = new Date(redemption.redemption_date);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const key = `${year}-${month}`;

      if (!monthlyData[key]) {
        monthlyData[key] = {
          year,
          month,
          hadRedemption: false,
          valueRedeemed: 0
        };
      }

      if (redemption.status === 'redeemed' || redemption.status === 'partially_redeemed') {
        monthlyData[key].hadRedemption = true;
        monthlyData[key].valueRedeemed += redemption.value_redeemed || 0;
      }
    });

    // Convert to array and save
    const streakHistory = Object.values(monthlyData);
    if (streakHistory.length > 0) {
      await AsyncStorage.setItem(STREAK_STORAGE_KEY, JSON.stringify(streakHistory));
    }
  } catch (error) {
    console.error('Error initializing streak from redemptions:', error);
  }
};