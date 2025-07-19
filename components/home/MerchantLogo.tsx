import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SvgXml } from 'react-native-svg';
import { ComponentColors } from '../../constants/DesignSystem';

interface MerchantLogoProps {
  perkName: string;
  size?: 'small' | 'medium' | 'large';
  fallbackIcon?: string;
}

// Comprehensive perk icon mapping with brand colors
const getMerchantIcon = (perkName: string): { name: string; color: string } => {
  const lowerName = perkName.toLowerCase();
  
  // === TRANSPORTATION & RIDESHARE ===
  if (lowerName.includes('uber eats')) return { name: 'fast-food', color: '#000000' };
  if (lowerName.includes('uber')) return { name: 'car', color: '#000000' };
  if (lowerName.includes('lyft')) return { name: 'car-outline', color: '#FF00BF' };
  if (lowerName.includes('rideshare')) return { name: 'car-sport', color: '#007AFF' };
  
  // === FOOD DELIVERY & DINING ===
  if (lowerName.includes('doordash')) return { name: 'fast-food', color: '#FF3008' };
  if (lowerName.includes('grubhub')) return { name: 'fast-food-outline', color: '#FF8000' };
  if (lowerName.includes('dining credit') || lowerName.includes('restaurant')) return { name: 'restaurant', color: '#8B4513' };
  if (lowerName.includes('exclusive table dining')) return { name: 'wine', color: '#722F37' };
  if (lowerName.includes('dunkin')) return { name: 'cafe', color: '#FF671F' };
  if (lowerName.includes('starbucks')) return { name: 'cafe-outline', color: '#00704A' };
  
  // === ENTERTAINMENT & STREAMING ===
  if (lowerName.includes('netflix')) return { name: 'tv', color: '#E50914' };
  if (lowerName.includes('digital entertainment')) return { name: 'play-circle', color: '#6B46C1' };
  if (lowerName.includes('disney bundle') || lowerName.includes('disney')) return { name: 'film', color: '#0066CC' };
  if (lowerName.includes('apple music')) return { name: 'musical-notes', color: '#000000' };
  if (lowerName.includes('apple tv')) return { name: 'tv-outline', color: '#000000' };
  if (lowerName.includes('apple')) return { name: 'logo-apple', color: '#000000' };
  if (lowerName.includes('stubhub')) return { name: 'ticket', color: '#3B5998' };
  
  // === TRAVEL & AIRLINES ===
  if (lowerName.includes('delta')) return { name: 'airplane', color: '#003366' };
  if (lowerName.includes('airline fee') || lowerName.includes('airline incidental')) return { name: 'airplane-outline', color: '#1E40AF' };
  if (lowerName.includes('airlight flight') || lowerName.includes('flight credit')) return { name: 'airplane', color: '#059669' };
  if (lowerName.includes('capital one travel')) return { name: 'map', color: '#004879' };
  if (lowerName.includes('the edit by chase travel') || lowerName.includes('chase travel')) return { name: 'compass', color: '#117ACA' };
  if (lowerName.includes('annual travel')) return { name: 'earth', color: '#10B981' };
  
  // === HOTELS & LODGING ===
  if (lowerName.includes('marriott')) return { name: 'bed', color: '#003366' };
  if (lowerName.includes('hilton')) return { name: 'bed-outline', color: '#104C97' };
  if (lowerName.includes('hotel credit') || lowerName.includes('prepaid hotel')) return { name: 'business', color: '#7C3AED' };
  if (lowerName.includes('annual free night') || lowerName.includes('free night')) return { name: 'moon', color: '#1E293B' };
  
  // === SHOPPING & RETAIL ===
  if (lowerName.includes('walmart')) return { name: 'cart', color: '#0071CE' };
  if (lowerName.includes('instacart')) return { name: 'cart-outline', color: '#43B02A' };
  if (lowerName.includes('saks')) return { name: 'pricetag', color: '#000000' };
  
  // === FITNESS & WELLNESS ===
  if (lowerName.includes('peloton')) return { name: 'bicycle', color: '#000000' };
  if (lowerName.includes('equinox')) return { name: 'fitness', color: '#000000' };
  if (lowerName.includes('lifestyle convenience')) return { name: 'leaf', color: '#059669' };
  
  // === SECURITY & SERVICES ===
  if (lowerName.includes('clear')) return { name: 'shield-checkmark', color: '#003087' };
  
  // === DINING & RESERVATIONS ===
  if (lowerName.includes('resy')) return { name: 'restaurant', color: '#000000' };
  if (lowerName.includes('opentable')) return { name: 'restaurant-outline', color: '#DA3743' };
  
  // === NEWS & MEDIA ===
  if (lowerName.includes('new york times') || lowerName.includes('nytimes')) return { name: 'newspaper', color: '#000000' };
  if (lowerName.includes('wall street journal') || lowerName.includes('wsj')) return { name: 'newspaper-outline', color: '#000000' };
  
  // === CATEGORY-BASED FALLBACKS ===
  if (lowerName.includes('credit') && lowerName.includes('travel')) return { name: 'airplane', color: '#6366F1' };
  if (lowerName.includes('credit') && lowerName.includes('dining')) return { name: 'restaurant', color: '#DC2626' };
  if (lowerName.includes('credit') && lowerName.includes('hotel')) return { name: 'bed', color: '#7C2D12' };
  if (lowerName.includes('credit') && lowerName.includes('entertainment')) return { name: 'play-circle', color: '#7C3AED' };
  if (lowerName.includes('credit') && lowerName.includes('streaming')) return { name: 'tv', color: '#1D4ED8' };
  if (lowerName.includes('membership') || lowerName.includes('subscription')) return { name: 'card', color: '#059669' };
  if (lowerName.includes('annual') && lowerName.includes('fee')) return { name: 'cash', color: '#DC2626' };
  
  // Default fallback
  return { name: 'pricetag-outline', color: ComponentColors.text.secondary };
};

const MerchantLogo: React.FC<MerchantLogoProps> = ({ 
  perkName, 
  size = 'medium',
  fallbackIcon = 'pricetag-outline' 
}) => {
  // Size configurations
  const sizeConfig = {
    small: { icon: 20, container: 36 },
    medium: { icon: 26, container: 48 },
    large: { icon: 32, container: 60 },
  }[size];
  
  const merchantIcon = getMerchantIcon(perkName);
  
  return (
    <View style={[
      styles.container,
      { 
        width: sizeConfig.container, 
        height: sizeConfig.container,
        backgroundColor: `${merchantIcon.color}10`, // 10% opacity background
        borderRadius: sizeConfig.container / 4,
      }
    ]}>
      <Ionicons 
        name={merchantIcon.name as any} 
        size={sizeConfig.icon} 
        color={merchantIcon.color}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default React.memo(MerchantLogo);