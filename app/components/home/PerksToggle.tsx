import React from 'react';
import { StyleSheet, View, Platform } from 'react-native';
import SegmentedControl from '@react-native-segmented-control/segmented-control'; // Import the library
import { Colors } from '../../../constants/Colors'; // Assuming you might want to use your app's tint color

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
  // console.log("DEBUG_PerksToggle_PROPS:", { segments, selectedMode });

  const selectedIndex = Math.max(0, segments.findIndex(segment => segment.key === selectedMode));
  const segmentValues = segments.map(segment => segment.title);

  const handleValueChange = (value: string) => {
    const selectedSegment = segments.find(segment => segment.title === value);
    if (selectedSegment) {
      onModeChange(selectedSegment.key);
    }
  };

  return (
    <View style={styles.outerContainer}>
      <SegmentedControl
        values={segmentValues}
        selectedIndex={selectedIndex}
        onChange={(event) => {
          // The event often gives selectedSegmentIndex, or you might need to use onValueChange for the value directly
          // For this library, onChange typically gives an event, and onValueChange gives the string value.
          // Let's assume onValueChange is preferred if available, or adapt from event.
          // The library's documentation should clarify the exact event structure.
          // We will use event.nativeEvent.selectedSegmentIndex if that's standard, or adapt if not.
          // Most robust is to have a direct onValueChange if the library supports it like this:
          // onValueChange={handleValueChange}
          // For now, if onChange is the primary, let's assume it returns an index:
          const newIndex = event.nativeEvent.selectedSegmentIndex;
          if (segments[newIndex]) {
            onModeChange(segments[newIndex].key);
          }
        }}
        // The following props are common for styling to match iOS native look
        tintColor={'#1E2A4C'} // Active tab background (rich navy)
        backgroundColor={'#F2F2F2'} // Inactive tab background (light gray)
        fontStyle={{ color: '#6B7280' }} // Inactive tab text (cool gray)
        activeFontStyle={{ color: '#FFFFFF' }} // Active tab text (white)
        appearance={Platform.OS === 'ios' ? 'dark' : undefined} 
        style={styles.segmentedControl}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8, // Added some vertical padding
    width: '100%',
    alignItems: 'center',
  },
  segmentedControl: {
    width: '100%',
    maxWidth: 320, // Max width to prevent it from becoming too wide on larger screens
    height: Platform.OS === 'ios' ? 32 : 40, // Adjust height based on platform norms
  },
}); 