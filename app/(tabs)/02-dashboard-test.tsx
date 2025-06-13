import React, { useRef } from 'react';
import {
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { BlurView } from 'expo-blur';


// --- Header Animation Constants ---
// We define the height of the main content area of the header, both when expanded and collapsed.
// The actual animated header container will be taller to account for the status bar area.
const EXPANDED_HEADER_CONTENT_HEIGHT = 60; // Increased height for better visual balance
const COLLAPSED_HEADER_CONTENT_HEIGHT = 20;
const HEADER_SCROLL_DISTANCE = EXPANDED_HEADER_CONTENT_HEIGHT - COLLAPSED_HEADER_CONTENT_HEIGHT;

// --- Color Palette ---
const colorPalette = [
  '#FFADAD', '#FFD6A5', '#FDFFB6', '#CAFFBF', '#9BF6FF', '#A0C4FF', '#BDB2FF', '#FFC6FF',
  '#FFE5E5', '#E5FFE5', '#E5E5FF', '#FFE5FF', '#FFFFE5', '#E5FFFF', '#FFE5CC', '#E5FFE5',
  '#E5E5E5', '#FFE5E5', '#E5FFE5', '#E5E5FF'
];

export default function DashboardTest() {
  // --- Hooks ---
  // useSafeAreaInsets provides the padding needed to avoid the device's notch and status/navigation bars.
  // We specifically need `insets.top` for the status bar.
  const insets = useSafeAreaInsets();
  const scrollY = useRef(new Animated.Value(0)).current;

  // --- Dynamic Content ---
  const currentMonthName = 'June';
  const collapsedHeaderText = `${currentMonthName} Dashboard`;
  const welcomeText = 'Welcome back,';
  const userName = 'John';

  // --- Derived Heights ---
  // The total height of our header includes the content area PLUS the safe area inset (status bar height).
  const totalHeaderHeight = EXPANDED_HEADER_CONTENT_HEIGHT + insets.top;
  // The initial padding for the ScrollView must match the total header height to avoid content starting underneath it.
  const scrollViewPaddingTop = totalHeaderHeight;

  // --- Animated Values ---
  // These interpolations control the fading and movement of the header elements during scroll.
  const expandedContentOpacity = scrollY.interpolate({
    inputRange: [0, HEADER_SCROLL_DISTANCE / 2],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const expandedContentTranslateY = scrollY.interpolate({
    inputRange: [0, HEADER_SCROLL_DISTANCE],
    outputRange: [0, -10], // A more subtle vertical shift
    extrapolate: 'clamp',
  });

  const collapsedContentOpacity = scrollY.interpolate({
    inputRange: [HEADER_SCROLL_DISTANCE / 2, HEADER_SCROLL_DISTANCE],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  // The header's height will shrink as the user scrolls up.
  const headerHeight = scrollY.interpolate({
      inputRange: [0, HEADER_SCROLL_DISTANCE],
      outputRange: [totalHeaderHeight, COLLAPSED_HEADER_CONTENT_HEIGHT + insets.top],
      extrapolate: 'clamp',
  });


  // --- Event Handlers ---
  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    {
      // The native driver cannot be used here because we are animating the 'height' property.
      useNativeDriver: false
    }
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['right', 'left']}>
      <StatusBar
        style="dark"
        backgroundColor="transparent"
        translucent={true}
      />
      <View style={styles.mainContainer}>
        {/* --- Animated Header --- */}
        <Animated.View
          style={[
            styles.animatedHeaderContainer,
            // The height is animated, and we no longer apply padding here.
            { height: headerHeight },
          ]}
        >
          {/* The BlurView fills the entire animated container, creating the frosted glass effect. */}
          <BlurView
            intensity={90}
            tint="light"
            style={StyleSheet.absoluteFill}
          />

          {/* Expanded Header Content (Greeting) */}
          <Animated.View
            style={[
              styles.headerContent,
              styles.expandedHeaderContent,
              {
                // We apply the top inset as padding here to push the content down.
                paddingTop: insets.top,
                opacity: expandedContentOpacity,
                transform: [{ translateY: expandedContentTranslateY }],
              },
            ]}
          >
            <View>
              <Text style={styles.welcomeText}>{welcomeText}</Text>
              <Text style={styles.userNameText}>{userName}</Text>
            </View>
          </Animated.View>

          {/* Collapsed Header Content (Summary Title) */}
          <Animated.View
            style={[
              styles.headerContent,
              styles.collapsedHeaderContent,
              { 
                // We also apply the top inset here for the collapsed state.
                paddingTop: insets.top / 1.3,
                opacity: collapsedContentOpacity 
              },
            ]}
          >
            <Text style={styles.collapsedHeaderText}>
              {collapsedHeaderText}
            </Text>
          </Animated.View>
        </Animated.View>

        {/* --- Scrollable Content --- */}
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: scrollViewPaddingTop }, // Apply dynamic padding
          ]}
          showsVerticalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
        >
          <View style={styles.testContent}>
            <Text style={styles.testText}>Scroll to see header animation</Text>
            {Array.from({ length: 20 }).map((_, index) => (
              <View
                key={index}
                style={[
                  styles.testItem,
                  { backgroundColor: colorPalette[index % colorPalette.length] }
                ]}
              >
                <Text style={styles.testItemText}>Test Item {index + 1}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

// --- Styles ---
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#Transparent',
  },
  mainContainer: {
    flex: 1,
    backgroundColor: '#FAFAFE',
  },
  animatedHeaderContainer: {
    // This container is positioned absolutely over the ScrollView.
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    overflow: 'hidden', // Ensures content doesn't spill out during animation
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(212,212,212,0.5)',
  },
  headerContent: {
    // This is a generic container for both expanded and collapsed content.
    // It's absolutely positioned to fill the parent animatedHeaderContainer.
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    // The paddingTop is now applied dynamically in the component's style prop.
  },
  expandedHeaderContent: {
    // Vertically centers content in the space *below* the top padding.
    justifyContent: 'center',
  },
  welcomeText: {
    fontSize: 16,
    color: '#3C3C43',
    fontWeight: '400',
    opacity: 0.8,
  },
  userNameText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1C1C1E',
    marginTop: 2,
  },
  collapsedHeaderContent: {
    // Centers the title vertically and horizontally in the space below the top padding.
    justifyContent: 'center',
    alignItems: 'center',
  },
  collapsedHeaderText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 80, // Space for the tab bar or other bottom elements
  },
  testContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  testText: {
    fontSize: 16,
    color: '#3C3C43',
    marginBottom: 20,
    textAlign: 'center',
  },
  testItem: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#8A8A8E',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  testItemText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1C1C1E',
  },
});
