//perk-info-sheet.tsx
import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Pressable,
  Platform,
  Dimensions,
  LayoutAnimation,
  UIManager,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  Easing,
  runOnJS,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { CardPerk } from '../../src/data/card-data';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Helper functions
const calculateYearlyTotal = (perk: CardPerk | null): number => {
  if (!perk) return 0;
  
  switch (perk.period) {
    case 'monthly':
      return perk.value * 12;
    case 'quarterly':
      return perk.value * 4;
    case 'semi_annual':
      return perk.value * 2;
    case 'annual':
      return perk.value;
    default:
      return perk.value;
  }
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

const toTitleCase = (str: string) => {
  return str.split(' ').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  ).join(' ');
};

interface PerkInfoSheetProps {
  visible: boolean;
  perk: CardPerk | null;
  onDismiss: () => void;
  onOpenApp: () => void;
}

const { height: screenHeight } = Dimensions.get('window');

// Get the app name for the CTA button
const getAppName = (perk: CardPerk): string => {
  if (perk.appScheme) {
    // Map app schemes to friendly names
    switch (perk.appScheme) {
      case 'dunkin': return 'Dunkin\'';
      case 'resy': return 'Resy';
      case 'uber': return 'Uber';
      case 'uberEats': return 'Uber Eats';
      case 'doordash': return 'DoorDash';
      case 'grubhub': return 'Grubhub';
      case 'disneyPlus': return 'Disney+';
      case 'hulu': return 'Hulu';
      case 'espn': return 'ESPN';
      case 'peacock': return 'Peacock';
      case 'nytimes': return 'NY Times';
      case 'instacart': return 'Instacart';
      case 'walmart': return 'Walmart';
      case 'capitalOne': return 'Capital One';
      case 'lyft': return 'Lyft';
      case 'saks': return 'Saks';
      case 'equinox': return 'Equinox';
      case 'soulcycle': return 'SoulCycle';
      case 'shoprunner': return 'ShopRunner';
      case 'wegmans': return 'Wegmans';
      default: return perk.appScheme.charAt(0).toUpperCase() + perk.appScheme.slice(1);
    }
  }
  return 'App';
};

