import React from 'react';
import { View, StyleSheet } from 'react-native';
import Reanimated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withTiming, 
  interpolate 
} from 'react-native-reanimated';

interface PerkSkeletonProps {
  showSwipeActions?: boolean;
  isRedeemed?: boolean;
}

const PerkSkeleton: React.FC<PerkSkeletonProps> = ({ 
  showSwipeActions = false, 
  isRedeemed = false 
}) => {
  const shimmerAnimation = useSharedValue(0);

  React.useEffect(() => {
    shimmerAnimation.value = withRepeat(
      withTiming(1, { duration: 1000 }),
      -1,
      true
    );
  }, []);

  const shimmerStyle = useAnimatedStyle(() => {
    const opacity = interpolate(shimmerAnimation.value, [0, 1], [0.3, 0.7]);
    return { opacity };
  });

  return (
    <View style={[
      styles.container, 
      isRedeemed && styles.redeemedContainer
    ]}>
      {showSwipeActions && (
        <View style={styles.swipeActionSkeleton}>
          <Reanimated.View style={[styles.actionIcon, shimmerStyle]} />
        </View>
      )}
      
      <View style={styles.content}>
        {/* Icon placeholder */}
        <Reanimated.View style={[styles.iconSkeleton, shimmerStyle]} />
        
        <View style={styles.textContent}>
          {/* Perk name skeleton */}
          <Reanimated.View style={[styles.titleSkeleton, shimmerStyle]} />
          {/* Description skeleton */}
          <Reanimated.View style={[styles.descriptionSkeleton, shimmerStyle]} />
        </View>
        
        {/* Value skeleton */}
        <Reanimated.View style={[styles.valueSkeleton, shimmerStyle]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#F7F7F7',
    borderRadius: 16,
    marginBottom: 8,
    height: 84, // Fixed height matching PerkRow
    overflow: 'hidden',
  },
  redeemedContainer: {
    opacity: 0.6,
  },
  swipeActionSkeleton: {
    position: 'absolute',
    left: 12,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  actionIcon: {
    width: 24,
    height: 24,
    borderRadius: 4,
    backgroundColor: '#CCCCCC',
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconSkeleton: {
    width: 30,
    height: 30,
    borderRadius: 6,
    backgroundColor: '#E0E0E0',
    marginRight: 12,
  },
  textContent: {
    flex: 1,
    paddingRight: 8,
  },
  titleSkeleton: {
    height: 18,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    marginBottom: 6,
    width: '70%',
  },
  descriptionSkeleton: {
    height: 14,
    backgroundColor: '#E8E8E8',
    borderRadius: 3,
    width: '90%',
  },
  valueSkeleton: {
    width: 60,
    height: 16,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
  },
});

export default PerkSkeleton;