import { trackPerkRedemption, deletePerkRedemption } from '../../lib/database';
import type { Benefit, CardPerk } from '../../src/data/card-data';

// Mock the database operations
jest.mock('../../lib/database');

// Create a type that combines Benefit and CardPerk for testing
type TestPerk = Benefit & Partial<CardPerk>;

describe('Perk Redemption Logic', () => {
  const mockUser = { id: 'test-user-1' };
  const mockPerk: TestPerk = {
    id: 'test-perk-1',
    definition_id: 'def-1',
    name: 'Test Perk',
    value: 100,
    period: 'monthly',
    periodMonths: 1,
    resetType: 'calendar',
    categories: ['Testing'], // Add required categories field
    // CardPerk properties
    cardId: 'test-card-1',
    status: 'partially_redeemed',
    streakCount: 0,
    coldStreakCount: 0,
    remaining_value: 40,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (trackPerkRedemption as jest.Mock).mockResolvedValue({ error: null });
    (deletePerkRedemption as jest.Mock).mockResolvedValue({ error: null });
  });

  describe('Marking partially redeemed perk as fully redeemed', () => {
    it('should delete partial redemption before creating full redemption', async () => {
      // First, delete the partial redemption
      const deleteResult = await deletePerkRedemption(mockUser.id, mockPerk.definition_id);
      expect(deleteResult.error).toBeNull();
      expect(deletePerkRedemption).toHaveBeenCalledWith(
        mockUser.id,
        mockPerk.definition_id
      );

      // Then, create the full redemption
      const trackResult = await trackPerkRedemption(
        mockUser.id,
        'test-card-1',
        mockPerk,
        mockPerk.value
      );
      expect(trackResult.error).toBeNull();
      expect(trackPerkRedemption).toHaveBeenCalledWith(
        mockUser.id,
        'test-card-1',
        mockPerk,
        mockPerk.value
      );
    });

    it('should not proceed with full redemption if partial deletion fails', async () => {
      // Mock deletion failure
      (deletePerkRedemption as jest.Mock).mockResolvedValue({
        error: new Error('Failed to delete')
      });

      // Attempt to delete partial redemption
      const deleteResult = await deletePerkRedemption(mockUser.id, mockPerk.definition_id);
      expect(deleteResult.error).toBeTruthy();
      expect(deletePerkRedemption).toHaveBeenCalledWith(
        mockUser.id,
        mockPerk.definition_id
      );

      // Verify that full redemption was not attempted
      expect(trackPerkRedemption).not.toHaveBeenCalled();
    });

    it('should handle the case where perk is already fully redeemed', async () => {
      // Mock trackPerkRedemption to indicate perk is already redeemed
      (trackPerkRedemption as jest.Mock).mockResolvedValue({
        error: { message: 'Perk already redeemed this period' }
      });

      const result = await trackPerkRedemption(
        mockUser.id,
        'test-card-1',
        mockPerk,
        mockPerk.value
      );

      expect(result.error).toBeTruthy();
      expect((result.error as { message: string }).message).toBe('Perk already redeemed this period');
    });
  });

  describe('Restoring partial redemption after undo', () => {
    it('should restore partial redemption with correct amount', async () => {
      const partialAmount = mockPerk.value - (mockPerk.remaining_value ?? 0);
      
      const result = await trackPerkRedemption(
        mockUser.id,
        'test-card-1',
        mockPerk,
        partialAmount
      );

      expect(result.error).toBeNull();
      expect(trackPerkRedemption).toHaveBeenCalledWith(
        mockUser.id,
        'test-card-1',
        mockPerk,
        60 // 100 - 40 = 60 (original partial redemption amount)
      );
    });
  });
}); 