import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { usePerkStatus } from '../../hooks/usePerkStatus';
import { useUserCards } from '../../hooks/useUserCards';
import { useAuth } from '../../hooks/useAuth';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface JourneyMilestone {
  id: string;
  title: string;
  description: string;
  date: string; // ISO string
  icon: keyof typeof Ionicons.glyphMap;
  value?: string;
  category: 'achievement' | 'milestone' | 'anniversary' | 'goal';
  color: string;
}

interface PersonalJourneyProps {
  userId: string;
}

const JOURNEY_STORAGE_KEY = '@personal_journey_milestones';

export const PersonalJourney = ({ userId }: PersonalJourneyProps) => {
  const { user } = useAuth();
  const { userCardsWithPerks } = useUserCards();
  const { periodAggregates, cumulativeValueSavedPerCard } = usePerkStatus(userCardsWithPerks || []);
  const [milestones, setMilestones] = useState<JourneyMilestone[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const generateMilestones = async () => {
      try {
        // Load existing milestones
        const existingMilestonesJson = await AsyncStorage.getItem(JOURNEY_STORAGE_KEY);
        const existingMilestones: JourneyMilestone[] = existingMilestonesJson 
          ? JSON.parse(existingMilestonesJson) 
          : [];

        const newMilestones: JourneyMilestone[] = [...existingMilestones];

        // Add account anniversary if not already added
        if (user?.created_at) {
          const createdDate = new Date(user.created_at);
          const accountAge = Math.floor((Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
          
          const anniversaryId = `anniversary-${createdDate.getFullYear()}-${createdDate.getMonth()}`;
          if (!existingMilestones.find(m => m.id === anniversaryId) && accountAge >= 30) {
            newMilestones.push({
              id: anniversaryId,
              title: 'Welcome to Credify!',
              description: 'Started your credit card optimization journey',
              date: user.created_at,
              icon: 'star',
              category: 'anniversary',
              color: '#FF6B35'
            });
          }
        }

        // Add first card milestone
        if (userCardsWithPerks && userCardsWithPerks.length > 0) {
          const firstCardId = 'first-card-added';
          if (!existingMilestones.find(m => m.id === firstCardId)) {
            newMilestones.push({
              id: firstCardId,
              title: 'First Card Added',
              description: 'Added your first credit card to track',
              date: new Date().toISOString(), // Approximate - would need real data
              icon: 'card',
              category: 'milestone',
              color: '#2196F3'
            });
          }
        }

        // Add redemption milestones based on total value (but limit redundancy with achievements)
        const totalValue = Object.values(cumulativeValueSavedPerCard || {})
          .reduce((sum, value) => sum + value, 0);

        // Only add major milestones that are different from achievements
        const majorMilestones = [
          { threshold: 2500, title: 'Elite Saver Status!', icon: 'diamond', color: '#9C27B0' },
          { threshold: 5000, title: 'Credit Card Master', icon: 'star', color: '#FF6B35' },
        ];

        majorMilestones.forEach(({ threshold, title, icon, color }, index) => {
          const milestoneId = `value-${threshold}`;
          if (totalValue >= threshold && !existingMilestones.find(m => m.id === milestoneId)) {
            // Create milestone with a date that's older for higher thresholds (reverse chronological)
            const milestoneDate = new Date();
            milestoneDate.setDate(milestoneDate.getDate() - (index * 30)); // Space them out by months
            
            newMilestones.push({
              id: milestoneId,
              title,
              description: `Reached $${threshold} in total perk value saved`,
              date: milestoneDate.toISOString(),
              icon: icon as keyof typeof Ionicons.glyphMap,
              value: `$${threshold}`,
              category: 'milestone',
              color
            });
          }
        });

        // Add account age milestones (unique to journey, not in achievements)
        if (user?.created_at) {
          const createdDate = new Date(user.created_at);
          const daysSinceCreated = Math.floor((Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
          
          const ageMilestones = [
            { days: 30, title: 'One Month Strong', icon: 'calendar', color: '#4CAF50' },
            { days: 90, title: 'Quarter Year User', icon: 'medal', color: '#FF9800' },
            { days: 365, title: 'One Year Anniversary!', icon: 'trophy', color: '#9C27B0' },
          ];

          ageMilestones.forEach(({ days, title, icon, color }) => {
            const ageId = `age-${days}`;
            if (daysSinceCreated >= days && !existingMilestones.find(m => m.id === ageId)) {
              const milestoneDate = new Date(createdDate);
              milestoneDate.setDate(milestoneDate.getDate() + days);
              
              newMilestones.push({
                id: ageId,
                title,
                description: `Been optimizing credit cards for ${days === 365 ? '1 year' : `${days} days`}`,
                date: milestoneDate.toISOString(),
                icon: icon as keyof typeof Ionicons.glyphMap,
                category: 'anniversary',
                color
              });
            }
          });
        }

        // Sort by date (most recent first)
        newMilestones.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        // Save updated milestones
        if (newMilestones.length !== existingMilestones.length) {
          await AsyncStorage.setItem(JOURNEY_STORAGE_KEY, JSON.stringify(newMilestones));
        }

        setMilestones(newMilestones);
      } catch (error) {
        console.error('Error generating milestones:', error);
      }
    };

    generateMilestones();
  }, [user, userCardsWithPerks, periodAggregates, cumulativeValueSavedPerCard]);

  const displayedMilestones = isExpanded ? milestones : milestones.slice(0, 3);

  if (milestones.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Personal Journey</Text>
        <Text style={styles.emptyText}>Your milestones will appear here as you use Credify!</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Personal Journey</Text>
        {milestones.length > 3 && (
          <Pressable 
            onPress={() => setIsExpanded(!isExpanded)}
            style={styles.expandButton}
            hitSlop={8}
          >
            <Text style={styles.expandText}>
              {isExpanded ? 'Show Less' : `+${milestones.length - 3} more`}
            </Text>
            <Ionicons 
              name={isExpanded ? 'chevron-up' : 'chevron-down'} 
              size={16} 
              color={Colors.light.tint} 
            />
          </Pressable>
        )}
      </View>

      <ScrollView 
        style={[styles.timelineContainer, !isExpanded && { maxHeight: 200 }]}
        showsVerticalScrollIndicator={false}
      >
        {displayedMilestones.map((milestone, index) => {
          const isLast = index === displayedMilestones.length - 1;
          
          return (
            <View key={milestone.id} style={styles.milestoneContainer}>
              <View style={styles.timelineNode}>
                <View style={[styles.iconContainer, { backgroundColor: milestone.color + '20' }]}>
                  <Ionicons 
                    name={milestone.icon} 
                    size={16} 
                    color={milestone.color} 
                  />
                </View>
                {!isLast && <View style={styles.timelineLine} />}
              </View>
              
              <View style={styles.milestoneContent}>
                <View style={styles.milestoneHeader}>
                  <Text style={styles.milestoneTitle}>{milestone.title}</Text>
                  {milestone.value && (
                    <Text style={[styles.milestoneValue, { color: milestone.color }]}>
                      {milestone.value}
                    </Text>
                  )}
                </View>
                <Text style={styles.milestoneDescription}>{milestone.description}</Text>
                <Text style={styles.milestoneDate}>
                  {new Date(milestone.date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </Text>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.light.text,
    letterSpacing: -0.3,
  },
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  expandText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.light.tint,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.light.secondaryLabel,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 20,
  },
  timelineContainer: {
    // maxHeight controlled by component state, not in StyleSheet
  },
  milestoneContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  timelineNode: {
    alignItems: 'center',
    marginRight: 16,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: Colors.light.separator,
    marginTop: 8,
  },
  milestoneContent: {
    flex: 1,
    paddingBottom: 8,
  },
  milestoneHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  milestoneTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    flex: 1,
  },
  milestoneValue: {
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 8,
  },
  milestoneDescription: {
    fontSize: 14,
    color: Colors.light.secondaryLabel,
    lineHeight: 18,
    marginBottom: 4,
  },
  milestoneDate: {
    fontSize: 12,
    color: Colors.light.tertiaryLabel,
    fontWeight: '500',
  },
});