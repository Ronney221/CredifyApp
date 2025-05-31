import React, { useEffect } from 'react';
import { StyleSheet, View, Text, Platform, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface TimeRemainingBannerProps {
  daysRemaining: number;
}

export const TimeRemainingBanner: React.FC<TimeRemainingBannerProps> = ({ daysRemaining }) => {
  // Animation for subtle pulsing effect
  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Only animate if 2 or fewer days remaining
    if (daysRemaining <= 2) {
      const pulse = Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]);

      Animated.loop(pulse).start();
    }
  }, [daysRemaining]);

  if (daysRemaining <= 0) return null;

  // const urgencyColor = daysRemaining <= 2 ? '#FF3B30' : '#FF9500';
  // const urgencyBgColor = daysRemaining <= 2 ? 'rgba(255, 59, 48, 0.08)' : 'rgba(255, 149, 0, 0.08)';
  
  // New color scheme: Orange for general warning, slightly more intense orange/yellow for few days left.
  const urgencyColor = daysRemaining <= 2 ? '#FF8C00' : '#FF9500'; // DarkOrange for <=2 days, Orange for >2 days
  const urgencyBgColor = daysRemaining <= 2 ? 'rgba(255, 140, 0, 0.1)' : 'rgba(255, 149, 0, 0.08)'; // Lighter, more transparent DarkOrange bg

  const message = daysRemaining === 1 
    ? "Last day to use this month's perks!"
    : `${daysRemaining} days left to use this month's perks`;

  return (
    <Animated.View 
      style={[
        styles.container,
        { 
          backgroundColor: urgencyBgColor,
          transform: [{ scale: pulseAnim }]
        }
      ]}
    >
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons 
            // name={daysRemaining <= 2 ? "alert-circle" : "time"} 
            name="time-outline" // Always use a clock icon
            size={18} 
            color={urgencyColor} 
          />
        </View>
        <Text style={[styles.text, { color: urgencyColor }]}>
          {message}
        </Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginBottom: 8,
    ...Platform.select({
      ios: {
        marginTop: 4,
      },
      android: {
        marginTop: 8,
      },
    }),
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    marginRight: 8,
  },
  text: {
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    ...Platform.select({
      ios: {
        fontFamily: 'System',
      },
      android: {
        fontFamily: 'sans-serif-medium',
      },
    }),
  },
}); 