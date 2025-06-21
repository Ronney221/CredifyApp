import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing, Dimensions, Pressable, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import { Colors } from '../../constants/Colors';
import { BlurView } from 'expo-blur';

interface SwipeCoachMarkProps {
  visible: boolean;
  onDismiss: () => void;
  topOffset?: number;
}

const screenWidth = Dimensions.get('window').width;

export const SwipeCoachMark: React.FC<SwipeCoachMarkProps> = ({ visible, onDismiss, topOffset = 0 }) => {
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
    <Pressable style={styles.overlay} onPress={onDismiss}>
      {Platform.OS === 'ios' && <BlurView intensity={10} tint="light" style={StyleSheet.absoluteFill} />}
      <MotiView
        from={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'timing', duration: 250 }}
      >
        <Pressable>
          <View style={[styles.coachCard, { marginTop: topOffset }]}>
            <Animated.View style={{ transform: [{ translateX }] }}>
              <Ionicons name="hand-left-outline" size={60} color="#8A8A8E" style={styles.fingerIcon} />
            </Animated.View>
            <Text style={styles.coachText}>
              Swipe perks to mark them as redeemed or available
            </Text>
            <Text style={styles.subText}>
              Swipe right for &apos;REDEEM&apos;, left to undo
            </Text>
            <TouchableOpacity style={styles.dismissButton} onPress={onDismiss}>
              <Text style={styles.dismissButtonText}>Got It!</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </MotiView>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Platform.OS === 'ios' ? 'transparent' : 'rgba(34, 34, 36, 0.6)',
    alignItems: 'center',
    zIndex: 1000,
  },
  coachCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 25,
    paddingTop: 30,
    alignItems: 'center',
    width: screenWidth * 0.85,
    maxWidth: 380,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 10,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  fingerIcon: {
    marginBottom: 20,
  },
  coachText: {
    fontSize: 19,
    fontWeight: '600',
    color: '#1c1c1e',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 26,
  },
  subText: {
    fontSize: 15,
    color: '#8A8A8E',
    textAlign: 'center',
    marginBottom: 25,
    lineHeight: 22,
  },
  dismissButton: {
    backgroundColor: Colors.light.tint,
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