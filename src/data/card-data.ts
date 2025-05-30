import { Platform, Linking, Alert } from 'react-native';

export interface Benefit {
  id: string;
  name: string;
  value: number; // Can be monetary value or other unit
  period: 'monthly' | 'quarterly' | 'yearly' | 'one-time' | 'semi_annual';
  description?: string; // Optional detailed description
  redemptionInstructions?: string; // How to redeem, e.g., link, in-app action
  appScheme?: keyof typeof APP_SCHEMES; // New field to link benefits to app schemes
  // Add other relevant fields like category (e.g., travel, dining, shopping)
}

export interface Card {
  id: string;
  name: string;
  image: any; // React Native's ImageSourcePropType for require
  annualFee?: number; // Optional: good to track for value calculations
  benefits: Benefit[];
}

export interface CardPerk extends Benefit {
  cardId: string;
  status: 'available' | 'redeemed';
  streakCount: number;
  coldStreakCount: number;
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
    appStoreUrlIOS: 'https://apps.apple.com/app/grubhub-local-food-delivery/id302920553',
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
    ios: 'hulu://',
    android: 'hulu://',
    fallback: 'https://www.hulu.com/',
    androidPackage: 'com.hulu.plus',
    appStoreUrlIOS: 'https://apps.apple.com/app/id376510438',
    appStoreUrlAndroid: 'https://play.google.com/store/apps/details?id=com.hulu.plus',
  },
  espn: {
    ios: 'sportscenter://',
    android: 'sportscenter://',
    fallback: 'https://www.espn.com/espnplus/',
    androidPackage: 'com.espn.score_center',
    appStoreUrlIOS: 'https://apps.apple.com/app/id317469184',
    appStoreUrlAndroid: 'https://play.google.com/store/apps/details?id=com.espn.score_center',
  },
  peacock: {
    ios: 'peacock://',
    android: 'peacocktv://',
    fallback: 'https://www.peacocktv.com/',
    androidPackage: 'com.peacocktv.peacockandroid',
    appStoreUrlIOS: 'https://apps.apple.com/app/id1508186374',
    appStoreUrlAndroid: 'https://play.google.com/store/apps/details?id=com.peacocktv.peacockandroid',
  },
  nytimes: {
    ios: 'nytimes://',
    android: 'nytimes://',
    fallback: 'https://www.nytimes.com/',
    androidPackage: 'com.nytimes.android',
    appStoreUrlIOS: 'https://apps.apple.com/app/id284862083',
    appStoreUrlAndroid: 'https://play.google.com/store/apps/details?id=com.nytimes.android',
  },
  dunkin: {
    ios: 'dunkindonuts://',
    android: 'dunkindonuts://',
    fallback: 'https://www.dunkindonuts.com/',
    androidPackage: 'com.dunkinbrands.otgo',
    appStoreUrlIOS: 'https://apps.apple.com/app/id1056813463',
    appStoreUrlAndroid: 'https://play.google.com/store/apps/details?id=com.dunkinbrands.otgo',
  },
  doordash: {
    ios: 'doordash://',
    android: 'doordash://',
    fallback: 'https://www.doordash.com/',
    androidPackage: 'com.dd.doordash',
    appStoreUrlIOS: 'https://apps.apple.com/app/id719972451',
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
    appStoreUrlIOS: 'https://apps.apple.com/app/id799274035',
    appStoreUrlAndroid: 'https://play.google.com/store/apps/details?id=com.resy.android',
  },
  walmart: {
    ios: 'walmart://',
    android: 'walmart://',
    fallback: 'https://www.walmart.com/plus',
    androidPackage: 'com.walmart.android',
    appStoreUrlIOS: 'https://apps.apple.com/app/id338137227',
    appStoreUrlAndroid: 'https://play.google.com/store/apps/details?id=com.walmart.android',
  },
  capitalOne: {
    ios: 'capitalone://',
    android: 'capitalone://',
    fallback: 'https://travel.capitalone.com/',
    androidPackage: 'com.capitalone.mobile',
    appStoreUrlIOS: 'https://apps.apple.com/app/id407558537',
    appStoreUrlAndroid: 'https://play.google.com/store/apps/details?id=com.capitalone.mobile',
  },
};

