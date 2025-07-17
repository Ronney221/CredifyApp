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
import { signOut } from '../../../lib/supabase';

export default function EditProfileScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { user, updateUserMetadata, loading: authLoading, deleteAccount } = useAuth();

  const [fullName, setFullName] = useState(user?.user_metadata?.full_name || '');
  const [isLoading, setIsLoading] = useState(false);
  const [avatarUri, setAvatarUri] = useState<string | null>(user?.user_metadata?.avatar_url || null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(fullName);
  const [isSavingName, setIsSavingName] = useState(false);

  // Track original values for comparison
  const originalFullName = useRef(user?.user_metadata?.full_name || '');
  const originalAvatarUrl = useRef(user?.user_metadata?.avatar_url || null);

  const hasChanges = useMemo(() => {
    // Only check for avatar changes since name changes are saved immediately
    const avatarChanged = avatarUri !== originalAvatarUrl.current;
    return avatarChanged;
  }, [avatarUri]);

  // Configure header
  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => <BackButton label="Profile" />, 
      headerRight: () => (
        <TouchableOpacity
          onPress={handleSaveChanges}
          disabled={!hasChanges || isLoading}
          style={{ 
            marginRight: 15, 
            opacity: !hasChanges || isLoading ? 0.3: 1 
          }}
          hitSlop={10}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color={Colors.light.tint} />
          ) : (
            <Text style={{ 
              color: Colors.light.tint, 
              fontSize: 17,
              fontWeight: '600'
            }}>
              Save
            </Text>
          )}
        </TouchableOpacity>
      ),
      headerShown: true,
    });
  }, [navigation, hasChanges, isLoading]);

  const handleSaveChanges = async () => {
    if (!hasChanges || isLoading) return;

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

  const handleEditName = () => {
    setTempName(fullName);
    setIsEditingName(true);
  };

  const handleSaveName = async () => {
    if (!tempName.trim()) {
      Alert.alert('Validation Error', 'Full name cannot be empty.');
      return;
    }

    setIsSavingName(true);
    try {
      const { error } = await updateUserProfile({
        full_name: tempName.trim(),
        avatar_url: avatarUri || undefined,
      });

      if (error) throw error;

      // Update local state
      setFullName(tempName.trim());
      originalFullName.current = tempName.trim();

      // Force a refresh of the auth context
      if (updateUserMetadata) {
        await updateUserMetadata({
          full_name: tempName.trim(),
        });
      }

      setIsEditingName(false);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show('Name updated!', { 
        position: Toast.positions.BOTTOM,
        backgroundColor: Colors.light.accent,
        textColor: Colors.light.textOnAccent,
        shadow: false,
        duration: Toast.durations.SHORT,
      });
    } catch (error) {
      console.error('[EditProfileScreen] Error updating name:', error);
      Alert.alert('Error', 'Failed to update name. Please try again.');
    } finally {
      setIsSavingName(false);
    }
  };

  const handleCancelName = () => {
    setTempName(fullName);
    setIsEditingName(false);
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

  const handleDeleteAccount = async () => {
    Alert.alert(
      "Are you sure?",
      "Instead of deleting your account, you can log out and return later. All your data will be safely stored.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Log Out",
          style: "default",
          onPress: async () => {
            try {
              const { error } = await signOut();
              if (error) {
                Alert.alert("Error", "Failed to sign out. Please try again.");
                return;
              }
              router.replace('/(auth)/login');
            } catch (error) {
              console.error('Error signing out:', error);
              Alert.alert("Error", "Failed to sign out. Please try again.");
            }
          }
        },
        {
          text: "Delete Account",
          style: "destructive",
          onPress: async () => {
            // Second confirmation for extra safety
            Alert.alert(
              "Delete Account Permanently",
              "This will permanently delete:\n\n" +
              "• All your personal data\n" +
              "• Your saved cards\n" +
              "• Your perk tracking history\n\n" +
              "This action cannot be undone.",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Yes, Delete My Account",
                  style: "destructive",
                  onPress: async () => {
                    try {
                      setIsLoading(true);
                      const { error } = await deleteAccount();
                      if (error) {
                        Alert.alert("Error", "Failed to delete account. Please try again or contact support.");
                        console.error('Error deleting account:', error);
                      }
                      // If successful, deleteAccount will handle navigation
                    } catch (error) {
                      console.error('Error in delete account flow:', error);
                      Alert.alert("Error", "An unexpected error occurred. Please try again.");
                    } finally {
                      setIsLoading(false);
                    }
                  }
                }
              ]
            );
          }
        }
      ]
    );
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
              {isEditingName ? (
                <View style={styles.editNameContainer}>
                  <TextInput
                    style={styles.editNameInput}
                    value={tempName}
                    onChangeText={setTempName}
                    placeholder="Enter your full name"
                    autoCapitalize="words"
                    autoCorrect={false}
                    returnKeyType="done"
                    onSubmitEditing={handleSaveName}
                    autoFocus={true}
                  />
                  <View style={styles.editNameButtons}>
                    <TouchableOpacity
                      style={styles.editNameButton}
                      onPress={handleCancelName}
                    >
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.editNameButton, styles.saveNameButton]}
                      onPress={handleSaveName}
                      disabled={!tempName.trim() || isSavingName}
                    >
                      {isSavingName ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Text style={styles.saveNameButtonText}>Save</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View style={styles.nameDisplayContainer}>
                  <Text style={styles.nameDisplayText}>
                    {fullName || 'No name set'}
                  </Text>
                  <TouchableOpacity
                    style={styles.editButton}
                    onPress={handleEditName}
                  >
                    <Ionicons name="pencil" size={16} color={Colors.light.tint} />
                  </TouchableOpacity>
                </View>
              )}
            </View>
            <View style={styles.fieldContainerNoBorder}>
              <Text style={styles.label}>Email</Text>
              <Text style={styles.emailText}>
                {user?.email || 'No email'}
              </Text>
            </View>
          </View>

          <View style={styles.spacer} />

          <View style={styles.deleteSection}>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={handleDeleteAccount}
              disabled={isLoading}
            >
              <Text style={styles.deleteButtonText}>Delete Account</Text>
            </TouchableOpacity>
            <Text style={styles.deleteSectionDescription}>
              Deleting your account will permanently remove all your data. Consider logging out instead if you plan to return later.
            </Text>
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
  nameDisplayContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  nameDisplayText: {
    fontSize: 17,
    color: Colors.light.text,
    flex: 1,
  },
  editButton: {
    padding: 8,
    marginLeft: 8,
  },
  editNameContainer: {
    marginTop: 8,
  },
  editNameInput: {
    fontSize: 17,
    color: Colors.light.text,
    backgroundColor: Colors.light.systemGroupedBackground,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 8,
  },
  editNameButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  editNameButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: Colors.light.systemGroupedBackground,
  },
  saveNameButton: {
    backgroundColor: Colors.light.tint,
  },
  cancelButtonText: {
    color: Colors.light.secondaryLabel,
    fontSize: 15,
    fontWeight: '500',
  },
  saveNameButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '500',
  },
  emailText: {
    fontSize: 17,
    color: Colors.light.secondaryLabel,
  },
  spacer: {
    flex: 1,
    minHeight: 40,
  },
  deleteSection: {
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24, // Account for bottom safe area
    alignItems: 'center',
  },
  deleteButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.light.error + '40', // 25% opacity
  },
  deleteButtonText: {
    color: Colors.light.error + '80', // 50% opacity
    fontSize: 15,
    fontWeight: '500',
  },
  deleteSectionDescription: {
    fontSize: 13,
    color: Colors.light.tertiaryLabel,
    textAlign: 'center',
    marginTop: 12,
    marginHorizontal: 32,
    lineHeight: 18,
  },
}); 