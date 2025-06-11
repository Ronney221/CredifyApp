import type { Benefit, CardPerk } from '../../src/data/card-data';

export const trackPerkRedemption = jest.fn().mockResolvedValue({ error: null });
export const deletePerkRedemption = jest.fn().mockResolvedValue({ error: null });
export const getPerkRedemptions = jest.fn();
export const setAutoRedemption = jest.fn(); 