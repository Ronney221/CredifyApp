import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  StatusBar,
} from 'react-native';
import { Colors } from '../../../constants/Colors';

interface PageHeaderProps {
  title: string;
  subtitle: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
}) => {
  return (
    <View style={styles.headerContainer}>
      {/* Ghost separator for depth */}
      <View style={styles.ghostSeparator} />
      
      <View style={styles.headerSection}>
        <Text style={styles.headerTitle}>{title}</Text>
        <Text style={styles.headerSubtitle}>{subtitle}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    backgroundColor: '#f2f2f7',
    position: 'relative',
  },
  ghostSeparator: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 142 : 122, // Under status bar
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(142, 142, 147, 0.25)', // systemFill at 25% opacity
  },
  headerSection: {
    padding: 20,
    paddingTop: 62,
    paddingBottom: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#EDEDED',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: Colors.light.icon,
  },
}); 