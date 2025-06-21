import React, { useState } from 'react';
import { TouchableOpacity, StyleSheet, View, Text, Image, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { useAuth } from '../../../contexts/AuthContext';
import AccountMenu from './AccountMenu';

export default function AccountButton() {
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const { user } = useAuth();
  const colorScheme = useColorScheme();

  const handleOpenMenu = () => {
    setIsMenuVisible(true);
  };

  const handleCloseMenu = () => {
    setIsMenuVisible(false);
  };

  return (
    <>
      <TouchableOpacity 
        style={styles.button}
        onPress={handleOpenMenu}
      >
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
      </TouchableOpacity>

      <AccountMenu 
        isVisible={isMenuVisible}
        onClose={handleCloseMenu}
      />
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.light.background,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    overflow: 'hidden',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  initialsContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.light.tint,
    justifyContent: 'center',
    alignItems: 'center',
  },
  initials: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
}); 