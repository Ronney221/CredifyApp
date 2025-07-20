import { Platform, Linking, Alert , ImageSourcePropType } from 'react-native';

import * as WebBrowser from 'expo-web-browser';
import { logger } from '../../utils/logger';

export interface Benefit {
  id: string;
  name: string;
  value: number; // Can be monetary value or other unit
  period: 'monthly' | 'quarterly' | 'semi_annual' | 'annual' | 'other';
  periodMonths: 1 | 3 | 6 | 12 | 48; // Number of months between resets
  resetType: 'calendar' | 'anniversary'; // Whether benefit resets on calendar year or card anniversary
  definition_id: string;
  description?: string; // Optional detailed description
  redemptionInstructions?: string; // How to redeem, e.g., link, in-app action
  appScheme?: keyof typeof APP_SCHEMES; // Link benefits to app schemes
  eligibleServices?: string[]; // Array of eligible services/merchants for redemption
  categories: string[]; // Explicit categories for AI classification Transportation, Dining, Bills & Utilities, Entertainment, Shopping, Grocery, Fitness, Wellness, Lifestyle, Travel, Flights, Lodging, Coffee, Rewards
  isActive?: boolean;
  startDate?: string;
  endDate?: string;
  terms?: string;
  redemptionUrl?: string;
  imageUrl?: string;
  merchantName?: string;
  merchantLogo?: string;
}
export interface Card {
  id: string;
  name: string;
  image: ImageSourcePropType;
  annualFee?: number;
  statementCredit?: number;
  rewardsCurrency?: string;
  network?: string;
  benefits: Benefit[];
  renewalDate?: Date | null;
}

export interface CardPerk extends Benefit {
  cardId: string;
  status: 'available' | 'redeemed' | 'partially_redeemed';
  streakCount: number;
  coldStreakCount: number;
  lastRedeemed?: string; // ISO date string of last redemption
  definition_id: string;
  remaining_value?: number; // Amount remaining for partially redeemed perks
  parent_redemption_id?: string; // For linked partial redemptions
}

export interface MultiChoicePerkConfig {
  label: string;
  targetPerkName: string;
}

// App URL Schemes Configuration
export const APP_SCHEMES = {
  uber: {
    ios: 'uber://',
    android: 'uber://',
    fallback: 'https://m.uber.com/',
    androidPackage: 'com.ubercab',
    appStoreUrlIOS: 'https://apps.apple.com/app/uber/id368677368',
    appStoreUrlAndroid: 'https://play.google.com/store/apps/details?id=com.ubercab',
  },
  uberEats: {
    ios: 'ubereats://',
    android: 'ubereats://',
    fallback: 'https://www.ubereats.com/',
    androidPackage: 'com.ubercab.eats',
    appStoreUrlIOS: 'https://apps.apple.com/app/uber-eats-food-delivery/id1058959277',
    appStoreUrlAndroid: 'https://play.google.com/store/apps/details?id=com.ubercab.eats',
  },
  grubhub: {
    ios: 'grubhub://',
    android: 'grubhub://',
    fallback: 'https://www.grubhub.com/',
    androidPackage: 'com.grubhub.android',
    appStoreUrlIOS: 'https://apps.apple.com/app/grubhub-food-delivery/id302920553',
    appStoreUrlAndroid: 'https://play.google.com/store/apps/details?id=com.grubhub.android',
  },
  disneyPlus: {
    ios: 'disneyplus://',
    android: 'disneyplus://',
    fallback: 'https://www.disneyplus.com/',
    androidPackage: 'com.disney.disneyplus',
    appStoreUrlIOS: 'https://apps.apple.com/app/id1446075923',
    appStoreUrlAndroid: 'https://play.google.com/store/apps/details?id=com.disney.disneyplus',
  },
  hulu: {
    ios: 'hulu://action?id=open.hulu.com',
    android: 'hulu://action?id=open.hulu.com',
    fallback: 'https://www.hulu.com/welcome',
    androidPackage: 'com.hulu.plus',
    appStoreUrlIOS: 'https://apps.apple.com/us/app/hulu-stream-tv-shows-movies/id376510438',
    appStoreUrlAndroid: 'https://play.google.com/store/apps/details?id=com.hulu.plus',
  },
  espn: {
    ios: 'sportscenter://',
    android: 'espn://',
    fallback: 'https://www.espn.com/espnplus/',
    androidPackage: 'com.espn.score_center',
    appStoreUrlIOS: 'https://apps.apple.com/app/id317469184',
    appStoreUrlAndroid: 'https://play.google.com/store/apps/details?id=com.espn.score_center',
  },
  peacock: {
    ios: 'peacock://',
    android: 'https://www.peacocktv.com/',
    fallback: 'https://www.peacocktv.com/',
    androidPackage: 'com.peacocktv.peacockandroid',
    appStoreUrlIOS: 'https://apps.apple.com/us/app/peacock-tv-stream-tv-movies/id1508186374',
    appStoreUrlAndroid: 'https://play.google.com/store/apps/details?id=com.peacocktv.peacockandroid',
  },
  nytimes: {
    ios: 'https://www.nytimes.com/',
    android: 'https://www.nytimes.com/',
    fallback: 'https://www.nytimes.com/',
    androidPackage: 'com.nytimes.android',
    appStoreUrlIOS: 'https://apps.apple.com/us/app/the-new-york-times/id284862083',
    appStoreUrlAndroid: 'https://play.google.com/store/apps/details?id=com.nytimes.android',
  },
  dunkin: {
    ios: 'dunkindonuts://',
    android: 'dunkindonuts://',
    fallback: 'https://www.dunkindonuts.com/',
    androidPackage: 'com.dunkinbrands.otgo',
    appStoreUrlIOS: 'https://apps.apple.com/app/dunkin/id1056813463',
    appStoreUrlAndroid: 'https://play.google.com/store/apps/details?id=com.dunkinbrands.otgo',
  },
  doordash: {
    ios: 'doordash://',
    android: 'doordash://',
    fallback: 'https://www.doordash.com/',
    androidPackage: 'com.dd.doordash',
    appStoreUrlIOS: 'https://apps.apple.com/app/doordash-food-delivery/id719972451',
    appStoreUrlAndroid: 'https://play.google.com/store/apps/details?id=com.dd.doordash',
  },
  instacart: {
    ios: 'instacart://',
    android: 'instacart://',
    fallback: 'https://www.instacart.com/',
    androidPackage: 'com.instacart.client',
    appStoreUrlIOS: 'https://apps.apple.com/app/id545599256',
    appStoreUrlAndroid: 'https://play.google.com/store/apps/details?id=com.instacart.client',
  },
  resy: {
    ios: 'resy://',
    android: 'resy://',
    fallback: 'https://resy.com/',
    androidPackage: 'com.resy.android',
    appStoreUrlIOS: 'https://apps.apple.com/app/resy/id866163372',
    appStoreUrlAndroid: 'https://play.google.com/store/apps/details?id=com.resy.android',
  },
  walmart: {
    ios: 'https://www.walmart.com/',
    android: 'https://www.walmart.com/',
    fallback: 'https://www.walmart.com/',
    androidPackage: 'com.walmart.android',
    appStoreUrlIOS: 'https://apps.apple.com/us/app/walmart-shopping-grocery/id338137227',
    appStoreUrlAndroid: 'https://play.google.com/store/apps/details?id=com.walmart.android',
  },
  capitalOne: {
    ios: 'https://www.capitalone.com/',
    android: 'https://www.capitalone.com/',
    fallback: 'https://www.capitalone.com/',
    androidPackage: 'com.konylabs.capitalone',
    appStoreUrlIOS: 'https://apps.apple.com/us/app/capital-one-mobile/id407558537',
    appStoreUrlAndroid: 'https://play.google.com/store/apps/details?id=com.konylabs.capitalone',
  },
  lyft: {
    ios: 'lyft://',
    android: 'me.lyft.android://',
    fallback: 'https://www.lyft.com/',
    androidPackage: 'me.lyft.android',
    appStoreUrlIOS: 'https://apps.apple.com/app/lyft/id529379082',
    appStoreUrlAndroid: 'https://play.google.com/store/apps/details?id=me.lyft.android',
  },
  saks: {
    ios: 'https://www.saksfifthavenue.com/',
    android: 'https://www.saksfifthavenue.com/',
    fallback: 'https://www.saksfifthavenue.com/',
    androidPackage: 'com.saks.android',
    appStoreUrlIOS: 'https://apps.apple.com/us/app/saks-fifth-avenue/id491507258',
    appStoreUrlAndroid: 'https://play.google.com/store/apps/details?id=com.saks.android',
  },
  equinox: {
    ios: 'equinoxplus://action?id=open.equinox.com',
    android: 'https://www.equinoxplus.com/',
    fallback: 'https://www.equinoxplus.com/',
    androidPackage: 'com.equinox.android',
    appStoreUrlIOS: 'https://apps.apple.com/us/app/equinox/id318815572',
    appStoreUrlAndroid: 'https://play.google.com/store/apps/details?id=com.equinox.android',
  },
  wallstreetjournal: {
    ios: 'wsj://',
    android: 'wsj://',
    fallback: 'https://www.wsj.com/',
    androidPackage: 'wsj.reader_sp',
    appStoreUrlIOS: 'https://apps.apple.com/us/app/the-wall-street-journal/id364387007',
    appStoreUrlAndroid: 'https://play.google.com/store/apps/details?id=wsj.reader_sp',
  },
  clear: {
    ios: [
      "clear://action?id=open.clearme.com",
    ],
    android: [
      "https://clearme.com/",
    ],
    fallback: "https://www.clearme.com/enroll",
    androidPackage: "com.clearme.clear",
    appStoreUrlIOS: "https://apps.apple.com/us/app/clear-fast-touchless-id/id1437330042",
    appStoreUrlAndroid: "https://play.google.com/store/apps/details?id=com.clearme.clear",
    notes: "The x-callback-url format is a specific type of scheme for app-to-app communication. The 'enroll.clearme.com' subdomain is another potential universal link entry point for the enrollment process."
  },
  chase: {
    'ios': [
      'chase://',
    ],
    'android': [
      'chase://',
    ],
    'fallback': 'https://www.chase.com/digital/mobile-banking',
    'androidPackage': 'com.chase.sig.android',
    'appStoreUrlIOS': 'https://apps.apple.com/us/app/chase-mobile/id298867247',
    'appStoreUrlAndroid': 'https://play.google.com/store/apps/details?id=com.chase.sig.android',
    'notes': 'The base \'chase://\' scheme is the primary entry point. For specific actions, \'/origination\' is often used for account or card applications, and \'/quickdeposit\' is used to launch the check deposit feature.'
  },
  amex: {
    'ios': [
      'amex://',
    ],
    'android': [
      'amex://',
    ],
    'fallback': 'https://www.americanexpress.com/en-us/support/digital/amex-mobile-app/',
    'androidPackage': 'com.americanexpress.android.acctsvcs.us',
    'appStoreUrlIOS': 'https://apps.apple.com/us/app/amex-mobile/id363434849',
    'appStoreUrlAndroid': 'https://play.google.com/store/apps/details?id=com.americanexpress.android.acctsvcs.us',
    'notes': 'Amex uses the \'amex://\' custom scheme. The \'/offers\' path is a common deep link to show Amex Offers. The HTTPS link is their modern universal link, which may direct to the app or website.'
  },
  marriott: {
    'ios': [
      'marriott://',
    ],
    'android': [
      'marriott://',
    ],
    'fallback': 'https://www.marriott.com/default.mi',
    'androidPackage': 'com.marriott.mrt',
    'appStoreUrlIOS': 'https://apps.apple.com/us/app/marriott-bonvoy/id455004710',
    'appStoreUrlAndroid': 'https://play.google.com/store/apps/details?id=com.marriott.mrt',
    'notes': 'The \'marriott://\' scheme is the main entry point. For the Marriott Bonvoy Brilliant card\'s \'Free Night Award\', the \'/reservation/find\' path is the most relevant as it takes the user directly to the booking flow.'
  },
  hilton: {
    'ios': [
      'hiltonhonors://action?id=open.hilton.com',
    ],
    'android': [
      'hiltonhonors://book',
    ],
    'fallback': 'https://www.hilton.com/en/hilton-honors/',
    'androidPackage': 'com.hilton.android.hhonors',
    'appStoreUrlIOS': 'https://apps.apple.com/us/app/hilton-honors-book-hotels/id335282542',
    'appStoreUrlAndroid': 'https://play.google.com/store/apps/details?id=com.hilton.android.hhonors',
    'notes': 'The Hilton Honors app uses \'hiltonhonors://\'. For the Hilton Honors Aspire card benefits, \'/book\' takes the user to the hotel search, and \'/account\' allows them to view their status and points.'
  },
  appletv: {
    'ios': [
      'videos://',
      'https://tv.apple.com/',
    ],
    'android': [
      'https://tv.apple.com/',
    ],
    'fallback': 'https://tv.apple.com/',
    'androidPackage': 'com.apple.atve.androidtv.appletv',
    'appStoreUrlIOS': 'https://apps.apple.com/us/app/apple-tv/id364147852',
    'appStoreUrlAndroid': 'https://play.google.com/store/apps/details?id=com.apple.atve.androidtv.appletv',
    'notes': 'Apple heavily uses universal links. The first option is the basic custom scheme. The second is a universal link to a specific show, which is a more reliable way to deep link into content.'
  },
  applemusic: {
    'ios': [
      'music://',
      'https://music.apple.com/',
    ],
    'android': [
      'https://music.apple.com/',
    ],
    'fallback': 'https://music.apple.com/',
    'androidPackage': 'com.apple.android.music',
    'appStoreUrlIOS': 'https://apps.apple.com/us/app/apple-music/id1108187390',
    'appStoreUrlAndroid': 'https://play.google.com/store/apps/details?id=com.apple.android.music',
    'notes': 'The base \'music://\' scheme opens the app. For more specific actions, use the universal link format and replace \'12345\' with a specific artist, album, or song ID.'
  },
  peloton: {
    'ios': [
      'https://members.onepeloton.com/classes',
    ],
    'android': [
      'https://members.onepeloton.com/classes',
    ],
    'fallback': 'https://www.onepeloton.com/app',
    'androidPackage': 'com.onepeloton.callisto',
    'appStoreUrlIOS': 'https://apps.apple.com/us/app/peloton-at-home-fitness/id792750946',
    'appStoreUrlAndroid': 'https://play.google.com/store/apps/details?id=com.onepeloton.callisto',
    'notes': 'Peloton uses a custom scheme. To link to a specific class, you need the class ID in the format shown. The universal link to the members area is another reliable entry point.'
  },
  stubhub: {
    'ios': [
      'stubhub://',
    ],
    'android': [
      'stubhub://',
    ],
    'fallback': 'https://www.stubhub.com/',
    'androidPackage': 'com.stubhub.mobile.android.platform',
    'appStoreUrlIOS': 'https://apps.apple.com/us/app/stubhub-event-tickets/id443501546',
    'appStoreUrlAndroid': 'https://play.google.com/store/apps/details?id=com.stubhub.mobile.android.platform',
    'notes': 'The \'stubhub://\' scheme can be used with a specific event ID. Universal links to performer or event pages on their website are also configured to open the app directly.'
  },
  opentable: {
    'ios': [
      'opentable://',
    ],
    'android': [
      'opentable://',
    ],
    'fallback': 'https://www.opentable.com/',
    'androidPackage': 'com.opentable',
    'appStoreUrlIOS': 'https://apps.apple.com/us/app/opentable/id296581815',
    'appStoreUrlAndroid': 'https://play.google.com/store/apps/details?id=com.opentable',
    'notes': 'OpenTable uses both a custom scheme and universal links. Replace \'12345\' with a restaurant\'s OpenTable ID for the custom scheme, or use the web URL format for the universal link.'
  },
  delta: {
    'ios': [
      'https://www.delta.com/stays'
    ],
    'android': [
      'https://www.delta.com/stays'
    ],
    'fallback': 'https://www.delta.com/stays',
    'androidPackage': 'com.delta.mobile.android',
    'appStoreUrlIOS': 'https://apps.apple.com/us/app/fly-delta/id388491656',
    'appStoreUrlAndroid': 'https://play.google.com/store/apps/details?id=com.delta.mobile.android',
    'notes': 'The \'Delta Stays\' feature is web-centric. The most reliable way to direct a user to it is the direct web URL. The \'flydelta://\' schemes will open the main app to its home screen, but not directly to the hotel booking section.'
  },
  curb: {
    'ios': [
      'curb://',
    ],
    'android': [
      'curb://',
    ],
    'fallback': 'https://gocurb.com/',
    'androidPackage': 'com.ridecharge.android.taximagic',
    'appStoreUrlIOS': 'https://apps.apple.com/us/app/curb-request-pay-for-taxis/id299226386',
    'appStoreUrlAndroid': 'https://play.google.com/store/apps/details?id=com.ridecharge.android.taximagic',
    'notes': 'The base \'curb://\' scheme is the most common. The variants with \'book\' are attempts to command the app to open directly to the ride booking screen.'
  },
  revel: {
    'ios': [
      'revel://',
    ],
    'android': [
      'revel://',
    ],
    'fallback': 'https://gorevel.com/ride',
    'androidPackage': 'com.gorevel.revel',
    'appStoreUrlIOS': 'https://apps.apple.com/us/app/revel-all-electric-rides/id1451000631',
    'appStoreUrlAndroid': 'https://play.google.com/store/apps/details?id=com.gorevel.revel',
    'notes': 'Revel\'s primary scheme is \'revel://\'. The \'/rideshare\' path specifically targets the rideshare portion of their app (as they also offer mopeds). The web URL also serves as a universal link.'
  },
  alto: {
    'ios': [
      'ridealto://',
    ],
    'android': [
      'ridealto://',
    ],
    'fallback': 'https://www.ridealto.com/',
    'androidPackage': 'com.ridealto.rider',
    'appStoreUrlIOS': 'https://apps.apple.com/us/app/alto/id1442044302',
    'appStoreUrlAndroid': 'https://play.google.com/store/apps/details?id=com.ridealto.rider',
    'notes': 'Alto uses the \'ridealto://\' scheme. The \'/schedule\' path is intended to open the pre-scheduling interface. The web link to their booking page is another reliable entry point.'
  },
  netflix: {
    'ios': 'nflx://',
    'android': 'nflx://',
    'fallback': 'https://www.netflix.com',
    'androidPackage': 'com.netflix.mediaclient',
    'appStoreUrlIOS': 'https://apps.apple.com/us/app/netflix/id363590051',
    'appStoreUrlAndroid': 'https://play.google.com/store/apps/details?id=com.netflix.mediaclient',
  }
};

