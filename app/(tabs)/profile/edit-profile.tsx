import React, { useState, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
  ScrollView,
  Pressable,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useAuth } from '../../../contexts/AuthContext';
import { Colors } from '../../../constants/Colors';
import Toast from 'react-native-root-toast';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { BlurView } from 'expo-blur';
import { uploadAvatar, updateUserProfile } from '../../../lib/supabase';

export default function EditProfileScreen() {
  const router = useRouter();
  const { user, updateUserMetadata, logOut, loading: authLoading } = useAuth();

  const [fullName, setFullName] = useState(user?.user_metadata?.full_name || '');
  const [isLoading, setIsLoading] = useState(false);
  const [avatarUri, setAvatarUri] = useState<string | null>(user?.user_metadata?.avatar_url || null);

  // Track original values for comparison
  const originalFullName = useRef(user?.user_metadata?.full_name || '');
  const originalAvatarUrl = useRef(user?.user_metadata?.avatar_url || null);

  const hasChanges = useMemo(() => {
    const nameChanged = fullName.trim() !== originalFullName.current.trim();
    const avatarChanged = avatarUri !== originalAvatarUrl.current;
    console.log('Change detection:', { nameChanged, avatarChanged, fullName, originalFullName: originalFullName.current, avatarUri, originalAvatarUrl: originalAvatarUrl.current });
    return nameChanged || avatarChanged;
  }, [fullName, avatarUri]);

  const handleSaveChanges = async () => {
    if (!hasChanges || isLoading) return;

    if (!fullName.trim()) {
      Alert.alert('Validation Error', 'Full name cannot be empty.');
      return;
    }

    setIsLoading(true);
    try {
      let avatarUrl = originalAvatarUrl.current;

      // If avatar has changed, upload the new one
      if (avatarUri && avatarUri !== originalAvatarUrl.current) {
        const { url, error: uploadError } = await uploadAvatar(avatarUri, user?.id!);
        if (uploadError) throw uploadError;
        avatarUrl = url;
      }

      const { error } = await updateUserProfile({
        full_name: fullName.trim(),
        avatar_url: avatarUrl,
      });

      if (error) throw error;

      // Force a refresh of the auth context
      if (updateUserMetadata) {
        await updateUserMetadata({
          full_name: fullName.trim(),
          avatar_url: avatarUrl,
        });
      }

      // Update original values to match the new values
      originalFullName.current = fullName.trim();
      originalAvatarUrl.current = avatarUrl;

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show('Profile updated!', { 
        position: Toast.positions.BOTTOM,
        backgroundColor: Colors.light.accent,
        textColor: Colors.light.textOnAccent,
        shadow: false,
        duration: Toast.durations.SHORT,
      });
    } catch (error) {
      console.error('[EditProfileScreen] Error updating profile:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSignOut = async () => {
    Alert.alert(
      "Log Out",
      "Are you sure you want to log out?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Log Out", 
          style: "destructive", 
          onPress: async () => {
            try {
              const { error } = await logOut();
              if (error) {
                Alert.alert('Error', 'Failed to sign out. Please try again.');
              } else {
                router.replace('/');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to sign out. Please try again.');
            }
          } 
        },
      ]
    );
  };

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Please grant camera roll permissions to change your profile picture.',
        [{ text: 'OK' }]
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setAvatarUri(result.assets[0].uri);
    }
  };

  if (authLoading && !user) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.light.tint} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: 'Edit Profile' }} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          bounces
          alwaysBounceVertical
          overScrollMode="never"
        >
          <View style={styles.avatarSection}>
            <Pressable 
              onPress={handlePickImage}
              hitSlop={16}
              style={({ pressed }) => [
                styles.avatarContainer,
                pressed && { opacity: 0.8 }
              ]}
            >
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.placeholderAvatar]}>
                  <Text style={styles.initialsText}>
                    {(fullName || user?.email || 'P')?.[0]?.toUpperCase()}
                  </Text>
                </View>
              )}
              <View style={styles.cameraButton}>
                <Ionicons name="camera" size={14} color={Colors.light.textOnPrimary} />
              </View>
            </Pressable>
          </View>

          <View style={styles.section}>
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Name</Text>
              <TextInput
                style={styles.input}
                value={fullName}
                onChangeText={setFullName}
                placeholder="Enter your full name"
                autoCapitalize="words"
                autoCorrect={false}
                returnKeyType="done"
              />
            </View>
            <View style={styles.fieldContainerNoBorder}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={[styles.input, styles.disabledInput]}
                value={user?.email || ''}
                editable={false}
              />
            </View>
          </View>
        </ScrollView>
        <View style={styles.footer}>
          <TouchableOpacity 
            style={[styles.saveButton, !hasChanges && styles.saveButtonDisabled]}
            onPress={handleSaveChanges}
            disabled={!hasChanges || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={Colors.light.textOnPrimary} />
            ) : (
              <Text style={styles.saveButtonText}>Save Changes</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.logoutButton} onPress={handleSignOut}>
            <Text style={styles.logoutButtonText}>Log Out</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.systemGroupedBackground,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.light.systemGroupedBackground,
  },
  scrollContent: {
    paddingVertical: 32,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 48,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  placeholderAvatar: {
    backgroundColor: Colors.light.secondaryAccent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  initialsText: {
    color: Colors.light.textOnPrimary,
    fontSize: 48,
    fontWeight: '600',
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: Colors.light.background,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.light.separator,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  section: {
    backgroundColor: Colors.light.background,
    borderRadius: 13,
    marginHorizontal: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  fieldContainer: {
    minHeight: 52,
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.light.separator,
  },
  fieldContainerNoBorder: {
    minHeight: 52,
    padding: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.light.secondaryLabel,
    marginBottom: 6,
    letterSpacing: 0.1,
  },
  input: {
    fontSize: 17,
    color: Colors.light.text,
  },
  disabledInput: {
    color: Colors.light.secondaryLabel,
  },
  footer: {
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
    backgroundColor: Colors.light.systemGroupedBackground,
  },
  saveButton: {
    backgroundColor: Colors.light.accent,
    borderRadius: 13,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
    opacity: 1,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: Colors.light.textOnAccent,
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.4,
  },
  logoutButton: {
    backgroundColor: Colors.light.error,
    borderRadius: 13,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: Platform.OS === 'ios' ? 34 : 24,
  },
  logoutButtonText: {
    color: Colors.light.textOnAccent,
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.4,
  },
}); 