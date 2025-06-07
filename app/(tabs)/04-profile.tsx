import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  TouchableOpacity,
  Alert,
  SectionListRenderItemInfo,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { Colors } from '../../constants/Colors';
import { ProfileHeader } from '../components/profile/ProfileHeader';

interface ProfileRow {
  id: string;
  title: string;
  icon?: keyof typeof Ionicons.glyphMap;
  isDestructive?: boolean;
  onPress: () => void;
}

interface ProfileSection {
  title: string;
  data: ProfileRow[];
  footer?: string;
}

const ProfileScreen = () => {
  const router = useRouter();
  const { logOut, user } = useAuth();

  const handleSignOut = async () => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Sign Out", 
          style: "destructive",
          onPress: async () => {
            const { error } = await logOut();
            if (error) {
              Alert.alert('Error', 'Failed to sign out. Please try again.');
            } else {
              router.replace('/');
            }
          }
        }
      ]
    );
  };
  
  const sections: ProfileSection[] = [
    {
      title: 'Wallet',
      data: [
        { id: 'manage-cards', title: 'Manage Cards', icon: 'card-outline', onPress: () => router.push('/(tabs)/profile/manage_cards') },
      ],
    },
    {
      title: 'Notifications',
      data: [
        { id: 'preferences', title: 'Preferences', icon: 'notifications-outline', onPress: () => router.push('/(tabs)/profile/notifications') },
      ],
    },
    {
      title: 'Support',
      data: [
        { id: 'help-faq', title: 'Help & FAQ', icon: 'help-circle-outline', onPress: () => router.push('/(tabs)/profile/help-faq') },
      ],
      footer: 'Get help with your account, cards, and more.',
    },
  ];

  const renderItem = ({ item, index, section }: SectionListRenderItemInfo<ProfileRow, ProfileSection>) => {
    const isFirstItem = index === 0;
    const isLastItem = index === section.data.length - 1;

    const rowStyle: StyleProp<ViewStyle> = [styles.row];
    if (isFirstItem && isLastItem) {
      rowStyle.push(styles.rowSingle);
    } else if (isFirstItem) {
      rowStyle.push(styles.rowFirst);
    } else if (isLastItem) {
      rowStyle.push(styles.rowLast);
    }

    return (
      <TouchableOpacity style={rowStyle} onPress={item.onPress}>
        {item.icon && (
          <Ionicons 
            name={item.icon} 
            size={22} 
            color={Colors.light.secondaryAccent} 
            style={styles.icon}
          />
        )}
        <Text style={[
          styles.rowText,
          item.isDestructive && styles.destructiveText
        ]}>
          {item.title}
        </Text>
        <Ionicons 
          name="chevron-forward" 
          size={20} 
          color={Colors.light.secondaryLabel} 
          style={styles.chevron} 
        />
      </TouchableOpacity>
    );
  };

  const renderSectionHeader = ({ section }: { section: ProfileSection }) => (
    <Text style={styles.sectionHeader}>{section.title}</Text>
  );

  const renderSectionFooter = ({ section }: { section: ProfileSection }) => (
    section.footer ? <Text style={styles.sectionFooter}>{section.footer}</Text> : null
  );

  // Extract first and last name from email (temporary, should come from user profile)
  const name = user?.email ? user.email.split('@')[0].split('.').map(
    word => word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ') : 'User';

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ProfileHeader
        name={name}
        email={user?.email || ''}
        onPress={() => router.push('/(tabs)/profile/edit-profile')}
      />
      
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        renderSectionFooter={renderSectionFooter}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={styles.listContent}
        stickySectionHeadersEnabled={false}
        ListFooterComponent={() => (
          <TouchableOpacity 
            style={styles.signOutButton} 
            onPress={handleSignOut}
          >
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.systemGroupedBackground,
  },
  listContent: {
    paddingHorizontal: 16,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.light.secondaryLabel,
    textTransform: 'uppercase',
    marginTop: 24,
    marginBottom: 8,
    marginLeft: 16,
  },
  sectionFooter: {
    fontSize: 13,
    color: Colors.light.secondaryLabel,
    marginTop: 8,
    marginBottom: 16,
    marginLeft: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.background,
    paddingHorizontal: 16,
    height: 44,
  },
  rowSingle: {
    borderRadius: 13,
  },
  rowFirst: {
    borderTopLeftRadius: 13,
    borderTopRightRadius: 13,
  },
  rowLast: {
    borderBottomLeftRadius: 13,
    borderBottomRightRadius: 13,
  },
  icon: {
    marginRight: 16,
    width: 24,
  },
  rowText: {
    fontSize: 17,
    color: Colors.light.text,
    flex: 1,
  },
  destructiveText: {
    color: Colors.light.error,
  },
  chevron: {
    marginLeft: 'auto',
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.light.separator,
    marginLeft: 56,
  },
  signOutButton: {
    backgroundColor: Colors.light.background,
    marginTop: 32,
    marginHorizontal: 16,
    height: 44,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  signOutText: {
    fontSize: 17,
    color: Colors.light.error,
    fontWeight: '600',
  },
});

export default ProfileScreen; 