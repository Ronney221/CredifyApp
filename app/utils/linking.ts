import { Linking, Alert, Platform } from 'react-native';
import * as Application from 'expo-application';
import { CardPerk, multiChoicePerksConfig } from '../types';

interface PerkTargetConfig {
  appScheme: string;
  websiteUrl: string;
  appName?: string; // Optional: for more descriptive alerts
  appStoreUrlIOS?: string; // Optional: URL for iOS App Store
  appStoreUrlAndroid?: string; // Optional: URL for Google Play Store
}

// IMPORTANT: The keys in this map (e.g., "Dunkin\' Donuts Credit")
// MUST EXACTLY MATCH the 'name' property of the perks from your card-data.ts.
// Please verify and update these names as needed.
const perkNameMappings: Record<string, PerkTargetConfig> = {
  "Dunkin' Donuts Credit": { // Example: For Amex Gold Dunkin' perk
    appScheme: 'dunkindonuts://',
    websiteUrl: 'https://www.dunkindonuts.com/',
    appName: "Dunkin' Donuts",
    appStoreUrlIOS: 'https://apps.apple.com/app/id1056813463',
    appStoreUrlAndroid: 'https://play.google.com/store/apps/details?id=com.dunkinbrands.otgo',
  },
  "Uber Ride Credit": { // Renamed from "Uber Credits" for clarity
    appScheme: 'uber://',
    websiteUrl: 'https://www.uber.com/ride/',
    appName: 'Uber',
    appStoreUrlIOS: 'https://apps.apple.com/app/uber/id368677368',
    appStoreUrlAndroid: 'https://play.google.com/store/apps/details?id=com.ubercab',
  },
  "Uber Eats Credit": {
    appScheme: 'ubereats://', // Basic scheme to open the app. Specific paths like /store/browse can be added if needed.
    websiteUrl: 'https://www.ubereats.com/',
    appName: 'Uber Eats',
    appStoreUrlIOS: 'https://apps.apple.com/app/uber-eats-food-delivery/id1058959277',
    appStoreUrlAndroid: 'https://play.google.com/store/apps/details?id=com.ubercab.eats',
  },
  "DoorDash Grocery Credit": {
    appScheme: 'doordash://',
    websiteUrl: 'https://www.doordash.com/',
    appName: 'DoorDash',
    appStoreUrlIOS: 'https://apps.apple.com/app/doordash-food-delivery/id719972451',
    appStoreUrlAndroid: 'https://play.google.com/store/apps/details?id=com.dd.doordash',
  },
  "Grubhub Credit": { // Scheme is likely, may need verification
    appScheme: 'grubhub://',
    websiteUrl: 'https://www.grubhub.com/',
    appName: 'Grubhub',
    appStoreUrlIOS: 'https://apps.apple.com/app/grubhub-local-food-delivery/id302920553',
    appStoreUrlAndroid: 'https://play.google.com/store/apps/details?id=com.grubhub.android',
  },
  "Resy Credit": { // Scheme is likely, may need verification
    appScheme: 'resy://',
    websiteUrl: 'https://resy.com/',
    appName: 'Resy',
    appStoreUrlIOS: 'https://apps.apple.com/app/resy/id799274035',
    appStoreUrlAndroid: 'https://play.google.com/store/apps/details?id=com.resy.android',
  },
  /* ────── Amex Platinum "Digital Entertainment Credit" choices ────── */
  "Disney+ Credit": {
    appScheme: "disneyplus://",
    websiteUrl: "https://www.disneyplus.com/",
    appName: "Disney+",
    appStoreUrlIOS: "https://apps.apple.com/app/id1446075923",
    appStoreUrlAndroid: "https://play.google.com/store/apps/details?id=com.disney.disneyplus",
  },
  "Hulu Credit": {
    appScheme: "hulu://",
    websiteUrl: "https://www.hulu.com/",
    appName: "Hulu",
    appStoreUrlIOS: "https://apps.apple.com/app/id376510438",
    appStoreUrlAndroid: "https://play.google.com/store/apps/details?id=com.hulu.plus",
  },
  "ESPN+ Credit": {
    appScheme: "sportscenter://",          // ESPN's registered scheme
    websiteUrl: "https://www.espn.com/espnplus/",
    appName: "ESPN",
    appStoreUrlIOS: "https://apps.apple.com/app/id317469184",
    appStoreUrlAndroid: "https://play.google.com/store/apps/details?id=com.espn.score_center",
  },
  "Peacock Credit": {
    appScheme: "peacock://",
    websiteUrl: "https://www.peacocktv.com/",
    appName: "Peacock",
    appStoreUrlIOS: "https://apps.apple.com/app/id1508186374",
    appStoreUrlAndroid: "https://play.google.com/store/apps/details?id=com.peacocktv.peacockandroid",
  },
  "NYTimes Credit": {
    appScheme: "nytimes://",
    websiteUrl: "https://www.nytimes.com/",
    appName: "The New York Times",
    appStoreUrlIOS: "https://apps.apple.com/app/id284862083",
    appStoreUrlAndroid: "https://play.google.com/store/apps/details?id=com.nytimes.android",
  },

  /* ────── Walmart+ rebate (Amex Platinum) ────── */
  "Walmart+ Membership Rebate": {
    appScheme: "walmart://",
    websiteUrl: "https://www.walmart.com/plus",
    appName: "Walmart",
    appStoreUrlIOS: "https://apps.apple.com/app/id338137227",
    appStoreUrlAndroid: "https://play.google.com/store/apps/details?id=com.walmart.android",
  },

  /* ────── DoorDash restaurant credit (CSR) ────── */
  "DoorDash Restaurant Credit": {          // distinct from Grocery credit
    appScheme: "doordash://",
    websiteUrl: "https://www.doordash.com/",
    appName: "DoorDash",
    appStoreUrlIOS: "https://apps.apple.com/app/id719972451",
    appStoreUrlAndroid: "https://play.google.com/store/apps/details?id=com.dd.doordash",
  },

  /* ────── Instacart credit (CSR/CSP) ────── */
  "Instacart Credit": {
    appScheme: "instacart://",
    websiteUrl: "https://www.instacart.com/",
    appName: "Instacart",
    appStoreUrlIOS: "https://apps.apple.com/app/id545599256",
    appStoreUrlAndroid: "https://play.google.com/store/apps/details?id=com.instacart.client",
  },

  /* ────── Capital One Venture X travel portal ────── */
  "Capital One Travel Credit": {
    appScheme: "capitalone://",
    websiteUrl: "https://travel.capitalone.com/",
    appName: "Capital One",
    appStoreUrlIOS: "https://apps.apple.com/app/id407558537",
    appStoreUrlAndroid: "https://play.google.com/store/apps/details?id=com.capitalone.mobile",
  },

  /* ────── CLEAR Plus credit (Amex Green) ────── */
  "CLEAR Plus Credit": {
    appScheme: "",                         // no documented scheme
    websiteUrl: "https://www.clearme.com/",
    appName: "CLEAR",
    appStoreUrlIOS: "https://apps.apple.com/app/id1436333504",
    appStoreUrlAndroid: "https://play.google.com/store/apps/details?id=com.clearme.clearapp",
  },
};

