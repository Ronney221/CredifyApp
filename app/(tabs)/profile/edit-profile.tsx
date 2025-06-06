import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-root-toast';
import { useAuth } from '../../../contexts/AuthContext'; // Adjust path as needed
import { Colors } from '../../../constants/Colors'; // Adjust path as needed

// Fallback colors - ideally, add these to your Colors.ts
const FauxColors = {
  textSecondary: '#6c757d',
  borderColor: '#ced4da',
  inputBackground: '#f8f9fa',
  error: '#dc3545',
};

export default function EditProfileScreen() {
  const router = useRouter();
  const { user, updateUserMetadata, loading: authLoading } = useAuth();

  const [fullName, setFullName] = useState(user?.user_metadata?.full_name || '');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Initialize fullName from user metadata or provide an empty string if not available
    setFullName(user?.user_metadata?.full_name || '');
  }, [user]); // Depend on user object to re-initialize if it changes

  const handleSaveChanges = async () => {
    if (!fullName.trim()) {
      Alert.alert('Validation Error', 'Full name cannot be empty.');
      return;
    }
    // Check if there are actual changes to save
    if (fullName.trim() === (user?.user_metadata?.full_name || '')) {
      Toast.show('No changes to save.', { position: Toast.positions.BOTTOM });
      return;
    }

    setIsLoading(true);
    try {
      // Ensure updateUserMetadata is available before calling
      if (typeof updateUserMetadata !== 'function') {
        console.error("updateUserMetadata function is not available on AuthContext.");
        Alert.alert('Error', 'Profile update functionality is currently unavailable. Please try again later.');
        setIsLoading(false);
        return;
      }

      const success = await updateUserMetadata({ full_name: fullName.trim() });
      if (success) {
        Toast.show('Profile updated successfully!', { 
          position: Toast.positions.BOTTOM, 
          backgroundColor: Colors.light.tint, 
          textColor: '#ffffff' 
        });
        router.back();
      } else {
        Alert.alert('Error', 'Failed to update profile. Please try again.');
      }
    } catch (error) {
      console.error('[EditProfileScreen] Error updating profile:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading indicator if auth state is loading and user is not yet available
  if (authLoading && !user) {
    return (
      <SafeAreaView style={styles.safeAreaLoading}>
        <ActivityIndicator size="large" color={Colors.light.tint} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen options={{ title: 'Edit Profile' }} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.container}>
            <View style={styles.avatarSection}>
              {user?.user_metadata?.avatar_url ? (
                <Image source={{ uri: user.user_metadata.avatar_url }} style={styles.avatar} />
              ) : (
                <View style={styles.initialsAvatar}>
                  <Text style={styles.initialsText}>
                    {(fullName || user?.email || 'P')?.[0]?.toUpperCase()}
                  </Text>
                </View>
              )}
              {/* Future: TouchableOpacity to change avatar */}
            </View>

            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Full Name</Text>
              <TextInput
                style={styles.input}
                value={fullName}
                onChangeText={setFullName}
                placeholder="Enter your full name"
                placeholderTextColor={FauxColors.textSecondary}
                autoCapitalize="words"
                autoCorrect={false}
                returnKeyType="done"
              />
            </View>

            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Email Address</Text>
              <TextInput
                style={[styles.input, styles.readOnlyInput]}
                value={user?.email || ''}
                editable={false}
                placeholderTextColor={FauxColors.textSecondary}
              />
            </View>

            <TouchableOpacity
              style={[styles.saveButton, (isLoading || !fullName.trim()) && styles.disabledButton]}
              onPress={handleSaveChanges}
              disabled={isLoading || !fullName.trim()}
            >
              {isLoading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.saveButtonText}>Save Changes</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.light.background, 
  },
  safeAreaLoading: {
    flex: 1,
    backgroundColor: Colors.light.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'flex-start', // Changed to flex-start for typical form layout
    paddingTop: 24, // Added padding top
  },
  container: {
    flex: 1,
    paddingHorizontal: 24, // Consistent horizontal padding
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: FauxColors.borderColor, 
  },
  initialsAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.light.tint,
    justifyContent: 'center',
    alignItems: 'center',
  },
  initialsText: {
    color: '#ffffff',
    fontSize: 40,
    fontWeight: 'bold',
  },
  fieldContainer: {
    marginBottom: 24, // Increased spacing
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: FauxColors.textSecondary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: FauxColors.inputBackground,
    borderWidth: 1,
    borderColor: FauxColors.borderColor,
    borderRadius: 10, // Slightly more rounded
    paddingHorizontal: 16,
    paddingVertical: 14, // Increased padding for better touch
    fontSize: 16,
    color: Colors.light.text,
  },
  readOnlyInput: {
    backgroundColor: '#e9ecef',
    color: '#495057',
  },
  saveButton: {
    backgroundColor: Colors.light.tint,
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 16, // Adjusted margin
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.5,
  },
}); 