import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Platform, StatusBar } from 'react-native';
import { useAuth } from '../../../contexts/AuthContext';
import { Colors } from '../../constants/Colors';
import { format } from 'date-fns';
import AccountButton from './AccountButton';

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
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    return lastDay.getDate() - today.getDate() + 1;
  }, []);

  const currentMonth = useMemo(() => {
    return format(new Date(), 'MMMM');
  }, []);

  const statusMessage = useMemo(() => {
    if (daysRemaining === 1) {
      return `Last day to use your ${currentMonth} perks!`;
    } else if (daysRemaining <= 3) {
      return `${daysRemaining} days left to use your ${currentMonth} perks`;
    }
    return `${daysRemaining} days left in ${currentMonth}`;
  }, [daysRemaining, currentMonth]);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.textContainer}>
          <Text style={styles.greeting}>{greeting},</Text>
          <Text style={styles.name}>{firstName}</Text>
          <Text style={[
            styles.status,
            daysRemaining <= 3 && styles.urgentStatus
          ]}>
            {statusMessage}
          </Text>
        </View>
        <AccountButton />
      </View>
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
    color: Colors.light.textSecondary,
    fontWeight: '500',
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.light.text,
    marginTop: 2,
    marginBottom: 4,
  },
  status: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    fontWeight: '500',
  },
  urgentStatus: {
    color: Colors.light.error,
    fontWeight: '600',
  },
}); 