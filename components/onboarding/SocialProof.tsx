import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MotiView } from 'moti';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';

interface SocialProofProps {
  variant?: 'welcome' | 'savings';
  delay?: number;
  selectedCardsCount?: number;
  netValue?: number;
}

export const SocialProof: React.FC<SocialProofProps> = ({ 
  variant = 'welcome', 
  delay = 0,
  selectedCardsCount = 0,
  netValue = 0,
}) => {
  const getStatistics = () => {
    if (variant === 'welcome') {
      return [
        {
          icon: 'trending-up',
          text: 'Credit card users miss 23% of benefits on average',
          highlight: '23%',
        },
        {
          icon: 'cash-outline',
          text: '$15 billion in rewards go unclaimed annually',
          highlight: '$15 billion',
        },
      ];
    }
    
    // Dynamic urgency for savings screen
    const missedValue = Math.round(netValue * 0.23);
    const statistics = [];
    
    if (selectedCardsCount > 0) {
      statistics.push({
        icon: 'warning',
        text: `Users with similar cards typically miss $${missedValue}/year in perks`,
        highlight: `$${missedValue}/year`,
      });
    }
    
    if (netValue > 1000) {
      statistics.push({
        icon: 'time-outline',
        text: 'Premium cardholders forget 31% of time-sensitive benefits',
        highlight: '31%',
      });
    } else if (netValue > 500) {
      statistics.push({
        icon: 'card-outline',
        text: 'Average cardholder leaves $600+ on the table annually',
        highlight: '$600+',
      });
    }
    
    return statistics;
  };

  const statistics = getStatistics();
  
  if (statistics.length === 0) return null;

  return (
    <MotiView
      from={{ opacity: 0, translateY: 20 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ 
        type: 'timing', 
        duration: 400,
        delay: delay,
      }}
      style={styles.container}
    >
      {statistics.map((stat, index) => (
        <View key={index} style={styles.statItem}>
          <View style={styles.iconContainer}>
            <Ionicons 
              name={stat.icon as any} 
              size={20} 
              color={Colors.light.tint} 
            />
          </View>
          <Text style={styles.statText}>
            {stat.text.split(stat.highlight).map((part, i, arr) => (
              <React.Fragment key={i}>
                {part}
                {i < arr.length - 1 && (
                  <Text style={styles.highlight}>{stat.highlight}</Text>
                )}
              </React.Fragment>
            ))}
          </Text>
        </View>
      ))}
    </MotiView>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 20,
    paddingHorizontal: 0,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: '#F9FAFB',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  iconContainer: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: Colors.light.tint + '12',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    flexShrink: 0,
  },
  statText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 19,
    color: Colors.light.secondaryLabel,
    letterSpacing: -0.2,
  },
  highlight: {
    color: Colors.light.tint,
    fontWeight: '600',
  },
});