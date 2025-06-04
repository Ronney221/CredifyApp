import React, { useState, useEffect } from 'react';
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
import { CardPerk, APP_SCHEMES, multiChoicePerksConfig } from '../../../src/data/card-data';

interface PerkActionModalProps {
  visible: boolean;
  perk: CardPerk | null;
  onDismiss: () => void;
  onOpenApp: (targetPerkName?: string) => void;
  onMarkRedeemed: () => void;
}

export default function PerkActionModal({
  visible,
  perk,
  onDismiss,
  onOpenApp,
  onMarkRedeemed,
}: PerkActionModalProps) {
  const [showChoices, setShowChoices] = useState(false);
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
  
  useEffect(() => {
    if (visible) {
      setShowChoices(false);
      translateY.value = 0;
    }
  }, [visible]);
  
  if (!perk) return null;

  const formattedValue = perk.value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
  });

  // Check if this is a multi-choice perk
  const choices = multiChoicePerksConfig[perk.name];
  const isMultiChoice = choices && choices.length > 0;

  // Get the app name for the CTA button
  const getAppName = (perk: CardPerk): string => {
    if (perk.appScheme && APP_SCHEMES[perk.appScheme]) {
      // Map app schemes to friendly names
      const appSchemeMap: Record<string, string> = {
        uber: 'Uber',
        uberEats: 'Uber Eats',
        grubhub: 'Grubhub',
        doordash: 'DoorDash',
        disneyPlus: 'Disney+',
        hulu: 'Hulu',
        espn: 'ESPN',
        peacock: 'Peacock',
        nytimes: 'NY Times',
        dunkin: 'Dunkin',
        instacart: 'Instacart',
        resy: 'Resy',
        walmart: 'Walmart',
        capitalOne: 'Capital One Travel',
        lyft: 'Lyft',
        saks: 'Saks',
        equinox: 'Equinox',
      };
      return appSchemeMap[perk.appScheme] || 'App';
    }

    // Fallback: try to extract from perk name
    const name = perk.name.toLowerCase();
    if (name.includes('uber eats')) return 'Uber Eats';
    if (name.includes('uber')) return 'Uber';
    if (name.includes('doordash')) return 'DoorDash';
    if (name.includes('grubhub')) return 'Grubhub';
    if (name.includes('disney')) return 'Disney+';
    if (name.includes('dunkin')) return 'Dunkin';
    if (name.includes('resy')) return 'Resy';
    if (name.includes('capital one')) return 'Capital One Travel';
    
    return 'App'; // Generic fallback
  };

  const appName = getAppName(perk);

  const handlePrimaryAction = () => {
    if (isMultiChoice && !showChoices) {
      setShowChoices(true);
    } else {
      onOpenApp();
    }
  };

  const handleChoiceSelect = (choice: { label: string; targetPerkName: string }) => {
    onOpenApp(choice.targetPerkName);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onDismiss}
    >
      <Pressable style={styles.overlay} onPress={onDismiss}>
        <BlurView intensity={20} style={styles.blurOverlay} />
      </Pressable>
      
      <PanGestureHandler onGestureEvent={handlePanGesture}>
        <Animated.View style={[styles.modalContainer, animatedStyle]}>
          <View style={styles.modalContent}>
            {/* Handle bar */}
            <View style={styles.handleBar} />
            
            {/* Perk details */}
            <View style={styles.perkHeader}>
              <View style={styles.perkIconContainer}>
                <Ionicons name="pricetag" size={28} color="#007AFF" />
              </View>
              <View style={styles.perkTextContainer}>
                <Text style={styles.perkName}>{perk.name}</Text>
                <Text style={styles.perkValue}>{formattedValue} remaining value</Text>
              </View>
            </View>

            <Text style={styles.perkDescription}>{perk.description}</Text>

            {/* Show choices if it's a multi-choice perk and user clicked the primary button */}
            {isMultiChoice && showChoices && choices ? (
              <View style={styles.choicesContainer}>
                <Text style={styles.choicesTitle}>Choose an option:</Text>
                {choices.map((choice, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.choiceButton}
                    onPress={() => handleChoiceSelect(choice)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="open-outline" size={20} color="#007AFF" style={styles.buttonIcon} />
                    <Text style={styles.choiceButtonText}>{choice.label}</Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={() => setShowChoices(false)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="arrow-back-outline" size={20} color="#666" style={styles.buttonIcon} />
                  <Text style={styles.backButtonText}>Back</Text>
                </TouchableOpacity>
              </View>
            ) : (
              /* Standard action buttons */
              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={handlePrimaryAction}
                  activeOpacity={0.8}
                >
                  <Ionicons name="open-outline" size={20} color="white" style={styles.buttonIcon} />
                  <Text style={styles.primaryButtonText}>
                    {isMultiChoice ? 'Choose App' : `Open in ${appName}`}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={onMarkRedeemed}
                  activeOpacity={0.8}
                >
                  <Ionicons name="checkmark-circle-outline" size={18} color="#007AFF" style={styles.buttonIcon} />
                  <Text style={styles.secondaryButtonText}>Mark as Redeemed</Text>
                </TouchableOpacity>
              </View>
            )}
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
    paddingBottom: Platform.OS === 'ios' ? 34 : 20, // Account for home indicator
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
  perkHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  perkIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F0F7FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  perkTextContainer: {
    flex: 1,
  },
  perkName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 2,
  },
  perkValue: {
    fontSize: 15,
    color: '#007AFF',
    fontWeight: '500',
  },
  perkDescription: {
    fontSize: 15,
    color: '#666',
    lineHeight: 22,
    marginBottom: 24,
  },
  buttonContainer: {
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 17,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#F0F7FF',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: '#007AFF',
    fontSize: 15,
    fontWeight: '500',
  },
  buttonIcon: {
    marginRight: 8,
  },
  choicesContainer: {
    marginTop: 20,
  },
  choicesTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 12,
  },
  choiceButton: {
    backgroundColor: '#F0F7FF',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  choiceButtonText: {
    color: '#007AFF',
    fontSize: 15,
    fontWeight: '500',
  },
  backButton: {
    backgroundColor: '#F0F7FF',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  backButtonText: {
    color: '#666',
    fontSize: 15,
    fontWeight: '500',
  },
}); 