import React from 'react';
import { StyleSheet, View, TouchableOpacity, Text, Platform } from 'react-native';
import { Animated } from 'react-native';

export interface Segment {
  key: string;
  title: string;
}

type PerksToggleProps = {
  segments: Segment[];
  selectedMode: string; // Key of the selected segment
  onModeChange: (modeKey: string) => void;
};

export const PerksToggle: React.FC<PerksToggleProps> = ({ 
  segments,
  selectedMode, 
  onModeChange 
}) => {
  console.log("DEBUG_PerksToggle_PROPS:", { segments, selectedMode });

  const [containerWidth, setContainerWidth] = React.useState(0);
  const [isFirstRender, setIsFirstRender] = React.useState(true);
  
  const selectedIndex = Math.max(0, segments.findIndex(segment => segment.key === selectedMode));
  const slideAnim = React.useRef(new Animated.Value(selectedIndex)).current;

  React.useEffect(() => {
    const newSelectedIndex = Math.max(0, segments.findIndex(segment => segment.key === selectedMode));
    const animationDuration = isFirstRender ? 400 : 200; 
    
    Animated.timing(slideAnim, {
      toValue: newSelectedIndex,
      duration: animationDuration,
      useNativeDriver: false, // Changed to false for layout-related animations like width/translateX
    }).start();
    
    if (isFirstRender) {
      setIsFirstRender(false);
    }
  }, [selectedMode, segments, isFirstRender, slideAnim]);

  const sliderWidth = containerWidth > 0 && segments.length > 0 ? (containerWidth / segments.length) - 4 : 0;

  const translateX = slideAnim.interpolate({
    inputRange: segments.map((_, index) => index),
    outputRange: segments.map((_, index) => (containerWidth / segments.length) * index + 2),
    extrapolate: 'clamp', // Important for preventing out-of-bounds issues
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
        {containerWidth > 0 && segments.length > 0 && (
          <Animated.View 
            style={[
              styles.slider,
              {
                width: sliderWidth,
                transform: [{ translateX }],
              }
            ]} 
          />
        )}
        
        <View style={styles.buttonsContainer}>
          {segments.map((segment) => (
            <TouchableOpacity 
              key={segment.key}
              style={styles.button} 
              onPress={() => onModeChange(segment.key)}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.buttonText,
                selectedMode === segment.key ? styles.activeText : styles.inactiveText
              ]}>
                {segment.title}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      {/* Optional: Divider can be kept or removed based on new design with potentially more tabs */}
      {/* <View style={styles.divider} /> */}
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    width: '100%',
    alignItems: 'center', // Center the control if it's not full width
  },
  segmentedControl: {
    height: 32,
    backgroundColor: '#F2F2F7',
    borderRadius: 6,
    overflow: 'hidden',
    width: '100%', // Allow it to take full width of its container
    maxWidth: 300, // Max width to prevent it from becoming too wide
    alignSelf: 'center',
    position: 'relative',
    // marginHorizontal: 16, // Removed to allow centering via outerContainer
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
    paddingHorizontal: 5, // Add some padding for longer text
  },
  buttonText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#8E8E93',
    textAlign: 'center', // Ensure text is centered
  },
  activeText: {
    color: Platform.OS === 'ios' ? '#007AFF' : '#1a73e8',
    fontWeight: '600',
  },
  inactiveText: {
    color: '#8E8E93',
    fontWeight: '500',
    opacity: 0.8, // Slightly increased opacity for better readability
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
  // Divider might be less necessary with more tabs, or could be styled differently.
  // For now, it's commented out in the JSX.
  divider: {
    height: 1,
    backgroundColor: '#E5E5EA',
    marginTop: 12,
    // marginHorizontal: -16, // Adjust if re-enabled
    // width: '120%', // Adjust if re-enabled
  },
}); 