import Fuse from 'fuse.js';

// --- TYPE DEFINITIONS for our minified data ---
export interface MinifiedPerk {
  i: string; // The original perk ID (e.g., 'platinum_uber_cash')
  n: string;
  rv: number;
  s: 'a' | 'p' | 'r';
  e: string | null;
  c: string[];
}

export interface MinifiedCard {
  cn: string;
  p: MinifiedPerk[];
}

// --- 1. THE ENRICHED KNOWLEDGE BASE ---
// This is the brain of our local search.
const ENRICHED_KNOWLEDGE_BASE = {
  platinum_uber_cash: ['uber', 'eats', 'ride', 'taxi', 'airport', 'transportation', 'delivery', 'takeout', 'dining', 'food'],
  platinum_digital_ent: ['disney', 'hulu', 'espn', 'peacock', 'nytimes', 'wsj', 'streaming', 'movie', 'show', 'series', 'subscription', 'bill', 'entertainment', 'digital', 'news'],
  platinum_walmart_plus: ['walmart', 'w+', 'plus', 'grocery', 'shopping', 'delivery'],
  platinum_equinox: ['equinox', 'gym', 'fitness', 'wellness', 'lifestyle', 'workout', 'health'],
  platinum_saks: ['saks', 'fifth', 'avenue', 'shopping', 'retail', 'clothes', 'fashion', 'apparel', 'luxury', 'department store'],
  platinum_clear: ['clear', 'airport', 'security', 'travel', 'flights', 'tsa'],
  platinum_airline_fee: ['airline', 'fee', 'travel', 'flights', 'baggage', 'seat', 'upgrade', 'incidental'],
  platinum_hotel_credit: ['hotel', 'fhr', 'thc', 'travel', 'lodging', 'amex travel', 'stay', 'trip', 'vacation', 'booking', 'international', 'resort'],
  amex_gold_uber: ['uber', 'ride', 'taxi', 'eats', 'food delivery', 'transportation', 'dining', 'food'],
  amex_gold_grubhub: ['grubhub', 'seamless', 'cheesecake factory', 'goldbelly', 'wine.com', 'resy', 'dining', 'food', 'meal', 'lunch', 'dinner', 'takeout'],
  amex_gold_resy: ['resy', 'dining', 'restaurant', 'food', 'meal', 'lunch', 'dinner'],
  amex_gold_dunkin: ["dunkin'", 'dunkin', 'donuts', 'coffee', 'dining', 'breakfast'],
  csr_the_edit_credit_h1: ['hotel', 'lodging', 'travel', 'chase travel', 'the edit', 'stay', 'trip', 'vacation', 'booking', 'resort'],
  csr_dining_credit_h1: ['dining', 'opentable', 'exclusive tables', 'restaurant', 'food', 'meal', 'lunch', 'dinner', 'anniversary'],
  csr_stubhub_credit_h1: ['stubhub', 'viagogo', 'tickets', 'events', 'concerts', 'entertainment', 'show', 'sports'],
  csr_doordash_restaurant: ['doordash', 'dining', 'restaurant', 'food delivery', 'takeout', 'meal'],
  csr_doordash_non_restaurant_1: ['doordash', 'grocery', 'retail', 'convenience', 'shopping', 'delivery'],
  csr_doordash_non_restaurant_2: ['doordash', 'grocery', 'retail', 'convenience', 'shopping', 'delivery'],
  csr_peloton_credit: ['peloton', 'fitness', 'wellness', 'lifestyle', 'gym', 'workout', 'health', 'subscription'],
  csr_lyft: ['lyft', 'ride', 'taxi', 'transportation', 'airport'],
  csr_apple_subscriptions: ['apple', 'tv', 'music', 'entertainment', 'lifestyle', 'subscription', 'streaming', 'show', 'movie'],
  csp_hotel: ['hotel', 'lodging', 'travel', 'chase travel', 'stay', 'trip', 'vacation', 'booking', 'resort'],
  csp_doordash_grocery: ['doordash', 'grocery', 'convenience', 'shopping', 'delivery'],
  brilliant_dining: ['marriott', 'dining', 'restaurant', 'food', 'meal', 'lunch', 'dinner', 'anniversary', 'breakfast', 'takeout'],
  aspire_flight_credit: ['flight', 'airline', 'travel', 'airfare', 'ticket'],
  venturex_travel_credit: ['travel', 'capital one travel', 'flights', 'hotels', 'cars', 'airfare', 'lodging', 'rental'],
  venturex_anniversary: ['miles', 'bonus', 'travel', 'rewards', 'points', 'anniversary'],
  bcp_disney_bundle: ['disney', 'hulu', 'espn', 'bundle', 'streaming', 'entertainment', 'bill', 'subscription', 'movie', 'show'],
  delta_resy: ['resy', 'dining', 'restaurant', 'food', 'meal', 'lunch', 'dinner'],
  green_clear: ['clear', 'airport', 'security', 'travel', 'flights', 'tsa'],
  boa_pr_airline_incidental: ['airline', 'incidental', 'fee', 'travel', 'flights', 'baggage', 'seat', 'upgrade'],
  boa_pre_airline_incidental: ['airline', 'incidental', 'fee', 'travel', 'flights', 'baggage', 'seat', 'upgrade'],
  boa_pre_lifestyle: ['lifestyle', 'ride-hailing', 'uber', 'lyft', 'streaming', 'food delivery', 'fitness', 'gym', 'dining', 'shopping', 'transportation', 'subscription'],
  usb_ar_travel_dining: ['travel', 'dining', 'airline', 'hotel', 'rental car', 'taxi', 'restaurant', 'takeout', 'food delivery', 'food', 'trip', 'flight', 'stay'],
  citi_prestige_travel: ['travel', 'flight', 'hotel', 'agency', 'parking', 'uber', 'lyft', 'trip', 'vacation', 'airfare', 'lodging'],
};

