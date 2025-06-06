import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  TouchableOpacity,
  Alert,
  SectionListData,
  SectionListRenderItemInfo,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { Colors } from '../../constants/Colors';
import { PageHeader } from '../components/cards'; // Reusing PageHeader

interface ProfileRow {
  id: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  iconBackgroundColor: string;
  onPress: () => void;
  color?: string;
}

interface ProfileSection extends SectionListData<ProfileRow> {
  title: string;
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
      title: 'Account',
      data: [
        { id: 'edit-profile', title: 'Edit Profile', icon: 'person-outline', iconColor: '#fff', iconBackgroundColor: '#007AFF', onPress: () => router.push('/(tabs)/profile/edit-profile') },
        { id: 'sign-out', title: 'Sign Out', icon: 'log-out-outline', iconColor: '#fff', iconBackgroundColor: '#FF3B30', onPress: handleSignOut, color: '#FF3B30' },
      ],
    },
    {
      title: 'Wallet',
      data: [
        { id: 'manage-cards', title: 'Manage Cards', icon: 'card-outline', iconColor: '#fff', iconBackgroundColor: '#34C759', onPress: () => router.push('/(tabs)/profile/manage_cards') },
      ],
    },
    {
      title: 'Notifications',
      data: [
        { id: 'preferences', title: 'Preferences', icon: 'notifications-outline', iconColor: '#fff', iconBackgroundColor: '#FF9500', onPress: () => router.push('/(tabs)/profile/notifications') },
      ],
    },
    {
      title: 'Support',
      data: [
        { id: 'help-faq', title: 'Help & FAQ', icon: 'help-circle-outline', iconColor: '#fff', iconBackgroundColor: '#5856D6', onPress: () => router.push('/(tabs)/profile/help-faq') },
      ],
    },
  ];

  const renderItem = ({ item, index, section }: SectionListRenderItemInfo<ProfileRow>) => {
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
        <View style={[styles.iconContainer, { backgroundColor: item.iconBackgroundColor }]}>
          <Ionicons name={item.icon} size={18} color={item.iconColor} />
        </View>
        <Text style={[styles.rowText, { color: item.color || Colors.light.text }]}>
          {item.title}
        </Text>
        {item.id !== 'sign-out' && (
          <Ionicons name="chevron-forward" size={20} color={'#C7C7CC'} style={styles.chevron} />
        )}
      </TouchableOpacity>
    );
  };

  const renderSectionHeader = ({ section }: { section: SectionListData<ProfileRow> }) => (
    <Text style={styles.sectionHeader}>{(section as ProfileSection).title}</Text>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <PageHeader 
        title="Profile"
        subtitle={`Signed in as ${user?.email || ''}`}
      />
      <SectionList
        sections={sections}
        keyExtractor={(item, index) => item.id + index}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        ItemSeparatorComponent={({ leadingItem, section }) => 
          section.data.indexOf(leadingItem) === section.data.length - 1 ? null : <View style={styles.separator} />
        }
        contentContainerStyle={styles.listContent}
        stickySectionHeadersEnabled={false}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f2f2f7',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '400',
    color: '#6D6D72',
    textTransform: 'uppercase',
    marginTop: 35,
    marginBottom: 10,
    paddingHorizontal: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    height: 44,
  },
  rowSingle: {
    borderRadius: 10,
  },
  rowFirst: {
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  rowLast: {
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
  },
  iconContainer: {
    width: 28,
    height: 28,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  rowText: {
    fontSize: 17,
    flex: 1,
  },
  chevron: {
    marginLeft: 'auto',
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#C8C7CC',
    marginLeft: 60, // icon width + margins
  },
});

export default ProfileScreen; 