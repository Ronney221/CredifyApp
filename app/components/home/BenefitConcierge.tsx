import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useUserCards } from '../../hooks/useUserCards';
import { usePerkStatus } from '../../hooks/usePerkStatus';
import { getBenefitAdvice } from '../../../lib/openai';
import { Card, CardPerk } from '../../../src/data/card-data';

interface BenefitConciergeProps {
  onClose: () => void;
}

interface AvailablePerk {
  name: string;
  value: number;
  periodMonths?: number;
}

interface CardWithPerks {
  cardName: string;
  perks: AvailablePerk[];
}

export default function BenefitConcierge({ onClose }: BenefitConciergeProps) {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<string | null>(null);
  const { userCardsWithPerks } = useUserCards();
  const { userCardsWithPerks: processedCards } = usePerkStatus(userCardsWithPerks);

  // Debug logging for component mount and state changes
  useEffect(() => {
    console.log('[BenefitConcierge] Component mounted');
    console.log('[BenefitConcierge] Initial userCardsWithPerks:', JSON.stringify(userCardsWithPerks, null, 2));
    console.log('[BenefitConcierge] Initial processedCards:', JSON.stringify(processedCards, null, 2));
  }, []);

  useEffect(() => {
    console.log('[BenefitConcierge] Query updated:', query);
  }, [query]);

  useEffect(() => {
    console.log('[BenefitConcierge] Loading state changed:', isLoading);
  }, [isLoading]);

  useEffect(() => {
    console.log('[BenefitConcierge] Response updated:', response);
  }, [response]);

  const handleSubmit = async () => {
    if (!query.trim()) {
      console.log('[BenefitConcierge] Submit attempted with empty query');
      return;
    }

    console.log('[BenefitConcierge] Starting handleSubmit');
    setIsLoading(true);
    setResponse(null);

    try {
      console.log('[BenefitConcierge] Processing available perks');
      // Get available perks
      const availablePerks: CardWithPerks[] = processedCards.map(card => ({
        cardName: card.card.name,
        perks: card.perks
          .filter(perk => perk.status === 'available')
          .map(perk => ({
            name: perk.name,
            value: perk.value,
            periodMonths: perk.periodMonths
          }))
      })).filter(card => card.perks.length > 0);

      console.log('[BenefitConcierge] Available perks:', JSON.stringify(availablePerks, null, 2));

      console.log('[BenefitConcierge] Calling getBenefitAdvice');
      const advice = await getBenefitAdvice(query, availablePerks);
      console.log('[BenefitConcierge] Received advice:', advice);
      
      setResponse(advice);
    } catch (error) {
      console.error('[BenefitConcierge] Error in handleSubmit:', error);
      setResponse('Sorry, I encountered an error. Please try again.');
    } finally {
      console.log('[BenefitConcierge] Finishing handleSubmit');
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Benefit Concierge</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close" size={24} color="#1C1C1E" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.description}>
          Ask how to make the most of your available benefits for any situation.
        </Text>

        <TextInput
          style={styles.input}
          value={query}
          onChangeText={setQuery}
          placeholder="e.g., I'm booking a trip to New York for 3 nights..."
          placeholderTextColor="#8E8E93"
          multiline
          maxLength={200}
        />

        <TouchableOpacity
          style={[styles.submitButton, (!query.trim() || isLoading) && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={!query.trim() || isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.submitButtonText}>Get Advice</Text>
          )}
        </TouchableOpacity>

        {response && (
          <View style={styles.responseContainer}>
            <Text style={styles.responseText}>{response}</Text>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 32 : 24,
  },
  description: {
    fontSize: 15,
    color: '#8E8E93',
    marginBottom: 16,
  },
  input: {
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1C1C1E',
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  submitButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  responseContainer: {
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    padding: 16,
  },
  responseText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#1C1C1E',
  },
}); 