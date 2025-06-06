import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { MotiView } from 'moti';
import { Card } from '../../../src/data/card-data';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface UndoSnackbarProps {
  visible: boolean;
  message: string;
  onUndo: () => void;
  onDismiss: () => void;
}

export const UndoSnackbar: React.FC<UndoSnackbarProps> = ({
  visible,
  message,
  onUndo,
  onDismiss,
}) => {
  const insets = useSafeAreaInsets();
  
  useEffect(() => {
    if (visible) {
      const timer = setTimeout(() => {
        onDismiss();
      }, 5000); // Auto-dismiss after 5 seconds
      return () => clearTimeout(timer);
    }
  }, [visible, onDismiss]);

  const handleUndo = () => {
    onDismiss(); // Dismiss immediately on undo
    onUndo();
  };

  return (
    <MotiView
      animate={{
        opacity: visible ? 1 : 0,
        translateY: visible ? 0 : 100,
      }}
      transition={{
        type: 'timing',
        duration: 300,
      }}
      style={[
        styles.undoSnackbar,
        { bottom: insets.bottom + 92 }
      ]}
      pointerEvents={visible ? 'auto' : 'none'}
    >
      <Text style={styles.undoSnackbarText}>
        {message}
      </Text>
      <TouchableOpacity onPress={handleUndo} style={styles.undoButton}>
        <Text style={styles.undoButtonText}>Undo</Text>
      </TouchableOpacity>
    </MotiView>
  );
};

const styles = StyleSheet.create({
  undoSnackbar: {
    position: 'absolute',
    left: '5%',
    right: '5%',
    backgroundColor: '#333333',
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 8,
  },
  undoSnackbarText: {
    fontSize: 16,
    color: '#ffffff',
    flex: 1,
    fontWeight: '500',
  },
  undoButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  undoButtonText: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '600',
  },
}); 