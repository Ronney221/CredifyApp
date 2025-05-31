import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Platform, StatusBar } from 'react-native';
import { useAuth } from '../../../contexts/AuthContext';
import AccountButton from './AccountButton';
import { TimeRemainingBanner } from './TimeRemainingBanner';
import { endOfMonth, differenceInDays } from 'date-fns';

export default function Header() {
  const { user } = useAuth();

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const firstName = useMemo(() => {
    const fullName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
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
      <TimeRemainingBanner daysRemaining={daysRemaining} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0,
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: '#ffffff',
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
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
    marginBottom: 4,
  },
}); 