import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Animated,
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

    if (mode === 'manage') {
      if (showRemoveButton) {
        return (
          <View style={styles.manageControls}>
            {onRemove && (
              <TouchableOpacity onPress={() => onRemove(card.id)} style={styles.removeButton}>
                <Ionicons name="remove-circle-outline" size={24} color="#ff3b30" />
              </TouchableOpacity>
            )}
          </View>
        );
      }
      return (
        <TouchableOpacity onPress={() => onPress(card.id)} style={styles.chevronButton}>
          <Ionicons name="chevron-forward" size={20} color="#c7c7cc" />
        </TouchableOpacity>
      );
    }

    return null;
  };

  const containerTransform = cardScaleAnim 
    ? [{ scale: cardScaleAnim }] 
    : [];

  return (
    <View>
      <TouchableOpacity
        style={[
          styles.cardRow,
          isSelected && mode === 'onboard' && styles.cardRowSelected,
          disabled && styles.cardRowDisabled,
          isEditMode && styles.cardRowEditMode,
        ]}
        onPress={() => !disabled && onPress(card.id)}
        activeOpacity={0.7}
        disabled={disabled}
      >
        {isEditMode && (
          <View style={styles.grabberIconContainer}>
            <Ionicons name="reorder-three-outline" size={28} color="#8e8e93" />
          </View>
        )}
        <Animated.View 
          style={[
            styles.cardImageWrapper, 
            { backgroundColor: networkColor, transform: containerTransform }
          ]}
        >
          <Image source={card.image} style={styles.cardImage} />
        </Animated.View>
        
        <View style={styles.cardContent}>
          <Text style={styles.cardName}>{card.name}</Text>
          {subtitle && (
            <View style={styles.statusChipContainer}>
              {subtitleStyle === 'placeholder' ? (
                <View style={[styles.statusChipBase, styles.statusChipMissingDate]}>
                  <Ionicons name="calendar-outline" size={12} color="#FFFFFF" style={styles.chipIcon} />
                  <Text style={[styles.statusChipTextBase, styles.statusChipTextMissingDate]}>{subtitle}</Text>
                </View>
              ) : (
                <View style={[styles.statusChipBase, styles.statusChipValidDate]}>
                  <Ionicons name="checkmark-circle" size={12} color="#FFFFFF" style={styles.chipIcon} />
                  <Text style={[styles.statusChipTextBase, styles.statusChipTextValidDate]}>{subtitle}</Text>
                </View>
              )}
            </View>
          )}
        </View>
        
        {renderRightElement()}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#c7c7cc',
  },
  cardRowSelected: {
    backgroundColor: '#eef7ff',
  },
  cardRowDisabled: {
    opacity: 0.5,
  },
  cardRowEditMode: {
    opacity: 0.9,
  },
  grabberIconContainer: {
    paddingRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardImageWrapper: {
    width: 64,
    height: 40,
    borderRadius: 5,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  cardImage: {
    width: '90%',
    height: '90%',
    resizeMode: 'contain',
  },
  cardContent: {
    flex: 1,
    marginRight: 8,
  },
  cardName: {
    fontSize: 17,
    color: Colors.light.text,
  },
  statusChipContainer: {
    marginTop: 6,
  },
  statusChipBase: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  statusChipMissingDate: {
    backgroundColor: '#FF950099',
  },
  chipIcon: {
    marginRight: 4,
  },
  statusChipTextBase: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: '500',
  },
  statusChipTextMissingDate: {
    // Potentially specific text color if needed, otherwise inherits from base
  },
  statusChipValidDate: {
    backgroundColor: Colors.light.tint,
  },
  statusChipTextValidDate: {
    // Potentially specific text color if needed, otherwise inherits from base
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
    padding: 4,
  },
  chevronButton: {
    padding: 4,
  },
}); 