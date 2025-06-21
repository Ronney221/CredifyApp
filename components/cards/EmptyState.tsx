import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { MotiText, MotiView } from 'moti';

interface EmptyStateProps {
  onAddCard: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  onAddCard,
}) => {
  return (
    <View style={styles.emptyState}>
      <MotiView
        from={{ opacity: 0, scale: 0.9, translateY: 10 }}
        animate={{ opacity: 1, scale: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 400, delay: 100 }}
      >
        <Ionicons name="card-outline" size={64} color={Colors.light.icon} style={styles.emptyStateIcon} />
      </MotiView>
      <MotiText
        style={styles.emptyTitle}
        from={{ opacity: 0, translateY: 10 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 400, delay: 200 }}
      >
        No cards yet
      </MotiText>
      <MotiText
        style={styles.emptySubtitle}
        from={{ opacity: 0, translateY: 10 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 400, delay: 300 }}
      >
        Add one to start tracking perks.
      </MotiText>
      <MotiView
        from={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'timing', duration: 400, delay: 400 }}
      >
        <TouchableOpacity style={styles.addButton} onPress={onAddCard} activeOpacity={0.8}>
          <Ionicons name="add" size={20} color="#FFF" />
          <Text style={styles.addButtonText}>Add Card</Text>
        </TouchableOpacity>
      </MotiView>
    </View>
  );
};


export default EmptyState;

const styles = StyleSheet.create({
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyStateIcon: {
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#1c1c1e',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#6e6e73',
    textAlign: 'center',
    marginBottom: 24,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007aff',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 100,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
}); 