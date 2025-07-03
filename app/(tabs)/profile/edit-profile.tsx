import React, { useState, useMemo, useRef, useLayoutEffect } from 'react';
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
  Linking,
} from 'react-native';
import { Stack, useRouter, useNavigation } from 'expo-router';
import { useAuth } from '../../../contexts/AuthContext';
import { Colors } from '../../../constants/Colors';
import Toast from 'react-native-root-toast';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import {
  launchImageLibraryAsync,
  requestMediaLibraryPermissionsAsync,
} from 'expo-image-picker';
import { BlurView } from 'expo-blur';
import { uploadAvatar, updateUserProfile } from '../../../lib/supabase';
import BackButton from '../../../components/ui/BackButton';

export default function EditProfileScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { user, updateUserMetadata, loading: authLoading } = useAuth();

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

  // Configure header (back title and Save button)
  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => <BackButton label="Profile" />, 
      headerRight: () => (
        <TouchableOpacity
          onPress={handleSaveChanges}
          disabled={!hasChanges || isLoading}
          style={{ marginRight: 15, opacity: !hasChanges || isLoading ? 0.3 : 1 }}
          hitSlop={10}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color={Colors.light.tint} />
          ) : (
            <Text style={{ color: Colors.light.tint, fontSize: 17, fontWeight: '600' }}>Save</Text>
          )}
        </TouchableOpacity>
      ),
      headerShown: true,
    });
  }, [navigation, hasChanges, isLoading]);

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

  const handlePickImage = async () => {
    try {
      // Request permissions first
      const { status } = await requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please grant camera roll permissions to change your profile picture.',
          [
            { 
              text: 'Open Settings', 
              onPress: () => {
                if (Platform.OS === 'ios') {
                  Linking.openURL('app-settings:');
                } else {
                  Linking.openSettings();
                }
              }
            },
            { text: 'Cancel', style: 'cancel' }
          ]
        );
        return;
      }

      // Launch image picker with more conservative settings for TestFlight
      const result = await launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5, // Reduced quality for better performance
        exif: false,
        allowsMultipleSelection: false, // Explicitly disable multiple selection
        base64: false, // Disable base64 to reduce memory usage
      });

      // More defensive checking of the result
      if (result && !result.canceled && result.assets && result.assets.length > 0) {
        const selectedAsset = result.assets[0];
        
        // Additional validation
        if (!selectedAsset.uri) {
          throw new Error('No image URI found');
        }

        // Ensure the URI is a string
        const imageUri = String(selectedAsset.uri);
        
        // Set the new avatar URI
        setAvatarUri(imageUri);
        
        // Provide haptic feedback
        if (Platform.OS === 'ios') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      }
    } catch (error) {
      console.error('[EditProfileScreen] Error picking image:', error);
      // More specific error message based on the error type
      let errorMessage = 'Failed to select image. Please try again.';
      if (error instanceof Error) {
        if (error.message.includes('permission')) {
          errorMessage = 'Please grant camera roll permissions in Settings.';
        } else if (error.message.includes('canceled')) {
          return; // User canceled, no need to show error
        }
      }
      
      Alert.alert(
        'Error',
        errorMessage,
        [{ text: 'OK' }]
      );
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
                <Ionicons name="camera" size={16} color={Colors.light.textOnAccent} />
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
    backgroundColor: Colors.light.accent,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: Colors.light.background,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
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
  // Footer styles removed — Save action now lives in the navigation bar
}); 