// Helper function to map perk names to app schemes
export const PERK_TO_APP_MAP: Record<string, keyof typeof APP_SCHEMES> = {
  // Uber/Rides
  'Uber Ride Credit': 'uber',
  'Uber Eats Credit': 'uberEats',
  'Uber Cash': 'uber',
  'Uber Cash Credit': 'uber',
  'Uber Credit': 'uber',
  
  // Food Delivery
  'Grubhub Credit': 'grubhub',
  'DoorDash Restaurant Credit': 'doordash',
  'DoorDash Non-Restaurant Credit #1': 'doordash',
  'DoorDash Non-Restaurant Credit #2': 'doordash',
  'DoorDash Grocery Credit': 'doordash',
  'DoorDash Credit': 'doordash',
  'Food Delivery Credit': 'doordash',
  
  // Streaming/Entertainment
  'Disney+ Credit': 'disneyPlus',
  'Disney Bundle Credit': 'disneyPlus',
  'Hulu Credit': 'hulu',
  'ESPN+ Credit': 'espn',
  'Peacock Credit': 'peacock',
  'NYTimes Credit': 'nytimes',
  'WSJ Credit': 'wallstreetjournal',
  'Apple TV+ Credit': 'appletv',
  'Apple Music Credit': 'applemusic',
  'StubHub / viagogo Credit': 'stubhub',
  'Netflix Credit': 'netflix',
  
  // Retail
  'Saks Fifth Avenue Credit': 'saks',
  'Walmart+ Membership Credit': 'walmart',
  
  // Dining/Restaurants
  'Dunkin\' Credit': 'dunkin',
  'Resy Credit': 'resy',
  'Resy Dining Credit': 'resy',
  'Dining Credit': 'grubhub',
  
  // Fitness
  'Equinox Credit': 'equinox',
  
  // Rideshare
  'Lyft Credit': 'lyft',
  'Rideshare Credit': 'lyft',
  'Curb Credit': 'curb',
  'Revel Credit': 'revel',
  'Alto Credit': 'alto',
  
  // Travel
  'Airline Fee Credit': 'amex',
  'Capital One Travel Credit': 'capitalOne',
  'CLEAR Plus Credit Aspire': 'clear',
  'CLEAR Plus Credit Green': 'clear',
  'CLEAR Plus Credit Platinum': 'clear',
  'Delta Stays Credit': 'delta',
  'Exclusive Tables Dining Credit': 'opentable',
  'Hotel Credit': 'chase',
  'Peloton Membership Credit': 'peloton',
  'Prepaid Hotel Credit': 'amex',
  'The Edit by Chase Travel Credit': 'chase',
    
  // Lodging
  'Annual Free Night Award': 'marriott',
  'Annual Free Night Reward': 'hilton',
  'Hilton Resort Credit': 'hilton',
};

