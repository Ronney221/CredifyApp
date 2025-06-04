import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';

interface SwipeCoachMarkProps {
  visible: boolean;
  onDismiss: () => void;
}

const screenWidth = Dimensions.get('window').width;

export const SwipeCoachMark: React.FC<SwipeCoachMarkProps> = ({ visible, onDismiss }) => {
  const fingerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(fingerAnim, {
            toValue: 1,
            duration: 1200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(fingerAnim, {
            toValue: 0,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            delay: 300,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      fingerAnim.setValue(0);
      fingerAnim.stopAnimation();
    }
    return () => {
      fingerAnim.setValue(0);
      fingerAnim.stopAnimation();
    };
  }, [visible, fingerAnim]);

  if (!visible) {
    return null;
  }

  const translateX = fingerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-screenWidth / 4, screenWidth / 4], // Swipe distance
  });

  return (
    <MotiView
      style={styles.overlay}
      from={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ type: 'timing', duration: 300 }}
    >
      <View style={styles.coachCard}>
        <Animated.View style={{ transform: [{ translateX }] }}>
          <Ionicons name="hand-left-outline" size={60} color="#FFFFFF" style={styles.fingerIcon} />
        </Animated.View>
        <Text style={styles.coachText}>
          Swipe perks to mark them as used or available!
        </Text>
        <Text style={styles.subText}>
          (Swipe right for &apos;Used&apos;, left for &apos;Available&apos;)
        </Text>
        <TouchableOpacity style={styles.dismissButton} onPress={onDismiss}>
          <Text style={styles.dismissButtonText}>Got it!</Text>
        </TouchableOpacity>
      </View>
    </MotiView>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  coachCard: {
    backgroundColor: 'rgba(50, 50, 50, 0.95)',
    borderRadius: 20,
    padding: 25,
    alignItems: 'center',
    width: screenWidth * 0.85,
    maxWidth: 380,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  fingerIcon: {
    marginBottom: 20,
    transform: [{ rotate: '0deg' }], // Initial slight rotation if needed
  },
  coachText: {
    fontSize: 19,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 10,
    lineHeight: 26,
  },
  subText: {
    fontSize: 15,
    color: '#E0E0E0',
    textAlign: 'center',
    marginBottom: 25,
    lineHeight: 22,
  },
  dismissButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
  },
  dismissButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});

export default SwipeCoachMark; 