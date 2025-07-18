import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { getUserActiveCards, getAllCardsData } from '../../lib/database';
import { Colors } from '../../constants/Colors';

interface UserDebugInfoProps {
  onClose: () => void;
}

export function UserDebugInfo({ onClose }: UserDebugInfoProps) {
  const { user } = useAuth();
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const gatherDebugInfo = async () => {
      try {
        const info: any = {
          user: user ? {
            id: user.id,
            email: user.email,
            created_at: user.created_at,
          } : null,
          timestamp: new Date().toISOString(),
        };

        if (user) {
          // Get user cards from database
          const { data: userCards, error: userCardsError } = await getUserActiveCards(user.id);
          info.userCards = {
            data: userCards,
            error: userCardsError,
            count: userCards?.length || 0,
          };

          // Get all available cards
          const allCards = await getAllCardsData();
          info.allCards = {
            count: allCards.length,
            sampleCard: allCards[0] ? {
              id: allCards[0].id,
              name: allCards[0].name,
              benefitsCount: allCards[0].benefits.length,
            } : null,
          };
        }

        setDebugInfo(info);
      } catch (error) {
        setDebugInfo({
          error: error.message,
          timestamp: new Date().toISOString(),
        });
      } finally {
        setLoading(false);
      }
    };

    gatherDebugInfo();
  }, [user]);

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Loading debug info...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Debug Information</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Text style={styles.closeButtonText}>Close</Text>
        </TouchableOpacity>
      </View>
      
      <ScrollView style={styles.scrollView}>
        <Text style={styles.debugText}>
          {JSON.stringify(debugInfo, null, 2)}
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.systemGroupedBackground,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.light.text,
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    color: Colors.light.tint,
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
  },
  debugText: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: Colors.light.text,
    backgroundColor: Colors.light.background,
    padding: 16,
    borderRadius: 8,
  },
});