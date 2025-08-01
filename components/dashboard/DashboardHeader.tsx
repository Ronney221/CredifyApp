import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { format } from 'date-fns';
import { useResponsiveStyles, getResponsiveFontSize, getResponsiveHeight } from '../../hooks/useResponsiveStyles';

// Header Animation Constants
const EXPANDED_HEADER_CONTENT_HEIGHT = 60;
const COLLAPSED_HEADER_CONTENT_HEIGHT = 20;
const HEADER_SCROLL_DISTANCE = EXPANDED_HEADER_CONTENT_HEIGHT - COLLAPSED_HEADER_CONTENT_HEIGHT;

interface DashboardHeaderProps {
  scrollY: Animated.Value;
  user: any;
}

export default function DashboardHeader({ scrollY, user }: DashboardHeaderProps) {
  const insets = useSafeAreaInsets();
  const { isLargeText, fontScale } = useResponsiveStyles();

  // Dynamic text for collapsed header
  const currentMonthName = useMemo(() => format(new Date(), 'MMMM'), []);
  const collapsedHeaderText = `${currentMonthName} Summary`;
  
  const userName = useMemo(() => {
    const fullName = user?.user_metadata?.full_name;
    if (fullName && fullName.trim().length > 0) {
      const first = fullName.trim().split(' ')[0];
      return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
    }
    const emailPrefix = user?.email?.split('@')[0] || 'User';
    return emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1).toLowerCase();
  }, [user]);

  // Dynamic greeting based on time of day and random easter eggs
  const welcomeText = useMemo(() => {
    const hour = new Date().getHours();
    const greetings = [
      'Welcome back,',
      'Ready to save more?',
      'Let\'s maximize those perks!',
      'Time to earn some rewards!',
      'Stack those points!',
      'Cashback mode: ON',
      'Perk up your day!',
      'Let\'s crush those annual fees!',
      'Your wallet says thanks!',
      'Another day, another bonus!',
      'Swipe right on savings!',
      'You\'re the MVP of rewards!',
      'Let\'s make your cards work for you!',
      'Savings never sleep!',
      'Keep calm and redeem on!',
      'Rewards radar activated!',
      'Let\'s squeeze every cent!',
      'Your perks are waiting!',
      'Unlock extra value today!',
      'Savings squad assemble!',
      'Time to flex those benefits!',
      'Card magic in progress!',
      'Optimize, redeem, repeat!',
      'More perks, less hassle!',
      'Victory lap for your wallet!',
      'Rewards radar activated!',
      'Let\'s squeeze every cent!',
      'Your perks are waiting!'
    ];
    // 20% chance to show a fun greeting
    if (Math.random() < 0.2) {
      return greetings[Math.floor(Math.random() * greetings.length)];
    }
    if (hour < 5) return 'Late night hustle?';
    if (hour < 12) return 'Good morning,';
    if (hour < 17) return 'Good afternoon,';
    if (hour < 22) return 'Good evening,';
    return 'Late night savings?';
  }, []);

  // Derived Heights - make responsive
  const expandedHeight = getResponsiveHeight(EXPANDED_HEADER_CONTENT_HEIGHT, isLargeText);
  const collapsedHeight = getResponsiveHeight(COLLAPSED_HEADER_CONTENT_HEIGHT, isLargeText);
  const totalHeaderHeight = expandedHeight + insets.top;
  const headerScrollDistance = expandedHeight - collapsedHeight;

  // Animated values for header styles - use responsive heights
  const expandedContentOpacity = scrollY.interpolate({
    inputRange: [0, headerScrollDistance / 2],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const expandedContentTranslateY = scrollY.interpolate({
    inputRange: [0, headerScrollDistance],
    outputRange: [0, -10],
    extrapolate: 'clamp',
  });

  const collapsedContentOpacity = scrollY.interpolate({
    inputRange: [headerScrollDistance / 2, headerScrollDistance],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const headerHeight = scrollY.interpolate({
    inputRange: [0, headerScrollDistance],
    outputRange: [totalHeaderHeight, collapsedHeight + insets.top],
    extrapolate: 'clamp',
  });

  return (
    <Animated.View
      style={[
        styles.animatedHeaderContainer,
        { height: headerHeight },
      ]}
    >
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
            paddingTop: insets.top,
            opacity: expandedContentOpacity,
            transform: [{ translateY: expandedContentTranslateY }],
          },
        ]}
      >
        <View>
          <Text style={[styles.welcomeText, isLargeText && styles.welcomeTextLarge]}>{welcomeText}</Text>
          <Text style={[styles.userNameText, isLargeText && styles.userNameTextLarge]}>{userName}</Text>
        </View>
      </Animated.View>

      {/* Collapsed Header Content (Summary Title) */}
      <Animated.View
        style={[
          styles.headerContent,
          styles.collapsedHeaderContent,
          { 
            paddingTop: insets.top / 1.3,
            opacity: collapsedContentOpacity 
          },
        ]}
      >
        <Text style={[styles.collapsedHeaderText, isLargeText && styles.collapsedHeaderTextLarge]}>
          {collapsedHeaderText}
        </Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  animatedHeaderContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    overflow: 'hidden',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(212,212,212,0.5)',
  },
  headerContent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
  },
  expandedHeaderContent: {
    justifyContent: 'center',
  },
  welcomeText: {
    fontSize: 16,
    color: '#3C3C43',
    fontWeight: '400',
    opacity: 0.8,
  },
  welcomeTextLarge: {
    fontSize: 15,
    lineHeight: 20,
  },
  userNameText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1C1C1E',
    marginTop: 2,
  },
  userNameTextLarge: {
    fontSize: 28,
    lineHeight: 34,
    marginTop: 4,
  },
  collapsedHeaderContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  collapsedHeaderText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  collapsedHeaderTextLarge: {
    fontSize: 16,
    lineHeight: 20,
  },
});