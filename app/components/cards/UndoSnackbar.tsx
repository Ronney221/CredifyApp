import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
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
  if (!visible || !deletedCard) return null;

  return (
    <MotiView
      from={{ opacity: 0, translateY: 100 }}
      animate={{ opacity: 1, translateY: 0 }}
      exit={{ opacity: 0, translateY: 100 }}
      style={styles.undoSnackbar}
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
    bottom: 100,
    left: '10%',
    right: '10%',
    backgroundColor: '#20B2AA',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  undoSnackbarText: {
    fontSize: 16,
    color: '#ffffff',
    flex: 1,
  },
  undoButton: {
    backgroundColor: '#007aff',
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