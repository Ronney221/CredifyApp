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
  platinum_uber_cash: ["uber", "ride", "taxi", "eats", "food delivery", "airport transport", "transportation", "dining"],
  platinum_digital_ent: ["disney", "hulu", "espn", "peacock", "nytimes", "wsj", "streaming", "movie", "bill", "entertainment"],
  platinum_walmart_plus: ["walmart", "w+", "grocery", "shopping"],
  platinum_equinox: ['equinox', 'gym', 'fitness', 'wellness', 'lifestyle', 'workout', 'health'],
  platinum_saks: ["saks", "clothes", "shopping", "fashion", "apparel", "luxury", "clothing"],
  platinum_clear: ['clear', 'airport security', 'travel', 'flights', 'tsa'],
  platinum_airline_fee: ["airline", "flight", "checked bag", "seat upgrade", "travel", "airfare"],
  platinum_hotel_credit: ["hotel", "lodging", "stay", "trip", "vacation", "booking", "international", "resort", "paris", "chicago", "hawaii"],
  amex_gold_uber: ['uber', 'ride', 'taxi', 'eats', 'food delivery', 'airport transport', 'transportation', 'dining', 'food'],
  amex_gold_grubhub: ["grubhub", "seamless", "takeout", "food", "dining", "lunch", "dinner", "anniversary", "cheesecake factory", "goldbelly", "wine.com", "resy", "hungry"],
  amex_gold_resy: ['resy', 'dining', 'restaurant', 'food', 'meal', 'lunch', 'dinner'],
  amex_gold_dunkin: ["dunkin'", 'dunkin', 'donuts', 'coffee', 'dining', 'breakfast'],
  csr_the_edit_credit_h1: ['hotel', 'lodging', 'travel', 'chase travel', 'the edit', 'stay', 'trip', 'vacation', 'booking', 'resort'],
  csr_dining_credit_h1: ['dining', 'opentable', 'exclusive tables', 'restaurant', 'food', 'meal', 'lunch', 'dinner', 'anniversary'],
  csr_stubhub_credit_h1: ['stubhub', 'viagogo', 'tickets', 'events', 'concerts', 'entertainment', 'show', 'sports'],
  csr_doordash_restaurant: ['doordash', 'dining', 'restaurant', 'food delivery', 'takeout', 'meal'],
  csr_doordash_non_restaurant_1: ['doordash', 'grocery', 'retail', 'convenience', 'shopping', 'delivery'],
  csr_doordash_non_restaurant_2: ['doordash', 'grocery', 'retail', 'convenience', 'shopping', 'delivery'],
  csr_peloton_credit: ['peloton', 'fitness', 'wellness', 'lifestyle', 'gym', 'workout', 'health', 'subscription'],
  csr_lyft: ['lyft', 'ride', 'taxi', 'transportation', 'airport transport'],
  csr_apple_subscriptions: ['apple', 'tv', 'music', 'entertainment', 'lifestyle', 'subscription', 'streaming', 'show', 'movie'],
  csp_hotel: ['hotel', 'lodging', 'travel', 'chase travel', 'stay', 'trip', 'vacation', 'booking', 'resort'],
  csp_doordash_grocery: ['doordash', 'grocery', 'convenience', 'shopping', 'delivery', 'dashmart'],
  brilliant_dining: ['marriott', 'dining', 'restaurant', 'food', 'meal', 'lunch', 'dinner', 'anniversary', 'breakfast', 'takeout', 'hungry'],
  aspire_flight_credit: ['flight', 'airline', 'travel', 'airfare', 'ticket'],
  venturex_travel_credit: ['travel', 'capital one travel', 'flights', 'hotels', 'cars', 'airfare', 'lodging', 'rental'],
  venturex_anniversary: ['miles', 'bonus', 'travel', 'rewards', 'points', 'anniversary'],
  bcp_disney_bundle: ['disney', 'hulu', 'espn', 'bundle', 'streaming', 'entertainment', 'bill', 'subscription', 'movie', 'show'],
  delta_resy: ['resy', 'dining', 'restaurant', 'food', 'meal', 'lunch', 'dinner'],
  green_clear: ['clear', 'airport', 'security', 'travel', 'flights', 'tsa'],
  boa_pr_airline_incidental: ['airline', 'incidental', 'fee', 'travel', 'flights', 'baggage', 'seat', 'upgrade'],
  boa_pre_airline_incidental: ['airline', 'incidental', 'fee', 'travel', 'flights', 'baggage', 'seat', 'upgrade'],
  boa_pre_lifestyle: ['lifestyle', 'ride-hailing', 'uber', 'lyft', 'streaming', 'food delivery', 'fitness', 'gym', 'dining', 'shopping', 'transportation', 'subscription'],
  usb_ar_travel_dining: ['travel', 'dining', 'airline', 'hotel', 'rental car', 'taxi', 'restaurant', 'takeout', 'food delivery', 'food', 'trip', 'flight', 'stay', 'hungry'],
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
  threshold: 0.2, // Stricter threshold to avoid false positives
});

