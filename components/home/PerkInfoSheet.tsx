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
import { LinearGradient } from 'expo-linear-gradient';
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
  // Special handling for multi-choice perks
  const lowerPerkName = perk.name.toLowerCase();
  if (lowerPerkName.includes('airline fee credit') || 
      lowerPerkName.includes('airline incidental') ||
      lowerPerkName.includes('airline flight credit')) {
    return 'Airlines';
  }
  if (lowerPerkName.includes('annual travel credit')) {
    return 'Travel';
  }
  if (lowerPerkName.includes('travel & dining credit')) {
    return 'Travel & Dining';
  }
  if (lowerPerkName.includes('digital entertainment credit')) {
    return 'Streaming Apps';
  }
  if (lowerPerkName.includes('apple services credit')) {
    return 'Apple Apps';
  }
  if (lowerPerkName.includes('disney bundle credit')) {
    return 'Disney Apps';
  }
  if (lowerPerkName.includes('lifestyle convenience credits')) {
    return 'Lifestyle Apps';
  }
  if (lowerPerkName.includes('rideshare credit')) {
    return 'Rideshare Apps';
  }
  if (lowerPerkName.includes('dining credit')) {
    return 'Dining Apps';
  }
  if (lowerPerkName.includes('uber cash')) {
    return 'Uber Apps';
  }
  
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
      case 'united': return 'United Airlines';
      case 'delta': return 'Delta Airlines';
      case 'american': return 'American Airlines';
      case 'amex': return 'Amex';
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
  if (lowerName.includes('united')) return '#002244';
  if (lowerName.includes('american airlines') || lowerName.includes('american credit')) return '#C41E3A';
  if (lowerName.includes('marriott')) return '#003366';
  if (lowerName.includes('hilton')) return '#104C97';
  if (lowerName.includes('clear')) return '#003087';
  if (lowerName.includes('dunkin')) return '#FF671F';
  if (lowerName.includes('starbucks')) return '#00704A';
  if (lowerName.includes('opentable')) return '#DA3743';
  if (lowerName.includes('stubhub')) return '#3B5998';
  
  // Category-based colors
  if (lowerName.includes('airline fee credit') || 
      lowerName.includes('airline incidental') || 
      lowerName.includes('airline flight credit')) return '#1E3A8A'; // Aviation blue
  if (lowerName.includes('annual travel credit')) return '#6366F1'; // Travel purple
  if (lowerName.includes('travel & dining credit')) return '#059669'; // Teal for mixed category
  if (lowerName.includes('digital entertainment credit')) return '#7C3AED'; // Entertainment purple
  if (lowerName.includes('apple services credit')) return '#007AFF'; // Apple blue
  if (lowerName.includes('disney bundle credit')) return '#0066CC'; // Disney blue
  if (lowerName.includes('lifestyle convenience credits')) return '#059669'; // Lifestyle teal
  if (lowerName.includes('rideshare credit')) return '#000000'; // Black for rideshare
  if (lowerName.includes('dining credit')) return '#DC2626'; // Red for dining
  if (lowerName.includes('uber cash')) return '#000000'; // Uber black
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
  if (lowerName.includes('united')) return 'airplane-outline';
  if (lowerName.includes('american airlines') || lowerName.includes('american credit')) return 'airplane';
  if (lowerName.includes('marriott')) return 'bed';
  if (lowerName.includes('hilton')) return 'bed-outline';
  if (lowerName.includes('hotel')) return 'business';
  if (lowerName.includes('clear')) return 'shield-checkmark';
  if (lowerName.includes('dunkin')) return 'cafe';
  if (lowerName.includes('starbucks')) return 'cafe-outline';
  if (lowerName.includes('opentable')) return 'restaurant-outline';
  if (lowerName.includes('stubhub')) return 'ticket';
  if (lowerName.includes('airline fee credit') || 
      lowerName.includes('airline incidental') || 
      lowerName.includes('airline flight credit')) return 'airplane';
  if (lowerName.includes('annual travel credit')) return 'airplane';
  if (lowerName.includes('travel & dining credit')) return 'globe'; // Multi-category icon
  if (lowerName.includes('digital entertainment credit')) return 'play-circle'; // Streaming icon
  if (lowerName.includes('apple services credit')) return 'logo-apple'; // Apple icon
  if (lowerName.includes('disney bundle credit')) return 'film'; // Disney icon
  if (lowerName.includes('lifestyle convenience credits')) return 'grid'; // Grid for multiple options
  if (lowerName.includes('rideshare credit')) return 'car'; // Car icon
  if (lowerName.includes('dining credit')) return 'restaurant'; // Restaurant icon
  if (lowerName.includes('uber cash')) return 'car'; // Uber icon
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
  const buttonScale = useSharedValue(1);
  const buttonRotation = useSharedValue(0);
  const buttonGlow = useSharedValue(0);
  const heroCardScale = useSharedValue(0.95);
  const heroCardRotation = useSharedValue(-2);
  const overlayOpacity = useSharedValue(0);
  const rippleScale = useSharedValue(0);
  const rippleOpacity = useSharedValue(0);
  const successCheckScale = useSharedValue(0);
  const successCheckOpacity = useSharedValue(0);
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

  const animatedHeroStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: heroCardScale.value },
        { rotateZ: `${heroCardRotation.value}deg` }
      ],
      opacity: withTiming(visible ? 1 : 0, { duration: 300 }),
    };
  });

  const animatedOverlayStyle = useAnimatedStyle(() => {
    return {
      opacity: overlayOpacity.value,
    };
  });

  const animatedButtonStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: buttonScale.value },
        { rotateZ: `${buttonRotation.value}deg` }
      ],
    };
  });

  const animatedButtonGlowStyle = useAnimatedStyle(() => {
    return {
      shadowOpacity: buttonGlow.value * 0.3,
      shadowRadius: buttonGlow.value * 20,
      elevation: buttonGlow.value * 8,
    };
  });

  const animatedRippleStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: rippleScale.value }],
      opacity: rippleOpacity.value,
    };
  });

  const animatedSuccessStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: successCheckScale.value }],
      opacity: successCheckOpacity.value,
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
    // Epic button animation sequence
    
    // 1. Initial press with rotation and glow
    buttonScale.value = withTiming(0.92, { duration: 100 });
    buttonRotation.value = withTiming(-1, { duration: 100 });
    buttonGlow.value = withTiming(1, { duration: 100 });
    
    // 2. Ripple effect
    rippleScale.value = 0;
    rippleOpacity.value = 0.6;
    rippleScale.value = withTiming(3, { duration: 600 });
    rippleOpacity.value = withTiming(0, { duration: 600 });
    
    if (Platform.OS === 'ios') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }
    
    // 3. Bounce back with success indication
    setTimeout(() => {
      buttonScale.value = withSpring(1.05, { damping: 15, stiffness: 300 });
      buttonRotation.value = withSpring(1, { damping: 15, stiffness: 300 });
      
      // Success checkmark animation
      successCheckScale.value = withSpring(1, { damping: 12, stiffness: 400 });
      successCheckOpacity.value = withTiming(1, { duration: 200 });
      
      if (Platform.OS === 'ios') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    }, 150);
    
    // 4. Final settle and fade out success
    setTimeout(() => {
      buttonScale.value = withSpring(1, { damping: 20, stiffness: 300 });
      buttonRotation.value = withSpring(0, { damping: 20, stiffness: 300 });
      buttonGlow.value = withTiming(0, { duration: 200 });
      
      successCheckOpacity.value = withTiming(0, { duration: 300 });
      successCheckScale.value = withTiming(0, { duration: 300 });
    }, 300);
    
    // 5. Launch app after full animation
    setTimeout(async () => {
      handleDismiss();
      await onOpenApp();
    }, 750); // Extended time for full animation experience
  }, [handleDismiss, onOpenApp, buttonScale, buttonRotation, buttonGlow, rippleScale, rippleOpacity, successCheckScale, successCheckOpacity]);

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
      // Premium staggered entrance animation
      overlayOpacity.value = withTiming(1, { duration: 300 });
      
      // Sheet slides up with bounce
      translateY.value = withSpring(0, {
        damping: 25,
        stiffness: 400,
        mass: 0.8,
      });
      
      // Hero card dramatic entrance
      setTimeout(() => {
        heroCardScale.value = withSpring(1, {
          damping: 15,
          stiffness: 300,
        });
        heroCardRotation.value = withSpring(0, {
          damping: 20,
          stiffness: 400,
        });
      }, 100);
      
      setShowHowItWorks(false);
      setCurrentTipIndex(0);
      rotation.value = 0;
      
      // Reset button states
      buttonScale.value = 1;
      buttonRotation.value = 0;
      buttonGlow.value = 0;
      rippleScale.value = 0;
      rippleOpacity.value = 0;
      successCheckScale.value = 0;
      successCheckOpacity.value = 0;
    } else {
      overlayOpacity.value = withTiming(0, { duration: 200 });
      heroCardScale.value = withTiming(0.95, { duration: 200 });
      heroCardRotation.value = withTiming(-2, { duration: 200 });
    }
  }, [visible, overlayOpacity, heroCardScale, heroCardRotation, buttonScale, buttonRotation, buttonGlow, rippleScale, rippleOpacity, successCheckScale, successCheckOpacity]);

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
      <Animated.View style={[styles.overlay, animatedOverlayStyle]}>
        <Pressable style={styles.overlayPress} onPress={handleDismiss} />
      </Animated.View>
      
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
            {/* Hero Balance Card */}
            <Animated.View style={[styles.heroCardWrapper, animatedHeroStyle]}>
              <LinearGradient
                colors={[
                  merchantColor + '15', // 15% opacity
                  merchantColor + '08', // 8% opacity
                  '#FFFFFF'
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.heroCard}
              >
                <View style={styles.heroCardContent}>
                  <View style={styles.balanceSection}>
                    <Text style={styles.remainingLabel}>Available Balance</Text>
                    <Text style={[styles.remainingValue, { color: merchantColor }]}>
                      {formattedRemainingValue}
                    </Text>
                  </View>
                  
                  <View style={styles.creditInfoSection}>
                    <View style={styles.creditInfoRow}>
                      <View style={styles.creditInfoItem}>
                        <Text style={styles.creditInfoLabel}>
                          {perk.period === 'monthly' ? 'Monthly' : 
                           perk.period === 'quarterly' ? 'Quarterly' :
                           perk.period === 'semi_annual' ? 'Semi-annual' :
                           perk.period === 'annual' ? 'Annual' : 'Period'} Credit
                        </Text>
                        <Text style={styles.creditInfoValue}>{formattedValue}</Text>
                      </View>
                      {yearlyTotal > 0 && (
                        <View style={styles.creditInfoItem}>
                          <Text style={styles.creditInfoLabel}>Annual Value</Text>
                          <Text style={styles.creditInfoValue}>{formatCurrency(yearlyTotal)}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
                
                {/* Decorative elements */}
                <View style={styles.heroDecoration}>
                  <View style={[styles.decorationCircle, { backgroundColor: merchantColor + '20' }]} />
                  <View style={[styles.decorationCircle, styles.decorationCircleSmall, { backgroundColor: merchantColor + '10' }]} />
                </View>
              </LinearGradient>
            </Animated.View>

            {/* Primary CTA Button */}
            <View style={styles.ctaSection}>
              <View style={styles.buttonContainer}>
                {/* Ripple Effect */}
                <Animated.View style={[
                  styles.rippleEffect,
                  { backgroundColor: merchantColor + '30' },
                  animatedRippleStyle
                ]} />
                
                {/* Main Button */}
                <Animated.View style={[animatedButtonStyle, animatedButtonGlowStyle]}>
                  <TouchableOpacity 
                    style={[styles.primaryButton, { backgroundColor: merchantColor }]} 
                    onPress={handleOpenApp}
                    activeOpacity={1}
                  >
                    <LinearGradient
                      colors={[merchantColor, merchantColor + 'DD']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.buttonGradient}
                    >
                      <View style={styles.buttonContent}>
                        <View style={styles.buttonIconContainer}>
                          <Ionicons name={merchantIcon as any} size={22} color="#FFFFFF" />
                        </View>
                        <Text style={styles.primaryButtonText}>
                          Open {appName}
                        </Text>
                        <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
                      </View>
                    </LinearGradient>
                  </TouchableOpacity>
                </Animated.View>
                
                {/* Success Checkmark Overlay */}
                <Animated.View style={[
                  styles.successOverlay,
                  animatedSuccessStyle
                ]}>
                  <View style={[styles.successCircle, { backgroundColor: merchantColor }]}>
                    <Ionicons name="checkmark" size={24} color="#FFFFFF" />
                  </View>
                </Animated.View>
              </View>
            </View>

            {/* Tips Cards Stack */}
            <View style={styles.tipsSection}>
              {proTips.slice(0, 3).map((tip, index) => (
                <Animated.View
                  key={index}
                  entering={FadeIn.delay(index * 100).duration(300)}
                  style={[
                    styles.tipCard,
                    index === 0 && styles.primaryTipCard,
                    index > 0 && styles.secondaryTipCard,
                  ]}
                >
                  <View style={[
                    styles.tipCardContent,
                    index === 0 && styles.primaryTipCardContent
                  ]}>
                    <View style={styles.tipHeader}>
                      <View style={[
                        styles.tipIconContainer,
                        { backgroundColor: index === 0 ? merchantColor + '15' : '#F2F2F7' }
                      ]}>
                        <Ionicons 
                          name={tip.icon as any} 
                          size={20} 
                          color={index === 0 ? merchantColor : '#007AFF'} 
                        />
                      </View>
                      <View style={styles.tipTextContent}>
                        <Text style={[
                          styles.tipTitle,
                          index === 0 && styles.primaryTipTitle
                        ]}>
                          {tip.title}
                        </Text>
                        <Text 
                          style={[
                            styles.tipDescription,
                            index === 0 && styles.primaryTipDescription
                          ]}
                        >
                          {tip.description}
                        </Text>
                      </View>
                    </View>
                  </View>
                </Animated.View>
              ))}
              
              {proTips.length > 3 && (
                <TouchableOpacity style={styles.viewMoreCard}>
                  <View style={styles.viewMoreContent}>
                    <Ionicons name="add-circle-outline" size={24} color="#007AFF" />
                    <Text style={styles.viewMoreText}>
                      View {proTips.length - 3} more tips
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
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
    width: 36,
    height: 4,
    backgroundColor: '#D1D1D6',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
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
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  heroCardWrapper: {
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 8,
  },
  heroCard: {
    borderRadius: 20,
    padding: 20,
    minHeight: 140,
    overflow: 'hidden',
    position: 'relative',
  },
  heroCardContent: {
    flex: 1,
    zIndex: 2,
  },
  balanceSection: {
    marginBottom: 16,
  },
  creditInfoSection: {
    flex: 1,
  },
  creditInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  creditInfoItem: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 10,
    padding: 10,
    backdropFilter: 'blur(10px)',
  },
  creditInfoLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#8E8E93',
    marginBottom: 4,
    letterSpacing: -0.24,
    textTransform: 'uppercase',
  },
  creditInfoValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1C1C1E',
    letterSpacing: -0.32,
  },
  heroDecoration: {
    position: 'absolute',
    top: -20,
    right: -20,
    zIndex: 1,
  },
  decorationCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    position: 'absolute',
  },
  decorationCircleSmall: {
    width: 60,
    height: 60,
    borderRadius: 30,
    top: 40,
    right: 40,
  },
  remainingLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 8,
    letterSpacing: -0.24,
    opacity: 0.8,
  },
  remainingValue: {
    fontSize: 48,
    fontWeight: '800',
    marginBottom: 4,
    letterSpacing: -1.5,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  ctaSection: {
    marginBottom: 40,
    paddingHorizontal: 4,
  },
  buttonContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rippleEffect: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    zIndex: 1,
  },
  successOverlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -25,
    marginLeft: -25,
    zIndex: 3,
  },
  successCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  primaryButton: {
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
    zIndex: 2,
  },
  buttonGradient: {
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    width: '100%',
    justifyContent: 'center',
  },
  buttonIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: 'rgba(255, 255, 255, 0.5)',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  primaryButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.41,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  tipsSection: {
    marginBottom: 24,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 16,
    letterSpacing: -0.41,
  },
  tipCard: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryTipCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  secondaryTipCard: {
    backgroundColor: '#F9F9F9',
    minHeight: 80,
  },
  tipCardContent: {
    padding: 14,
  },
  primaryTipCardContent: {
    padding: 18,
  },
  tipHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  tipIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  tipTextContent: {
    flex: 1,
  },
  tipTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 6,
    letterSpacing: -0.24,
  },
  primaryTipTitle: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.41,
  },
  tipDescription: {
    fontSize: 14,
    fontWeight: '400',
    color: '#8E8E93',
    lineHeight: 20,
    letterSpacing: -0.24,
  },
  primaryTipDescription: {
    fontSize: 15,
    color: '#666666',
    lineHeight: 22,
    marginTop: 2,
  },
  viewMoreCard: {
    backgroundColor: '#F2F2F7',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderStyle: 'dashed',
  },
  viewMoreContent: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  viewMoreText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#007AFF',
    letterSpacing: -0.24,
  },
  howItWorksSection: {
    marginBottom: 20,
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