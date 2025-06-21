import { useAuth } from '../contexts/AuthContext';
import { useState, useEffect, useCallback } from 'react';
import { getAutoRedemptions } from '../lib/database';

interface AutoRedemption {
  id: string;
  perk_id: string;
  user_card_id: string;
  is_enabled: boolean;
  perk_definitions: {
    name: string;
    value: number;
  };
  user_credit_cards: {
    card_name: string;
    card_brand: string;
  };
}

export function useAutoRedemptions() {
  const { user } = useAuth();
  const [autoRedemptions, setAutoRedemptions] = useState<AutoRedemption[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadAutoRedemptions = useCallback(async () => {
    if (!user) {
      console.log('[useAutoRedemptions] No user, clearing auto-redemptions');
      setAutoRedemptions([]);
      setIsLoading(false);
      return;
    }

    try {
      console.log(`[useAutoRedemptions] Loading auto-redemptions for user: ${user.id}`);
      setIsLoading(true);
      const { data, error } = await getAutoRedemptions(user.id);
      
      if (error) {
        console.error('[useAutoRedemptions] Error loading auto-redemptions:', error);
        setAutoRedemptions([]);
      } else {
        console.log(`[useAutoRedemptions] Successfully loaded ${data?.length || 0} auto-redemptions:`, 
          data?.map(ar => ({
            perkName: ar.perk_definitions?.name,
            cardName: ar.user_credit_cards?.card_name,
            isEnabled: ar.is_enabled
          }))
        );
        setAutoRedemptions(data || []);
      }
    } catch (error) {
      console.error('[useAutoRedemptions] Unexpected error loading auto-redemptions:', error);
      setAutoRedemptions([]);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadAutoRedemptions();
  }, [loadAutoRedemptions]);

  const isAutoRedeemed = useCallback((perkDefinitionId: string, userCardId?: string) => {
    return autoRedemptions.some(ar => 
      ar.perk_id === perkDefinitionId && 
      (userCardId ? ar.user_card_id === userCardId : true) &&
      ar.is_enabled
    );
  }, [autoRedemptions]);

  const getAutoRedemptionByPerkName = useCallback((perkName: string) => {
    return autoRedemptions.find(ar => 
      ar.perk_definitions?.name === perkName && ar.is_enabled
    );
  }, [autoRedemptions]);

  return {
    autoRedemptions,
    isLoading,
    isAutoRedeemed,
    getAutoRedemptionByPerkName,
    refreshAutoRedemptions: loadAutoRedemptions,
  };
} 