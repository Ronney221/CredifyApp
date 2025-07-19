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
import MerchantLogo from './MerchantLogo';

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

// Get merchant brand color (reuse logic from MerchantLogo)
const getMerchantColor = (perkName: string): string => {
  const lowerName = perkName.toLowerCase();
  
  if (lowerName.includes('uber')) return '#000000';
  if (lowerName.includes('lyft')) return '#FF00BF';
  if (lowerName.includes('doordash')) return '#FF3008';
  if (lowerName.includes('grubhub')) return '#FF8000';
  if (lowerName.includes('netflix')) return '#E50914';
  if (lowerName.includes('walmart')) return '#0071CE';
  if (lowerName.includes('instacart')) return '#43B02A';
  if (lowerName.includes('capital one travel')) return '#004879';
  if (lowerName.includes('chase travel')) return '#117ACA';
  if (lowerName.includes('disney')) return '#0066CC';
  if (lowerName.includes('delta')) return '#003366';
  if (lowerName.includes('marriott')) return '#003366';
  if (lowerName.includes('hilton')) return '#104C97';
  if (lowerName.includes('clear')) return '#003087';
  if (lowerName.includes('dunkin')) return '#FF671F';
  if (lowerName.includes('starbucks')) return '#00704A';
  if (lowerName.includes('opentable')) return '#DA3743';
  if (lowerName.includes('stubhub')) return '#3B5998';
  
  // Category-based colors
  if (lowerName.includes('travel')) return '#6366F1';
  if (lowerName.includes('dining')) return '#DC2626';
  if (lowerName.includes('hotel')) return '#7C3AED';
  if (lowerName.includes('entertainment')) return '#7C3AED';
  
  return '#007AFF'; // Default iOS blue
};

