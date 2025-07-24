import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';

interface SettingItem {
  id: string;
  title: string;
  subtitle?: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  isDestructive?: boolean;
  showChevron?: boolean;
}

interface SettingsSectionProps {
  title: string;
  items: SettingItem[];
  style?: any;
}

export const SettingsSection = ({ title, items, style }: SettingsSectionProps) => {
  return (
    <View style={[styles.container, style]}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.itemsContainer}>
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          
          return (
            <Pressable
              key={item.id}
              onPress={item.onPress}
              style={({ pressed }) => [
                styles.item,
                !isLast && styles.itemBorder,
                pressed && styles.itemPressed,
                item.isDestructive && styles.destructiveItem
              ]}
              hitSlop={4}
            >
              <View style={[
                styles.iconContainer,
                item.isDestructive && styles.destructiveIconContainer
              ]}>
                <Ionicons
                  name={item.icon}
                  size={20}
                  color={item.isDestructive ? Colors.light.error : Colors.light.tint}
                />
              </View>
              
              <View style={styles.textContainer}>
                <Text style={[
                  styles.itemTitle,
                  item.isDestructive && styles.destructiveTitle
                ]}>
                  {item.title}
                </Text>
                {item.subtitle && (
                  <Text style={styles.itemSubtitle}>
                    {item.subtitle}
                  </Text>
                )}
              </View>
              
              {(item.showChevron !== false && !item.isDestructive) && (
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={Colors.light.tertiaryLabel}
                  style={styles.chevron}
                />
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.light.text,
    letterSpacing: -0.3,
    marginBottom: 12,
  },
  itemsContainer: {
    backgroundColor: Colors.light.background,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    overflow: 'hidden',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    minHeight: 60,
  },
  itemBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.light.separator,
  },
  itemPressed: {
    backgroundColor: Colors.light.systemGroupedBackground,
  },
  destructiveItem: {
    // No special background for destructive items in this style
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.light.systemGroupedBackground,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  destructiveIconContainer: {
    backgroundColor: Colors.light.error + '15',
  },
  textContainer: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    letterSpacing: -0.2,
  },
  destructiveTitle: {
    color: Colors.light.error,
  },
  itemSubtitle: {
    fontSize: 13,
    color: Colors.light.secondaryLabel,
    marginTop: 2,
    lineHeight: 18,
    fontWeight: '500',
  },
  chevron: {
    marginLeft: 8,
    opacity: 0.6,
  },
});