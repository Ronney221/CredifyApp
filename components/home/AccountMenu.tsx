import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Modal, Platform, Dimensions, Pressable, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { useAuth } from '../../contexts/AuthContext';
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
  const { user, signOut } = useAuth();
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

  const handleLogout = async () => {
    try {
      await signOut();
      onClose();
    } catch (error) {
      console.error('Error logging out:', error);
      Alert.alert('Error', 'Failed to log out. Please try again.');
    }
  };
  
  // Use Pressable for the overlay to dismiss when clicking outside the menu content
  // The actual menu content (Animated.View) will stop propagation for its own touch events.

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Animated.View style={[styles.menuContainer, animatedStyle]}>
          <View style={styles.handle} />
          
          <View style={styles.header}>
            <View style={styles.avatarContainer}>
              {user?.user_metadata?.avatar_url ? (
                <Image 
                  source={{ uri: user.user_metadata.avatar_url }} 
                  style={styles.avatar}
                />
              ) : (
                <View style={styles.initialsContainer}>
                  <Text style={styles.initials}>
                    {user?.user_metadata?.full_name?.[0]?.toUpperCase() || 
                     user?.email?.[0].toUpperCase() || 
                     '?'}
                  </Text>
                </View>
              )}
            </View>
            
            <Text style={styles.name}>
              {user?.user_metadata?.full_name || 'User'}
            </Text>
            <Text style={styles.email}>{user?.email}</Text>
          </View>

          <View style={styles.menuItems}>
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => {
                onClose();
                router.push('/(tabs)/profile/edit-profile');
              }}
            >
              <Ionicons name="person-outline" size={24} color={Colors.light.text} />
              <Text style={styles.menuItemText}>Edit Profile</Text>
              <Ionicons name="chevron-forward" size={24} color={Colors.light.secondaryLabel} />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => {
                onClose();
                router.push('/(tabs)/profile/manage_cards');
              }}
            >
              <Ionicons name="card-outline" size={24} color={Colors.light.text} />
              <Text style={styles.menuItemText}>Manage Cards</Text>
              <Ionicons name="chevron-forward" size={24} color={Colors.light.secondaryLabel} />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => {
                onClose();
                router.push('/(tabs)/profile/notifications');
              }}
            >
              <Ionicons name="notifications-outline" size={24} color={Colors.light.text} />
              <Text style={styles.menuItemText}>Notifications</Text>
              <Ionicons name="chevron-forward" size={24} color={Colors.light.secondaryLabel} />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => {
                onClose();
                router.push('/(tabs)/profile/help-faq');
              }}
            >
              <Ionicons name="help-circle-outline" size={24} color={Colors.light.text} />
              <Text style={styles.menuItemText}>Help & FAQ</Text>
              <Ionicons name="chevron-forward" size={24} color={Colors.light.secondaryLabel} />
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.menuItem, styles.logoutButton]} 
              onPress={handleLogout}
            >
              <Ionicons name="log-out-outline" size={24} color={Colors.light.warning} />
              <Text style={[styles.menuItemText, styles.logoutText]}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: Platform.OS === 'ios' ? 'transparent' : 'rgba(0, 0, 0, 0.4)',
  },
  menuContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.light.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    maxHeight: SCREEN_HEIGHT * 0.8,
  },
  handle: {
    width: 36,
    height: 5,
    backgroundColor: Colors.light.secondaryLabel,
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 10,
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  avatarContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.light.tint,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 22,
  },
  initialsContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.light.tint,
    justifyContent: 'center',
    alignItems: 'center',
  },
  initials: {
    color: Colors.light.textOnPrimary,
    fontSize: 20,
    fontWeight: '600',
  },
  name: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  menuItems: {
    paddingHorizontal: 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  menuItemText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 17,
    color: Colors.light.text,
  },
  logoutButton: {
    marginTop: 8,
  },
  logoutText: {
    color: Colors.light.warning,
  },
}); 