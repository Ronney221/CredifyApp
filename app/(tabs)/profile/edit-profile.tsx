import React, { useState, useMemo } from 'react';
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
import { useAuth } from '../../../contexts/AuthContext';
import { Colors } from '../../../constants/Colors';
import Toast from 'react-native-root-toast';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';

export default function EditProfileScreen() {
  const router = useRouter();
  const { user, updateUserMetadata, logOut, loading: authLoading } = useAuth();

  const [fullName, setFullName] = useState(user?.user_metadata?.full_name || '');
  const [isLoading, setIsLoading] = useState(false);

  const hasChanges = useMemo(() => {
    return fullName.trim() !== (user?.user_metadata?.full_name || '');
  }, [fullName, user]);

  const handleSaveChanges = async () => {
    if (!hasChanges || isLoading) return;

    if (!fullName.trim()) {
      Alert.alert('Validation Error', 'Full name cannot be empty.');
      return;
    }

    setIsLoading(true);
    try {
      const success = await updateUserMetadata({ full_name: fullName.trim() });
      if (success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Toast.show('Profile updated!', { 
          position: Toast.positions.BOTTOM,
          backgroundColor: '#4cd964',
          textColor: '#ffffff',
          shadow: false,
        });
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
              await logOut();
            } catch (error) {
              Alert.alert('Error', 'Failed to sign out. Please try again.');
            }
          } 
        },
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
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.avatarSection}>
            <View>
                {user?.user_metadata?.avatar_url ? (
                <Image source={{ uri: user.user_metadata.avatar_url }} style={styles.avatar} />
                ) : (
                <View style={styles.initialsAvatar}>
                    <Text style={styles.initialsText}>
                    {(fullName || user?.email || 'P')?.[0]?.toUpperCase()}
                    </Text>
                </View>
                )}
                <TouchableOpacity style={styles.avatarEditButton}>
                    <Ionicons name="camera-outline" size={18} color="#ffffff" />
                </TouchableOpacity>
            </View>
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
                onBlur={handleSaveChanges}
              />
            </View>
            <View style={styles.fieldContainerNoBorder}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                value={user?.email || ''}
                editable={false}
              />
            </View>
          </View>
        </ScrollView>
        <View style={styles.footer}>
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
    backgroundColor: '#f2f2f7',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f2f2f7',
  },
  scrollContent: {
    paddingVertical: 32,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 48,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
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
   avatarEditButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  section: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginHorizontal: 20,
    overflow: 'hidden',
  },
  fieldContainer: {
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#c7c7cc',
  },
  fieldContainerNoBorder: {
     padding: 16,
  },
  label: {
    fontSize: 13,
    color: '#6e6e73',
    marginBottom: 4,
  },
  input: {
    fontSize: 17,
    color: '#000000',
  },
  footer: {
    padding: 20,
  },
  logoutButton: {
    backgroundColor: '#ff3b30',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '600',
  },
}); 