// A list of common words to ignore during search to reduce noise.
const STOP_WORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'being', 'been',
  'i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves',
  'you', 'your', 'yours', 'yourself', 'yourselves',
  'he', 'him', 'his', 'himself', 'she', 'her', 'hers', 'herself',
  'it', 'its', 'itself', 'they', 'them', 'their', 'theirs', 'themselves',
  'what', 'which', 'who', 'whom', 'this', 'that', 'these', 'those',
  'am', 'do', 'does', 'did', 'doing', 'have', 'has', 'had', 'having',
  'and', 'but', 'if', 'or', 'because', 'as', 'until', 'while',
  'of', 'at', 'by', 'for', 'with', 'about', 'against', 'between',
  'into', 'through', 'during', 'before', 'after', 'above', 'below',
  'to', 'from', 'up', 'down', 'in', 'out', 'on', 'off', 'over', 'under',
  'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where',
  'why', 'how', 'all', 'any', 'both', 'each', 'few', 'more', 'most',
  'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same',
  'so', 'than', 'too', 'very', 's', 't', 'can', 'will', 'just', 'don',
  'should', 'now', 'need', 'want', 'let', 'lets', 'im', 'ive', 'id',
  'get', 'best', 'nice', 'treat'
]);


// --- 3. THE EXPORTED PRE-FILTERING FUNCTION ---
/**
 * Pre-filters perks using fuzzy search BEFORE calling the AI.
 * @param query The user's raw query string.
 * @param allUserCards The user's full list of cards with minified perks.
 * @returns A filtered list of cards containing only perks relevant to the query.
 */
export function getRelevantPerks(query: string, allUserCards: MinifiedCard[]): MinifiedCard[] {
  console.log('[PERK-MATCHER] Starting pre-filtering for query:', query);
  
  // Tokenize the user's query and filter out stop words.
  const queryKeywords = query.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(k => k.length > 2 && !STOP_WORDS.has(k));
  console.log('[PERK-MATCHER] Tokenized query into keywords (after stop words):', queryKeywords);

  if (queryKeywords.length === 0) {
    console.log('[PERK-MATCHER] No relevant keywords found in query after filtering stop words.');
    return [];
  }

  const relevantPerkIds = new Set<string>();

  // Perform a fuzzy search for EACH keyword and aggregate the results.
  for (const keyword of queryKeywords) {
    const results = fuse.search(keyword);
    if (results.length > 0) {
      console.log(`[PERK-MATCHER] Fuse results for keyword "${keyword}":`, JSON.stringify(results.slice(0, 3).map(r => ({id: r.item.id, score: r.score?.toFixed(4)})), null, 2));
      for (const result of results) {
        // We add the ID of the perk that contained the keyword match
        relevantPerkIds.add(result.item.id);
      }
    }
  }

  // If no keywords matched anything after checking all of them, stop.
  if (relevantPerkIds.size === 0) {
    console.log('[PERK-MATCHER] No relevant perks found in knowledge base for any keywords.');
    return [];
  }

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