// Get merchant icon for button (white color for visibility on colored backgrounds)
const getMerchantButtonIcon = (perkName: string): string => {
  const lowerName = perkName.toLowerCase();
  
  if (lowerName.includes('uber')) return 'car';
  if (lowerName.includes('lyft')) return 'car-outline';
  if (lowerName.includes('doordash')) return 'fast-food';
  if (lowerName.includes('grubhub')) return 'fast-food-outline';
  if (lowerName.includes('netflix')) return 'tv';
  if (lowerName.includes('walmart')) return 'cart';
  if (lowerName.includes('instacart')) return 'cart-outline';
  if (lowerName.includes('capital one travel')) return 'map';
  if (lowerName.includes('chase travel')) return 'compass';
  if (lowerName.includes('disney')) return 'film';
  if (lowerName.includes('delta')) return 'airplane';
  if (lowerName.includes('marriott')) return 'bed';
  if (lowerName.includes('hilton')) return 'bed-outline';
  if (lowerName.includes('hotel')) return 'business';
  if (lowerName.includes('clear')) return 'shield-checkmark';
  if (lowerName.includes('dunkin')) return 'cafe';
  if (lowerName.includes('starbucks')) return 'cafe-outline';
  if (lowerName.includes('opentable')) return 'restaurant-outline';
  if (lowerName.includes('stubhub')) return 'ticket';
  if (lowerName.includes('dining')) return 'restaurant';
  if (lowerName.includes('travel')) return 'airplane';
  if (lowerName.includes('entertainment')) return 'play-circle';
  
  return 'open-outline'; // Default
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
  const merchantColor = useMemo(() => perk ? getMerchantColor(perk.name) : '#007AFF', [perk]);
  const merchantIcon = useMemo(() => perk ? getMerchantButtonIcon(perk.name) : 'open-outline', [perk]);

  // Parse redemption instructions into pro tips for carousel
  const proTips = useMemo(() => {
    if (!perk || !perk.redemptionInstructions) {
      // Fallback to generic tips if no redemption instructions
      return [
        {
          icon: 'bulb-outline',
          title: 'Maximize Value',
          description: `Use your ${perk?.name || 'credit'} at the beginning of each ${perk?.period || 'period'} to ensure you don't miss out on the benefit.`,
        },
      ];
    }

    const instructions = perk.redemptionInstructions.trim();
    
    // Debug: Log the raw instructions to see the actual format
    console.log('[PerkInfoSheet] Raw redemption instructions:', JSON.stringify(instructions));
    
    // Try multiple line break patterns
    let tips = [];
    
    // Handle potential escaped characters from database
    let processedInstructions = instructions
      .replace(/\\n\\n/g, '\n\n')  // Convert escaped \\n\\n to actual \n\n
      .replace(/\\n/g, '\n')       // Convert escaped \\n to actual \n
      .replace(/\\'/g, "'");       // Convert escaped quotes
    
    // First try double line breaks
    tips = processedInstructions.split('\n\n').filter(tip => tip.trim().length > 0);
    console.log('[PerkInfoSheet] After \\n\\n split:', tips);
    
    // If that didn't work, try different patterns
    if (tips.length === 1) {
      // Try Windows-style line breaks
      tips = processedInstructions.split('\r\n\r\n').filter(tip => tip.trim().length > 0);
      console.log('[PerkInfoSheet] After \\r\\n\\r\\n split:', tips);
    }
    
    // If still one tip, try splitting by "Credify Hack" pattern
    if (tips.length === 1 && processedInstructions.includes('Credify Hack')) {
      tips = processedInstructions.split(/(?=Credify Hack \d+)/g).filter(tip => tip.trim().length > 0);
      console.log('[PerkInfoSheet] After Credify Hack split:', tips);
    }
    
    // Fallback: treat as single tip
    if (tips.length === 0) {
      tips = [instructions];
    }
    
    console.log('[PerkInfoSheet] Final tips array:', tips);

    // Convert tips to carousel format with appropriate icons
    return tips.map((tip, index) => {
      let icon = 'bulb-outline';
      let title = `Pro Tip ${tips.length > 1 ? index + 1 : ''}`.trim();

      // Check if this is a Credify Hack format
      const credifyHackMatch = tip.match(/Credify Hack \d+ \(([^)]+)\):/);
      if (credifyHackMatch) {
        const hackType = credifyHackMatch[1];
        title = hackType;
        
        // Assign icons based on hack type
        if (hackType.toLowerCase().includes('takeout') || hackType.toLowerCase().includes('walk')) {
          icon = 'walk-outline';
        } else if (hackType.toLowerCase().includes('gift card') || hackType.toLowerCase().includes('conversion')) {
          icon = 'card-outline';
        } else if (hackType.toLowerCase().includes('booking') || hackType.toLowerCase().includes('book')) {
          icon = 'calendar-outline';
        } else if (hackType.toLowerCase().includes('zero') || hackType.toLowerCase().includes('free')) {
          icon = 'checkmark-circle-outline';
        } else if (hackType.toLowerCase().includes('maximize') || hackType.toLowerCase().includes('value')) {
          icon = 'trending-up-outline';
        } else {
          icon = 'bulb-outline';
        }
      } else {
        // Fallback logic for non-Credify format tips
        if (tip.toLowerCase().includes('enroll') || tip.toLowerCase().includes('activate')) {
          icon = 'checkmark-circle-outline';
          title = 'Activation Required';
        } else if (tip.toLowerCase().includes('gift card') || tip.toLowerCase().includes('strategy')) {
          icon = 'card-outline';
          title = 'Smart Strategy';
        } else if (tip.toLowerCase().includes('expire') || tip.toLowerCase().includes('roll over') || tip.toLowerCase().includes('unused')) {
          icon = 'time-outline';
          title = 'Important Timing';
        } else if (tip.toLowerCase().includes('credit') && tip.toLowerCase().includes('automatic')) {
          icon = 'refresh-outline';
          title = 'Auto Credit';
        } else if (tip.toLowerCase().includes('membership') || tip.toLowerCase().includes('subscription')) {
          icon = 'card-outline';
          title = 'Membership Tip';
        }
      }

      return {
        icon,
        title,
        description: tip,
      };
    });
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

  const currentTip = proTips[currentTipIndex] || { 
    icon: 'bulb-outline', 
    title: 'Pro Tip', 
    description: 'No tips available for this perk.' 
  };

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
            <TouchableOpacity 
              style={[styles.primaryButton, { backgroundColor: merchantColor }]} 
              onPress={handleOpenApp}
            >
              <View style={styles.buttonContent}>
                <Ionicons name={merchantIcon as any} size={20} color="#FFFFFF" />
                <Text style={styles.primaryButtonText}>
                  Open {appName}
                </Text>
                <Ionicons name="open-outline" size={18} color="#FFFFFF" />
              </View>
            </TouchableOpacity>

            {/* Pro Tips Carousel */}
            <View style={styles.proTipsSection}>
              <Text style={styles.sectionTitle}>Pro Tips</Text>
              <View style={styles.tipCard}>
                <View style={styles.tipHeader}>
                  <Ionicons name={currentTip.icon as any} size={24} color="#007AFF" />
                  <Text style={styles.tipTitle}>{currentTip.title}</Text>
                </View>
                <ScrollView 
                  style={styles.tipDescriptionScroll}
                  showsVerticalScrollIndicator={false}
                  nestedScrollEnabled={true}
                >
                  <Text style={styles.tipDescription}>{currentTip.description}</Text>
                </ScrollView>
                
                {/* Carousel Controls - Only show if more than 1 tip */}
                {proTips.length > 1 && (
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
                )}
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
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  primaryButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: -0.41,
    flex: 1,
    textAlign: 'center',
  },
  proTipsSection: {
    marginBottom: 16, // Reduced from 24 to give more space for How it Works
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
    maxHeight: 240, // Increased for more tip content space
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
  tipDescriptionScroll: {
    maxHeight: 160, // Much more space for tip content
    marginBottom: 8, // Keep tight margin before controls
  },
  tipDescription: {
    fontSize: 15,
    fontWeight: '400',
    color: '#666666',
    lineHeight: 20, // Reduced from 22 for more compact text
    letterSpacing: -0.24,
  },
  carouselControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center', // Center everything
    marginTop: 4, // Small top margin
    height: 32, // Fixed height to prevent expansion
  },
  carouselButton: {
    padding: 4, // Reduced from 8
    marginHorizontal: 8, // Space from dots
  },
  carouselDots: {
    flexDirection: 'row',
    gap: 4, // Reduced from 6
    alignItems: 'center',
  },
  dot: {
    width: 5, // Reduced from 6
    height: 5, // Reduced from 6
    borderRadius: 2.5,
    backgroundColor: '#C7C7CC',
  },
  activeDot: {
    backgroundColor: '#007AFF',
    width: 6, // Slightly larger for active state
    height: 6,
    borderRadius: 3,
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