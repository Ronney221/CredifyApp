import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../constants/Colors';

interface EmptyStateProps {
  onAddCard: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  onAddCard,
}) => {
  return (
    <View style={styles.emptyState}>
      <Ionicons name="card-outline" size={64} color={Colors.light.icon} style={styles.emptyStateIcon} />
      <Text style={styles.emptyStateTitle}>No cards yet</Text>
      <Text style={styles.emptyStateText}>
        Add your first card to start tracking perks and benefits
      </Text>
      <TouchableOpacity onPress={onAddCard} style={styles.emptyStateButton}>
        <Text style={styles.emptyStateButtonText}>Add Your First Card</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyStateIcon: {
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: Colors.light.icon,
    marginBottom: 16,
    textAlign: 'center',
  },
  emptyStateButton: {
    backgroundColor: Colors.light.tint,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  emptyStateButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
  },
}); 