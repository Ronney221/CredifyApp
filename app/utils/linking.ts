import { Linking, Alert, Platform } from 'react-native';
import * as Application from 'expo-application';
import { CardPerk, multiChoicePerksConfig } from '../types';

// App URL schemes and configurations
const APP_SCHEMES = {
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
  "Dunkin' Donuts Credit": 'dunkin',
  "DoorDash Grocery Credit": 'doordash',
  "DoorDash Restaurant Credit": 'doordash',
  "Instacart Credit": 'instacart',
  "Resy Credit": 'resy',
  "Walmart+ Membership Rebate": 'walmart',
  "Capital One Travel Credit": 'capitalOne',
};

async function isAppInstalled(appKey: keyof typeof APP_SCHEMES): Promise<boolean> {
  const appSchemes = APP_SCHEMES[appKey];
  try {
    if (Platform.OS === 'ios') {
      return await Linking.canOpenURL(appSchemes.ios);
    } else {
      // On Android, we need to check if the package is installed
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