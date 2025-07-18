import { useMemo } from 'react';
import { Card } from '../../../src/data/card-data';

const FREQUENTLY_OWNED_IDS = [
  'chase_sapphire_preferred',
  'amex_gold',
  'blue_cash_preferred',
  'chase_sapphire_reserve',
  'amex_platinum',
  'capital_one_venture_x',
  'boa_premium_rewards',
];

const ISSUER_ORDER = [
  "American Express",
  "Bank of America",
  "Capital One",
  "Chase",
];

function getIssuer(card: Card): string {
  const id = card.id.toLowerCase();
  const name = card.name.toLowerCase();

  if (id.startsWith('amex_') || id.startsWith('blue_cash_') || id.startsWith('delta_') || name.includes('(amex)') || name.includes('american express')) return "American Express";
  if (id.startsWith('chase_')) return "Chase";
  if (id.startsWith('boa_')) return "Bank of America";
  if (id.startsWith('capital_one_')) return "Capital One";
  if (id.startsWith('citi_')) return "Citi";
  if (id.startsWith('usb_')) return "U.S. Bank";
  if (id.startsWith('marriott_')) return "Marriott";
  if (id.startsWith('hilton_')) return "Hilton";
  
  return "Other";
}

export function useGroupedCards(allCards: Card[]) {
  const groupedCards = useMemo(() => {
    if (!allCards || allCards.length === 0) {
      return { frequentlyOwned: [], allCardsByIssuer: {} };
    }

    console.log('[useGroupedCards] Recalculating grouped cards...');
    // --- Data Preparation ---
    const frequentlyOwnedIdsSet = new Set(FREQUENTLY_OWNED_IDS);

    // Group all cards by their issuer in a single pass.
    const allCardsGroupedByIssuer = allCards.reduce((acc, card) => {
      const issuer = getIssuer(card);
      if (!acc[issuer]) {
        acc[issuer] = [];
      }
      acc[issuer].push(card);
      return acc;
    }, {} as { [key: string]: Card[] });

    // --- Section 1: Frequently Owned (Top Section) ---
    const frequentlyOwned = FREQUENTLY_OWNED_IDS
      .map(id => allCards.find(c => c.id === id))
      .filter((c): c is Card => c !== undefined);

    // --- Section 2: All Other Cards (Grouped and Sorted) ---
    // Start with the main issuers in their defined order.
    const allCardsByIssuer: { [key: string]: Card[] } = {};
    
    ISSUER_ORDER.forEach(issuerName => {
      const cards = allCardsGroupedByIssuer[issuerName];
      if (cards && cards.length > 0) {
        // Filter out any cards that might have been shown in "Frequently Owned"
        const remaining = cards.filter(c => !frequentlyOwnedIdsSet.has(c.id));
        if (remaining.length > 0) {
          allCardsByIssuer[issuerName] = remaining.sort((a, b) => a.name.localeCompare(b.name));
        }
      }
    });

    // Get the names of all issuers we've already processed.
    const processedIssuers = new Set([...ISSUER_ORDER, ...frequentlyOwned.map(getIssuer)]);
    
    // Process the rest of the issuers, sorted alphabetically.
    Object.keys(allCardsGroupedByIssuer)
      .sort()
      .forEach(issuerName => {
        if (!processedIssuers.has(issuerName)) {
          const remaining = allCardsGroupedByIssuer[issuerName].filter(c => !frequentlyOwnedIdsSet.has(c.id));
          if (remaining.length > 0) {
            allCardsByIssuer[issuerName] = remaining.sort((a, b) => a.name.localeCompare(b.name));
          }
        }
      });
      
    console.log('[useGroupedCards] Grouping complete.');
    return { frequentlyOwned, allCardsByIssuer };
  }, [allCards]);

  return groupedCards;
} 