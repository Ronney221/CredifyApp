import '@testing-library/jest-native/extend-expect';

// Mock Alert
jest.mock('react-native/Libraries/Alert/Alert', () => ({
  alert: jest.fn(),
}));

// Mock Haptics
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: {
    Light: 'light',
    Medium: 'medium',
  },
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

// Mock React Native components that need special handling
jest.mock('react-native/Libraries/Components/Touchable/TouchableOpacity', () => {
  const { TouchableOpacity } = jest.requireActual('react-native');
  return TouchableOpacity;
});

// Add test IDs to components that need them
jest.mock('../../app/components/home/PerkActionModal', () => {
  const ActualComponent = jest.requireActual('../../app/components/home/PerkActionModal').default;
  return function MockPerkActionModal(props: any) {
    return <ActualComponent {...props} testID="perk-action-modal" />;
  };
});

// Mock supabase client
jest.mock('../lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockReturnThis(),
    })),
  },
})); 