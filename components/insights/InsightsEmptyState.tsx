import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { useRouter } from 'expo-router';

interface InsightsEmptyStateProps {
  selectedCardCount: number;
  activeFilterCount: number;
}

const InsightsEmptyState: React.FC<InsightsEmptyStateProps> = ({
  selectedCardCount,
  activeFilterCount,
}) => {
  const router = useRouter();

  return (
    <View style={styles.emptyStateContainer}>
      <View style={styles.emptyStateContent}>
        <Ionicons name="bar-chart-outline" size={64} color={Colors.light.icon} style={styles.emptyStateIcon} />
        <Text style={styles.emptyStateTitle}>No Insights Yet</Text>
        <Text style={styles.emptyStateText}>
          Track your credit card perks and rewards to see valuable insights about your redemptions.
        </Text>
        {(selectedCardCount === 0 || activeFilterCount > 0) ? (
          <Text style={styles.emptyStateSubText}>Try adjusting your filters or selecting cards.</Text>
        ) : (
          <>
            <View style={styles.emptyStateBulletPoints}>
              <View style={styles.bulletPoint}>
                <Ionicons name="checkmark-circle" size={20} color={Colors.light.tint} style={styles.bulletIcon} />
                <Text style={styles.bulletText}>See monthly redemption trends</Text>
              </View>
              <View style={styles.bulletPoint}>
                <Ionicons name="trending-up" size={20} color={Colors.light.tint} style={styles.bulletIcon} />
                <Text style={styles.bulletText}>Track your card ROI</Text>
              </View>
              <View style={styles.bulletPoint}>
                <Ionicons name="notifications-outline" size={20} color={Colors.light.tint} style={styles.bulletIcon} />
                <Text style={styles.bulletText}>Get reminders for upcoming perks</Text>
              </View>
            </View>
            <TouchableOpacity 
              style={styles.ctaButton}
              onPress={() => router.push("/(tabs)/01-dashboard")}
            >
              <Text style={styles.ctaButtonText}>Start Tracking Perks</Text>
              <Ionicons name="arrow-forward" size={20} color="#FFF" style={styles.ctaButtonIcon} />
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: Colors.light.background,
  },
  emptyStateContent: {
    maxWidth: 320,
    alignItems: 'center',
  },
  emptyStateIcon: {
    marginBottom: 20,
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.light.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  emptyStateText: {
    fontSize: 16,
    color: Colors.light.text,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  emptyStateSubText: {
    fontSize: 14,
    color: Colors.light.icon,
    textAlign: 'center',
  },
  emptyStateBulletPoints: {
    alignSelf: 'stretch',
    marginBottom: 32,
  },
  bulletPoint: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  bulletIcon: {
    marginRight: 12,
  },
  bulletText: {
    fontSize: 16,
    color: Colors.light.text,
    flex: 1,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.tint,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: '100%',
  },
  ctaButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginRight: 8,
  },
  ctaButtonIcon: {
    marginLeft: 4,
  },
});

export default InsightsEmptyState;