// Multi-choice Perk Configuration
export const multiChoicePerksConfig: Record<string, MultiChoicePerkConfig[]> = {
  "Digital Entertainment Credit": [
    { label: "Open Disney+", targetPerkName: "Disney+ Credit" },
    { label: "Open Hulu", targetPerkName: "Hulu Credit" },
    { label: "Open ESPN+", targetPerkName: "ESPN+ Credit" },
    { label: "Open Peacock", targetPerkName: "Peacock Credit" },
    { label: "Open NYTimes", targetPerkName: "NYTimes Credit" },
  ],
  "Uber Cash": [
    { label: "Open Uber (Rides)", targetPerkName: "Uber Ride Credit" },
    { label: "Open Uber Eats", targetPerkName: "Uber Eats Credit" },
  ],
  // ... [keep all other multiChoicePerksConfig entries]
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
        value: 15,          // $15 (plus an extra $20 every Dec.)
        period: 'monthly',
        description: 'Up to $15 in Uber Cash each month for rides or Uber Eats orders (extra $20 in December).',
        redemptionInstructions: 'Add your Platinum Card to the Uber wallet and the credit auto-appears as Uber Cash.',
      },
      {
        id: 'platinum_digital_ent',
        name: 'Digital Entertainment Credit',
        value: 20,
        period: 'monthly',
        description: '$20 in statement credits for Disney+, Hulu, ESPN+, Peacock or NYT subscriptions.',
      },
      {
        id: 'platinum_walmart_plus',
        name: 'Walmart+ Membership Rebate',
        value: 12.95,
        period: 'monthly',
        description: 'Reimburses one Walmart+ monthly membership (up to $12.95 + tax).',
      },
    ],
  },

  /* 2. ——— AMEX GOLD (sample expanded) ——— */
  {
    id: 'amex_gold',
    name: 'American Express Gold',
    image: require('../../assets/images/amex_gold.avif'),
    annualFee: 250,
    benefits: [
      {
        id: 'amex_gold_uber',
        name: 'Uber Cash Credit',
        value: 10,
        period: 'monthly',
        description: 'Up to $10 in Uber Cash each month for U.S. Uber rides or Uber Eats orders. Add your Gold Card to the Uber app to receive the credit automatically. Credits do not roll over - use it or lose it each month.',
        redemptionInstructions: 'Add your Gold Card to the Uber wallet and the credit auto-appears as Uber Cash.',
      },
      {
        id: 'amex_gold_grubhub',
        name: 'Grubhub Credit',
        value: 10,
        period: 'monthly',
        description: 'Up to $10 back each month at Grubhub/Seamless, The Cheesecake Factory, Goldbelly, Wine.com, and select Resy restaurants. Simply use your Gold Card at eligible merchants to receive the credit.',
        redemptionInstructions: 'Enroll your card in the benefit and use it at eligible merchants. Credit appears automatically after qualifying purchase.',
      },
      {
        id: 'amex_gold_resy',
        name: 'Resy Dining Credit',
        value: 50,
        period: 'semi_annual',
        description: 'Up to $50 in statement credits twice per year (Jan-Jun and Jul-Dec) for dining purchases at Resy-booked restaurants in the U.S.',
        redemptionInstructions: 'Book and dine at Resy partner restaurants. No special code needed; credit posts automatically after dining.',
      },
      {
        id: 'amex_gold_dunkin',
        name: 'Dunkin\' Donuts Credit',
        value: 7,
        period: 'monthly',
        description: 'Up to $7 in statement credits each month for Dunkin\' Donuts purchases in the U.S. when you spend $7 or more.',
        redemptionInstructions: 'Enroll your card and use it at Dunkin\' Donuts. Credit appears on statement after qualifying purchase.',
      },
    ],
  },

  /* 3. ——— CHASE SAPPHIRE RESERVE ——— */
  {
    id: 'chase_sapphire_reserve',
    name: 'Chase Sapphire Reserve',
    image: require('../../assets/images/chase_sapphire_reserve.png'),
    annualFee: 550,
    benefits: [
      {
        id: 'csr_doordash_grocery',
        name: 'DoorDash Grocery Credits',
        value: 20,        // two $10 credits / month
        period: 'monthly',
        description: '$20 in DoorDash credits for grocery & convenience orders (2 × $10 promos).',
      },
      {
        id: 'csr_doordash_restaurant',
        name: 'DoorDash Restaurant Credit',
        value: 5,
        period: 'monthly',
        description: '$5 DoorDash credit for restaurant orders while enrolled in DashPass.',
      },
      {
        id: 'csr_instacart',
        name: 'Instacart Credit',
        value: 15,
        period: 'monthly',
        description: 'Up to $15 in Instacart statement credits after enrolling in the complimentary Instacart+ membership.',
      },
      {
        id: 'csr_travel',
        name: 'Annual Travel Credit',
        value: 300,
        period: 'yearly',
        description: '$300 automatic credit toward travel purchases each cardmember year.',
      },
    ],
  },

  /* 4. ——— CHASE SAPPHIRE PREFERRED (sample existed) ——— */
  {
    id: 'chase_sapphire_preferred',
    name: 'Chase Sapphire Preferred',
    image: require('../../assets/images/chase_sapphire_preferred.png'),
    annualFee: 95,
    benefits: [
      {
        id: 'csp_doordash_grocery',
        name: 'DoorDash Grocery Credit',
        value: 10,
        period: 'monthly',
        description: '$10 DoorDash credit for grocery / non-restaurant orders while enrolled in DashPass.',
      },
      {
        id: 'csp_instacart',
        name: 'Instacart Credit',
        value: 15,
        period: 'quarterly',
        description: 'Up to $15 in Instacart statement credits each quarter after activating Instacart+ membership.',
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
        description: '$25 dining statement credit each month (up to $300 per year) at restaurants worldwide.',
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
        description: 'Up to $50 back in statement credits each quarter on eligible flight purchases (total $200 yr).',
      },
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
        period: 'yearly',
        description: '$300 credit each cardmember year for bookings made through the Capital One Travel portal.',
      },
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
        description: '$7 statement credit after spending ≥ $9.99 on an eligible Disney Bundle subscription.',
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
        description: 'Up to $20 back each month on Resy restaurant purchases.',
      },
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
        name: 'CLEAR Plus Credit',
        value: 189,
        period: 'yearly',
        description: 'Up to $189 in statement credits per calendar year for CLEAR Plus airport security membership.',
      },
    ],
  },
];

