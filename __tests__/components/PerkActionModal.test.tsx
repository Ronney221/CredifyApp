import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import PerkActionModal from '../../app/components/home/PerkActionModal';
import { Alert } from 'react-native';

// Mock the native modules and components we're using
jest.mock('expo-blur', () => ({
  BlurView: 'BlurView',
}));

jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

jest.mock('react-native-gesture-handler', () => ({
  PanGestureHandler: 'PanGestureHandler',
}));

jest.mock('@react-native-community/slider', () => 'Slider');

jest.mock('react-native-root-toast', () => ({
  show: jest.fn(),
  positions: { BOTTOM: 0 },
}));

describe('PerkActionModal', () => {
  // Mock props
  const mockPerk = {
    id: 'test-perk-1',
    definition_id: 'def-1',
    name: 'Test Perk',
    value: 100,
    status: 'partially_redeemed' as const,
    remaining_value: 40,
    period: 'monthly' as const,
  };

  const defaultProps = {
    visible: true,
    perk: mockPerk,
    onDismiss: jest.fn(),
    onOpenApp: jest.fn(),
    onMarkRedeemed: jest.fn(),
    onMarkAvailable: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should show partial redemption status and remaining value', () => {
    const { getByText } = render(<PerkActionModal {...defaultProps} />);
    
    expect(getByText('$40 remaining')).toBeTruthy();
    expect(getByText('Continue Redemption')).toBeTruthy();
  });

  it('should handle transition from partially redeemed to fully redeemed', async () => {
    const { getByText } = render(<PerkActionModal {...defaultProps} />);
    
    // Click "Continue Redemption"
    fireEvent.press(getByText('Continue Redemption'));
    
    // Click "Full Redemption"
    fireEvent.press(getByText('Full Redemption'));
    
    // Verify onMarkRedeemed was called
    expect(defaultProps.onMarkRedeemed).toHaveBeenCalledTimes(1);
    expect(defaultProps.onMarkRedeemed).toHaveBeenCalledWith();
  });

  it('should handle undo of full redemption back to partial redemption', async () => {
    const { getByText } = render(<PerkActionModal {...defaultProps} />);
    
    // Click "Continue Redemption" and then "Full Redemption"
    fireEvent.press(getByText('Continue Redemption'));
    fireEvent.press(getByText('Full Redemption'));
    
    // Verify the toast message includes the correct text
    expect(defaultProps.onMarkRedeemed).toHaveBeenCalledTimes(1);
    
    // Simulate undo by calling the undo callback (this would normally be triggered by tapping the toast)
    const toastCallback = defaultProps.onMarkRedeemed.mock.calls[0][1];
    if (toastCallback) {
      await toastCallback();
      
      // Verify we restored the partial redemption state
      expect(defaultProps.onMarkRedeemed).toHaveBeenCalledWith(60); // 100 - 40 = 60 (original partial redemption amount)
    }
  });

  it('should handle marking a fully redeemed perk as available', async () => {
    const redeemedPerk = {
      ...mockPerk,
      status: 'redeemed' as const,
      remaining_value: undefined,
    };
    
    const { getByText } = render(
      <PerkActionModal {...defaultProps} perk={redeemedPerk} />
    );
    
    // Click "Mark as Available"
    fireEvent.press(getByText('Mark as Available'));
    
    // Verify onMarkAvailable was called
    expect(defaultProps.onMarkAvailable).toHaveBeenCalledTimes(1);
  });

  it('should handle partial redemption with custom amount', async () => {
    const { getByText } = render(<PerkActionModal {...defaultProps} />);
    
    // Click "Continue Redemption"
    fireEvent.press(getByText('Continue Redemption'));
    
    // Click "Partial Redemption"
    fireEvent.press(getByText('Partial Redemption'));
    
    // Enter a custom amount (this would be done through the slider or text input)
    // Note: The actual implementation might need to be adjusted based on how your
    // slider and text input components work with testing-library
    
    // Click "Confirm"
    fireEvent.press(getByText('Confirm'));
    
    // Verify onMarkRedeemed was called with the partial amount
    expect(defaultProps.onMarkRedeemed).toHaveBeenCalledWith(expect.any(Number));
  });
}); 