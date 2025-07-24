import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  runOnJS,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';

export type InsightTab = 'summary' | 'cards' | 'trends' | 'tips';

interface InsightsSegmentedControlProps {
  activeTab: InsightTab;
  onTabChange: (tab: InsightTab) => void;
}

interface TabConfig {
  id: InsightTab;
  label: string;
  icon?: string;
}

const tabs: TabConfig[] = [
  { id: 'summary', label: 'Summary' },
  { id: 'cards', label: 'Cards' },
  { id: 'trends', label: 'Trends' },
  { id: 'tips', label: 'History' },
];

const { width: screenWidth } = Dimensions.get('window');
const CONTAINER_PADDING = 32; // 16px left + 16px right
const CONTROL_PADDING = 8; // 4px left + 4px right inside control
const AVAILABLE_WIDTH = screenWidth - CONTAINER_PADDING - CONTROL_PADDING;
const SEGMENT_WIDTH = AVAILABLE_WIDTH / tabs.length;

export default function InsightsSegmentedControl({
  activeTab,
  onTabChange,
}: InsightsSegmentedControlProps) {
  const translateX = useSharedValue(0);
  const previousTab = useRef(activeTab);

  useEffect(() => {
    const activeIndex = tabs.findIndex(tab => tab.id === activeTab);
    const previousIndex = tabs.findIndex(tab => tab.id === previousTab.current);
    
    // Determine animation style based on direction
    const isMovingRight = activeIndex > previousIndex;
    
    translateX.value = withSpring(activeIndex * SEGMENT_WIDTH, {
      damping: 15,
      stiffness: 400,
      mass: 0.6,
    });
    
    previousTab.current = activeTab;
  }, [activeTab, translateX]);

  const animatedIndicatorStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
    };
  });

  const handleTabPress = async (tab: InsightTab) => {
    if (tab === activeTab) return;
    
    if (Platform.OS === 'ios') {
      await Haptics.selectionAsync();
    }
    
    onTabChange(tab);
  };

  return (
    <View style={styles.container}>
      <BlurView intensity={80} tint="light" style={styles.blurContainer}>
        <View style={styles.segmentedControl}>
          {/* Animated indicator */}
          <Animated.View style={[styles.indicator, animatedIndicatorStyle]}>
            <View style={styles.indicatorInner} />
          </Animated.View>
          
          {/* Tab buttons */}
          {tabs.map((tab, index) => {
            const isActive = tab.id === activeTab;
            
            return (
              <TouchableOpacity
                key={tab.id}
                style={styles.tab}
                onPress={() => handleTabPress(tab.id)}
                activeOpacity={0.7}
              >
                <Animated.View style={styles.tabContent}>
                  <AnimatedTabLabel
                    label={tab.label}
                    isActive={isActive}
                    index={index}
                  />
                </Animated.View>
              </TouchableOpacity>
            );
          })}
        </View>
      </BlurView>
    </View>
  );
}

// Animated tab label component for smooth transitions
const AnimatedTabLabel: React.FC<{
  label: string;
  isActive: boolean;
  index: number;
}> = ({ label, isActive, index }) => {
  const scale = useSharedValue(isActive ? 1 : 1);
  const opacity = useSharedValue(isActive ? 1 : 0.6);

  useEffect(() => {
    scale.value = withSpring(isActive ? 1.05 : 1, {
      damping: 20,
      stiffness: 300,
    });
    
    opacity.value = withTiming(isActive ? 1 : 0.6, {
      duration: 200,
    });
  }, [isActive, scale, opacity]);

  const animatedLabelStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
      opacity: opacity.value,
    };
  });

  return (
    <Animated.View style={{ width: '100%', alignItems: 'center' }}>
      <Animated.Text 
        style={[
          styles.tabLabel,
          isActive && styles.tabLabelActive,
          animatedLabelStyle,
        ]}
      >
        {label}
      </Animated.Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  blurContainer: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 16,
    padding: 4,
    position: 'relative',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  indicator: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    left: 4,
    width: SEGMENT_WIDTH,
  },
  indicatorInner: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
    minHeight: 40,
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    flex: 1,
  },
  tabLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#666666',
    letterSpacing: -0.24,
    textAlign: 'center',
    includeFontPadding: false,
    textAlignVertical: 'center',
    width: '100%',
  },
  tabLabelActive: {
    color: '#1C1C1E',
    fontWeight: '700',
  },
});