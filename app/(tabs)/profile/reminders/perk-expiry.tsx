// app/(tabs)/profile/reminders/perk-expiry.tsx
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

export default function PerkExpirySettingsScreen() {
  // TODO: Replace with useNotificationPreferences once hook is refactored
  const [isMainEnabled, setMainEnabled] = useState(true);
  const [monthly, setMonthly] = useState(true);
  const [semiAnnual, setSemiAnnual] = useState(true);
  const [annual, setAnnual] = useState(true);

  const isMasterDisabled = !isMainEnabled;

  return (
    <>
      <Stack.Screen options={{ title: 'Perk Expiry Reminders', headerShown: true }} />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.section}>
            <ToggleRow
              label="Notify about perk expiries"
              value={isMainEnabled}
              onValueChange={setMainEnabled}
              isLast={true}
            />
          </View>
          
          <Text style={styles.headerText}>REMIND ME FOR PERKS THAT ARE:</Text>
          
          <View style={styles.section}>
            <ToggleRow
              label="Monthly"
              value={monthly}
              onValueChange={setMonthly}
              disabled={isMasterDisabled}
            />
            <ToggleRow
              label="Semi-Annual"
              value={semiAnnual}
              onValueChange={setSemiAnnual}
              disabled={isMasterDisabled}
            />
            <ToggleRow
              label="Annual"
              value={annual}
              onValueChange={setAnnual}
              disabled={isMasterDisabled}
              isLast={true}
            />
          </View>
          
          <Text style={styles.descriptionText}>
            Get a notification for perks that are about to expire at the end of their cycle.
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