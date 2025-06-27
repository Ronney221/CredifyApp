import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import AccountButton from './AccountButton';
import { endOfMonth, differenceInDays } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';

export default function Header() {
  const { user } = useAuth();

  console.log('[Header.tsx] User object from useAuth():', user);
  if (user) {
    console.log('[Header.tsx] User metadata:', user.user_metadata);
  }

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const firstName = useMemo(() => {
    const fullName = user?.user_metadata?.full_name || 'User';
    return fullName.split(' ')[0].charAt(0).toUpperCase() + fullName.split(' ')[0].slice(1).toLowerCase();
  }, [user]);

  const daysRemaining = useMemo(() => {
    const today = new Date();
    const lastDay = endOfMonth(today);
    return differenceInDays(lastDay, today) + 1;
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.textContainer}>
          <Text style={styles.greeting}>{greeting},</Text>
          <Text style={styles.name}>{firstName}</Text>
        </View>
        <AccountButton />
      </View>
      <View style={styles.daysRemainingPill}>
        <Ionicons name="alarm-outline" size={14} color="#545454" style={styles.pillIcon} />
        <Text style={styles.pillText}>{daysRemaining} days left this month</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 20,
    backgroundColor: '#F8F7FF',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  textContainer: {
    flex: 1,
    marginRight: 12,
  },
  greeting: {
    fontSize: 16,
    color: '#666666',
    fontWeight: '500',
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1c1c1e',
    marginTop: 2,
  },
  daysRemainingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
  },
  pillIcon: {
    marginRight: 6,
  },
  pillText: {
    fontSize: 13,
    color: '#545454',
    fontWeight: '500',
  },
}); 