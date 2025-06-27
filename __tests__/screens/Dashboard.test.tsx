import { render, fireEvent } from '@testing-library/react-native';
import Dashboard from '../../app/(tabs)/01-dashboard';
import { Alert } from 'react-native';
import { trackPerkRedemption, deletePerkRedemption } from '../../lib/database';

// Mock the database operations
jest.mock('../../lib/database', () => ({
  trackPerkRedemption: jest.fn(),
  deletePerkRedemption: jest.fn(),
}));

// Mock the context providers
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user-1' },
  }),
}));

describe('Dashboard - Perk Redemption Flow', () => {
  const mockPerk = {
    id: 'test-perk-1',
    definition_id: 'def-1',
    name: 'Test Perk',
    value: 100,
    status: 'partially_redeemed' as const,
    remaining_value: 40,
    period: 'monthly' as const,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (trackPerkRedemption as jest.Mock).mockResolvedValue({ error: null });
    (deletePerkRedemption as jest.Mock).mockResolvedValue({ error: null });
  });

  it('should handle marking a partially redeemed perk as fully redeemed', async () => {
    const { getByTestId } = render(<Dashboard />);
    
    // Simulate selecting a perk (you'll need to add testID to your components)
    fireEvent.press(getByTestId('perk-test-perk-1'));
    
    // Verify that deletePerkRedemption was called first
    expect(deletePerkRedemption).toHaveBeenCalledWith(
      'test-user-1',
      'def-1'
    );
    
    // Verify that trackPerkRedemption was called with full value
    expect(trackPerkRedemption).toHaveBeenCalledWith(
      'test-user-1',
      expect.any(String), // cardId
      mockPerk,
      100, // full value
      undefined // no parent redemption for full redemption
    );
  });

  it('should handle errors when deleting partial redemption', async () => {
    // Mock an error response for deletePerkRedemption
    (deletePerkRedemption as jest.Mock).mockResolvedValue({
      error: new Error('Failed to delete partial redemption')
    });
    
    const { getByTestId } = render(<Dashboard />);
    
    // Simulate selecting a perk
    fireEvent.press(getByTestId('perk-test-perk-1'));
    
    // Verify error alert was shown
    expect(Alert.alert).toHaveBeenCalledWith(
      'Error',
      'Failed to update perk redemption.'
    );
    
    // Verify trackPerkRedemption was not called
    expect(trackPerkRedemption).not.toHaveBeenCalled();
  });

  it('should handle errors when tracking full redemption', async () => {
    // Mock successful deletion but failed tracking
    (deletePerkRedemption as jest.Mock).mockResolvedValue({ error: null });
    (trackPerkRedemption as jest.Mock).mockResolvedValue({
      error: new Error('Failed to track redemption')
    });
    
    const { getByTestId } = render(<Dashboard />);
    
    // Simulate selecting a perk
    fireEvent.press(getByTestId('perk-test-perk-1'));
    
    // Verify error alert was shown
    expect(Alert.alert).toHaveBeenCalledWith(
      'Error',
      'Failed to mark perk as redeemed in the database.'
    );
  });

  it('should handle the case where perk is already redeemed', async () => {
    // Mock the error response indicating perk is already redeemed
    (trackPerkRedemption as jest.Mock).mockResolvedValue({
      error: { message: 'Perk already redeemed this period' }
    });
    
    const { getByTestId } = render(<Dashboard />);
    
    // Simulate selecting a perk
    fireEvent.press(getByTestId('perk-test-perk-1'));
    
    // Verify appropriate alert was shown
    expect(Alert.alert).toHaveBeenCalledWith(
      'Already Redeemed',
      'This perk has already been redeemed this month.'
    );
  });
}); 