// Multi-choice Perk Configuration
export const multiChoicePerksConfig: Record<string, MultiChoicePerkConfig[]> = {
  "Digital Entertainment Credit": [
    { label: "Open Disney+", targetPerkName: "Disney+ Credit" },
    { label: "Open Hulu", targetPerkName: "Hulu Credit" },
    { label: "Open ESPN+", targetPerkName: "ESPN+ Credit" },
    { label: "Open Peacock", targetPerkName: "Peacock Credit" },
    { label: "Open NYTimes", targetPerkName: "NYTimes Credit" },
    { label: "Open Wall Street Journal", targetPerkName: "WSJ Credit" },
  ],
  "Apple Services Credit": [
    { label: "Open Apple TV+", targetPerkName: "Apple TV+ Credit" },
    { label: "Open Apple Music", targetPerkName: "Apple Music Credit" },
  ],
  "Uber Cash": [
    { label: "Open Uber Rides", targetPerkName: "Uber Ride Credit" },
    { label: "Open Uber Eats", targetPerkName: "Uber Eats Credit" },
  ],
  "Dining Credit": [
    { label: "Open Grubhub", targetPerkName: "Grubhub Credit" },
    { label: "Open Resy", targetPerkName: "Resy Credit" },
    { label: "View Other Options", targetPerkName: "Dining Info" },
  ],
  "Lifestyle Convenience Credits": [
    { label: "Open Uber", targetPerkName: "Uber Credit" },
    { label: "Open Lyft", targetPerkName: "Lyft Credit" },
    { label: "Open DoorDash", targetPerkName: "DoorDash Credit" },
    { label: "Open Grubhub", targetPerkName: "Grubhub Credit" },
    { label: "Open Hulu", targetPerkName: "Hulu Credit" },
    { label: "Open Disney+", targetPerkName: "Disney+ Credit" },
    { label: "Open Netflix", targetPerkName: "Netflix Credit" },
    { label: "Open Peloton", targetPerkName: "Peloton Credit" },
    { label: "Open Equinox", targetPerkName: "Equinox Credit" },
  ],
  "Disney Bundle Credit": [
    { label: "Open Disney+", targetPerkName: "Disney+ Credit" },
    { label: "Open Hulu", targetPerkName: "Hulu Credit" },
    { label: "Open ESPN+", targetPerkName: "ESPN+ Credit" },
  ],
  "Rideshare Credit": [
    { label: "Open Uber", targetPerkName: "Uber Credit" },
    { label: "Open Lyft", targetPerkName: "Lyft Credit" },
    { label: "Open Curb", targetPerkName: "Curb Credit" },
    { label: "Open Revel", targetPerkName: "Revel Credit" },
    { label: "Open Alto", targetPerkName: "Alto Credit" },
  ]
};

