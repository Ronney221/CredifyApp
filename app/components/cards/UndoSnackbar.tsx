import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { MotiView } from 'moti';
import { Card } from '../../../src/data/card-data';

interface UndoSnackbarProps {
  visible: boolean;
  deletedCard: { card: Card; renewalDate?: Date } | null;
  onUndo: () => void;
}

export const UndoSnackbar: React.FC<UndoSnackbarProps> = ({
  visible,
  deletedCard,
  onUndo,
}) => {
  if (!deletedCard) return null;

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
      style={styles.undoSnackbar}
      pointerEvents={visible ? 'auto' : 'none'}
    >
      <Text style={styles.undoSnackbarText}>
        {deletedCard.card.name} removed
      </Text>
      <TouchableOpacity onPress={onUndo} style={styles.undoButton}>
        <Text style={styles.undoButtonText}>Undo</Text>
      </TouchableOpacity>
    </MotiView>
  );
};

const styles = StyleSheet.create({
  undoSnackbar: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 120 : 92,
    left: '10%',
    right: '10%',
    backgroundColor: '#20B2AA',
    borderRadius: 12,
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