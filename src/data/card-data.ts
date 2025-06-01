import { Platform, Linking, Alert } from 'react-native';
import { ImageSourcePropType } from 'react-native';

export interface Benefit {
  id: string;
  name: string;
  value: number; // Can be monetary value or other unit
  period: 'monthly' | 'quarterly' | 'semi_annual' | 'yearly';
  periodMonths: 1 | 3 | 6 | 12; // Number of months between resets
  resetType: 'calendar' | 'anniversary'; // Whether benefit resets on calendar year or card anniversary
  definition_id: string;
  description?: string; // Optional detailed description
  redemptionInstructions?: string; // How to redeem, e.g., link, in-app action
  appScheme?: keyof typeof APP_SCHEMES; // Link benefits to app schemes
  eligibleServices?: string[]; // Array of eligible services/merchants for redemption
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
    ios: 'walmart://',
    android: 'com.walmart.android://',
    fallback: 'https://www.walmart.com/plus',
    androidPackage: 'com.walmart.android',
    appStoreUrlIOS: 'https://apps.apple.com/app/walmart-shopping-grocery/id338137227',
    appStoreUrlAndroid: 'https://play.google.com/store/apps/details?id=com.walmart.android',
  },
  capitalOne: {
    ios: 'capitalone://',
    android: 'com.capitalone.mobile://',
    fallback: 'https://travel.capitalone.com/',
    androidPackage: 'com.capitalone.mobile',
    appStoreUrlIOS: 'https://apps.apple.com/app/id407558537',
    appStoreUrlAndroid: 'https://play.google.com/store/apps/details?id=com.capitalone.mobile',
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
    ios: 'saksfifthavenue://',
    android: 'com.saks.android://',
    fallback: 'https://www.saksfifthavenue.com/',
    androidPackage: 'com.saks.android',
    appStoreUrlIOS: 'https://apps.apple.com/app/saks-fifth-avenue/id491507258',
    appStoreUrlAndroid: 'https://play.google.com/store/apps/details?id=com.saks.android',
  },
  equinox: {
    ios: 'equinox://',
    android: 'com.equinox.mobile://',
    fallback: 'https://www.equinox.com/',
    androidPackage: 'com.equinox.mobile',
    appStoreUrlIOS: 'https://apps.apple.com/app/equinox/id394112157',
    appStoreUrlAndroid: 'https://play.google.com/store/apps/details?id=com.equinox.mobile',
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
    { label: "Open Wall Street Journal", targetPerkName: "WSJ Credit" },
  ],
  "Uber Cash": [
    { label: "Open Uber (Rides)", targetPerkName: "Uber Ride Credit" },
    { label: "Open Uber Eats", targetPerkName: "Uber Eats Credit" },
  ],
  "Dining Credit": [
    { label: "Open Grubhub", targetPerkName: "Grubhub Credit" },
    { label: "Open Resy", targetPerkName: "Resy Credit" },
    { label: "View Other Options", targetPerkName: "Dining Info" },
  ],
  "Lifestyle Convenience Credits": [
    { label: "Open Uber/Lyft", targetPerkName: "Rideshare Credit" },
    { label: "Open DoorDash", targetPerkName: "Food Delivery Credit" },
    { label: "View Streaming Options", targetPerkName: "Streaming Credit" },
    { label: "View All Options", targetPerkName: "Lifestyle Credit Info" },
  ],
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
        description: 'Up to $15 in Uber Cash each month for U.S. Uber rides or Uber Eats orders (extra $20 in December, totaling $200/year).',
        redemptionInstructions: 'Add your Platinum Card to the Uber app to automatically receive Uber Cash each month.',
        appScheme: 'uber',
      },
      {
        id: 'platinum_digital_ent',
        name: 'Digital Entertainment Credit',
        value: 20,
        period: 'monthly',
        periodMonths: 1,
        resetType: 'calendar',
        definition_id: '7e10ad1b-792e-4c34-8d36-bd0ebbca8591',
        description: 'Up to $20 back each month on eligible digital subscriptions. As of 2024–2025, covered services include Disney+ (and bundle with Hulu/ESPN+), Hulu, ESPN+, Peacock, The New York Times, and The Wall Street Journal.',
        redemptionInstructions: 'Enroll and pay with your Platinum Card for eligible digital subscriptions. The credit posts as a statement credit each month after an eligible charge.',
      },
      {
        id: 'platinum_walmart_plus',
        name: 'Walmart+ Membership Rebate',
        value: 12.95,
        period: 'monthly',
        periodMonths: 1,
        resetType: 'calendar',
        definition_id: 'b4ca65e4-a537-4688-b46a-63326bd72f36',
        description: 'Full reimbursement of Walmart+ monthly membership fee ($12.95 plus applicable taxes, ~$155/year).',
        redemptionInstructions: 'Enroll and use your Platinum Card to pay for a Walmart+ monthly membership. The credit will appear after the charge posts each month.',
        appScheme: 'walmart',
      },
      {
        id: 'platinum_equinox',
        name: 'Equinox Credit',
        value: 25,
        period: 'monthly',
        periodMonths: 1,
        resetType: 'calendar',
        definition_id: '360e8050-d55d-46e4-a604-a3006dc39724',
        description: 'Up to $25 back each month on Equinox gym memberships or Equinox+ digital fitness subscriptions (up to $300 annually).',
        redemptionInstructions: 'Use your Platinum Card to pay for an Equinox gym membership or Equinox+ digital fitness subscription. Credit posts monthly after charge.',
      },
      {
        id: 'platinum_saks',
        name: 'Saks Fifth Avenue Credit',
        value: 50,
        period: 'semi_annual',
        periodMonths: 6,
        resetType: 'anniversary',
        definition_id: '008f140c-56fe-48f1-9e89-6c39391e3def',
        description: 'Up to $50 in statement credits twice per year (Jan–Jun and Jul–Dec; $100 total annually).',
        redemptionInstructions: 'Enroll, then use your Platinum Card at Saks Fifth Avenue (in-store or online). Unused semiannual credits do not carry over.',
      },
      {
        id: 'platinum_clear',
        name: 'CLEAR® Plus Credit',
        value: 189,
        period: 'yearly',
        periodMonths: 12,
        resetType: 'calendar',
        definition_id: '7d9d198c-5fd4-4d3e-b095-8059e89273d2',
        description: 'Up to $189 in statement credits per calendar year to cover CLEAR Plus membership.',
        redemptionInstructions: 'Enroll in CLEAR Plus and pay with your Platinum Card. The credit covers one annual CLEAR membership.',
      },
      {
        id: 'platinum_airline_fee',
        name: 'Airline Fee Credit',
        value: 200,
        period: 'yearly',
        periodMonths: 12,
        resetType: 'calendar',
        definition_id: 'd8158b44-a979-40a5-ab13-1042577b5263',
        description: 'Up to $200 in statement credits per calendar year for incidental fees with one selected qualifying airline.',
        redemptionInstructions: 'Enroll and select one qualifying airline on your Amex account. Charges for incidental airline fees (checked bags, seat upgrades, lounge passes, etc.) will be reimbursed. Credit resets every Jan 1.',
      },
      {
        id: 'platinum_hotel_credit',
        name: 'Hotel Credit (FHR/THC)',
        value: 200,
        period: 'yearly',
        periodMonths: 12,
        resetType: 'calendar',
        definition_id: '37eeb419-2110-4ca2-ac70-0eebbd587530',
        description: 'Up to $200 back in statement credits each calendar year for prepaid hotels booked through Amex Fine Hotels + Resorts or The Hotel Collection.',
        redemptionInstructions: 'Use your Platinum Card to book prepaid hotels through Amex FHR or The Hotel Collection (minimum 2-night stay for THC) via Amex Travel.',
      },
    ],
  },

  /* 2. ——— AMEX GOLD ——— */
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
        periodMonths: 1,
        resetType: 'calendar',
        definition_id: '86836d3c-6573-43ec-9b42-33493bec5765',
        description: 'Up to $10 in Uber Cash each month for U.S. Uber rides or Uber Eats orders. Credits do not roll over - use it or lose it each month.',
        redemptionInstructions: 'Add your Gold Card to the Uber wallet and the credit auto-appears as Uber Cash.',
        appScheme: 'uber',
      },
      {
        id: 'amex_gold_grubhub',
        name: 'Grubhub Credit',
        value: 10,
        period: 'monthly',
        periodMonths: 1,
        resetType: 'calendar',
        definition_id: '8c57ee72-0b5b-4d93-aeee-150c15539514',
        description: 'Up to $10 back each month at eligible dining partners: Grubhub/Seamless, The Cheesecake Factory, Goldbelly, Wine.com, and select Resy restaurants.',
        redemptionInstructions: 'Enroll your card and use it at eligible merchants. Credit appears automatically after qualifying purchase of $10 or more.',
        appScheme: 'grubhub',
      },
      {
        id: 'amex_gold_resy',
        name: 'Resy Dining Credit',
        value: 50,
        period: 'semi_annual',
        periodMonths: 6,
        resetType: 'anniversary',
        definition_id: 'd538f219-3595-4a96-85da-508054a9b36d',
        description: 'Up to $50 in statement credits twice per year (Jan-Jun and Jul-Dec) for dining purchases at Resy-booked restaurants in the U.S.',
        redemptionInstructions: 'Book and dine at Resy partner restaurants. No special code needed; credit posts automatically after dining.',
        appScheme: 'resy',
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
        id: 'csr_travel',
        name: 'Travel Purchase Credit',
        value: 300,
        period: 'yearly',
        periodMonths: 12,
        resetType: 'calendar',
        definition_id: 'e1c07060-3c13-4387-be74-066ecc30b60f',
        description: 'Up to $300 in statement credits for travel purchases each calendar year. Applies to a broad range of travel expenses including airfare, hotels, car rentals, cruises, taxis, public transit, parking, tolls, etc.',
        redemptionInstructions: 'Use your Sapphire Reserve for any travel or transit purchases. Credits are applied in real time until you hit $300. Resets every January.',
      },
      {
        id: 'csr_doordash_restaurant',
        name: 'DoorDash Restaurant Credit',
        value: 5,
        period: 'monthly',
        periodMonths: 1,
        resetType: 'calendar',
        definition_id: '8726f459-c527-45c6-8321-59666524784e',
        description: '$5 off one eligible DoorDash restaurant order each month when paying with the Reserve card and enrolled in complimentary DashPass (valid through Dec 2027).',
        redemptionInstructions: 'Enroll for complimentary DashPass membership. The $5 discount is available in your DoorDash account\'s "Promo" section each month and must be applied at checkout.',
        appScheme: 'doordash',
      },
      {
        id: 'csr_doordash_non_restaurant_1',
        name: 'DoorDash Non-Restaurant Credit #1',
        value: 10,
        period: 'monthly',
        periodMonths: 1,
        resetType: 'calendar',
        definition_id: '38ca9405-eafc-4f95-aac0-c436d050c0d0',
        description: '$10 off one eligible non-restaurant order (grocery, convenience store, etc.) per month with DashPass enrollment (valid through Dec 2027).',
        redemptionInstructions: 'Use your Reserve card with active DashPass membership. The $10 discount appears in your DoorDash account\'s "Promo" section and must be applied at checkout.',
        appScheme: 'doordash',
      },
      {
        id: 'csr_doordash_non_restaurant_2',
        name: 'DoorDash Non-Restaurant Credit #2',
        value: 10,
        period: 'monthly',
        periodMonths: 1,
        resetType: 'calendar',
        definition_id: 'ed2aa3a3-8ad3-4739-bf34-55eb1dd741c5',
        description: 'Second $10 off eligible non-restaurant order (grocery, convenience store, etc.) per month with DashPass enrollment (valid through Dec 2027).',
        redemptionInstructions: 'Use your Reserve card with active DashPass membership. The second $10 discount appears in your DoorDash account\'s "Promo" section after using the first credit.',
        appScheme: 'doordash',
      },
      {
        id: 'csr_lyft',
        name: 'Lyft Credit',
        value: 10,
        period: 'monthly',
        periodMonths: 1,
        resetType: 'calendar',
        definition_id: 'f79316d4-5ddd-4591-830b-6e897a3dd0f5',
        description: '$10 in-app Lyft ride credit each month (April 2025 through Sept 2027). Plus earn 5x points on Lyft rides.',
        redemptionInstructions: 'Add your Sapphire Reserve as the payment method in the Lyft app. Credit appears automatically (usually labeled as "Amp" or Chase credit) and applies to your next ride(s).',
      },
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
        period: 'yearly',
        periodMonths: 12,
        resetType: 'calendar',
        definition_id: '32a15587-31ef-473a-a73b-b40c68026419',
        description: 'Up to $50 statement credit each account anniversary year for hotel stays booked via the Chase Ultimate Rewards travel portal.',
        redemptionInstructions: 'Book a hotel through Chase Travel using your Sapphire Preferred; the first $50 of hotel charges will be automatically refunded. Credit resets every account anniversary.',
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
        definition_id: '8c57ee72-0b5b-4d93-aeee-150c15539514',
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
        periodMonths: 3,
        resetType: 'anniversary',
        definition_id: 'd8158b44-a979-40a5-ab13-1042577b5263',
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
        periodMonths: 12,
        resetType: 'calendar',
        definition_id: '0faeed05-234e-4110-a710-b8cb41bb0f72',
        description: 'Up to $300 per year in credits to offset bookings made through the Capital One Travel portal. Can be used in part or full across multiple bookings.',
        redemptionInstructions: 'Use your Venture X to book travel through the Capital One Travel portal. At checkout, you can apply the credit to your booking. Credit resets on your account anniversary each year.',
        appScheme: 'capitalOne',
      },
      {
        id: 'venturex_anniversary',
        name: 'Anniversary Miles Bonus',
        value: 100,
        period: 'yearly',
        periodMonths: 12,
        resetType: 'calendar',
        definition_id: 'c6004d5f-c5c4-435e-b717-eb6cafd9a089',
        description: '10,000 bonus miles awarded every account anniversary (≈$100 in travel value).',
        redemptionInstructions: 'Automatic benefit - miles are deposited into your account each anniversary.',
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
        periodMonths: 1,
        resetType: 'calendar',
        definition_id: '55fec7a1-de50-40c9-b5a2-0f456161def0',
        description: 'Up to $7 back each month on Disney Bundle subscription (Disney+, Hulu, and ESPN+) when you spend $9.99 or more.',
        redemptionInstructions: 'Enroll your Blue Cash Preferred and use it to pay for the Disney Bundle. Credit posts monthly after the charge.',
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
        name: 'CLEAR® Plus Credit',
        value: 189,
        period: 'yearly',
        periodMonths: 12,
        resetType: 'calendar',
        definition_id: '7d9d198c-5fd4-4d3e-b095-8059e89273d2',
        description: 'Up to $189 in statement credits per calendar year for CLEAR Plus airport security membership.',
        redemptionInstructions: 'Use your Green Card to pay for a CLEAR Plus membership. No enrollment required beyond using the card for payment.',
      },
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
        period: 'yearly',
        periodMonths: 12,
        resetType: 'calendar',
        definition_id: 'd8158b44-a979-40a5-ab13-1042577b5263',
        description: 'Up to $100 in statement credits per calendar year for qualifying airline incidental fees (checked baggage, seat selection fees, lounge passes, onboard food, etc.).',
        redemptionInstructions: 'Use your Premium Rewards card to pay for qualifying airline incidental fees. No enrollment needed; credits post usually within a week of an eligible charge until you hit $100 for the year.',
      },
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
        period: 'yearly',
        periodMonths: 12,
        resetType: 'calendar',
        definition_id: 'd8158b44-a979-40a5-ab13-1042577b5263',
        description: 'Up to $300 annually in airline incidental fee credits for charges like seat upgrades, baggage fees, airline lounge memberships, etc. (not airfare).',
        redemptionInstructions: 'Use the card for qualifying airline fees and you\'ll be reimbursed automatically, up to $300 per year. Resets each calendar year.',
      },
      {
        id: 'boa_pre_lifestyle',
        name: 'Lifestyle Convenience Credits',
        value: 150,
        period: 'yearly',
        periodMonths: 12,
        resetType: 'calendar',
        definition_id: 'd8158b44-a979-40a5-ab13-1042577b5261',
        description: 'Up to $150 annually in statement credits for lifestyle expenses including ride-hailing, streaming services, food delivery, and fitness subscriptions.',
        redemptionInstructions: 'Use the card for eligible lifestyle purchases like monthly streaming subscriptions, Uber/Lyft rides, food delivery, or gym memberships. Credits post automatically as eligible transactions occur.',
      },
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
        name: 'Travel/Dining Credit',
        value: 325,
        period: 'yearly',
        periodMonths: 12,
        resetType: 'calendar',
        definition_id: 'e1c07060-3c13-4387-be74-066ecc30b60f',
        description: 'Up to $325 per year in combined travel and dining purchases reimbursement. Includes airlines, hotels, rental cars, taxis, restaurants, takeout, and food delivery.',
        redemptionInstructions: 'Use the Altitude Reserve for any travel or dining expenses. Charges in those categories will be credited back until you\'ve accumulated $325 in credits. Resets on your cardmember anniversary.',
      },
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
        name: 'Travel Credit',
        value: 250,
        period: 'yearly',
        periodMonths: 12,
        resetType: 'calendar',
        definition_id: 'e1c07060-3c13-4387-be74-066ecc30b60f',
        description: 'Up to $250 in statement credits for travel purchases each year. Any purchase that codes as travel (flights, hotels, travel agencies, parking, Uber/Lyft, etc.) will be automatically reimbursed.',
        redemptionInstructions: 'No activation needed; use the card for travel purchases and receive automatic statement credits until you hit $250 for the year. Credit resets every Jan 1.',
      },
    ],
  },
];

