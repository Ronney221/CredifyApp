import React from 'react';
import { View, StyleSheet } from 'react-native';
import Reanimated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withTiming, 
  interpolate 
} from 'react-native-reanimated';
import PerkSkeleton from './PerkSkeleton';

interface CardSkeletonProps {
  isExpanded?: boolean;
  perkCount?: number;
}

const CardSkeleton: React.FC<CardSkeletonProps> = ({ 
  isExpanded = false, 
  perkCount = 3 
}) => {
  const shimmerAnimation = useSharedValue(0);

  React.useEffect(() => {
    shimmerAnimation.value = withRepeat(
      withTiming(1, { duration: 1200 }),
      -1,
      true
    );
  }, []);

  const shimmerStyle = useAnimatedStyle(() => {
    const opacity = interpolate(shimmerAnimation.value, [0, 1], [0.3, 0.8]);
    return { opacity };
  });

  return (
    <View style={styles.container}>
      {/* Card Header Skeleton */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Reanimated.View style={[styles.cardIcon, shimmerStyle]} />
          <View style={styles.headerText}>
            <Reanimated.View style={[styles.cardName, shimmerStyle]} />
            <Reanimated.View style={[styles.cardStats, shimmerStyle]} />
          </View>
        </View>
        <View style={styles.headerRight}>
          <Reanimated.View style={[styles.savedAmount, shimmerStyle]} />
          <Reanimated.View style={[styles.chevron, shimmerStyle]} />
        </View>
      </View>

      {/* Expanded Content Skeleton */}
      {isExpanded && (
        <View style={styles.expandedContent}>
          <View style={styles.sectionHeader}>
            <Reanimated.View style={[styles.sectionTitle, shimmerStyle]} />
          </View>
          
          {/* Generate perk skeletons */}
          {Array.from({ length: perkCount }, (_, index) => (
            <PerkSkeleton 
              key={index} 
              showSwipeActions={index === 0} 
              isRedeemed={index >= Math.floor(perkCount * 0.6)} 
            />
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.06)',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    height: 84, // Fixed height matching CardHeader
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cardIcon: {
    width: 44,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#E0E0E0',
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  cardName: {
    height: 18,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    marginBottom: 6,
    width: '80%',
  },
  cardStats: {
    height: 14,
    backgroundColor: '#E8E8E8',
    borderRadius: 3,
    width: '60%',
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  savedAmount: {
    width: 80,
    height: 18,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    marginBottom: 4,
  },
  chevron: {
    width: 20,
    height: 20,
    backgroundColor: '#E8E8E8',
    borderRadius: 10,
  },
  expandedContent: {
    backgroundColor: '#FAFAFA',
    padding: 16,
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    height: 16,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    width: 120,
    marginBottom: 8,
  },
});

export default CardSkeleton;