// Helper function to map perk names to app schemes
export const PERK_TO_APP_MAP: Record<string, keyof typeof APP_SCHEMES> = {
  'Uber Ride Credit': 'uber',
  'Uber Eats Credit': 'uberEats',
  'Grubhub Credit': 'grubhub',
  'Disney+ Credit': 'disneyPlus',
  'Hulu Credit': 'hulu',
  'ESPN+ Credit': 'espn',
  'Peacock Credit': 'peacock',
  'NYTimes Credit': 'nytimes',
  "Dunkin' Donuts Credit": 'dunkin',
  "DoorDash Grocery Credit": 'doordash',
  "DoorDash Restaurant Credit": 'doordash',
  "Instacart Credit": 'instacart',
  "Resy Credit": 'resy',
  "Walmart+ Membership Rebate": 'walmart',
  "Capital One Travel Credit": 'capitalOne',
};

// Helper function to check if an app is installed
async function isAppInstalled(appKey: keyof typeof APP_SCHEMES): Promise<boolean> {
  const appSchemes = APP_SCHEMES[appKey];
  try {
    if (Platform.OS === 'ios') {
      return await Linking.canOpenURL(appSchemes.ios);
    } else {
      return await Linking.canOpenURL(appSchemes.android);
    }
  } catch (error) {
    console.log(`Error checking if app is installed for ${appKey}:`, error);
    return false;
  }
}

// Helper function to open app or fallback to website/store
async function openAppOrFallback(appKey: keyof typeof APP_SCHEMES): Promise<boolean> {
  const appSchemes = APP_SCHEMES[appKey];
  const scheme = Platform.select({
    ios: appSchemes.ios,
    android: appSchemes.android,
  });
  
  if (!scheme) {
    console.log(`No scheme found for platform: ${Platform.OS}`);
    return false;
  }

  try {
    const isInstalled = await isAppInstalled(appKey);
    if (isInstalled) {
      await Linking.openURL(scheme);
      return true;
    } else {
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
                  await Linking.openURL(storeUrl);
                }
                resolve(false);
              },
            },
            {
              text: 'Open Website',
              onPress: async () => {
                await Linking.openURL(appSchemes.fallback);
                resolve(true);
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
    }
  } catch (error) {
    console.error(`Error opening ${appKey}:`, error);
    // If the deep link fails, try the fallback URL
    try {
      await Linking.openURL(appSchemes.fallback);
      return true;
    } catch (fallbackError) {
      console.error('Fallback URL also failed:', fallbackError);
      return false;
    }
  }
}

// Export function to open perk target app
export async function openPerkTarget(perk: CardPerk): Promise<boolean> {
  // Check if this is a multi-choice perk
  const choices = multiChoicePerksConfig[perk.name];

  if (choices) {
    // Return a promise that resolves when the user makes a choice
    return new Promise((resolve) => {
      Alert.alert(
        `Redeem ${perk.name}`,
        "Choose an app to open:",
        [
          ...choices.map(choice => ({
            text: choice.label,
            onPress: async () => {
              const appKey = PERK_TO_APP_MAP[choice.targetPerkName];
              if (!appKey) {
                console.log(`No app mapping found for perk: ${choice.targetPerkName}`);
                resolve(false);
                return;
              }
              const success = await openAppOrFallback(appKey);
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
    // Single-target perk
    const appKey = PERK_TO_APP_MAP[perk.name];
    if (!appKey) {
      console.log(`No app mapping found for perk: ${perk.name}`);
      return false;
    }
    return openAppOrFallback(appKey);
  }
} 