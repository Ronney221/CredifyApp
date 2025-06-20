import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Colors } from '../../constants/Colors';

interface ProfileHeaderProps {
  name: string;
  email: string;
  avatarUrl?: string;
  onPress: () => void;
}

export const ProfileHeader = ({ name, email, avatarUrl, onPress }: ProfileHeaderProps) => {
  const HeaderContent = () => (
    <View style={styles.contentContainer}>
      <View style={styles.avatarContainer}>
        {avatarUrl ? (
          <Image 
            source={{ uri: avatarUrl }} 
            style={styles.avatar}
          />
        ) : (
          <View style={[styles.avatar, styles.placeholderAvatar]}>
            <Text style={styles.placeholderText}>
              {name.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.email}>{email}</Text>
      </View>
      <Ionicons 
        name="chevron-forward" 
        size={20} 
        color={Colors.light.secondaryLabel}
        style={styles.chevron}
      />
    </View>
  );

  return (
    <Pressable 
      onPress={onPress} 
      style={({ pressed }) => [
        styles.container,
        pressed && { opacity: 0.8 }
      ]}
      hitSlop={16}
    >
      {Platform.OS === 'ios' ? (
        <BlurView intensity={22} tint="light" style={styles.blurContainer}>
          <HeaderContent />
        </BlurView>
      ) : (
        <View style={[styles.blurContainer, styles.androidContainer]}>
          <HeaderContent />
        </View>
      )}
    </Pressable>
  );
};


export default ProfileHeader;

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 32,
    marginBottom: 24,
    borderRadius: 13,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 2,
  },
  blurContainer: {
    overflow: 'hidden',
    height: 88,
  },
  androidContainer: {
    backgroundColor: Colors.light.secondarySystemGroupedBackground,
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    height: '100%',
  },
  avatarContainer: {
    marginRight: 16,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  placeholderAvatar: {
    backgroundColor: Colors.light.secondaryAccent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: Colors.light.textOnPrimary,
    fontSize: 32,
    fontWeight: '600',
  },
  textContainer: {
    flex: 1,
  },
  name: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 4,
  },
  email: {
    fontSize: 13,
    color: Colors.light.secondaryLabel,
    letterSpacing: 0.1,
  },
  chevron: {
    marginLeft: 8,
    marginRight: 8,
  },
}); 