export const allCards: Card[] = [
  /* 1. ——— AMEX PLATINUM ——— */
  {
    id: 'amex_platinum',
    name: 'American Express Platinum',
    image: require('../../assets/images/amex_plat.avif'),
    annualFee: 695,
    benefits: [
      {
        id: 'platinum_uber_cash',
        name: 'Uber Cash',
        value: 15,
        period: 'monthly',
        periodMonths: 1,
        resetType: 'calendar',
        definition_id: '207067ca-6933-40cf-ab7b-1d2d36bf067f',
        description: 'Receive $15 in Uber Cash for U.S. rides or Uber Eats orders each month, plus a $20 bonus in December, for a total of $200 annually.',
        redemptionInstructions: 'To activate, add your Platinum Card as a payment method in your Uber account. The Uber Cash is automatically added to your account on the first day of each month and expires at the end of that month. Unused amounts do not roll over.',
        appScheme: 'uber',
        categories: ['Transportation', 'Dining']
      },
      {
        id: 'platinum_digital_ent',
        name: 'Digital Entertainment Credit',
        value: 20,
        period: 'monthly',
        periodMonths: 1,
        resetType: 'calendar',
        definition_id: '7e10ad1b-792e-4c34-8d36-bd0ebbca8591',
        description: 'Up to $20 per month (totaling $240 per year) in statement credits for eligible digital subscriptions. Covered services include Audible, Disney+, The Disney Bundle, ESPN+, Hulu, Peacock, The New York Times, and The Wall Street Journal.',
        redemptionInstructions: 'You must enroll in this benefit first via your Amex account. Then, simply use your Platinum Card to pay for the eligible subscriptions. The credit is automatically applied as a statement credit.',
        categories: ['Bills & Utilities', 'Entertainment']
      },
      {
        id: 'platinum_walmart_plus',
        name: 'Walmart+ Membership Credit',
        value: 12.95,
        period: 'monthly',
        periodMonths: 1,
        resetType: 'calendar',
        definition_id: 'b4ca65e4-a537-4688-b46a-63326bd72f36',
        description: 'Receive a statement credit that covers the full cost of a Walmart+ monthly membership ($12.95 plus applicable sales tax).',
        redemptionInstructions: 'Use your Platinum Card to pay for a Walmart+ monthly membership. This benefit does not cover the annual membership. A key value of this perk is that a Walmart+ membership also includes a complimentary Paramount+ subscription.',
        appScheme: 'walmart',
        categories: ['Shopping', 'Grocery', 'Entertainment']
      },
      {
        id: 'platinum_equinox',
        name: 'Equinox Credit',
        value: 300,
        period: 'annual',
        periodMonths: 12,
        resetType: 'calendar',
        definition_id: '360e8050-d55d-46e4-a604-a3006dc39724',
        description: 'Receive up to $300 in statement credits annually for eligible Equinox memberships.',
        redemptionInstructions: 'Enrollment is required. Use your Platinum Card to pay for an Equinox All Access, Destination, E by Equinox, or Equinox+ membership. The credit is applied monthly based on your charges, up to the annual maximum of $300.',
        appScheme: 'equinox',
        categories: ['Fitness', 'Wellness']
      },
      {
        id: 'platinum_saks',
        name: 'Saks Fifth Avenue Credit',
        value: 50,
        period: 'semi_annual',
        periodMonths: 6,
        resetType: 'calendar',
        definition_id: '008f140c-56fe-48f1-9e89-6c39391e3def',
        appScheme: 'saks',
        description: 'Receive up to $50 in statement credits twice per year for purchases at Saks Fifth Avenue. This provides up to $100 in total value annually.',
        redemptionInstructions: 'Enrollment is required. The credit is split into two periods: January through June, and July through December. Use your Platinum Card at Saks in-store or online. A popular strategy is to purchase a $50 gift card in-store to use later if you don\'t have an immediate purchase to make. The credit does not apply to purchases at Saks OFF 5TH.',
        categories: ['Shopping']
      },
      {
        id: 'platinum_clear',
        name: 'CLEAR Plus Credit Platinum',
        value: 189,
        period: 'annual',
        periodMonths: 12,
        resetType: 'calendar',
        definition_id: '7d9d198c-5fd4-4d3e-b095-8059e89273d2',
        description: 'Receive up to $189 in statement credits per calendar year for a CLEAR Plus membership, which provides expedited security screening at select airports and stadiums.',
        redemptionInstructions: 'Enroll in CLEAR Plus and pay with your Platinum Card. The credit covers one annual CLEAR membership.',
        appScheme: 'clear',
        categories: ['Travel', 'Flights'],
      },
      {
        id: 'platinum_airline_fee',
        name: 'Airline Fee Credit',
        value: 200,
        period: 'annual',
        periodMonths: 12,
        resetType: 'calendar',
        definition_id: 'd8158b44-a979-40a5-ab13-1042577b5263',
        description: 'Up to $200 in statement credits per calendar year for incidental fees with one selected qualifying airline.',
        appScheme: 'amex',
        redemptionInstructions: 'You must enroll and select one airline from the Amex website each year. This credit applies to incidental fees like checked bags, seat selection, and in-flight refreshments, but not directly to ticket purchases. Some users have found that certain charges under $100 or purchases for airline travel banks (e.g., United TravelBank) may trigger the credit, but these methods are not guaranteed. Plan to use it for standard fees to ensure reimbursement.',
        categories: ['Travel', 'Flights']
      },
      {
        id: 'platinum_hotel_credit',
        name: 'Prepaid Hotel Credit',
        value: 200,
        period: 'annual',
        periodMonths: 12,
        resetType: 'calendar',
        definition_id: '37eeb419-2110-4ca2-ac70-0eebbd587530',
        description: 'Receive up to $200 back in statement credits each calendar year on prepaid bookings with Fine Hotels + Resorts® or The Hotel Collection made through American Express Travel.',
        appScheme: 'amex',
        redemptionInstructions: 'Book a prepaid stay through amextravel.com. For The Hotel Collection, a minimum two-night stay is required. The credit is automatically applied. This is in addition to the valuable on-site benefits (like room upgrades and property credits) that come with FHR and THC bookings.',
        categories: ['Travel', 'Lodging']
      },
    ],
  },

  /* 2. ——— AMEX GOLD ——— */
  {
    id: 'amex_gold',
    name: 'American Express Gold',
    image: require('../../assets/images/amex_gold.avif'),
    annualFee: 325,
    benefits: [
      {
        id: 'amex_gold_uber',
        name: 'Uber Cash',
        value: 10,
        period: 'monthly',
        periodMonths: 1,
        resetType: 'calendar',
        definition_id: '86836d3c-6573-43ec-9b42-33493bec5765',
        description: 'Receive up to $10 in Uber Cash each month, totaling $120 per year. This can be used for both U.S. Uber rides and U.S. Uber Eats orders.',
        redemptionInstructions: 'To receive the benefit, add your Gold Card as a payment method in your Uber account. The $10 in Uber Cash will be automatically deposited into your account on the first of each month. Credits do not roll over and expire at the end of the month.',
        appScheme: 'uber',
        categories: ['Transportation', 'Dining']
      },
      {
        id: 'amex_gold_grubhub',
        name: 'Grubhub Credit',
        value: 10,
        period: 'monthly',
        periodMonths: 1,
        resetType: 'calendar',
        definition_id: '8c57ee72-0b5b-4d93-aeee-150c15539514',
        description: 'Receive up to $10 in statement credits each month for purchases at Grubhub, Five Guys, The Cheesecake Factory, Goldbelly, Wine.com, and Milk Bar.',
        redemptionInstructions: 'You must first enroll in the benefit through your American Express online account. Then, simply use your Gold Card to pay at any of the eligible partners. The statement credit is applied automatically. Unused amounts do not roll over.',
        appScheme: 'grubhub',
        categories: ['Dining'],
      },
      {
        id: 'amex_gold_resy',
        name: 'Resy Dining Credit',
        value: 50,
        period: 'semi_annual',
        periodMonths: 6,
        resetType: 'calendar',
        definition_id: '38f28a7f-49cf-4a5f-9bde-f3be87b33291',
        description: 'Up to $50 in statement credits twice per year (Jan-Jun and Jul-Dec) for dining purchases at Resy-booked restaurants in the U.S.',
        redemptionInstructions: 'Book and dine at Resy partner restaurants. No special code needed; credit posts automatically after dining.',
        appScheme: 'resy',
        categories: ['Dining'],
      },
      {
        id: 'amex_gold_dunkin',
        name: "Dunkin' Credit",
        value: 7,
        period: 'monthly',
        periodMonths: 1,
        resetType: 'calendar',
        definition_id: '1aab4bed-a106-47a2-a7e5-0ae17b1fde02',
        description: "Up to $7 in statement credits each month for Dunkin' Donuts purchases in the U.S. when you spend $7 or more.",
        redemptionInstructions: "Enroll your card and use it at Dunkin' Donuts. Credit appears on statement after qualifying purchase.",
        appScheme: 'dunkin',
        categories: ['Dining', 'Coffee'],
      },
    ],
  },

  /* 3. ——— CHASE SAPPHIRE RESERVE ——— */
  {
    id: 'chase_sapphire_reserve',
    name: 'Chase Sapphire Reserve',
    image: require('../../assets/images/chase_sapphire_reserve.png'),
    annualFee: 795,
    benefits:[
      {
        id: 'csr_the_edit_credit_h1',
        name: 'The Edit by Chase Travel Credit',
        value: 250,
        period: 'semi_annual',
        periodMonths: 6,
        resetType: 'calendar',
        definition_id: 'c2a1b459-e527-45c6-8321-59666524784e',
        description: '$250 statement credit for prepaid hotel bookings of at least two nights made through "The Edit by Chase Travel" portal. Valid from January 1 to June 30.',
        redemptionInstructions: 'Credit is automatically applied to eligible bookings. Purchases reimbursed with this credit do not earn points.',
        appScheme: 'chase',
        categories:['Travel', 'Lodging'],
      },
      {
        id: 'csr_dining_credit_h1',
        name: 'Exclusive Tables Dining Credit',
        value: 150,
        period: 'semi_annual',
        periodMonths: 6,
        resetType: 'calendar',
        definition_id: 'ae2ab1a1-3aad-4377-97eb-542ea733d905',
        description: '$150 statement credit for dining experiences booked through the "Sapphire Reserve Exclusive Tables" platform on OpenTable. Valid from January 1 to June 30.',
        redemptionInstructions: 'Credit is automatically applied for dining experiences booked via the "Sapphire Reserve Exclusive Tables" program.',
        appScheme: 'opentable',
        categories:['Dining'],
      },
      {
        id: 'csr_stubhub_credit_h1',
        name: 'StubHub / viagogo Credit',
        value: 150,
        period: 'semi_annual',
        periodMonths: 6,
        resetType: 'calendar',
        definition_id: '8250b448-86d1-49c1-b37d-40c0039a5a0c',
        description: '$150 statement credit for concert and event tickets purchased through StubHub or viagogo. Valid from January 1 to June 30.',
        redemptionInstructions: 'Benefit requires activation before use.',
        appScheme: 'stubhub',
        categories: ['Entertainment'],
      },
      {
        id: 'csr_doordash_restaurant',
        name: 'DoorDash Restaurant Credit',
        value: 5,
        period: 'monthly',
        periodMonths: 1,
        resetType: 'calendar',
        definition_id: '8726f459-c527-45c6-8321-59666524784e',
        description: '$5 monthly promo credit for an eligible DoorDash restaurant order. Part of the up to $300 annual DoorDash credit benefit. Requires complimentary DashPass enrollment (valid through Dec 31, 2027).',
        redemptionInstructions: 'Enroll in complimentary DashPass. The $5 promo credit is available in your DoorDash account each month and must be applied at checkout.',
        appScheme: 'doordash',
        categories:['Dining'],
      },
      {
        id: 'csr_doordash_non_restaurant_1',
        name: 'DoorDash Non-Restaurant Credit #1',
        value: 10,
        period: 'monthly',
        periodMonths: 1,
        resetType: 'calendar',
        definition_id: '38ca9405-eafc-4f95-aac0-c436d050c0d0',
        description: '$10 monthly promo credit for an eligible non-restaurant order (e.g., grocery, retail). Part of the up to $300 annual DoorDash credit benefit. Requires DashPass enrollment (valid through Dec 31, 2027).',
        redemptionInstructions: 'Use your Reserve card with active DashPass membership. The $10 promo credit appears in your DoorDash account and must be applied at checkout.',
        appScheme: 'doordash',
        categories:['Grocery'],
      },
      {
        id: 'csr_doordash_non_restaurant_2',
        name: 'DoorDash Non-Restaurant Credit #2',
        value: 10,
        period: 'monthly',
        periodMonths: 1,
        resetType: 'calendar',
        definition_id: 'ed2aa3a3-8ad3-4739-bf34-55eb1dd741c5',
        description: 'Second $10 monthly promo credit for an eligible non-restaurant order. Part of the up to $300 annual DoorDash credit benefit. Requires DashPass enrollment (valid through Dec 31, 2027).',
        redemptionInstructions: 'Use your Reserve card with active DashPass membership. The second $10 promo credit appears in your DoorDash account after the first is used.',
        appScheme: 'doordash',
        categories:['Grocery'],
      },
      {
        id: 'csr_peloton_credit',
        name: 'Peloton Membership Credit',
        value: 10,
        period: 'monthly',
        periodMonths: 1,
        resetType: 'calendar',
        definition_id: '66ca3bae-2feb-40ee-b907-b07c845163fd',
        description: 'Up to $10 in monthly statement credits toward a Peloton All-Access, App+, or App One membership. Valid through December 31, 2027.',
        redemptionInstructions: 'Credits are automatically applied to your statement for eligible Peloton membership charges.',
        appScheme: 'peloton',
        categories: ['Lifestyle', 'Fitness', 'Wellness'],
      },
      {
        id: 'csr_lyft',
        name: 'Lyft Credit',
        value: 10,
        period: 'monthly',
        periodMonths: 1,
        resetType: 'calendar',
        definition_id: 'f79316d4-5ddd-4591-830b-6e897a3dd0f5',
        description: '$10 in-app Lyft ride credit each month. Plus earn 5x points on Lyft rides through September 30, 2027.',
        appScheme: 'lyft',
        redemptionInstructions: 'Add your Sapphire Reserve as the payment method in the Lyft app. Credit appears automatically and applies to your next ride(s).',
        categories:['Transportation'],
      },
      {
        id: 'csr_apple_subscriptions',
        name: 'Apple Services Credit',
        value: 250,
        period: 'annual',
        periodMonths: 12,
        resetType: 'calendar',
        definition_id: 'be07d25c-2f76-4a09-8bfd-78c3c047163b',
        description: 'Complimentary subscriptions to Apple TV+ and Apple Music, positioned as a $250 annual value.',
        redemptionInstructions: 'Requires a one-time activation for each service through chase.com or the Chase Mobile app.',
        categories: ['Lifestyle', 'Entertainment'],
      },
      // {
      //   id: 'csr_trusted_traveler_credit',
      //   name: 'Global Entry / TSA PreCheck / NEXUS Credit',
      //   value: 120,
      //   period: 'other',
      //   periodMonths: 48,
      //   resetType: 'calendar',
      //   definition_id: 'a7b8c9d0-e1f2-3456-7890-bcdef1234567',
      //   description: 'Receive a statement credit of up to $120 once every four years for the application fee for Global Entry, TSA PreCheck, or NEXUS.',
      //   redemptionInstructions: 'Charge the application fee to your card to receive the statement credit automatically.',
      //   categories:['Travel', 'Flights'],
      // },
    ],
  },

  /* 4. ——— CHASE SAPPHIRE PREFERRED ——— */
  {
    id: 'chase_sapphire_preferred',
    name: 'Chase Sapphire Preferred',
    image: require('../../assets/images/chase_sapphire_preferred.png'),
    annualFee: 95,
    benefits: [
      {
        id: 'csp_hotel',
        name: 'Hotel Credit',
        value: 50,
        period: 'annual',
        periodMonths: 12,
        resetType: 'calendar',
        definition_id: '32a15587-31ef-473a-a73b-b40c68026419',
        description: 'Up to $50 statement credit each account anniversary year for hotel stays booked via the Chase Ultimate Rewards travel portal.',
        appScheme: 'chase',
        redemptionInstructions: 'Book a hotel through Chase Travel using your Sapphire Preferred; the first $50 of hotel charges will be automatically refunded. Credit resets every account anniversary.',
        categories: ['Travel', 'Lodging'],
      },
      {
        id: 'csp_doordash_grocery',
        name: 'DoorDash Grocery Credit',
        value: 10,
        period: 'monthly',
        periodMonths: 1,
        resetType: 'calendar',
        definition_id: 'a30da18a-b7f8-4d52-bb8a-80200f62e2b5',
        description: '$10 monthly DoorDash credit for non-restaurant purchases (grocery stores, convenience stores, DashMart, etc.) through 2027.',
        redemptionInstructions: 'Use your Preferred card with DashPass activated. You\'ll see a $10 off promo automatically for eligible non-restaurant orders each month. Credit does not roll over.',
        appScheme: 'doordash',
        categories: ['Grocery'],
      },
    ],
  },

  /* 5. ——— MARRIOTT BONVOY BRILLIANT ——— */
  {
    id: 'marriott_bonvoy_brilliant',
    name: 'Marriott Bonvoy Brilliant',
    image: require('../../assets/images/marriott_bonvoy_brilliant.avif'),
    annualFee: 650,
    benefits: [
      {
        id: 'brilliant_dining',
        name: 'Dining Credit',
        value: 25,
        period: 'monthly',
        periodMonths: 1,
        resetType: 'calendar',
        definition_id: '041c3ce2-db24-4f74-a319-b8bb5e239aa2',
        description: '$25 dining statement credit each month (up to $300 per year) at restaurants worldwide.',
        categories: ['Dining'],
      },
      {
        id: "brilliant_free_night_award",
        name: "Annual Free Night Award",
        value: 765,
        period: "annual",
        periodMonths: 12,
        resetType: "anniversary",
        appScheme: 'marriott',
        definition_id: "a2e8f7d1-5b7a-4b0e-8b1a-9f8d7c6b5a4d",
        description: "Receive one Free Night Award each year after your card renewal month. The award can be used for a one-night stay at a participating Marriott Bonvoy hotel with a redemption level at or under 85,000 points. You can top off the award with up to 15,000 of your own points.",
        categories: [
          "Travel", "Lodging"
        ],
        redemptionInstructions: "The Free Night Award will be automatically deposited into your Marriott Bonvoy account 8-12 weeks after your card renewal month. To use it, log in to your Marriott Bonvoy account and select the award at the time of booking. The award expires one year from the date of issuance. Be aware that some properties may charge resort fees, which are not covered by the award."
      },
    ],
  },

  /* 6. ——— HILTON HONORS ASPIRE ——— */
  {
    id: 'hilton_aspire',
    name: 'Hilton Honors Aspire',
    image: require('../../assets/images/hilton_aspire.avif'),
    annualFee: 550,
    benefits: [
      {
        id: 'aspire_flight_credit',
        name: 'Airline Flight Credit',
        value: 50,
        period: 'quarterly',
        periodMonths: 3,
        resetType: 'calendar',
        definition_id: '0c1d3305-e06a-4c00-99f2-053158a446a9',
        description: 'Up to $50 back in statement credits each quarter on eligible flight purchases (total $200 yr).',
        categories: ['Travel', 'Flights'],
      },
      {
        id: "aspire_hilton_resort_credit",
        name: "Hilton Resort Credit",
        value: 200,
        period: "semi_annual",
        periodMonths: 6,
        resetType: "calendar",
        definition_id: "7bd0e404-3ca4-409f-9827-a78d4f51584f",
        description: "Get up to $200 in statement credits semi-annually for eligible purchases made directly at participating Hilton Resorts. This provides a total of up to $400 in resort credits per calendar year. The credit periods are January-June and July-December.",
        categories: [
          "Travel"
        ],
        appScheme: 'hilton',
        redemptionInstructions: "To use this credit, charge eligible purchases, including room rates and incidental charges like dining and spa treatments, to your room at a participating Hilton Resort and pay with your Hilton Honors Aspire card at checkout. A list of participating resorts is available on the Hilton website. Advance purchase or non-refundable rates may not be eligible. Unused semi-annual credits do not roll over."
      },
      {
        id: 'aspire_free_night_reward',
        name: 'Annual Free Night Reward',
        value: 1000,
        period: 'annual',
        periodMonths: 12,
        resetType: 'calendar',
        definition_id: 'ff646ff5-9d6e-4587-a44c-d6da0c219e0a',
        description: 'Receive one Free Night Reward certificate each year after your card renewal month, valid for a standard room on a weekend night at almost any Hilton property worldwide. You can earn a second Free Night Reward after you spend $30,000 in purchases on your card in a calendar year, and a third after spending a total of $60,000 in the same calendar year.',
        categories: ['Travel'],
        appScheme: 'hilton',
        redemptionInstructions: "The Free Night Reward will be delivered to you via email. To redeem, you must call Hilton Honors at 1-800-446-6677 and mention the code provided. The certificate is valid for one year from the date of issuance. It's best to use this for high-value properties to maximize its value."
      },
      {
        id: 'aspire_clear_plus_credit',
        name: 'CLEAR Plus Credit Aspire',
        value: 189,
        period: 'annual',
        periodMonths: 12,
        resetType: 'calendar',
        definition_id: 'ffc46725-85ed-47a8-8454-b4df2107020f',
        description: 'Receive up to $189 in statement credits per calendar year for a CLEAR Plus membership, which provides expedited security screening at select airports and stadiums.',
        categories: ['Travel'],
        appScheme: 'clear',
        redemptionInstructions: 'Pay for your CLEAR Plus membership using your Hilton Honors Aspire card, and the statement credit will be automatically applied. This benefit covers the full cost of an individual CLEAR Plus membership.'
      },
      // {
      //   id: 'aspire_diamond_status',
      //   name: 'Hilton Honors Diamond Status',
      //   value: 0,
      //   period: 'ongoing',
      //   periodMonths: 0,
      //   resetType: 'none',
      //   definition_id: 'c3d4e5f6-g7h8-9012-3456-7890abcdef12',
      //   description: "Receive complimentary Hilton Honors Diamond status, the top tier of Hilton's loyalty program. Benefits include a 100% point bonus on stays, executive lounge access, room upgrades (up to a one-bedroom suite), and a daily food and beverage credit at select properties.",
      //   categories: ['Travel'],
      //   redemptionInstructions: 'Your Hilton Honors account will be automatically upgraded to Diamond status upon card approval. Ensure your card is linked to your Hilton Honors account to receive these benefits.'
      // },
      // {
      //   id: 'aspire_waldorf_conrad_credit',
      //   name: 'Waldorf Astoria & Conrad Property Credit',
      //   value: 100,
      //   period: 'per_stay',
      //   periodMonths: 0,
      //   resetType: 'none',
      //   definition_id: 'e5f6g7h8-i9j0-1234-5678-90abcdef1234',
      //   description: 'Receive a $100 property credit when you book a two-night minimum stay at participating Waldorf Astoria and Conrad properties.',
      //   categories: ['Travel'],
      //   redemptionInstructions: "To receive this credit, you must book your stay through HiltonHonors.com/aspirecard or by calling the number on the back of your card and booking the specific 'Aspire Card' rate. The credit can be used for on-property expenses such as dining and spa services."
      // }
  ],
  },

  /* 7. ——— CAPITAL ONE VENTURE X ——— */
  {
    id: 'capital_one_venture_x',
    name: 'Capital One Venture X',
    image: require('../../assets/images/venture_x.avif'),
    annualFee: 395,
    benefits: [
      {
        id: 'venturex_travel_credit',
        name: 'Capital One Travel Credit',
        value: 300,
        period: 'annual',
        periodMonths: 12,
        resetType: 'calendar',
        definition_id: '0faeed05-234e-4110-a710-b8cb41bb0f72',
        description: 'Receive a $300 statement credit annually for travel bookings made through the Capital One Travel portal. This credit is flexible and can be applied to flights, hotels, and rental cars.',
        redemptionInstructions: 'Simply use your Venture X card to pay for a booking on the Capital One Travel portal. The credit is automatically applied as a statement credit to your account. The credit can be used in one go or across multiple bookings. Unused credit does not roll over past your card anniversary date. To maximize value, compare prices, as the portal offers price matching within 24 hours of booking.',
        appScheme: 'capitalOne',
        categories: ['Travel']
      },
      // {
      //   id: 'venturex_anniversary',
      //   name: 'Anniversary Miles Bonus',
      //   value: 100,
      //   period: 'annual',
      //   periodMonths: 12,
      //   resetType: 'anniversary',
      //   definition_id: 'c6004d5f-c5c4-435e-b717-eb6cafd9a089',
      //   description: 'Receive 10,000 bonus miles every year starting on your first account anniversary. These miles are worth a minimum of $100 when redeemed for travel.',
      //   redemptionInstructions: 'This is an automatic benefit. The 10,000 bonus miles will be deposited into your Capital One miles account within the billing cycle of your card anniversary.',
      //   categories: ['Travel', 'Rewards']
      // },
      // {
      //   id: 'venturex_lounge_access',
      //   name: 'Airport Lounge Access',
      //   value: 0,
      //   period: 'ongoing',
      //   periodMonths: 0,
      //   resetType: 'none',
      //   definition_id: 'a1b2c3d4-e5f6-a7b8-c9d0-e1f2a3b4c5d6',
      //   description: 'Get unlimited complimentary access to Capital One Lounges for you and two guests. Also includes a complimentary Priority Pass Select membership, giving you access to over 1,300+ lounges worldwide.',
      //   redemptionInstructions: 'You must enroll in Priority Pass through your Capital One online account to receive your membership. For Capital One Lounges, simply present your Venture X card and a same-day boarding pass. Note: Guest policies for Capital One Lounges are subject to change.',
      //   categories: ['Travel']
      // },
      // {
      //   id: 'venturex_global_entry',
      //   name: 'Global Entry or TSA PreCheck Credit',
      //   value: 100,
      //   period: 'quadrennial',
      //   periodMonths: 48,
      //   resetType: 'usage',
      //   definition_id: 'b2c3d4e5-f6g7-h8i9-j0k1-l2m3n4o5p6q7',
      //   description: 'Receive up to a $100 statement credit for the application fee for either Global Entry or TSA PreCheck.',
      //   redemptionInstructions: 'Pay the application fee for either Global Entry or TSA PreCheck with your Venture X card. The statement credit will automatically be applied to your account. This benefit is available once every four years. You can use this credit to cover the fee for another person.',
      //   categories: ['Travel']
      // },
      // {
      //   id: 'venturex_hertz_status',
      //   name: "Hertz President's Circle Status",
      //   value: 0,
      //   period: 'ongoing',
      //   periodMonths: 0,
      //   resetType: 'none',
      //   definition_id: 'c3d4e5f6-g7h8-i9j0-k1l2-m3n4o5p6q7r8',
      //   description: 'Receive complimentary top-tier Hertz President's Circle status, which provides benefits like guaranteed car upgrades, a wider selection of vehicles, and a dedicated customer service line.',
      //   redemptionInstructions: 'You must enroll for this benefit through your Capital One online account. You will be redirected to the Hertz website to link your accounts and activate your status.',
      //   categories: ['Travel']
      // },
      // {
      //   id: 'venturex_cell_phone_protection',
      //   name: 'Cell Phone Protection',
      //   value: 800,
      //   period: 'per_incident',
      //   periodMonths: 0,
      //   resetType: 'none',
      //   definition_id: 'd4e5f6g7-h8i9-j0k1-l2m3-n4o5p6q7r8s9',
      //   description: 'Get reimbursed for the repair or replacement of your stolen or damaged cell phone, up to $800 per claim.',
      //   redemptionInstructions: 'You must pay your monthly cell phone bill with your Venture X card to be eligible for this coverage. There is a $50 deductible per claim, and you can make up to two claims per 12-month period. To file a claim, contact the benefits administrator within 60 days of the incident.',
      //   categories: ['Insurance', 'Shopping']
      // }
    ],
  },

  /* 8. ——— BLUE CASH PREFERRED ——— */
  {
    id: 'blue_cash_preferred',
    name: 'Blue Cash Preferred (AmEx)',
    image: require('../../assets/images/blue_cash_preferred.avif'),
    annualFee: 95,
    benefits: [
      {
        id: 'bcp_disney_bundle',
        name: 'Disney Bundle Credit',
        value: 7,
        period: 'monthly',
        periodMonths: 1,
        resetType: 'calendar',
        definition_id: '55fec7a1-de50-40c9-b5a2-0f456161def0',
        description: 'Get a $7 statement credit each month after you spend $9.99 or more on an eligible subscription to The Disney Bundle. This can reduce the cost of subscriptions that include Disney+, Hulu, and ESPN+.',
        redemptionInstructions: 'You must first enroll in the benefit through your American Express online account. Then, use your Blue Cash Preferred card to pay for your monthly Disney Bundle subscription of $9.99 or more. The statement credit will be applied automatically. Unused credits do not roll over.',
        categories: ['Bills & Utilities', 'Entertainment']
      },
    ],
  },

  /* 9. ——— DELTA SKYMILES RESERVE (AmEx) ——— */
  {
    id: 'delta_reserve',
    name: 'Delta SkyMiles Reserve (AmEx)',
    image: require('../../assets/images/delta_reserve.avif'),
    annualFee: 650,
    benefits: [
      {
        id: 'delta_resy',
        name: 'Resy Dining Credit',
        value: 20,
        period: 'monthly',
        periodMonths: 1,
        resetType: 'calendar',
        definition_id: 'd538f219-3595-4a96-85da-508054a9b36d',
        description: 'Receive up to $20 in statement credits each month for eligible purchases at U.S. restaurants on Resy. This amounts to a total of up to $240 per calendar year.',
        categories: ['Dining'],
        appScheme: 'resy',
        redemptionInstructions: 'Enrollment is required through your American Express online account. After enrolling, use your Delta Reserve card to pay at eligible U.S. restaurants that offer reservations through Resy.com or the Resy app. The credit is applied automatically. Unused monthly credits do not roll over.'
      },
      {
        id: 'delta_rideshare',
        name: 'Rideshare Credit',
        value: 10,
        period: 'monthly',
        periodMonths: 1,
        resetType: 'calendar',
        definition_id: '90ec407b-6efc-4b7a-b071-3aa51e68af2c',
        description: 'Get up to $10 in statement credits each month on U.S. rideshare purchases with select providers, totaling up to $120 per year.',
        categories: ['Transportation'],
        redemptionInstructions: 'Enrollment is required via your Amex account. Use your card to pay for eligible U.S. rideshare services like Uber, Lyft, Curb, Revel, and Alto. The credit is applied automatically. Unused monthly credits are forfeited.'
      },
      {
        id: 'delta_stays',
        name: 'Delta Stays Credit',
        value: 200,
        period: 'annual',
        periodMonths: 12,
        resetType: 'calendar',
        definition_id: '7d82e0d9-4495-4ac4-86f8-f819b0762747',
        description: 'Receive up to a $200 statement credit each calendar year for prepaid hotels or vacation rentals booked through the Delta Stays platform.',
        categories: ['Travel'],
        appScheme: 'delta',
        redemptionInstructions: 'To redeem, book a prepaid hotel or vacation rental through delta.com/stays and pay with your Delta Reserve card. The credit is applied automatically to your statement. The credit resets each calendar year.'
      },
      // {
      //   id: 'delta_companion_certificate',
      //   name: 'Annual Companion Certificate',
      //   value: 0,
      //   period: 'annual',
      //   periodMonths: 12,
      //   resetType: 'anniversary',
      //   definition_id: 'c3d4e5f6-g7h8-i9j0-k1l2-m3n4o5p6q7r8',
      //   description: 'Receive a Companion Certificate each year after your card renewal. This certificate is valid for one round-trip Main Cabin, Delta Comfort+, or First Class ticket for a companion traveling with you on the same itinerary.',
      //   redemptionInstructions: 'The certificate is deposited into your Delta SkyMiles account after your card anniversary. To use it, you must book through delta.com. The certificate is valid for travel within the 48 contiguous United States, and to select destinations in Alaska, Hawaii, Mexico, the Caribbean, and Central America. You are responsible for government-imposed taxes and fees on the companion ticket. Availability is subject to certain fare classes, so booking in advance provides the best chance of successful redemption.'
      // },
      // {
      //   id: 'delta_sky_club_access',
      //   name: 'Delta Sky Club Access',
      //   value: 0,
      //   period: 'ongoing',
      //   periodMonths: 0,
      //   resetType: 'none',
      //   definition_id: 'd4e5f6g7-h8i9-j0k1-l2m3-n4o5p6q7r8s9',
      //   description: 'Receive 15 complimentary visits to the Delta Sky Club each year. You can unlock unlimited visits for the remainder of the year after spending $75,000 on the card in a calendar year. Also includes four one-time guest passes annually.',
      //   categories: ['Travel'],
      //   redemptionInstructions: 'Access the Sky Club by presenting your valid Delta Reserve card and a same-day boarding pass for a Delta or partner airline flight. You also get complimentary access to The Centurion Lounge when you book your Delta flight with your Reserve Card.'
      // },
      // {
      //   id: 'delta_global_entry',
      //   name: 'Global Entry or TSA PreCheck Credit',
      //   value: 120,
      //   period: 'quadrennial',
      //   periodMonths: 48,
      //   resetType: 'usage',
      //   definition_id: 'e5f6g7h8-i9j0-k1l2-m3n4-o5p6q7r8s9t0',
      //   description: 'Receive a statement credit for the application fee for either Global Entry (up to $120 every 4 years) or TSA PreCheck (up to $85 every 4.5 years).',
      //   categories: ['Travel'],
      //   redemptionInstructions: 'Pay the application fee for either program with your Delta Reserve card to receive the statement credit automatically. You do not need to be the one applying to use the credit.'
      // }
    ],
  },

  /* 10. ——— AMEX GREEN ——— */
  {
    id: 'amex_green',
    name: 'American Express Green',
    image: require('../../assets/images/amex_green.avif'),
    annualFee: 150,
    benefits: [
      {
        id: 'green_clear',
        name: 'CLEAR Plus Credit Green',
        value: 189,
        period: 'annual',
        periodMonths: 12,
        resetType: 'calendar',
        definition_id: '7829f4fe-8428-492e-948c-746d474fa7f5',
        description: 'Receive up to $189 in statement credits per calendar year, enough to cover the full cost of a CLEAR Plus membership for expedited airport security.',
        redemptionInstructions: 'Simply use your American Express Green card to pay for your CLEAR Plus membership. The statement credit will be applied automatically to your account, typically within 6-8 weeks. To maximize this benefit, ensure CLEAR is available at airports you frequently use.',
        appScheme: 'clear',
        categories: ['Travel', 'Flights']
      },
      // {
      //   id: 'green_travel_rewards',
      //   name: '3X Points on Travel, Transit & Dining',
      //   value: 0,
      //   period: 'ongoing',
      //   periodMonths: 0,
      //   resetType: 'none',
      //   definition_id: 'a1b2c3d4-e5f6-a7b8-c9d0-e1f2a3b4c5d7',
      //   description: 'Earn 3X Membership Rewards points on a broad range of categories. This includes travel (flights, hotels, car rentals, cruises, tours, third-party travel websites), transit (rideshares, subways, parking, tolls), and at restaurants worldwide.',
      //   redemptionInstructions: 'Points are earned automatically when you use your card for purchases in these categories. This is a primary benefit of the card, and maximizing its value depends on using it for all eligible travel and dining expenses. Unlike some cards, the travel category is very broad and not limited to a specific travel portal.',
      //   categories: ['Travel', 'Dining', 'Transportation', 'Rewards']
      // },
    ],
  },

  /* 11. ——— BANK OF AMERICA PREMIUM REWARDS ——— */
  {
    id: 'boa_premium_rewards',
    name: 'Bank of America Premium Rewards',
    image: require('../../assets/images/boa_premium_rewards.png'),
    annualFee: 95,
    benefits: [
      {
        id: 'boa_pr_airline_incidental',
        name: 'Airline Incidental Credit',
        value: 100,
        period: 'annual',
        periodMonths: 12,
        resetType: 'calendar',
        definition_id: '0325f1de-9ef4-45a1-9c13-9cd312709bdb',
        description: 'Receive up to $100 in statement credits annually for qualifying airline incidental fees. This helps to significantly offset the annual fee.',
        redemptionInstructions: 'The credit is automatically applied to your statement when you use your card for qualifying fees. Qualifying charges include seat upgrades, checked baggage fees, in-flight food and entertainment, and airline lounge access fees. It does not cover tickets, award fees, mileage purchases, or gift cards. It is also important to note that charges from some airlines, like Spirit and Allegiant, may not qualify. The credit resets every calendar year.',
        categories: ['Travel', 'Flights']
      },
      // {
      //   id: 'boa_pr_global_entry',
      //   name: 'Global Entry or TSA PreCheck Credit',
      //   value: 100,
      //   period: 'quadrennial',
      //   periodMonths: 48,
      //   resetType: 'usage',
      //   definition_id: 'c6004d5f-c5c4-435e-b717-eb6cafd9a089',
      //   description: 'Receive a statement credit of up to $100 every four years to cover the application fee for either Global Entry or TSA PreCheck.',
      //   redemptionInstructions: 'Simply pay the application fee for either Global Entry or TSA PreCheck with your Premium Rewards card. The statement credit will be automatically applied to your account. Since Global Entry includes TSA PreCheck benefits, it is generally the better value. You can also use this credit to pay for a friend or family member\'s application fee.',
      //   categories: ['Travel']
      // },
      // {
      //   id: 'boa_pr_preferred_rewards_bonus',
      //   name: 'Preferred Rewards Bonus',
      //   value: 0,
      //   period: 'ongoing',
      //   periodMonths: 0,
      //   resetType: 'none',
      //   definition_id: 'a1b2c3d4-e5f6-g7h8-i9j0-k1l2m3n4o5p6',
      //   description: 'Boost your rewards earnings by 25% to 75% on every purchase if you are a Bank of America Preferred Rewards member. This is the most significant way to maximize the value of this card.',
      //   redemptionInstructions: 'To receive this benefit, you must be enrolled in the Bank of America Preferred Rewards program, which requires having a qualifying Bank of America checking account and maintaining a combined three-month average daily balance. Gold Tier ($20k+ balance) gets a 25% bonus, Platinum ($50k+) gets a 50% bonus, and Platinum Honors ($100k+) gets a 75% bonus. The bonus is applied automatically to the points you earn.',
      //   categories: ['Rewards']
      // },
      // {
      //   id: 'boa_pr_base_rewards',
      //   name: 'Base Rewards Rate',
      //   value: 0,
      //   period: 'ongoing',
      //   periodMonths: 0,
      //   resetType: 'none',
      //   definition_id: 'b2c3d4e5-f6g7-h8i9-j0k1-l2m3n4o5p6q7',
      //   description: 'Earn unlimited 2 points for every $1 spent on travel and dining purchases, and 1.5 points for every $1 spent on all other purchases. There is no limit to the points you can earn.',
      //   redemptionInstructions: 'Points are earned automatically on all purchases. The travel and dining categories are defined broadly, including purchases from restaurants, bars, airlines, hotels, car rentals, cruise lines, and tourist attractions. The points value is a straightforward 1 cent per point when redeemed for cash back, a statement credit, travel, or gift cards.',
      //   categories: ['Rewards']
      // }
    ],
  },

  /* 12. ——— BANK OF AMERICA PREMIUM REWARDS ELITE ——— */
  {
    id: 'boa_premium_rewards_elite',
    name: 'Bank of America Premium Rewards Elite',
    image: require('../../assets/images/boa_premium_rewards_elite.png'),
    annualFee: 550,
    benefits: [
      {
        id: 'boa_pre_airline_incidental',
        name: 'Airline Incidental Credits',
        value: 300,
        period: 'annual',
        periodMonths: 12,
        resetType: 'calendar',
        definition_id: '25930ec5-f49c-4ea0-96a7-0ca51c6ff4d7',
        description: 'Up to $300 annually in statement credits for qualifying airline incidental fees. This credit helps substantially offset the annual fee.',
        redemptionInstructions: 'The credit is automatically applied to your statement for qualifying charges. Qualifying fees include seat upgrades, checked baggage, in-flight food and entertainment, and airline lounge day passes. It does not cover the cost of airfare, mileage purchases, or gift cards. The credit resets each calendar year.',
        categories: ['Travel', 'Flights']
      },
      {
        id: 'boa_pre_lifestyle',
        name: 'Lifestyle Convenience Credits',
        value: 150,
        period: 'annual',
        periodMonths: 12,
        resetType: 'calendar',
        definition_id: 'd8158b44-a979-40a5-ab13-1042577b5261',
        description: 'Up to $150 annually in statement credits for lifestyle purchases. This flexible credit applies to a wide range of everyday services.',
        redemptionInstructions: 'Credits post automatically when you use your card for eligible purchases. Confirmed eligible services include food delivery (DoorDash, Grubhub), ride-hailing (Uber, Lyft), streaming (Netflix, Hulu, Disney+), and fitness subscriptions. Some services like YouTube TV and Audible have been reported by users as not qualifying. The credit resets each calendar year.',
        categories: ['Shopping', 'Dining', 'Transportation', 'Fitness']
      },
      // {
      //   id: 'boa_pre_priority_pass',
      //   name: 'Priority Pass Select Membership',
      //   value: 0,
      //   period: 'ongoing',
      //   periodMonths: 0,
      //   resetType: 'none',
      //   definition_id: 'a1b2c3d4-e5f6-g7h8-i9j0-k1l2m3n4o5p6',
      //   description: 'Receive up to four complimentary Priority Pass Select memberships, providing access to over 1,300 airport lounges and experiences worldwide for you and authorized members.',
      //   redemptionInstructions: 'You must enroll yourself and up to three other individuals in Priority Pass Select through your Bank of America online account. This is a significant perk for families or small groups, as most premium cards offer only one membership. The membership includes access to participating airport restaurants for a dining credit in some locations.',
      //   categories: ['Travel']
      // },
      // {
      //   id: 'boa_pre_global_entry',
      //   name: 'Global Entry or TSA PreCheck Credit',
      //   value: 100,
      //   period: 'quadrennial',
      //   periodMonths: 48,
      //   resetType: 'usage',
      //   definition_id: 'b2c3d4e5-f6g7-h8i9-j0k1-l2m3n4o5p6q7',
      //   description: 'Receive a statement credit of up to $100 every four years to cover the application fee for either Global Entry or TSA PreCheck.',
      //   redemptionInstructions: 'Pay the application fee for either Global Entry or TSA PreCheck with your Premium Rewards Elite card. The statement credit will be automatically applied. Global Entry includes TSA PreCheck, making it the more valuable option. You can use this credit to pay for the application fee of another person.',
      //   categories: ['Travel']
      // },
      // {
      //   id: 'boa_pre_preferred_rewards_bonus',
      //   name: 'Preferred Rewards Bonus',
      //   value: 0,
      //   period: 'ongoing',
      //   periodMonths: 0,
      //   resetType: 'none',
      //   definition_id: 'c3d4e5f6-g7h8-i9j0-k1l2-m3n4o5p6q7r8',
      //   description: 'Dramatically increase your rewards earnings with a 25% to 75% bonus on all points earned if you are a Bank of America Preferred Rewards member. This is the single most effective way to maximize the value of this card.',
      //   redemptionInstructions: 'Enrollment in the Preferred Rewards program is required. You must have a qualifying Bank of America checking account and maintain a combined three-month average daily balance of $20k+ for Gold (25% bonus), $50k+ for Platinum (50% bonus), or $100k+ for Platinum Honors (75% bonus). With Platinum Honors, your earning rates become 3.5x on travel/dining and 2.625x on everything else.',
      //   categories: ['Rewards']
      // },
      // {
      //   id: 'boa_pre_airfare_discount',
      //   name: '20% Airfare Discount',
      //   value: 20,
      //   period: 'ongoing',
      //   periodMonths: 0,
      //   resetType: 'none',
      //   definition_id: 'd4e5f6g7-h8i9-j0k1-l2m3-n4o5p6q7r8s9',
      //   description: 'Receive a 20% discount on the price of airfare when you pay with points through the Bank of America Travel Center. This increases the value of your points to 1.25 cents each for these redemptions.',
      //   redemptionInstructions: 'To receive the discount, you must book your flight through the Bank of America Travel Center and elect to pay with your points at checkout. The 20% savings will be automatically reflected in the number of points required for the booking.',
      //   categories: ['Travel', 'Flights', 'Rewards']
      // },
      // {
      //   id: 'boa_pre_base_rewards',
      //   name: 'Base Rewards Rate',
      //   value: 0,
      //   period: 'ongoing',
      //   periodMonths: 0,
      //   resetType: 'none',
      //   definition_id: 'e5f6g7h8-i9j0-k1l2-m3n4-o5p6q7r8s9t0',
      //   description: 'Earn unlimited 2 points for every $1 spent on travel and dining purchases, and a high base rate of 1.5 points for every $1 spent on all other purchases.',
      //   redemptionInstructions: 'Points are earned automatically on all purchases. The travel and dining categories are defined broadly. Points can be redeemed for 1 cent each as a statement credit, for travel, or as a cash deposit into a Bank of America or Merrill account.',
      //   categories: ['Rewards']
      // }
    ],
  },

  /* 13. ——— U.S. BANK ALTITUDE RESERVE ——— */
  {
    id: 'usb_altitude_reserve',
    name: 'U.S. Bank Altitude Reserve Visa Infinite',
    image: require('../../assets/images/usb_altitude_reserve.png'),
    annualFee: 400,
    benefits: [
      {
        id: 'usb_ar_travel_dining',
        name: 'Travel & Dining Credit',
        value: 325,
        period: 'annual',
        periodMonths: 12,
        resetType: 'calendar',
        definition_id: '5413d47b-1c0b-4c29-97db-6bf586e327cc',
        description: 'Receive up to $325 in automatic statement credits for purchases made directly from airlines, hotels, car rental companies, taxis, limousines, passenger trains, cruise lines, restaurants, takeout, and food delivery services.',
        redemptionInstructions: 'This is one of the easiest credits to use. Simply use your Altitude Reserve card for any eligible travel or dining purchase and the credits will be applied automatically until you reach the $325 maximum for your cardmember year. This benefit effectively reduces the annual fee to $75 if fully utilized.',
        categories: ['Travel', 'Dining']
      },
      // {
      //   id: 'usb_ar_mobile_wallet_rewards',
      //   name: 'Mobile Wallet Rewards',
      //   value: 0,
      //   period: 'ongoing',
      //   periodMonths: 0,
      //   resetType: 'none',
      //   definition_id: 'a1b2c3d4-e5f6-g7h8-i9j0-k1l2m3n4o5p6',
      //   description: 'Earn 3X points on eligible purchases made using a mobile wallet (like Apple Pay®, Google Pay™, or Samsung Pay). This is the signature feature of the card and a primary way to accumulate points on everyday spending.',
      //   redemptionInstructions: 'To maximize this benefit, add your Altitude Reserve card to your mobile wallet and use it for all tap-to-pay transactions. When points are redeemed for travel through the U.S. Bank Rewards Center, they are worth 1.5 cents each, making this an effective 4.5% return on mobile wallet spending. You can also redeem points via "Real-Time Rewards" for travel purchases made directly with merchants.',
      //   categories: ['Rewards', 'Shopping']
      // },
      // {
      //   id: 'usb_ar_priority_pass',
      //   name: 'Priority Pass Select Membership',
      //   value: 0,
      //   period: 'annual',
      //   periodMonths: 12,
      //   resetType: 'anniversary',
      //   definition_id: 'b2c3d4e5-f6g7-h8i9-j0k1-l2m3n4o5p6q7',
      //   description: 'Receive a complimentary Priority Pass Select membership, which grants access to over 1,300 airport lounges worldwide. This membership includes a limited number of free visits.',
      //   redemptionInstructions: 'You must enroll for this benefit on the U.S. Bank website. Your membership provides eight complimentary visits per year. These can be used as four visits for yourself and four for guests, or any combination up to eight total visits. After the free visits are used, a fee will be charged for each subsequent entry.',
      //   categories: ['Travel']
      // },
      // {
      //   id: 'usb_ar_global_entry',
      //   name: 'Global Entry or TSA PreCheck Credit',
      //   value: 100,
      //   period: 'quadrennial',
      //   periodMonths: 48,
      //   resetType: 'usage',
      //   definition_id: 'c3d4e5f6-g7h8-i9j0-k1l2-m3n4o5p6q7r8',
      //   description: 'Receive a statement credit of up to $100 for the application fee for either Global Entry or TSA PreCheck.',
      //   redemptionInstructions: 'Pay the application fee for either Global Entry or TSA PreCheck with your Altitude Reserve card. The statement credit will be automatically applied to your account. This benefit is available once every four years, and Global Entry is the recommended choice as it includes TSA PreCheck benefits.',
      //   categories: ['Travel']
      // }
    ],
  },

  /* 14. ——— CITI PRESTIGE (LEGACY) ——— */
  {
    id: 'citi_prestige',
    name: 'Citi Prestige Card',
    image: require('../../assets/images/citi_prestige.jpeg'),
    annualFee: 495,
    benefits: [
      {
        id: 'citi_prestige_travel',
        name: 'Annual Travel Credit',
        value: 250,
        period: 'annual',
        periodMonths: 12,
        resetType: 'calendar',
        definition_id: 'e1c07060-3c13-4387-be74-066ecc30b60f',
        description: 'Up to $250 in statement credits for travel purchases each year. This is a highly flexible credit that applies to a wide range of purchases coding as travel. IMPORTANT: The Citi Prestige card is no longer available to new applicants; this benefit is for existing cardholders.',
        redemptionInstructions: 'No activation is needed. Simply use your card for travel purchases, including airfare, hotels, car rentals, cruise lines, travel agencies, taxis, ride-hailing services, tolls, and parking. The credit is automatically applied to your statement until you have received the full $250. The benefit resets on January 1st each year.',
        categories: ['Travel']
      },
      // {
      //   id: 'citi_prestige_4th_night',
      //   name: '4th Night Free Hotel Stay',
      //   value: 0,
      //   period: 'per_stay',
      //   periodMonths: 0,
      //   resetType: 'none',
      //   definition_id: 'a1b2c3d4-e5f6-g7h8-i9j0-k1l2m3n4o5p6',
      //   description: 'Receive a complimentary fourth night on any hotel stay of four nights or more. The credit is equal to the average nightly rate of your stay, excluding taxes and fees. This benefit can be used up to two times per calendar year.',
      //   redemptionInstructions: 'To use this benefit, you must book your stay of four consecutive nights through thankyou.com or by calling the Citi Concierge. The credit you receive will be for the average cost of one night, not necessarily the actual cost of the fourth night. This benefit is a key feature for existing cardholders but requires booking through Citi\'s channels.',
      //   categories: ['Travel']
      // },
      // {
      //   id: 'citi_prestige_priority_pass',
      //   name: 'Priority Pass Select Membership',
      //   value: 0,
      //   period: 'ongoing',
      //   periodMonths: 0,
      //   resetType: 'none',
      //   definition_id: 'b2c3d4e5-f6g7-h8i9-j0k1-l2m3n4o5p6q7',
      //   description: 'Receive a complimentary Priority Pass Select membership, which grants access to over 1,300 airport lounges worldwide for you and up to two guests or immediate family.',
      //   redemptionInstructions: 'Enrollment is required to receive your Priority Pass membership card. This can be done via your online account or by calling the number on the back of your card. While the U.S. benefit has historically been unlimited, be aware that this benefit has been reduced in some international markets, so it is prudent to confirm the current terms before use.',
      //   categories: ['Travel']
      // },
      // {
      //   id: 'citi_prestige_global_entry',
      //   name: 'Global Entry or TSA PreCheck Credit',
      //   value: 100,
      //   period: 'quadrennial',
      //   periodMonths: 48,
      //   resetType: 'usage',
      //   definition_id: 'c3d4e5f6-g7h8-i9j0-k1l2-m3n4o5p6q7r8',
      //   description: 'Receive a statement credit of up to $100 for the application fee for either Global Entry or TSA PreCheck.',
      //   redemptionInstructions: 'Pay the application fee for either Global Entry or TSA PreCheck with your Citi Prestige card to automatically receive the statement credit. This benefit is available once every 4 to 5 years. Global Entry is generally the better option as it includes TSA PreCheck.',
      //   categories: ['Travel']
      // },
      // {
      //   id: 'citi_prestige_rewards_earning',
      //   name: 'Rewards Earning Structure',
      //   value: 0,
      //   period: 'ongoing',
      //   periodMonths: 0,
      //   resetType: 'none',
      //   definition_id: 'd4e5f6g7-h8i9-j0k1-l2m3-n4o5p6q7r8s9',
      //   description: 'A key remaining benefit is the card\'s reward earning rates. Earn 5x Citi ThankYou Points on air travel and at restaurants, 3x on hotels and cruise lines, and 1x on all other purchases.',
      //   redemptionInstructions: 'Points are earned automatically when you use your card in these spending categories. These points can be transferred to a variety of airline partners or used for travel bookings to maximize their value.',
      //   categories: ['Rewards', 'Dining', 'Travel']
      // }
    ],
  },
];


