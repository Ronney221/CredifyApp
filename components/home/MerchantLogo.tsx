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

// Since we can't directly import SVGs, let's use a mapping approach
// For now, we'll use icons as placeholders until SVGs are properly configured
const getMerchantIcon = (perkName: string): { name: string; color: string } => {
  const lowerName = perkName.toLowerCase();
  
  // Map perks to appropriate icons and colors
  if (lowerName.includes('uber')) return { name: 'car', color: '#000000' };
  if (lowerName.includes('lyft')) return { name: 'car-outline', color: '#FF00BF' };
  if (lowerName.includes('doordash')) return { name: 'fast-food', color: '#FF3008' };
  if (lowerName.includes('grubhub')) return { name: 'fast-food-outline', color: '#FF8000' };
  if (lowerName.includes('netflix')) return { name: 'tv', color: '#E50914' };
  if (lowerName.includes('walmart')) return { name: 'cart', color: '#0071CE' };
  if (lowerName.includes('instacart')) return { name: 'cart-outline', color: '#43B02A' };
  if (lowerName.includes('peloton')) return { name: 'bicycle', color: '#000000' };
  if (lowerName.includes('equinox')) return { name: 'fitness', color: '#000000' };
  if (lowerName.includes('clear')) return { name: 'shield-checkmark', color: '#003087' };
  if (lowerName.includes('marriott')) return { name: 'bed', color: '#003366' };
  if (lowerName.includes('hilton')) return { name: 'bed-outline', color: '#104C97' };
  if (lowerName.includes('delta')) return { name: 'airplane', color: '#003366' };
  if (lowerName.includes('saks')) return { name: 'pricetag', color: '#000000' };
  if (lowerName.includes('apple')) return { name: 'logo-apple', color: '#000000' };
  if (lowerName.includes('resy')) return { name: 'restaurant', color: '#000000' };
  if (lowerName.includes('opentable')) return { name: 'restaurant-outline', color: '#DA3743' };
  if (lowerName.includes('stubhub')) return { name: 'ticket', color: '#3B5998' };
  if (lowerName.includes('new york times') || lowerName.includes('nytimes')) return { name: 'newspaper', color: '#000000' };
  if (lowerName.includes('wall street journal') || lowerName.includes('wsj')) return { name: 'newspaper-outline', color: '#000000' };
  if (lowerName.includes('dunkin')) return { name: 'cafe', color: '#FF671F' };
  if (lowerName.includes('starbucks')) return { name: 'cafe-outline', color: '#00704A' };
  
  // Default
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