export default function PerkInfoSheet({
  visible,
  perk,
  onDismiss,
  onOpenApp,
}: PerkInfoSheetProps) {
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  
  const translateY = useSharedValue(screenHeight);
  const context = useSharedValue({ y: 0 });
  const rotation = useSharedValue(0);
  const insets = useSafeAreaInsets();

  const appName = useMemo(() => perk ? getAppName(perk) : '', [perk]);
  const yearlyTotal = useMemo(() => calculateYearlyTotal(perk), [perk]);

  // Mock pro tips data - in a real app this would come from the perk data
  const proTips = useMemo(() => {
    if (!perk) return [];
    
    // Default tips that could be customized per perk
    return [
      {
        icon: 'bulb-outline',
        title: 'Maximize Value',
        description: `Use your ${perk.name} credit at the beginning of each ${perk.period || 'period'} to ensure you don't miss out on the benefit.`,
      },
      {
        icon: 'calendar-outline',
        title: 'Set Reminders',
        description: `Your credit resets ${perk.period === 'monthly' ? 'monthly' : perk.period === 'quarterly' ? 'quarterly' : 'periodically'}. Set a reminder to use it before it expires.`,
      },
      {
        icon: 'gift-outline',
        title: 'Stack with Offers',
        description: `Check for additional promotions in the ${appName} app that can be combined with your credit for extra savings.`,
      },
    ];
  }, [perk, appName]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
    };
  });

  const animatedChevronStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${rotation.value}deg` }],
    };
  });

  const handleDismiss = useCallback(() => {
    translateY.value = withTiming(screenHeight, { duration: 300 }, isFinished => {
      if (isFinished) {
        runOnJS(onDismiss)();
      }
    });
  }, [onDismiss, translateY]);

  const panGesture = Gesture.Pan()
    .onStart(() => {
      context.value = { y: translateY.value };
    })
    .onUpdate(event => {
      translateY.value = event.translationY + context.value.y;
      translateY.value = Math.max(translateY.value, 0);
    })
    .onEnd(() => {
      if (translateY.value > 150) {
        runOnJS(handleDismiss)();
      } else {
        translateY.value = withSpring(0, { damping: 50 });
      }
    });

  const toggleHowItWorks = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowHowItWorks(!showHowItWorks);
    rotation.value = withSpring(showHowItWorks ? 0 : 180);
  }, [showHowItWorks, rotation]);

  const handleOpenApp = useCallback(async () => {
    handleDismiss();
    await onOpenApp();
    if (Platform.OS === 'ios') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  }, [handleDismiss, onOpenApp]);

  const nextTip = useCallback(() => {
    setCurrentTipIndex((prev) => (prev + 1) % proTips.length);
    if (Platform.OS === 'ios') {
      Haptics.selectionAsync();
    }
  }, [proTips.length]);

  const prevTip = useCallback(() => {
    setCurrentTipIndex((prev) => (prev - 1 + proTips.length) % proTips.length);
    if (Platform.OS === 'ios') {
      Haptics.selectionAsync();
    }
  }, [proTips.length]);

  React.useEffect(() => {
    if (visible) {
      translateY.value = withTiming(0, {
        duration: 240,
        easing: Easing.out(Easing.quad),
      });
      setShowHowItWorks(false);
      setCurrentTipIndex(0);
      rotation.value = 0;
    }
  }, [visible]);

  if (!visible || !perk) {
    return null;
  }

  const formattedValue = perk.value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
  });

  const formattedRemainingValue = perk.remaining_value 
    ? perk.remaining_value.toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
      }) 
    : formattedValue;

  const currentTip = proTips[currentTipIndex];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleDismiss}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.overlayPress} onPress={handleDismiss} />
      </View>
      
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.container, animatedStyle]}>
          <View style={styles.handle} />
          
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>{toTitleCase(perk.name)}</Text>
            <TouchableOpacity onPress={handleDismiss} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#8E8E93" />
            </TouchableOpacity>
          </View>

          {/* Main Content */}
          <ScrollView 
            style={styles.content}
            contentContainerStyle={[styles.contentContainer, { paddingBottom: insets.bottom + 24 }]}
            showsVerticalScrollIndicator={false}
          >
            {/* Remaining Balance */}
            <View style={styles.balanceContainer}>
              <Text style={styles.remainingLabel}>Remaining Balance</Text>
              <Text style={styles.remainingValue}>{formattedRemainingValue}</Text>
              <Text style={styles.periodInfo}>
                {perk.period === 'monthly' ? 'Monthly' : 
                 perk.period === 'quarterly' ? 'Quarterly' :
                 perk.period === 'semi_annual' ? 'Semi-annual' :
                 perk.period === 'annual' ? 'Annual' : 'Period'} credit: {formattedValue}
                {yearlyTotal > 0 && ` • Up to ${formatCurrency(yearlyTotal)}/year`}
              </Text>
            </View>

            {/* Primary CTA Button */}
            <TouchableOpacity style={styles.primaryButton} onPress={handleOpenApp}>
              <Text style={styles.primaryButtonText}>
                Open {appName} <Ionicons name="open-outline" size={18} color="#FFFFFF" />
              </Text>
            </TouchableOpacity>

            {/* Pro Tips Carousel */}
            <View style={styles.proTipsSection}>
              <Text style={styles.sectionTitle}>Pro Tips</Text>
              <View style={styles.tipCard}>
                <View style={styles.tipHeader}>
                  <Ionicons name={currentTip.icon as any} size={24} color="#007AFF" />
                  <Text style={styles.tipTitle}>{currentTip.title}</Text>
                </View>
                <Text style={styles.tipDescription}>{currentTip.description}</Text>
                
                {/* Carousel Controls */}
                <View style={styles.carouselControls}>
                  <TouchableOpacity onPress={prevTip} style={styles.carouselButton}>
                    <Ionicons name="chevron-back" size={20} color="#007AFF" />
                  </TouchableOpacity>
                  
                  <View style={styles.carouselDots}>
                    {proTips.map((_, index) => (
                      <View 
                        key={index} 
                        style={[
                          styles.dot, 
                          index === currentTipIndex && styles.activeDot
                        ]} 
                      />
                    ))}
                  </View>
                  
                  <TouchableOpacity onPress={nextTip} style={styles.carouselButton}>
                    <Ionicons name="chevron-forward" size={20} color="#007AFF" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* How it Works Accordion */}
            <View style={styles.howItWorksSection}>
              <TouchableOpacity onPress={toggleHowItWorks} style={styles.accordionHeader}>
                <Text style={styles.sectionTitle}>How it Works</Text>
                <Animated.View style={animatedChevronStyle}>
                  <Ionicons name="chevron-down" size={20} color="#8E8E93" />
                </Animated.View>
              </TouchableOpacity>
              
              {showHowItWorks && (
                <Animated.View 
                  entering={FadeIn.duration(200)}
                  exiting={FadeOut.duration(200)}
                  style={styles.howItWorksContent}
                >
                  <Text style={styles.description}>{perk.description}</Text>
                  {perk.redemptionInstructions && (
                    <>
                      <Text style={styles.redemptionTitle}>How to Redeem:</Text>
                      <Text style={styles.description}>{perk.redemptionInstructions}</Text>
                    </>
                  )}
                </Animated.View>
              )}
            </View>
          </ScrollView>
        </Animated.View>
      </GestureDetector>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  overlayPress: {
    flex: 1,
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '75%',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1C1C1E',
    flex: 1,
    letterSpacing: -0.5,
  },
  closeButton: {
    padding: 8,
    marginRight: -8,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  balanceContainer: {
    backgroundColor: '#F2F2F7',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 24,
  },
  remainingLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#8E8E93',
    marginBottom: 8,
    letterSpacing: -0.24,
  },
  remainingValue: {
    fontSize: 42,
    fontWeight: '800',
    color: '#007AFF',
    marginBottom: 8,
    letterSpacing: -1,
  },
  periodInfo: {
    fontSize: 14,
    fontWeight: '400',
    color: '#666666',
    textAlign: 'center',
    lineHeight: 20,
    letterSpacing: -0.24,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  primaryButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: -0.41,
  },
  proTipsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 16,
    letterSpacing: -0.41,
  },
  tipCard: {
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    padding: 16,
  },
  tipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  tipTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginLeft: 12,
    letterSpacing: -0.32,
  },
  tipDescription: {
    fontSize: 15,
    fontWeight: '400',
    color: '#666666',
    lineHeight: 22,
    marginBottom: 16,
    letterSpacing: -0.24,
  },
  carouselControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  carouselButton: {
    padding: 8,
  },
  carouselDots: {
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#C7C7CC',
  },
  activeDot: {
    backgroundColor: '#007AFF',
  },
  howItWorksSection: {
    marginBottom: 24,
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  howItWorksContent: {
    marginTop: 12,
  },
  description: {
    fontSize: 15,
    fontWeight: '400',
    color: '#666666',
    lineHeight: 22,
    letterSpacing: -0.24,
  },
  redemptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginTop: 16,
    marginBottom: 8,
    letterSpacing: -0.32,
  },
});