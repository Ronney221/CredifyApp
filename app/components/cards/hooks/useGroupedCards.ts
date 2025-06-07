import { useMemo } from 'react';
import { Card, allCards } from '../../../../src/data/card-data';

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

export function useGroupedCards() {
  const groupedCards = useMemo(() => {
    const frequentlyOwnedIdsSet = new Set(FREQUENTLY_OWNED_IDS);
    
    const frequentlyOwned = FREQUENTLY_OWNED_IDS
      .map(id => allCards.find(c => c.id === id))
      .filter((c): c is Card => c !== undefined);
    
    const remainingCards = allCards.filter(c => !frequentlyOwnedIdsSet.has(c.id));
    
    const allRemainingGroups: { [key: string]: Card[] } = {};
    remainingCards.forEach(card => {
      const issuer = getIssuer(card);
      if (!allRemainingGroups[issuer]) {
        allRemainingGroups[issuer] = [];
      }
      allRemainingGroups[issuer].push(card);
    });

    const allCardsByIssuer: { [key: string]: Card[] } = {};
    const mainIssuerSet = new Set(ISSUER_ORDER);
    const otherIssuersList: Card[] = [];
    const nonMainMultiCardIssuers: { [key: string]: Card[] } = {};

    for (const issuerName in allRemainingGroups) {
        const cards = allRemainingGroups[issuerName];
        if (mainIssuerSet.has(issuerName)) {
            continue;
        }
        if (cards.length > 1) {
            nonMainMultiCardIssuers[issuerName] = cards;
        } else {
            otherIssuersList.push(...cards);
        }
    }
    
    ISSUER_ORDER.forEach(issuerName => {
        if (allRemainingGroups[issuerName]) {
            allCardsByIssuer[issuerName] = allRemainingGroups[issuerName].sort((a,b) => a.name.localeCompare(b.name));
        }
    });
    
    Object.keys(nonMainMultiCardIssuers).sort().forEach(issuerName => {
        allCardsByIssuer[issuerName] = nonMainMultiCardIssuers[issuerName].sort((a,b) => a.name.localeCompare(b.name));
    });
    
    if (otherIssuersList.length > 0) {
        allCardsByIssuer["Other Issuers"] = otherIssuersList.sort((a, b) => a.name.localeCompare(b.name));
    }
    
    return { frequentlyOwned, allCardsByIssuer };
  }, []);

  return groupedCards;
} 