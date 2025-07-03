// app/(tabs)/profile/reminders/first-of-month.tsx
import React, { useState } from 'react';
import { View, Text, Switch, StyleSheet, ScrollView, Platform } from 'react-native';
import { Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../../../constants/Colors';

interface ToggleRowProps {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  isLast?: boolean;
}

const ToggleRow: React.FC<ToggleRowProps> = ({ label, value, onValueChange, disabled = false, isLast = false }) => (
  <View style={[styles.toggleRow, isLast && styles.noBorder]}>
    <Text style={[styles.toggleLabel, disabled && styles.disabledText]}>{label}</Text>
    <Switch
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
      trackColor={{ false: '#e9e9ea', true: Colors.light.tint }}
      thumbColor={'#ffffff'}
      ios_backgroundColor="#e9e9ea"
    />
  </View>
);

export default function FirstOfMonthSettingsScreen() {
  // TODO: Replace with useNotificationPreferences once hook is refactored
  const [isEnabled, setEnabled] = useState(true);

  return (
    <>
      <Stack.Screen options={{ title: 'First of Month Reminders', headerShown: true }} />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.section}>
            <ToggleRow
              label="Send a summary on the first of each month"
              value={isEnabled}
              onValueChange={setEnabled}
              isLast={true}
            />
          </View>
          
          <Text style={styles.descriptionText}>
            Receive a monthly summary of your upcoming perks and benefits to help you plan your spending.
          </Text>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f2f2f7',
  },
  scrollContent: {
    padding: 20,
    paddingTop: 24,
  },
  section: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    marginBottom: 20,
    overflow: 'hidden',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e5ea',
  },
  noBorder: {
    borderBottomWidth: 0,
  },
  toggleLabel: {
    fontSize: 17,
    color: '#000000',
    flex: 1, 
    marginRight: 10
  },
  disabledText: {
    color: '#8e8e93',
  },
  descriptionText: {
    fontSize: 13,
    color: '#6d6d72',
    paddingHorizontal: 16,
  },
}); 