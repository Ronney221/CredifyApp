import React from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { MotiView } from 'moti';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface SaveFooterProps {
  visible: boolean;
  onSave: () => void;
  onDiscard: () => void;
  isSaving: boolean;
}

export const SaveFooter: React.FC<SaveFooterProps> = ({
  visible,
  onSave,
  onDiscard,
  isSaving,
}) => {
  const insets = useSafeAreaInsets();
  if (!visible) return null;

  return (
    <MotiView 
      style={[
        styles.footer,
        { paddingBottom: insets.bottom > 0 ? insets.bottom + 65 : 100 }
      ]}
      from={{ opacity: 0, translateY: 100 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 300, delay: 100 }}
    >
      <TouchableOpacity style={styles.discardButton} onPress={onDiscard} disabled={isSaving}>
        <Text style={styles.discardButtonText}>Discard</Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={[styles.saveButton, isSaving && styles.saveButtonDisabled]} 
        onPress={onSave}
        disabled={isSaving}
      >
        {isSaving ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text style={styles.saveButtonText}>Save Changes</Text>
        )}
      </TouchableOpacity>
    </MotiView>
  );
};


export default SaveFooter;

const styles = StyleSheet.create({
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#ffffff',
  },
  discardButton: {
    flex: 1,
    backgroundColor: '#e5e5ea',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginRight: 10,
  },
  discardButtonText: {
    fontSize: 17,
    color: '#000000',
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#007aff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#a0c7ff',
  },
  saveButtonText: {
    fontSize: 17,
    color: '#ffffff',
    fontWeight: '600',
  },
}); 