// --- 2. FUSE.JS INITIALIZATION ---
// Convert the knowledge base into a searchable array.
const searchablePerks = Object.keys(ENRICHED_KNOWLEDGE_BASE).map(perkId => ({
  id: perkId,
  keywords: ENRICHED_KNOWLEDGE_BASE[perkId as keyof typeof ENRICHED_KNOWLEDGE_BASE]
}));

// Initialize Fuse. This only happens once when the app starts.
const fuse = new Fuse(searchablePerks, {
  keys: ['keywords'],
  includeScore: true,
  threshold: 0.4, // Looseness of the search. 0.0 is a perfect match.
});


// --- 3. THE EXPORTED PRE-FILTERING FUNCTION ---
/**
 * Pre-filters perks using fuzzy search BEFORE calling the AI.
 * @param query The user's raw query string.
 * @param allUserCards The user's full list of cards with minified perks.
 * @returns A filtered list of cards containing only perks relevant to the query.
 */
export function getRelevantPerks(query: string, allUserCards: MinifiedCard[]): MinifiedCard[] {
  console.log('[PERK-MATCHER] Starting pre-filtering for query:', query);
  
  // Use Fuse to search the query against our local knowledge base
  const results = fuse.search(query);
  console.log('[PERK-MATCHER] Fuse search results (top 5):', JSON.stringify(results.slice(0, 5).map(r => ({id: r.item.id, score: r.score?.toFixed(4)})), null, 2));

  // If Fuse returns no results, we can stop early.
  if (results.length === 0) {
    console.log('[PERK-MATCHER] No relevant perks found in knowledge base.');
    return [];
  }

  // Get the IDs of the top matching perks. We use a Set for efficiency.
  const relevantPerkIds = new Set(results.map(result => result.item.id));
  console.log('[PERK-MATCHER] Found relevant perk IDs:', Array.from(relevantPerkIds));

  const filteredCards: MinifiedCard[] = [];

  for (const card of allUserCards) {
    // Filter the perks on this card to only include ones that are both relevant AND available/partial.
    const relevantOwnedPerks = card.p.filter(perk =>
      relevantPerkIds.has(perk.i) && (perk.s === 'a' || perk.s === 'p')
    );

    // If we found any relevant perks on this card, add it to our list for the AI.
    if (relevantOwnedPerks.length > 0) {
      console.log(`[PERK-MATCHER] Found ${relevantOwnedPerks.length} relevant perk(s) on card: ${card.cn}`);
      filteredCards.push({
        cn: card.cn,
        p: relevantOwnedPerks
      });
    }
  }
  
  console.log('[PERK-MATCHER] Pre-filtering complete. Sending', filteredCards.length, 'cards to the AI.');
  return filteredCards;
} 