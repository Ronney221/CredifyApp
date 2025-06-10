import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../constants/Colors';
import { CardROI } from '../../../src/data/dummy-insights';

interface CardRoiLeaderboardProps {
  cardRois: CardROI[];
}

const ProgressBar: React.FC<{ progress: number }> = ({ progress }) => {
  const clampedProgress = Math.max(0, Math.min(100, progress));
  const isFeeCovered = progress >= 100;

  return (
    <View style={styles.progressBarContainer}>
      <View style={[
        styles.progressBarFill, 
        { width: `${clampedProgress}%` },
        isFeeCovered ? styles.progressGreen : styles.progressBlue,
      ]} />
    </View>
  );
};

const CardRoiLeaderboard: React.FC<CardRoiLeaderboardProps> = ({ cardRois }) => {
  if (!cardRois || cardRois.length === 0) {
    return null; // Don't render anything if there's no data
  }

  const sortedRois = [...cardRois].sort((a, b) => b.roiPercentage - a.roiPercentage);
  const medalEmojis = ['🥇', '🥈', '🥉'];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Card ROI for {new Date().getFullYear()}</Text>
        <Ionicons name="help-circle-outline" size={20} color={Colors.light.icon} />
      </View>
      <View style={styles.leaderboard}>
        {sortedRois.map((roi, index) => (
          <View key={roi.id} style={styles.row}>
            <View style={styles.cardInfo}>
              <Text style={styles.rank}>{index < 3 ? medalEmojis[index] : `${index + 1}.`}</Text>
              <Text style={styles.cardName}>{roi.name}</Text>
            </View>
            <View style={styles.roiInfo}>
              <View style={styles.roiTextContainer}>
                <Text style={[styles.roiPercentage, roi.roiPercentage >= 100 ? styles.roiPercentageSuccess : null]}>
                  {Math.round(roi.roiPercentage)}%
                </Text>
                <Text style={styles.roiValues}>
                  ${roi.totalRedeemed.toFixed(0)} / ${roi.annualFee.toFixed(0)}
                </Text>
              </View>
              <ProgressBar progress={roi.roiPercentage} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 20,
    marginHorizontal: 15,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.light.text,
  },
  leaderboard: {
    // container for all the rows
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  cardInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  rank: {
    fontSize: 16,
    width: 30,
  },
  cardName: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.light.text,
    flexShrink: 1,
  },
  roiInfo: {
    flex: 1,
    alignItems: 'flex-end',
  },
  roiTextContainer: {
    alignItems: 'flex-end',
    marginBottom: 4,
  },
  roiPercentage: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.tint,
  },
  roiPercentageSuccess: {
    color: '#34C759',
  },
  roiValues: {
    fontSize: 12,
    color: Colors.light.icon,
    marginTop: 2,
  },
  progressBarContainer: {
    height: 6,
    width: '100%',
    backgroundColor: '#E5E5EA',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressBlue: {
    backgroundColor: Colors.light.tint,
  },
  progressGreen: {
    backgroundColor: '#34C759', // A clear success green
  },
});

export default CardRoiLeaderboard; 