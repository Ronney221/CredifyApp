import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../constants/Colors';
import { MotiView } from 'moti';

interface ToggleProps {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
}

interface ReminderToggleGroupProps {
  iconName: keyof typeof Ionicons.glyphMap;
  title: string;
  details?: string[];
  iconColor?: string;
  toggles?: ToggleProps[];
  mode: 'onboard' | 'manage';
  index?: number;
  isLastItem?: boolean;
  dimmed?: boolean;
  disabledReason?: string;
}

export const ReminderToggleGroup: React.FC<ReminderToggleGroupProps> = ({
  iconName,
  title,
  details,
  iconColor = Colors.light.tint,
  toggles,
  mode,
  index = 0,
  isLastItem = false,
  dimmed = false,
  disabledReason,
}) => {
  const containerStyle = mode === 'onboard' 
    ? [
        styles.onboardContainer, 
        isLastItem && { borderBottomWidth: 0 },
        dimmed && styles.dimmedItem,
      ]
    : [
        styles.manageContainer,
        isLastItem && { borderBottomWidth: 0 },
      ];

  const content = (
    <View style={containerStyle}>
      <View style={styles.header}>
        <Ionicons 
          name={iconName} 
          size={22} 
          color={dimmed ? Colors.light.icon : iconColor} 
          style={styles.icon} 
        />
        <Text style={[styles.title, dimmed && styles.dimmedText]}>
          {title}
        </Text>
      </View>
      
      {details && details.length > 0 && (
        <View style={styles.detailsContainer}>
          {details.map((detail, idx) => (
            <Text key={idx} style={[styles.detailText, dimmed && styles.dimmedText]}>
              • {detail}
            </Text>
          ))}
          {disabledReason && (
            <Text style={styles.disabledReasonText}>
              {disabledReason}
            </Text>
          )}
        </View>
      )}
      
      {toggles && toggles.length > 0 && (
        <View style={[styles.togglesContainer, dimmed && styles.dimmedToggles]}>
          {toggles.map((toggle, idx) => (
            <View key={idx} style={styles.toggleRow}>
              <Text style={[styles.toggleLabel, dimmed && styles.dimmedText]}>
                {toggle.label}
              </Text>
              <Switch
                trackColor={{ 
                  false: "#767577", 
                  true: dimmed ? Colors.light.icon : Colors.light.tint 
                }}
                thumbColor={toggle.value ? "#ffffff" : "#f4f3f4"}
                ios_backgroundColor="#3e3e3e"
                onValueChange={toggle.onValueChange}
                value={toggle.value}
                disabled={dimmed || toggle.disabled}
              />
            </View>
          ))}
        </View>
      )}
    </View>
  );

  if (mode === 'onboard') {
    return (
      <MotiView
        from={{ opacity: 0, translateY: 20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{
          type: 'timing',
          duration: 250,
          delay: 150 + (index * 100),
        }}
      >
        {content}
      </MotiView>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  onboardContainer: {
    backgroundColor: 'transparent',
    borderRadius: 0,
    paddingVertical: 12,
    paddingHorizontal: 0,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#EDEDED',
  },
  manageContainer: {
    backgroundColor: '#ffffff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#c7c7cc',
  },
  dimmedItem: {
    // Container dimming handled by child opacity
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  icon: {
    marginRight: 12,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.light.text,
    flex: 1,
  },
  dimmedText: {
    color: Colors.light.icon,
    opacity: 0.7,
  },
  detailsContainer: {
    paddingLeft: 34, // Align with title text (icon width + margin)
  },
  detailText: {
    fontSize: 15,
    color: Colors.light.icon,
    marginBottom: 4,
    lineHeight: 20,
  },
  disabledReasonText: {
    fontSize: 14,
    color: Colors.light.icon,
    fontStyle: 'italic',
    marginTop: 4,
  },
  togglesContainer: {
    marginTop: 12,
  },
  dimmedToggles: {
    opacity: 0.5,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F9F9FB',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 4,
  },
  toggleLabel: {
    fontSize: 15,
    color: Colors.light.text,
    flexShrink: 1,
    marginRight: 8,
  },
}); 