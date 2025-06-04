import React from 'react';
import { StyleSheet, View, TouchableOpacity, Text, Platform } from 'react-native';
import { Animated } from 'react-native';

type PerksToggleProps = {
  selectedMode: 'monthly' | 'annualFees';
  onModeChange: (mode: 'monthly' | 'annualFees') => void;
};

export const PerksToggle: React.FC<PerksToggleProps> = ({ 
  selectedMode, 
  onModeChange 
}) => {
  const [containerWidth, setContainerWidth] = React.useState(0);
  const [isFirstRender, setIsFirstRender] = React.useState(true);
  const slideAnim = React.useRef(new Animated.Value(selectedMode === 'monthly' ? 0 : 1)).current;

  React.useEffect(() => {
    const animationDuration = isFirstRender ? 400 : 200; // Longer for first launch
    
    Animated.timing(slideAnim, {
      toValue: selectedMode === 'monthly' ? 0 : 1,
      duration: animationDuration,
      useNativeDriver: true,
    }).start();
    
    if (isFirstRender) {
      setIsFirstRender(false);
    }
  }, [selectedMode, isFirstRender]);

  const translateX = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [2, (containerWidth / 2) - 2],
  });

  // Animated opacity for slider to match inactive text
  const sliderOpacity = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1], // Keep slider at full opacity when active
  });

  return (
    <View style={styles.outerContainer}>
      <View 
        style={styles.segmentedControl} 
        onLayout={(event) => {
          const { width } = event.nativeEvent.layout;
          setContainerWidth(width);
        }}
      >
        <Animated.View 
          style={[
            styles.slider,
            {
              width: containerWidth ? (containerWidth / 2) - 4 : 0,
              transform: [{ translateX }],
              opacity: sliderOpacity,
            }
          ]} 
        />
        
        <View style={styles.buttonsContainer}>
          <TouchableOpacity 
            style={styles.button} 
            onPress={() => onModeChange('monthly')}
            activeOpacity={0.7}
          >
            <Text style={[
              styles.buttonText,
              selectedMode === 'monthly' ? styles.activeText : styles.inactiveText
            ]}>
              Monthly
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.button}
            onPress={() => onModeChange('annualFees')}
            activeOpacity={0.7}
          >
            <Text style={[
              styles.buttonText,
              selectedMode === 'annualFees' ? styles.activeText : styles.inactiveText
            ]}>
              Annual
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.divider} />
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    width: '100%',
  },
  segmentedControl: {
    height: 32,
    backgroundColor: '#F2F2F7',
    borderRadius: 6,
    overflow: 'hidden',
    width: '100%',
    maxWidth: 240,
    alignSelf: 'center',
    position: 'relative',
    marginHorizontal: 16,
  },
  buttonsContainer: {
    flexDirection: 'row',
    position: 'relative',
    zIndex: 1,
    height: '100%',
  },
  button: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#8E8E93',
  },
  activeText: {
    color: Platform.OS === 'ios' ? '#007AFF' : '#1a73e8',
    fontWeight: '600',
  },
  inactiveText: {
    color: '#8E8E93',
    fontWeight: '500',
    opacity: 0.35,
  },
  slider: {
    position: 'absolute',
    top: 2,
    bottom: 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 5,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 1,
        },
        shadowOpacity: 0.15,
        shadowRadius: 2,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E5EA',
    marginTop: 12,
    marginHorizontal: -16,
    width: '120%',
  },
}); 