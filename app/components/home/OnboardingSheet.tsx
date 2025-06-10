import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { PanGestureHandler } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedGestureHandler,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';

interface OnboardingSheetProps {
  visible: boolean;
  onDismiss: () => void;
}

export default function OnboardingSheet({
  visible,
  onDismiss,
}: OnboardingSheetProps) {
  const translateY = useSharedValue(0);
  
  const handlePanGesture = useAnimatedGestureHandler({
    onStart: (_, context: { startY: number }) => {
      context.startY = translateY.value;
    },
    onActive: (event, context: { startY: number }) => {
      translateY.value = Math.max(0, context.startY + event.translationY);
    },
    onEnd: (event) => {
      const shouldDismiss = event.translationY > 150 || event.velocityY > 1000;
      
      if (shouldDismiss) {
        translateY.value = withSpring(500, {}, () => {
          runOnJS(onDismiss)();
          translateY.value = 0;
        });
      } else {
        translateY.value = withSpring(0);
      }
    },
  });

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
    };
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onDismiss}
      presentationStyle="overFullScreen"
    >
      <Pressable style={styles.overlay} onPress={onDismiss}>
        <BlurView intensity={20} style={styles.blurOverlay} />
      </Pressable>
      
      <PanGestureHandler onGestureEvent={handlePanGesture}>
        <Animated.View style={[styles.modalContainer, animatedStyle]}>
          <View style={styles.modalContent}>
            {/* Handle bar */}
            <View style={styles.handleBar} />
            
            <Text style={styles.title}>Pro Tips 🎯</Text>
            
            {/* Tip items */}
            <View style={styles.tipContainer}>
              <View style={styles.tipItem}>
                <View style={styles.tipIconContainer}>
                  <Ionicons name="information-circle" size={24} color="#007AFF" />
                </View>
                <View style={styles.tipTextContainer}>
                  <Text style={styles.tipTitle}>Tap for Details</Text>
                  <Text style={styles.tipDescription}>Tap any perk to see more information and quick actions</Text>
                </View>
              </View>

              <View style={styles.tipItem}>
                <View style={styles.tipIconContainer}>
                  <Ionicons name="open-outline" size={24} color="#007AFF" />
                </View>
                <View style={styles.tipTextContainer}>
                  <Text style={styles.tipTitle}>Open Apps Directly</Text>
                  <Text style={styles.tipDescription}>Launch the relevant app to redeem your perk instantly</Text>
                </View>
              </View>

              <View style={styles.tipItem}>
                <View style={styles.tipIconContainer}>
                  <Ionicons name="time" size={24} color="#007AFF" />
                </View>
                <View style={styles.tipTextContainer}>
                  <Text style={styles.tipTitle}>Auto-Redeem Monthly</Text>
                  <Text style={styles.tipDescription}>Long-press to set up automatic redemption for recurring credits</Text>
                </View>
              </View>
            </View>

            {/* Got it button */}
            <TouchableOpacity
              style={styles.gotItButton}
              onPress={onDismiss}
              activeOpacity={0.8}
            >
              <Text style={styles.gotItButtonText}>Got it!</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </PanGestureHandler>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  blurOverlay: {
    flex: 1,
  },
  modalContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  modalContent: {
    padding: 20,
    paddingTop: 12,
  },
  handleBar: {
    width: 36,
    height: 4,
    backgroundColor: '#C7C7CC',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 24,
    textAlign: 'center',
  },
  tipContainer: {
    gap: 20,
    marginBottom: 32,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  tipIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F7FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  tipTextContainer: {
    flex: 1,
  },
  tipTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  tipDescription: {
    fontSize: 15,
    color: '#666',
    lineHeight: 20,
  },
  gotItButton: {
    backgroundColor: '#007AFF',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  gotItButtonText: {
    color: 'white',
    fontSize: 17,
    fontWeight: '600',
  },
}); 