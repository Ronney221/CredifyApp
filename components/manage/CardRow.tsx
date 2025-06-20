import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Animated,
  Platform,
} from 'react-native';
import { Card } from '../../../src/data/card-data';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../constants/Colors';
import LottieView from 'lottie-react-native';

const getCardNetworkColor = (card: Card) => {
  switch (card.network?.toLowerCase()) {
    case 'amex':
    case 'american express':
      if (card.name?.toLowerCase().includes('platinum')) return '#E5E4E2';
      if (card.name?.toLowerCase().includes('gold')) return '#B08D57';
      return '#007bc1';
    case 'chase':
      return '#124A8D';
    default:
      return '#F0F0F0';
  }
};

interface CardRowProps {
  card: Card;
  isSelected: boolean;
  onPress: (cardId: string) => void;
  mode: 'onboard' | 'manage';
  cardScaleAnim?: Animated.Value;
  disabled?: boolean;
  subtitle?: string;
  subtitleStyle?: 'normal' | 'placeholder';
  showRemoveButton?: boolean;
  onRemove?: (cardId: string) => void;
  isEditMode?: boolean;
  isActive?: boolean;
  drag?: () => void;
}

export const CardRow: React.FC<CardRowProps> = ({
  card,
  isSelected,
  onPress,
  mode,
  cardScaleAnim,
  disabled = false,
  subtitle,
  subtitleStyle = 'normal',
  showRemoveButton = false,
  onRemove,
  isEditMode = false,
  isActive = false,
  drag,
}) => {
  const networkColor = getCardNetworkColor(card);

  const renderRightElement = () => {
    if (mode === 'onboard') {
      return (
        <View style={styles.checkboxContainer}>
          {isSelected ? (
            <LottieView
              source={require('../../../assets/animations/checkmark.json')}
              autoPlay={true}
              loop={false}
              style={styles.lottieCheckmark}
              speed={1.5}
            />
          ) : (
            <Ionicons
              name="square-outline"
              size={26}
              color={Colors.light.icon}
              style={styles.checkboxIcon}
            />
          )}
        </View>
      );
    }

    if (mode === 'manage' && showRemoveButton) {
      return (
        <View style={styles.manageControls}>
          {onRemove && (
            <TouchableOpacity onPress={() => onRemove(card.id)} style={styles.removeButton}>
              <Ionicons name="remove-circle-outline" size={24} color={Colors.light.error} />
            </TouchableOpacity>
          )}
        </View>
      );
    }

    return null;
  };

  const containerTransform = cardScaleAnim 
    ? [{ scale: cardScaleAnim }] 
    : [];

  const renderCardIcon = () => {
    if (card.image) {
      return (
        <Animated.View 
          style={[
            styles.cardImageWrapper, 
            { backgroundColor: networkColor, transform: containerTransform }
          ]}
        >
          <Image source={card.image} style={styles.cardImage} />
        </Animated.View>
      );
    }

    return (
      <Animated.View 
        style={[
          styles.cardIconWrapper,
          { transform: containerTransform }
        ]}
      >
        <Ionicons 
          name={Platform.OS === 'ios' ? 'card' : 'card-outline'} 
          size={28} 
          color={Colors.light.icon} 
        />
      </Animated.View>
    );
  };

  return (
    <TouchableOpacity
      style={[
        styles.cardRow,
        isSelected && mode === 'onboard' && styles.cardRowSelected,
        disabled && styles.cardRowDisabled,
        isEditMode && styles.cardRowEditMode,
        isActive && styles.cardRowActive,
      ]}
      onPress={() => !disabled && onPress(card.id)}
      activeOpacity={0.7}
      disabled={disabled || isEditMode}
    >
      {isEditMode && showRemoveButton && onRemove && (
        <TouchableOpacity 
          onPress={() => onRemove(card.id)} 
          style={styles.removeButton}
        >
          <Ionicons 
            name="remove-circle-outline" 
            size={24} 
            color={Colors.light.error} 
          />
        </TouchableOpacity>
      )}
      
      {renderCardIcon()}
      
      <View style={styles.cardContent}>
        <Text style={styles.cardName} numberOfLines={1}>{card.name}</Text>
        {subtitle && (
          <Text 
            style={[
              styles.subtitle, 
              subtitleStyle === 'placeholder' && styles.subtitlePlaceholder
            ]}
            numberOfLines={1}
          >
            {subtitle}
          </Text>
        )}
      </View>
      
      {isEditMode && (
        <TouchableOpacity 
          onPressIn={drag}
          style={styles.grabberIconContainer}
        >
          <Ionicons 
            name="reorder-three-outline" 
            size={28} 
            color={Colors.light.secondaryLabel} 
          />
        </TouchableOpacity>
      )}
      
      {!isEditMode && renderRightElement()}
    </TouchableOpacity>
  );
};


export default CardRow;

const styles = StyleSheet.create({
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 60,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    marginHorizontal: 16,
    marginVertical: 4,
    backgroundColor: '#fff',
  },
  cardRowSelected: {
    backgroundColor: '#eef7ff',
    borderColor: Colors.light.tint,
    shadowColor: Colors.light.tint,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  cardRowDisabled: {
    opacity: 0.5,
  },
  cardRowEditMode: {
    opacity: 0.9,
  },
  cardRowActive: {
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  grabberIconContainer: {
    paddingLeft: 8,
    paddingRight: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardImageWrapper: {
    width: 44,
    height: 28,
    borderRadius: 4,
    marginRight: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
    backgroundColor: 'transparent',
  },
  cardIconWrapper: {
    width: 28,
    height: 28,
    marginRight: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardImage: {
    width: '100%',
    height: '100%',
    borderRadius: 4,
    resizeMode: 'contain',
  },
  cardContent: {
    flex: 1,
    marginRight: 8,
    justifyContent: 'center',
  },
  cardName: {
    fontSize: 17,
    fontWeight: '400',
    color: Colors.light.text,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.light.secondaryLabel,
  },
  subtitlePlaceholder: {
    color: Colors.light.tint,
    fontWeight: '500',
  },
  checkboxContainer: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lottieCheckmark: {
    width: 36,
    height: 36,
    backgroundColor: 'transparent',
  },
  checkboxIcon: {},
  manageControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  removeButton: {
    paddingRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
}); 