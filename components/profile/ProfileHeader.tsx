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
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
  },
  blurContainer: {
    overflow: 'hidden',
    minHeight: 96,
  },
  androidContainer: {
    backgroundColor: Colors.light.background,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.light.separator,
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    minHeight: 96,
  },
  avatarContainer: {
    marginRight: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: Colors.light.background,
  },
  placeholderAvatar: {
    backgroundColor: Colors.light.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: Colors.light.textOnAccent,
    fontSize: 34,
    fontWeight: '700',
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  name: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  email: {
    fontSize: 14,
    color: Colors.light.secondaryLabel,
    letterSpacing: 0.1,
    fontWeight: '500',
  },
  chevron: {
    marginLeft: 12,
    marginRight: 4,
    opacity: 0.6,
  },
}); 