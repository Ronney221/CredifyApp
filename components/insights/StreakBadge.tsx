import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Colors } from '../../constants/Colors';

interface StreakBadgeProps {
  streakCount?: number;
}

export const StreakBadge: React.FC<StreakBadgeProps> = ({ streakCount }) => {
  if (!streakCount || streakCount < 2) {
    return null;
  }

  return (
    <Animated.View entering={FadeIn.duration(500)} style={styles.streakBadgeContainer}>
      <Text style={styles.streakBadgeText}>🔥 {streakCount}-month fee coverage streak!</Text>
    </Animated.View>
  );
};

const ACCENT_YELLOW_BACKGROUND = '#FFFBEA';


export default StreakBadge;

const styles = StyleSheet.create({
  streakBadgeContainer: {
    backgroundColor: ACCENT_YELLOW_BACKGROUND,
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    alignSelf: 'center',
    marginVertical: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  streakBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
  },
}); 