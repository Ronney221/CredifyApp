import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { Achievement } from '../../utils/achievements';

interface AchievementBadgeProps {
  achievement: Achievement;
  size?: 'small' | 'medium' | 'large';
  showProgress?: boolean;
}

export const AchievementBadge = ({ 
  achievement, 
  size = 'medium',
  showProgress = false 
}: AchievementBadgeProps) => {
  const sizeStyles = getSizeStyles(size);
  const categoryColors = getCategoryColors(achievement.category);

  return (
    <View style={[styles.container, sizeStyles.container]}>
      <View style={[
        styles.iconContainer,
        sizeStyles.iconContainer,
        achievement.isUnlocked 
          ? { backgroundColor: categoryColors.background }
          : styles.lockedIconContainer
      ]}>
        <Ionicons
          name={achievement.icon as any}
          size={sizeStyles.iconSize}
          color={achievement.isUnlocked ? categoryColors.icon : Colors.light.tertiaryLabel}
        />
      </View>
      
      <View style={[styles.textContainer, sizeStyles.textContainer]}>
        <Text style={[
          styles.title,
          sizeStyles.title,
          !achievement.isUnlocked && styles.lockedText
        ]}>
          {achievement.title}
        </Text>
        
        {size !== 'small' && (
          <Text style={[
            styles.description,
            sizeStyles.description,
            !achievement.isUnlocked && styles.lockedText
          ]}>
            {achievement.description}
          </Text>
        )}
        
        {showProgress && !achievement.isUnlocked && (
          <View style={styles.progressContainer}>
            <View style={styles.progressTrack}>
              <View 
                style={[
                  styles.progressFill,
                  { 
                    width: `${achievement.progress * 100}%`,
                    backgroundColor: categoryColors.icon
                  }
                ]} 
              />
            </View>
            <Text style={styles.progressText}>
              {Math.round(achievement.progress * 100)}%
            </Text>
          </View>
        )}
      </View>

      {achievement.isUnlocked && size !== 'small' && (
        <View style={[styles.statusIndicator, { backgroundColor: categoryColors.icon }]}>
          <Ionicons name="checkmark" size={12} color="white" />
        </View>
      )}
    </View>
  );
};

const getSizeStyles = (size: 'small' | 'medium' | 'large') => {
  switch (size) {
    case 'small':
      return {
        container: { minHeight: 50, paddingHorizontal: 10, paddingVertical: 6 },
        iconContainer: { width: 28, height: 28 },
        iconSize: 14,
        textContainer: { marginLeft: 10 },
        title: { fontSize: 13, fontWeight: '600' as const },
        description: { fontSize: 11 },
      };
    case 'large':
      return {
        container: { minHeight: 100, paddingHorizontal: 20, paddingVertical: 16 },
        iconContainer: { width: 56, height: 56 },
        iconSize: 28,
        textContainer: { marginLeft: 16 },
        title: { fontSize: 18, fontWeight: '700' as const },
        description: { fontSize: 14 },
      };
    default: // medium
      return {
        container: { minHeight: 65, paddingHorizontal: 14, paddingVertical: 10 },
        iconContainer: { width: 36, height: 36 },
        iconSize: 18,
        textContainer: { marginLeft: 12 },
        title: { fontSize: 15, fontWeight: '600' as const },
        description: { fontSize: 12 },
      };
  }
};

const getCategoryColors = (category: Achievement['category']) => {
  switch (category) {
    case 'streak':
      return {
        background: '#FF6B35' + '20',
        icon: '#FF6B35',
      };
    case 'value':
      return {
        background: '#4CAF50' + '20',
        icon: '#4CAF50',
      };
    case 'efficiency':
      return {
        background: '#2196F3' + '20',
        icon: '#2196F3',
      };
    case 'mastery':
      return {
        background: '#9C27B0' + '20',
        icon: '#9C27B0',
      };
    case 'fee_recovery':
      return {
        background: '#FF9800' + '20',
        icon: '#FF9800',
      };
    default:
      return {
        background: Colors.light.accent + '20',
        icon: Colors.light.accent,
      };
  }
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.background,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  iconContainer: {
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockedIconContainer: {
    backgroundColor: Colors.light.systemGroupedBackground,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    color: Colors.light.text,
    letterSpacing: -0.2,
    marginBottom: 4,
  },
  description: {
    color: Colors.light.secondaryLabel,
    lineHeight: 18,
    fontWeight: '500',
  },
  lockedText: {
    color: Colors.light.tertiaryLabel,
  },
  statusIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  progressTrack: {
    flex: 1,
    height: 4,
    backgroundColor: Colors.light.systemGroupedBackground,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.light.secondaryLabel,
    minWidth: 32,
  },
});