// App URL schemes
const APP_SCHEMES = {
  uber: {
    ios: 'uber://',
    android: 'uber://',
    fallback: 'https://m.uber.com/',
    androidPackage: 'com.ubercab',
  },
  uberEats: {
    ios: 'ubereats://',
    android: 'ubereats://',
    fallback: 'https://www.ubereats.com/',
    androidPackage: 'com.ubercab.eats',
  },
  grubhub: {
    ios: 'grubhub://',
    android: 'grubhub://',
    fallback: 'https://www.grubhub.com/',
    androidPackage: 'com.grubhub.android',
  },
  disneyPlus: {
    ios: 'disneyplus://',
    android: 'disneyplus://',
    fallback: 'https://www.disneyplus.com/',
    androidPackage: 'com.disney.disneyplus',
  },
  hulu: {
    ios: 'hulu://',
    android: 'hulu://',
    fallback: 'https://www.hulu.com/',
    androidPackage: 'com.hulu.plus',
  },
  espn: {
    ios: 'espn://',
    android: 'espn://',
    fallback: 'https://www.espn.com/',
    androidPackage: 'com.espn.score_center',
  },
  peacock: {
    ios: 'peacock://',
    android: 'peacocktv://',
    fallback: 'https://www.peacocktv.com/',
    androidPackage: 'com.peacocktv.peacockandroid',
  },
  nytimes: {
    ios: 'nytimes://',
    android: 'nytimes://',
    fallback: 'https://www.nytimes.com/',
    androidPackage: 'com.nytimes.android',
  },
};

// Map perk names to their corresponding app schemes
const PERK_TO_APP_MAP: Record<string, keyof typeof APP_SCHEMES> = {
  'Uber Ride Credit': 'uber',
  'Uber Eats Credit': 'uberEats',
  'Grubhub Credit': 'grubhub',
  'Disney+ Credit': 'disneyPlus',
  'Hulu Credit': 'hulu',
  'ESPN+ Credit': 'espn',
  'Peacock Credit': 'peacock',
  'NYTimes Credit': 'nytimes',
};

async function isAppInstalled(appKey: keyof typeof APP_SCHEMES): Promise<boolean> {
  const appSchemes = APP_SCHEMES[appKey];
  try {
    if (Platform.OS === 'ios') {
      return await Linking.canOpenURL(appSchemes.ios);
    } else {
      // On Android, we can check if the package is installed
      return await Linking.canOpenURL(appSchemes.android);
    }
  } catch (error) {
    console.log(`Error checking if app is installed for ${appKey}:`, error);
    return false;
  }
}

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
    const urlToOpen = isInstalled ? scheme : appSchemes.fallback;
    
    await Linking.openURL(urlToOpen);
    return true;
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