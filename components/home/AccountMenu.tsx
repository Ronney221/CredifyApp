import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Modal, Platform, Dimensions, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { useAuth } from '../../../contexts/AuthContext';
import { PanGestureHandler, PanGestureHandlerGestureEvent } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
  useAnimatedGestureHandler,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';

interface AccountMenuProps {
  isVisible: boolean;
  onClose: () => void;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
// const MENU_WIDTH = Math.min(SCREEN_WIDTH - 32, 400); // No longer a top-right popover

type AnimatedGHContext = {
  startY: number;
};

export default function AccountMenu({ isVisible, onClose }: AccountMenuProps) {
  const router = useRouter();
  const { user, logOut } = useAuth();
  const translateY = useSharedValue(SCREEN_HEIGHT); // Start off-screen (bottom)

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
    };
  });

  React.useEffect(() => {
    if (isVisible) {
      translateY.value = withSpring(0, { damping: 15, stiffness: 120 });
    } else {
      translateY.value = withSpring(SCREEN_HEIGHT, { damping: 15, stiffness: 120 });
    }
  }, [isVisible, translateY]);


  const gestureHandler = useAnimatedGestureHandler<PanGestureHandlerGestureEvent, AnimatedGHContext>({
    onStart: (_, ctx) => {
      ctx.startY = translateY.value;
    },
    onActive: (event, ctx) => {
      translateY.value = Math.max(0, ctx.startY + event.translationY); // Prevent over-dragging upwards
    },
    onEnd: (event) => {
      if (event.translationY > 100 || event.velocityY > 700) { // Condition to dismiss
        translateY.value = withSpring(SCREEN_HEIGHT, { damping: 15, stiffness: 120 }, () => {
          runOnJS(onClose)();
        });
      } else {
        translateY.value = withSpring(0, { damping: 15, stiffness: 120 }); // Snap back to open
      }
    },
  });


  const handleEditCards = () => {
    // Intentionally keep sheet open for this action, or close first then navigate
    // For now, let's assume we close it first.
    runOnJS(onClose)(); // Ensure onClose is called to hide modal before navigating
    router.push({
      pathname: '/(tabs)/02-cards', // Corrected path based on typical project structure
      params: { mode: 'edit' }
    } as any);
  };

  const handleHelp = () => {
    runOnJS(onClose)();
    router.push('/(tabs)/04-more/help-faq' as any);
  };

  const handleEditProfile = () => {
    runOnJS(onClose)();
    router.push('/(tabs)/04-more/edit-profile' as any);
  };

  const handleSignOut = async () => {
    runOnJS(onClose)();
    const { error } = await logOut();
    if (error) {
      console.error('Error signing out:', error);
    } else {
      router.replace('/');
    }
  };
  
  // Use Pressable for the overlay to dismiss when clicking outside the menu content
  // The actual menu content (Animated.View) will stop propagation for its own touch events.

  return (
    <Modal
      visible={isVisible}
      transparent={true}
      animationType="none" // We handle animation with Reanimated
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        {Platform.OS === 'ios' && <BlurView intensity={10} tint="light" style={StyleSheet.absoluteFill} />}
      </Pressable>

      <PanGestureHandler onGestureEvent={gestureHandler}>
        <Animated.View style={[styles.menuContainer, animatedStyle]}>
          <View style={styles.grabber} />
          {/* TouchableOpacity to prevent PanGestureHandler from capturing taps meant for content */}
          <TouchableOpacity activeOpacity={1} style={styles.contentWrapper}>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Account</Text>
              <View style={styles.userInfo}>
                {user?.user_metadata?.avatar_url ? (
                  <Image 
                    source={{ uri: user.user_metadata.avatar_url }} 
                    style={styles.avatarContainer} 
                  />
                ) : (
                  <View style={styles.avatarContainer}>
                    <Text style={styles.avatarText}>
                      {user?.user_metadata?.full_name?.[0]?.toUpperCase() || 
                       user?.email?.[0].toUpperCase() || 
                       '?'}
                    </Text>
                  </View>
                )}
                <View style={styles.userTextContainer}>
                  <Text style={styles.userName}>
                    {user?.user_metadata?.full_name || 
                     user?.email?.split('@')[0] || 
                     'User'}
                  </Text>
                  <Text style={styles.userEmail} numberOfLines={1}>
                    {user?.email}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.menuItems}>
              <TouchableOpacity 
                style={styles.menuItem} 
                onPress={handleEditProfile}
              >
                <Ionicons name="person-circle-outline" size={24} color={Colors.light.text} />
                <Text style={styles.menuItemText}>Edit Profile</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.menuItem} 
                onPress={handleHelp}
              >
                <Ionicons name="help-circle-outline" size={24} color={Colors.light.text} />
                <Text style={styles.menuItemText}>Help & FAQ</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.menuItem} 
                onPress={handleSignOut}
              >
                <Ionicons name="log-out-outline" size={24} color={Colors.light.error} />
                <Text style={[styles.menuItemText, styles.signOutText]}>
                  Sign Out
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Animated.View>
      </PanGestureHandler>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: Platform.OS === 'ios' ? 'transparent' : 'rgba(0, 0, 0, 0.4)', // Dimmed background for Android
  },
  menuContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.light.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 12, // Space for grabber
    paddingBottom: Platform.OS === 'ios' ? 34 : 20, // Home indicator/nav bar
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2, // Shadow upwards
    },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 10,
    minHeight: SCREEN_HEIGHT * 0.4, // Example: At least 40% of screen height
    maxHeight: SCREEN_HEIGHT * 0.8, // Example: At most 80% of screen height
  },
  grabber: {
    width: 36,
    height: 5,
    backgroundColor: Colors.light.textSecondary,
    borderRadius: 2.5,
    alignSelf: 'center',
    marginBottom: 10,
  },
  contentWrapper: {
    // This wrapper ensures that taps on the content don't get mistaken by the overlay Pressable
  },
  header: {
    paddingHorizontal: 20, // Added padding for sheet content
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 16,
    textAlign: 'center', // Center title in a sheet
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10, // Added margin
  },
  avatarContainer: {
    width: 44, // Slightly larger avatar for sheet
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.light.tint,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#fff',
    fontSize: 20, // Adjusted for new avatar size
    fontWeight: '600',
  },
  userTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  userName: {
    fontSize: 17, // Slightly larger
    fontWeight: '600',
    color: Colors.light.text,
  },
  userEmail: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.light.textSecondary, // Use StyleSheet.hairlineWidth for thin lines
    marginVertical: 16,
    marginHorizontal: 20, // Apply horizontal margin
  },
  menuItems: {
    paddingHorizontal: 12, // Adjust padding for items within the sheet
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14, // Slightly more padding
    paddingHorizontal: 8,
    borderRadius: 10, // Consistent rounding
  },
  menuItemText: {
    marginLeft: 16, // More space between icon and text
    fontSize: 16,
    color: Colors.light.text,
  },
  signOutText: {
    color: Colors.light.error,
  },
}); 