// Helper function to check if an app is installed
async function isAppInstalled(appKey: keyof typeof APP_SCHEMES): Promise<boolean> {
  const appSchemes = APP_SCHEMES[appKey];
  try {
    if (Platform.OS === 'ios') {
      const schemes = Array.isArray(appSchemes.ios) ? appSchemes.ios : [appSchemes.ios];
      for (const scheme of schemes) {
        if (scheme && await Linking.canOpenURL(scheme)) return true;
      }
      
      // Try universal link if custom scheme fails
      if (await Linking.canOpenURL(appSchemes.fallback)) return true;

      return false;
    } else {
      // On Android, check if the package is installed
      const isPackageInstalled = await Linking.canOpenURL(`${appSchemes.androidPackage}://`);
      if (isPackageInstalled) return true;

      // Try package check as fallback
      try {
        await Linking.sendIntent('android.intent.action.VIEW', [
          { key: 'package', value: appSchemes.androidPackage }
        ]);
        return true;
      } catch {
        return false;
      }
    }
  } catch (error) {
    logger.log(`Error checking if app is installed for ${appKey}:`, error);
    return false;
  }
}

// Helper function to open app or fallback to website/store
async function openAppOrFallback(appKey: keyof typeof APP_SCHEMES): Promise<boolean> {
  const appSchemes = APP_SCHEMES[appKey];
  

  
  try {
    const isInstalled = await isAppInstalled(appKey);
    
    if (isInstalled) {
      // Try to open the app directly
      if (Platform.OS === 'ios') {
        const url = Array.isArray(appSchemes.ios) ? appSchemes.ios[0] : appSchemes.ios;
        try {
          await Linking.openURL(url);
          return true;
        } catch (error) {
          logger.log(`Failed to open ${appKey} with iOS scheme, trying fallback:`, error);
          // Try universal link as fallback
          await Linking.openURL(appSchemes.fallback);
          return true;
        }
      } else {
        const scheme = Array.isArray(appSchemes.android) ? appSchemes.android[0] : appSchemes.android;
        // On Android, try the intent URL first
        try {
          // Use a more reliable intent format for Android
          const intentUrl = `intent://#Intent;package=${appSchemes.androidPackage};scheme=${scheme.replace('://', '')};end`;
          await Linking.openURL(intentUrl);
          return true;
        } catch (error) {
          logger.log(`Failed to open ${appKey} with intent, trying package:`, error);
          // Try package URL as fallback
          try {
            await Linking.openURL(`${appSchemes.androidPackage}://`);
            return true;
          } catch (packageError) {
            logger.log(`Failed to open ${appKey} with package, trying scheme:`, packageError);
            // Try scheme as last resort
            try {
              await Linking.openURL(scheme);
              return true;
            } catch (schemeError) {
              logger.log(`Failed to open ${appKey} with scheme, falling back to website:`, schemeError);
              await Linking.openURL(appSchemes.fallback);
              return true;
            }
          }
        }
      }
    }

    // If app is not installed, show an alert with options
    return new Promise((resolve) => {
      Alert.alert(
        'App Not Installed',
        'Would you like to install the app or visit the website?',
        [
          {
            text: 'Install App',
            onPress: async () => {
              const storeUrl = Platform.select({
                ios: appSchemes.appStoreUrlIOS,
                android: appSchemes.appStoreUrlAndroid,
              });
              if (storeUrl) {
                try {
                  await Linking.openURL(storeUrl);
                } catch (error) {
                  logger.log('Error opening store URL, trying fallback website:', error);
                  await Linking.openURL(appSchemes.fallback);
                }
              }
              resolve(false);
            },
          },
          {
            text: 'Open Website',
            onPress: async () => {
              try {
                await WebBrowser.openBrowserAsync(appSchemes.fallback);
                resolve(true);
              } catch (error) {
                logger.log('Error opening fallback URL with WebBrowser:', error);
                try {
                  await Linking.openURL(appSchemes.fallback);
                  resolve(true);
                } catch (linkError) {
                  logger.log('Error opening fallback URL with Linking:', linkError);
                  resolve(false);
                }
              }
            },
          },
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => resolve(false),
          },
        ],
        { cancelable: true, onDismiss: () => resolve(false) }
      );
    });
  } catch (error) {
    logger.log(`Error in openAppOrFallback for ${appKey}:`, error);
    // If all else fails, try the fallback URL
    try {
      await WebBrowser.openBrowserAsync(appSchemes.fallback);
      return true;
    } catch (fallbackError) {
      logger.log('Fallback URL also failed, trying Linking:', fallbackError);
      try {
        await Linking.openURL(appSchemes.fallback);
        return true;
      } catch (linkError) {
        logger.log('Linking also failed:', linkError);
        return false;
      }
    }
  }
}