// Helper function to map perk names to app schemes
export const PERK_TO_APP_MAP: Record<string, keyof typeof APP_SCHEMES> = {
  // Uber/Rides
  'Uber Ride Credit': 'uber',
  'Uber Eats Credit': 'uberEats',
  'Uber Cash': 'uber',
  'Uber Cash Credit': 'uber',
  
  // Food Delivery
  'Grubhub Credit': 'grubhub',
  'DoorDash Restaurant Credit': 'doordash',
  'DoorDash Non-Restaurant Credit #1': 'doordash',
  'DoorDash Non-Restaurant Credit #2': 'doordash',
  'DoorDash Grocery Credit': 'doordash',
  'Food Delivery Credit': 'doordash',
  
  // Streaming/Entertainment
  'Disney+ Credit': 'disneyPlus',
  'Disney Bundle Credit': 'disneyPlus',
  'Digital Entertainment Credit': 'disneyPlus',
  
  // Retail
  'Saks Fifth Avenue Credit': 'saks',
  'Walmart+ Membership Rebate': 'walmart',
  
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
};

// Helper function to check if an app is installed
async function isAppInstalled(appKey: keyof typeof APP_SCHEMES): Promise<boolean> {
  const appSchemes = APP_SCHEMES[appKey];
  try {
    if (Platform.OS === 'ios') {
      // On iOS, we need to check both the custom scheme and universal links
      const customSchemeSupported = await Linking.canOpenURL(appSchemes.ios);
      if (customSchemeSupported) return true;
      
      // Try universal link if custom scheme fails
      const universalLinkSupported = await Linking.canOpenURL(appSchemes.fallback);
      return universalLinkSupported;
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
    console.log(`Error checking if app is installed for ${appKey}:`, error);
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
        try {
          await Linking.openURL(appSchemes.ios);
          return true;
        } catch (error) {
          console.log(`Failed to open ${appKey} with iOS scheme, trying fallback:`, error);
          // Try universal link as fallback
          await Linking.openURL(appSchemes.fallback);
          return true;
        }
      } else {
        // On Android, try the intent URL first
        try {
          // Use a more reliable intent format for Android
          const intentUrl = `intent://#Intent;package=${appSchemes.androidPackage};scheme=${appSchemes.android.replace('://', '')};end`;
          await Linking.openURL(intentUrl);
          return true;
        } catch (error) {
          console.log(`Failed to open ${appKey} with intent, trying package:`, error);
          // Try package URL as fallback
          try {
            await Linking.openURL(`${appSchemes.androidPackage}://`);
            return true;
          } catch (packageError) {
            console.log(`Failed to open ${appKey} with package, trying scheme:`, packageError);
            // Try scheme as last resort
            try {
              await Linking.openURL(appSchemes.android);
              return true;
            } catch (schemeError) {
              console.log(`Failed to open ${appKey} with scheme, falling back to website:`, schemeError);
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
                  console.log('Error opening store URL, trying fallback website:', error);
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
                await Linking.openURL(appSchemes.fallback);
                resolve(true);
              } catch (error) {
                console.log('Error opening fallback URL:', error);
                resolve(false);
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
    console.log(`Error in openAppOrFallback for ${appKey}:`, error);
    // If all else fails, try the fallback URL
    try {
      await Linking.openURL(appSchemes.fallback);
      return true;
    } catch (fallbackError) {
      console.log('Fallback URL also failed:', fallbackError);
      return false;
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
      console.log(`No app mapping or invalid appKey found for perk: ${targetPerkName}. Falling back to Google search.`);
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
  const periodMap: Record<Benefit['period'], Benefit['periodMonths']> = {
    'monthly': 1,
    'quarterly': 3,
    'semi_annual': 6,
    'yearly': 12,
  };
  return periodMap[period];
}

// Helper function to determine if a benefit resets on calendar year
export function isCalendarReset(benefit: Benefit): boolean {
  // Most yearly credits reset on calendar year
  // Most monthly/quarterly credits reset on statement cycle
  return benefit.period === 'yearly' || 
         benefit.name.toLowerCase().includes('calendar') ||
         (benefit.description?.toLowerCase().includes('calendar') ?? false);
} 