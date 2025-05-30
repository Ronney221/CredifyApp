import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Modal, Platform, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { useAuth } from '../../../contexts/AuthContext';

interface AccountMenuProps {
  isVisible: boolean;
  onClose: () => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MENU_WIDTH = Math.min(SCREEN_WIDTH - 32, 400);

export default function AccountMenu({ isVisible, onClose }: AccountMenuProps) {
  const router = useRouter();
  const { user, logOut } = useAuth();

  const handleEditCards = () => {
    onClose();
    router.push({
      pathname: '/card-selection-screen',
      params: { mode: 'edit' }
    } as any);
  };

  const handleHelp = () => {
    onClose();
    router.push('/(help)' as any);
  };

  const handleSignOut = async () => {
    onClose();
    const { error } = await logOut();
    if (error) {
      console.error('Error signing out:', error);
    } else {
      router.replace('/');
    }
  };

  return (
    <Modal
      visible={isVisible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity 
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.menuContainer}>
          <TouchableOpacity activeOpacity={1}>
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
                onPress={handleEditCards}
              >
                <Ionicons name="card-outline" size={24} color={Colors.light.text} />
                <Text style={styles.menuItemText}>Edit Cards</Text>
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
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  menuContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    right: 16,
    width: MENU_WIDTH,
    backgroundColor: Colors.light.background,
    borderRadius: 16,
    paddingVertical: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  header: {
    paddingHorizontal: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 16,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.light.tint,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  userTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
  },
  userEmail: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.light.textSecondary,
    marginVertical: 12,
  },
  menuItems: {
    paddingHorizontal: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  menuItemText: {
    fontSize: 16,
    marginLeft: 12,
    color: Colors.light.text,
  },
  signOutText: {
    color: Colors.light.error,
  },
}); 