// Export function to open perk target
export async function openPerkTarget(perk: CardPerk): Promise<boolean> {
  // Helper function to handle the actual opening logic
  const handleOpen = async (targetPerkName: string): Promise<boolean> => {
    const appKey = PERK_TO_APP_MAP[targetPerkName];
    if (appKey && APP_SCHEMES[appKey]) { // Check if appKey exists and is valid in APP_SCHEMES
      return openAppOrFallback(appKey);
    } else {
      // If no appKey or invalid appKey, fall back to Google search
      logger.log(`No app mapping or invalid appKey found for perk: ${targetPerkName}. Falling back to Google search.`);
      const searchTerm = encodeURIComponent(targetPerkName);
      const googleSearchUrl = `https://www.google.com/search?q=${searchTerm}`;
      try {
        const canOpen = await Linking.canOpenURL(googleSearchUrl);
        if (canOpen) {
          await Linking.openURL(googleSearchUrl);
          return true;
        } else {
          console.error(`Cannot open Google search URL for ${targetPerkName}`);
          Alert.alert("Error", `Could not open a web search for ${targetPerkName}.`);
          return false;
        }
      } catch (error) {
        console.error(`Failed to open Google search for ${targetPerkName}:`, error);
        Alert.alert("Error", `Could not open a link for ${targetPerkName}.`);
        return false;
      }
    }
  };

  // Check if this is a multi-choice perk
  const choices = multiChoicePerksConfig[perk.name];

  if (choices) {
    // Return a promise that resolves when the user makes a choice
    return new Promise((resolve) => {
      Alert.alert(
        `Redeem ${perk.name}`,
        "Choose an option to open:", // Updated message for clarity
        [
          ...choices.map(choice => ({
            text: choice.label,
            onPress: async () => {
              // Use the targetPerkName from the choice for the app mapping
              const success = await handleOpen(choice.targetPerkName);
              resolve(success);
            },
          })),
          {
            text: "Cancel",
            style: "cancel",
            onPress: () => resolve(false)
          },
        ],
        {
          cancelable: true,
          onDismiss: () => resolve(false)
        }
      );
    });
  } else {
    // Single-target perk, use perk.name directly
    return handleOpen(perk.name);
  }
}

