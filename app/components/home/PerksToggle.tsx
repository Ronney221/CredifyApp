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
  const slideAnim = React.useRef(new Animated.Value(selectedMode === 'monthly' ? 0 : 1)).current;

  React.useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: selectedMode === 'monthly' ? 0 : 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [selectedMode]);

  const translateX = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [2, (containerWidth / 2) - 2], // Adjust for padding
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
              width: containerWidth ? (containerWidth / 2) - 4 : 0, // Adjust for padding
              transform: [{ translateX }],
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
              selectedMode === 'monthly' && styles.activeText
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
              selectedMode === 'annualFees' && styles.activeText
            ]}>
              Annual
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    width: '100%',
  },
  segmentedControl: {
    height: 36,
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    overflow: 'hidden',
    width: '100%',
    position: 'relative',
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
    fontSize: 15,
    fontWeight: '600',
    color: '#8E8E93',
  },
  activeText: {
    color: Platform.OS === 'ios' ? '#007AFF' : '#1a73e8',
  },
  slider: {
    position: 'absolute',
    top: 2,
    bottom: 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
}); 