import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Colors';
import { updateUserProfile } from '../../lib/supabase';
import * as Haptics from 'expo-haptics';
import Toast from 'react-native-root-toast';

interface UsernameRequirementModalProps {
  visible: boolean;
  onComplete: () => void;
  currentEmail?: string;
}

export default function UsernameRequirementModal({ 
  visible, 
  onComplete, 
  currentEmail 
}: UsernameRequirementModalProps) {
  const [displayName, setDisplayName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    if (!displayName.trim()) {
      Alert.alert('Name Required', 'Please enter your name to continue.');
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await updateUserProfile({
        full_name: displayName.trim(),
      });

      if (error) {
        throw error;
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show('Name updated successfully!', {
        position: Toast.positions.BOTTOM,
        backgroundColor: Colors.light.accent,
        textColor: Colors.light.textOnAccent,
        shadow: false,
        duration: Toast.durations.SHORT,
      });

      onComplete();
    } catch (error) {
      console.error('Error updating display name:', error);
      Alert.alert('Error', 'Failed to update your name. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <View style={styles.content}>
            <View style={styles.header}>
              <Text style={styles.title}>Welcome to Credify!</Text>
              <Text style={styles.subtitle}>
                Let&apos;s personalize your experience by adding your name.
              </Text>
            </View>

            <View style={styles.formSection}>
              <Text style={styles.label}>What should we call you?</Text>
              <TextInput
                style={styles.input}
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="Enter your name"
                autoCapitalize="words"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={handleSave}
                autoFocus={true}
              />
              {currentEmail && (
                <Text style={styles.emailHint}>
                  Signed in as: {currentEmail}
                </Text>
              )}
            </View>

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.button, styles.primaryButton]}
                onPress={handleSave}
                disabled={isLoading || !displayName.trim()}
                activeOpacity={0.8}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryButtonText}>Continue</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.systemGroupedBackground,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 40
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    fontSize: 28,
    fontWeight: 700,
    color: Colors.light.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 17,
    color: Colors.light.secondaryLabel,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  formSection: {
    marginBottom: 48,
  },
  label: {
    fontSize: 17,
    fontWeight: 600,
    color: Colors.light.text,
    marginBottom: 12,
  },
  input: {
    backgroundColor: Colors.light.background,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 17,
    color: Colors.light.text,
    borderWidth: 1,
    borderColor: Colors.light.separator,
  },
  emailHint: {
    fontSize: 13,
    color: Colors.light.tertiaryLabel,
    marginTop: 8,
    textAlign: 'center',
  },
  buttonContainer: {
    gap: 12
  },
  button: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: Colors.light.tint,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.light.separator,
  },
  secondaryButtonText: {
    color: Colors.light.tint,
    fontSize: 17,
    fontWeight: '500',
  },
}); 