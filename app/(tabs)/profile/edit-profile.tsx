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
  Linking,
  Modal,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useAuth } from '../../../contexts/AuthContext';
import { Colors } from '../../../constants/Colors';
import Toast from 'react-native-root-toast';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import {
  launchImageLibraryAsync,
  requestMediaLibraryPermissionsAsync,
  MediaTypeOptions,
} from 'expo-image-picker';
import { BlurView } from 'expo-blur';
import { uploadAvatar, updateUserProfile } from '../../../lib/supabase';

export default function EditProfileScreen() {
  const router = useRouter();
  const { user, updateUserMetadata } = useAuth();

  const [fullName, setFullName] = useState(user?.user_metadata?.full_name || '');
  const [isLoading, setIsLoading] = useState(false);
  const [avatarUri, setAvatarUri] = useState<string | null>(user?.user_metadata?.avatar_url || null);
  const [isNameModalVisible, setNameModalVisible] = useState(false);
  const [modalName, setModalName] = useState(fullName);

  const handleSaveName = async () => {
    if (!modalName.trim()) {
      Alert.alert('Validation Error', 'Full name cannot be empty.');
      return;
    }
    
    setIsLoading(true);
    setNameModalVisible(false);

    try {
      const { error } = await updateUserProfile({
        full_name: modalName.trim(),
        avatar_url: avatarUri || undefined,
      });

      if (error) throw error;

      if (updateUserMetadata) {
        await updateUserMetadata({
          full_name: modalName.trim(),
          avatar_url: avatarUri,
        });
      }
      
      setFullName(modalName.trim());

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show('Profile updated!', {
        position: Toast.positions.BOTTOM,
        backgroundColor: Colors.light.accent,
        textColor: Colors.light.textOnAccent,
        shadow: false,
        duration: Toast.durations.SHORT,
      });
    } catch (error) {
      console.error('[EditProfileScreen] Error updating name:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePickImage = async () => {
    try {
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

      const result = await launchImageLibraryAsync({
        mediaTypes: MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedAsset = result.assets[0];
        if (!selectedAsset.uri) {
          throw new Error('No image URI found');
        }

        const imageUri = String(selectedAsset.uri);
        setAvatarUri(imageUri);
        
        if (Platform.OS === 'ios') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }

        // Upload immediately
        setIsLoading(true);
        const { url, error: uploadError } = await uploadAvatar(imageUri, user?.id!);
        if (uploadError) throw uploadError;

        const { error: updateError } = await updateUserProfile({
          full_name: fullName,
          avatar_url: url,
        });
        if (updateError) throw updateError;
        
        if (updateUserMetadata) {
          await updateUserMetadata({
            full_name: fullName,
            avatar_url: url,
          });
        }
        setAvatarUri(url || null);

        Toast.show('Avatar updated!', {
            position: Toast.positions.BOTTOM,
        });
      }
    } catch (error) {
      console.error('[EditProfileScreen] Error picking/uploading image:', error);
      Alert.alert('Error', 'Failed to update avatar. Please try again.');
    } finally {
        setIsLoading(false);
    }
  };

  if (!user) {
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
              {isLoading && <ActivityIndicator style={styles.avatarLoading} size="large" />}
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={[styles.avatar, isLoading && {opacity: 0.5}]} />
              ) : (
                <View style={[styles.avatar, styles.placeholderAvatar, isLoading && {opacity: 0.5}]}>
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
            <TouchableOpacity 
              onPress={() => {
                setModalName(fullName);
                setNameModalVisible(true);
              }}
              style={styles.fieldContainer}
            >
              <Text style={styles.label}>Name</Text>
              <View style={styles.valueContainer}>
                <Text style={styles.input} numberOfLines={1}>{fullName}</Text>
                <Ionicons name="chevron-forward" size={20} color={Colors.light.placeholder} style={{ marginLeft: 6 }}/>
              </View>
            </TouchableOpacity>
            <View style={[styles.fieldContainer, { borderBottomWidth: 0 }]}>
              <Text style={styles.label}>Email</Text>
              <Text style={[styles.input, styles.disabledInput]}>
                {user?.email || ''}
              </Text>
            </View>
          </View>
        </ScrollView>
        <Modal
          animationType="fade"
          transparent={true}
          visible={isNameModalVisible}
          onRequestClose={() => {
            setNameModalVisible(!isNameModalVisible);
          }}>
          <BlurView intensity={20} tint="dark" style={styles.modalOverlay}>
            <KeyboardAvoidingView behavior="padding" style={styles.centeredView}>
              <View style={styles.modalView}>
                <View style={styles.modalTextContainer}>
                  <Text style={styles.modalText}>Change Name</Text>
                  <Text style={styles.modalSubText}>
                    This will be displayed on your profile.
                  </Text>
                </View>
                <View style={styles.modalInputContainer}>
                  <TextInput
                    style={styles.modalInput}
                    onChangeText={setModalName}
                    value={modalName}
                    placeholder="Enter your full name"
                    autoCapitalize="words"
                    autoFocus
                  />
                </View>
                <View style={styles.modalButtonContainer}>
                  <TouchableOpacity
                    style={[styles.modalButton, { borderRightWidth: StyleSheet.hairlineWidth, borderColor: Colors.light.separator }]}
                    onPress={() => setNameModalVisible(!isNameModalVisible)}>
                    <Text style={styles.modalButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.modalButton}
                    onPress={handleSaveName}>
                    <Text style={[styles.modalButtonText, { fontWeight: 'bold' }]}>Save</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </KeyboardAvoidingView>
          </BlurView>
        </Modal>
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
  avatarLoading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.light.separator,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.light.background,
  },
  fieldContainerNoBorder: {
    minHeight: 52,
    padding: 16,
    borderBottomWidth: 0,
  },
  label: {
    fontSize: 17,
    color: Colors.light.text,
    marginRight: 16,
  },
  input: {
    fontSize: 17,
    color: Colors.light.secondaryLabel,
    textAlign: 'right',
    flexShrink: 1,
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
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
    opacity: 0,
  },
  saveButtonText: {
    color: Colors.light.textOnAccent,
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.4,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalView: {
    width: 280,
    backgroundColor: 'rgba(249, 249, 249, 0.9)',
    borderRadius: 14,
    overflow: 'hidden',
  },
  modalTextContainer: {
    padding: 20,
    paddingBottom: 0,
    alignItems: 'center',
  },
  modalText: {
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
    color: '#000',
  },
  modalSubText: {
    fontSize: 13,
    textAlign: 'center',
    color: '#000',
    marginTop: 4,
  },
  modalInputContainer: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  modalInput: {
    backgroundColor: '#fff',
    borderColor: '#D1D1D6',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 10,
    fontSize: 15,
  },
  modalButtonContainer: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.light.separator,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonText: {
    fontSize: 17,
    color: Colors.light.accent,
  },
});