/**
 * Merchant Logo Mapping System
 * Maps merchant names to their logo assets with consistent sizing
 */

export const MerchantLogos = {
  // Payment & Financial
  americanexpress: require('../assets/partner_svg/americanexpress.svg'),
  capital_one: require('../assets/partner_svg/capital_one.svg'),
  chase: require('../assets/partner_svg/chase.svg'),
  
  // Travel & Transportation
  delta: require('../assets/partner_svg/delta.svg'),
  hilton: require('../assets/partner_svg/hilton.svg'),
  marriott: require('../assets/partner_svg/marriott.svg'),
  lyft: require('../assets/partner_svg/lyft.svg'),
  uber: require('../assets/partner_svg/uber.svg'),
  clear: require('../assets/partner_svg/clear.svg'),
  
  // Food & Dining
  doordash: require('../assets/partner_svg/doordash.svg'),
  grubhub: require('../assets/partner_svg/grubhub.svg'),
  ubereats: require('../assets/partner_svg/ubereats.svg'),
  dunkin: require('../assets/partner_svg/dunkin.svg'),
  opentable: require('../assets/partner_svg/opentable.svg'),
  resy: require('../assets/partner_svg/resy.svg'),
  
  // Entertainment & Media
  netflix: require('../assets/partner_svg/netflix.svg'),
  applemusic: require('../assets/partner_svg/applemusic.svg'),
  appletv: require('../assets/partner_svg/appletv.svg'),
  newyorktimes: require('../assets/partner_svg/newyorktimes.svg'),
  wall_street_journal: require('../assets/partner_svg/wall-street-journal.svg'),
  stubhub: require('../assets/partner_svg/stubhub.svg'),
  
  // Shopping & Services
  walmart: require('../assets/partner_svg/walmart.svg'),
  saks: require('../assets/partner_svg/saks-fifth-avenue.svg'),
  instacart: require('../assets/partner_svg/instacart.svg'),
  
  // Fitness & Wellness
  peloton: require('../assets/partner_svg/peloton.svg'),
  equinox: require('../assets/partner_svg/equinox-fitness-clubs-seeklogo.svg'),
} as const;

// Logo dimensions configuration for consistent display
export const LogoDimensions = {
  // Standard square logos (1:1 ratio)
  square: {
    width: 32,
    height: 32,
  },
  
  // Wide logos with text (2:1 or wider)
  wide: {
    width: 48,
    height: 24,
  },
  
  // Tall logos (1:2 ratio)
  tall: {
    width: 24,
    height: 32,
  },
  
  // Container size (for consistent spacing)
  container: {
    width: 48,
    height: 32,
  }
} as const;

// Mapping of which logos need special sizing
export const LogoSizeMap: Record<keyof typeof MerchantLogos, keyof typeof LogoDimensions> = {
  // Wide logos (typically with text)
  americanexpress: 'wide',
  capital_one: 'wide',
  wall_street_journal: 'wide',
  newyorktimes: 'wide',
  saks: 'wide',
  equinox: 'wide',
  
  // Square logos (app icons, symbols)
  netflix: 'square',
  uber: 'square',
  lyft: 'square',
  doordash: 'square',
  grubhub: 'square',
  ubereats: 'square',
  instacart: 'square',
  peloton: 'square',
  applemusic: 'square',
  appletv: 'square',
  stubhub: 'square',
  walmart: 'square',
  dunkin: 'square',
  opentable: 'square',
  resy: 'square',
  
  // Standard/default sizing
  chase: 'square',
  delta: 'square',
  hilton: 'square',
  marriott: 'square',
  clear: 'square',
};

// Helper to get merchant logo key from perk name
export const getMerchantLogoKey = (perkName: string): keyof typeof MerchantLogos | null => {
  const lowerName = perkName.toLowerCase();
  
  // Direct mappings
  if (lowerName.includes('uber eats')) return 'ubereats';
  if (lowerName.includes('uber')) return 'uber';
  if (lowerName.includes('doordash')) return 'doordash';
  if (lowerName.includes('grubhub')) return 'grubhub';
  if (lowerName.includes('netflix')) return 'netflix';
  if (lowerName.includes('walmart')) return 'walmart';
  if (lowerName.includes('lyft')) return 'lyft';
  if (lowerName.includes('peloton')) return 'peloton';
  if (lowerName.includes('equinox')) return 'equinox';
  if (lowerName.includes('instacart')) return 'instacart';
  if (lowerName.includes('clear')) return 'clear';
  if (lowerName.includes('dunkin')) return 'dunkin';
  if (lowerName.includes('marriott')) return 'marriott';
  if (lowerName.includes('hilton')) return 'hilton';
  if (lowerName.includes('delta')) return 'delta';
  if (lowerName.includes('saks')) return 'saks';
  if (lowerName.includes('apple music')) return 'applemusic';
  if (lowerName.includes('apple tv')) return 'appletv';
  if (lowerName.includes('resy')) return 'resy';
  if (lowerName.includes('opentable')) return 'opentable';
  if (lowerName.includes('stubhub')) return 'stubhub';
  if (lowerName.includes('new york times') || lowerName.includes('nytimes')) return 'newyorktimes';
  if (lowerName.includes('wall street journal') || lowerName.includes('wsj')) return 'wall_street_journal';
  if (lowerName.includes('capital one')) return 'capital_one';
  if (lowerName.includes('chase')) return 'chase';
  if (lowerName.includes('american express') || lowerName.includes('amex')) return 'americanexpress';
  
  return null;
};