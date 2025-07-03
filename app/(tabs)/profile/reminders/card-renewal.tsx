// app/(tabs)/profile/reminders/card-renewal.tsx
import React, { useState } from 'react';
import { View, Text, Switch, StyleSheet, ScrollView, Platform } from 'react-native';
import { Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../../../constants/Colors';
// import { useNotificationPreferences } from '../../../../components/cards/hooks/useNotificationPreferences';

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

export default function CardRenewalSettingsScreen() {
  // const { preferences, setPreference } = useNotificationPreferences();
  // TODO: Replace with useNotificationPreferences once hook is refactored
  const [isMainEnabled, setMainEnabled] = useState(true);
  const [days90, setDays90] = useState(true);
  const [days30, setDays30] = useState(true);
  const [days7, setDays7] = useState(true);
  const [days1, setDays1] = useState(true);


  const handleMainToggle = (value: boolean) => {
    setMainEnabled(value);
  };

  const isMasterDisabled = !isMainEnabled;

  return (
    <>
      <Stack.Screen options={{ title: 'Card Renewal Reminders', headerShown: true }} />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.section}>
            <ToggleRow
              label="Notify about card renewals"
              value={isMainEnabled}
              onValueChange={handleMainToggle}
              isLast={true}
            />
          </View>
          
          <Text style={styles.headerText}>REMIND ME BEFORE RENEWAL AT:</Text>
          
          <View style={styles.section}>
            <ToggleRow
              label="90 days"
              value={days90}
              onValueChange={setDays90}
              disabled={isMasterDisabled}
            />
            <ToggleRow
              label="30 days"
              value={days30}
              onValueChange={setDays30}
              disabled={isMasterDisabled}
            />
            <ToggleRow
              label="7 days"
              value={days7}
              onValueChange={setDays7}
              disabled={isMasterDisabled}
            />
            <ToggleRow
              label="1 day"
              value={days1}
              onValueChange={setDays1}
              disabled={isMasterDisabled}
              isLast={true}
            />
          </View>
          
          <Text style={styles.descriptionText}>
            Get a notification this many days before your card&apos;s annual fee is due to be charged.
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
  },
  disabledText: {
    color: '#8e8e93',
  },
  headerText: {
    fontSize: 13,
    color: '#6d6d72',
    textTransform: 'uppercase',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  descriptionText: {
    fontSize: 13,
    color: '#6d6d72',
    paddingHorizontal: 16,
  },
}); 