import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { ImageSourcePropType } from 'react-native';
import ExpandableCard from '../../components/home/ExpandableCard';
import { Card, CardPerk } from '../../src/data/card-data';
import { trackPerkRedemption, deletePerkRedemption } from '../../lib/database';

// Mock the hooks
jest.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'test-user-1' } })
}));

jest.mock('../../hooks/useAutoRedemptions', () => ({
  useAutoRedemptions: () => ({
    getAutoRedemptionByPerkName: () => null,
    refreshAutoRedemptions: jest.fn()
  })
}));

// Mock expo-haptics
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: {
    Light: 'light',
    Medium: 'medium'
  }
}));

// Mock the image require
jest.mock('../../assets/images/test-image.jpg', () => 'test-image-mock');

// Mock child components to isolate testing on ExpandableCard
jest.mock('../../components/home/expandable-card/CardHeader', () => 'CardHeader');

describe('ExpandableCard Value Tracking', () => {
  // Sample test data
  const mockCard: Card = {
    id: 'test-card-1',
    name: 'Test Card',
    network: 'visa',
    annualFee: 95,
    image: 'test-image-mock' as unknown as ImageSourcePropType,
    benefits: []
  };

  const mockPerks: CardPerk[] = [
    {
      id: 'perk-1',
      definition_id: 'def-1',
      name: 'Monthly Streaming Credit',
      value: 100,
      period: 'annual',
      periodMonths: 12,
      status: 'available',
      cardId: 'test-card-1',
      streakCount: 0,
      coldStreakCount: 0,
      resetType: 'calendar',
      categories: ['testing']
    },
    {
      id: 'perk-2',
      definition_id: 'def-2',
      name: 'Annual Travel Credit',
      value: 200,
      period: 'annual',
      periodMonths: 12,
      status: 'available',
      cardId: 'test-card-1',
      streakCount: 0,
      coldStreakCount: 0,
      resetType: 'calendar',
      categories: ['testing']
    }
  ];

  const defaultProps = {
    card: mockCard,
    perks: mockPerks,
    cumulativeSavedValue: 0,
    onTapPerk: jest.fn(),
    onExpandChange: jest.fn(),
    onPerkStatusChange: jest.fn(),
    setPerkStatus: jest.fn(),
    sortIndex: 0,
    userHasSeenSwipeHint: true,
    onHintDismissed: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (trackPerkRedemption as jest.Mock).mockResolvedValue({ error: null });
    (deletePerkRedemption as jest.Mock).mockResolvedValue({ error: null });
  });

  it('should track full redemption value correctly', async () => {
    const { getByText } = render(<ExpandableCard {...defaultProps} />);
    
    // Expand the card
    fireEvent.press(getByText('Test Card'));

    // Find and swipe the Monthly Streaming Credit perk
    const perk = getByText('Monthly Streaming Credit');
    await act(async () => {
      // Simulate swipe to redeem
      fireEvent(perk, 'swipeableWillOpen', 'left');
      fireEvent(perk, 'swipeableOpen', 'left');
    });

    // Verify the perk status was updated
    expect(defaultProps.setPerkStatus).toHaveBeenCalledWith(
      'test-card-1',
      'perk-1',
      'redeemed'
    );

    // Verify the redemption was tracked with correct value
    expect(trackPerkRedemption).toHaveBeenCalledWith(
      'test-user-1',
      'test-card-1',
      expect.objectContaining({ id: 'perk-1' }),
      100 // Full value
    );
  });

  it('should handle partial redemptions correctly', async () => {
    const partiallyRedeemedPerks: CardPerk[] = [
      {
        ...mockPerks[0],
        status: 'partially_redeemed',
        remaining_value: 40 // $60 already redeemed
      },
      mockPerks[1]
    ];

    const { getByText } = render(
      <ExpandableCard {...defaultProps} perks={partiallyRedeemedPerks} />
    );

    // Expand the card
    fireEvent.press(getByText('Test Card'));

    // Find and swipe the partially redeemed perk to fully redeem it
    const perk = getByText('Monthly Streaming Credit');
    await act(async () => {
      fireEvent(perk, 'swipeableWillOpen', 'left');
      fireEvent(perk, 'swipeableOpen', 'left');
    });

    // Verify the partial redemption was deleted first
    expect(deletePerkRedemption).toHaveBeenCalledWith(
      'test-user-1',
      'def-1'
    );

    // Verify the full redemption was tracked
    expect(trackPerkRedemption).toHaveBeenCalledWith(
      'test-user-1',
      'test-card-1',
      expect.objectContaining({ id: 'perk-1' }),
      100 // Full value
    );
  });

  it('should handle marking redeemed perk as available', async () => {
    const redeemedPerks: CardPerk[] = [
      {
        ...mockPerks[0],
        status: 'redeemed'
      },
      mockPerks[1]
    ];

    const { getByText } = render(
      <ExpandableCard {...defaultProps} perks={redeemedPerks} />
    );

    // Expand the card
    fireEvent.press(getByText('Test Card'));

    // Find and swipe the redeemed perk to mark as available
    const perk = getByText('Monthly Streaming Credit');
    await act(async () => {
      fireEvent(perk, 'swipeableWillOpen', 'right');
      fireEvent(perk, 'swipeableOpen', 'right');
    });

    // Verify the redemption was deleted
    expect(deletePerkRedemption).toHaveBeenCalledWith(
      'test-user-1',
      'def-1'
    );

    // Verify the perk status was updated
    expect(defaultProps.setPerkStatus).toHaveBeenCalledWith(
      'test-card-1',
      'perk-1',
      'available'
    );
  });

  it('should restore partial redemption after undo', async () => {
    const partiallyRedeemedPerks: CardPerk[] = [
      {
        ...mockPerks[0],
        status: 'partially_redeemed',
        remaining_value: 40 // $60 already redeemed
      },
      mockPerks[1]
    ];

    const { getByText } = render(
      <ExpandableCard {...defaultProps} perks={partiallyRedeemedPerks} />
    );

    // Expand the card
    fireEvent.press(getByText('Test Card'));

    // Find and swipe the partially redeemed perk to mark as available
    const perk = getByText('Monthly Streaming Credit');
    await act(async () => {
      fireEvent(perk, 'swipeableWillOpen', 'right');
      fireEvent(perk, 'swipeableOpen', 'right');
    });

    // Verify the partial redemption was deleted
    expect(deletePerkRedemption).toHaveBeenCalledWith(
      'test-user-1',
      'def-1'
    );

    // Simulate undo by calling the undo function from the toast
    // We need to find the last call to trackPerkRedemption and extract the undo function
    const undoFn = (defaultProps.setPerkStatus as jest.Mock).mock.calls[1][2];
    if (undoFn) {
      await act(async () => {
        await undoFn();
      });

      // Verify the partial redemption was restored
      expect(trackPerkRedemption).toHaveBeenCalledWith(
        'test-user-1',
        'test-card-1',
        expect.objectContaining({ id: 'perk-1' }),
        60 // Original partial redemption amount
      );
    }
  });
}); 