// Helper function to get period in months
export function getPeriodMonths(period: Benefit['period']): Benefit['periodMonths'] {
  switch (period) {
    case 'monthly': return 1;
    case 'quarterly': return 3;
    case 'semi_annual': return 6;
    case 'annual': return 12;
    default: return 1;
  }
}

// Helper function to determine if a benefit resets on calendar year
export function isCalendarReset(benefit: Benefit): boolean {
  // Most yearly credits reset on calendar year
  // Most monthly/quarterly credits reset on statement cycle
  return benefit.period === 'annual' || 
         benefit.name.toLowerCase().includes('calendar') ||
         (benefit.description?.toLowerCase().includes('calendar') ?? false);
}

// Utility function to calculate perk expiry date
export function calculatePerkExpiryDate(periodMonths: number): Date {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-11

  switch (periodMonths) {
    case 1: // Monthly - expires on 1st of next month
      const nextMonth = new Date(currentYear, currentMonth + 1, 1);
      return nextMonth;

    case 3: // Quarterly - expires on next quarter start (Jan 1, Apr 1, Jul 1, Oct 1)
      const currentQuarter = Math.floor(currentMonth / 3);
      const nextQuarterMonth = (currentQuarter + 1) * 3;
      const nextQuarterYear = nextQuarterMonth >= 12 ? currentYear + 1 : currentYear;
      return new Date(nextQuarterYear, nextQuarterMonth % 12, 1);

    case 6: // Semi-annual - expires on next semi-annual date (Jan 1 or Jul 1)
      const isFirstHalf = currentMonth < 6;
      if (isFirstHalf) {
        return new Date(currentYear, 6, 1); // July 1st
      } else {
        return new Date(currentYear + 1, 0, 1); // Jan 1st next year
      }

    case 12: // Annual - expires on Jan 1st next year
      return new Date(currentYear + 1, 0, 1);

    default:
      return new Date(currentYear, currentMonth + periodMonths, 1);
  }
} 