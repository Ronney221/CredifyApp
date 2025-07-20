import { Platform, Linking, Alert , ImageSourcePropType } from 'react-native';
import { CardService } from '../../lib/card-service';

// Keep all the type definitions
export interface Benefit {
  id: string;
  name: string;
  value: number;
  period: 'monthly' | 'quarterly' | 'semi_annual' | 'annual' | 'other';
  periodMonths: 1 | 3 | 6 | 12 | 48;
  resetType: 'calendar' | 'anniversary';
  definition_id: string;
  description?: string;
  redemptionInstructions?: string;
  appScheme?: keyof typeof APP_SCHEMES;
  eligibleServices?: string[];
  categories: string[];
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
  lastRedeemed?: string;
  definition_id: string;
  remaining_value?: number;
  parent_redemption_id?: string;
}

export interface MultiChoicePerkConfig {
  id: string;
  name: string;
  choices: string[];
  maxSelections: number;
  resetFrequency: 'monthly' | 'quarterly' | 'annually';
  description?: string;
}

// APP_SCHEMES will be loaded from database - this is a placeholder
export const APP_SCHEMES = {
  uber: 'uber://',
  uberEats: 'uber-eats://',
  grubhub: 'grubhub://',
  disneyPlus: 'disneyplus://',
  hulu: 'hulu://',
  espn: 'espn://',
  peacock: 'peacock://',
  nytimes: 'nytimes://',
  dunkin: 'dunkin://',
  doordash: 'doordash://',
  instacart: 'instacart://',
  resy: 'resy://',
  walmart: 'walmart://',
  capitalOne: 'capitalone://',
  lyft: 'lyft://',
  saks: 'saks://',
  equinox: 'equinox://',
  soulcycle: 'soulcycle://',
  shoprunner: 'shoprunner://',
  wegmans: 'wegmans://',
  wholefoods: 'wholefoods://',
  costco: 'costco://',
  target: 'target://',
  clear: 'clear://',
  drizly: 'drizly://',
  grubhubplus: 'grubhub-plus://',
  walmartplus: 'walmart-plus://',
  dashpass: 'dashpass://',
  gopuff: 'gopuff://',
  postmates: 'postmates://',
  seamless: 'seamless://',
  ubereats: 'uber-eats://',
  amazon: 'amazon://',
  amex: 'amex://',
  chase: 'chase://',
  citi: 'citi://',
  boa: 'boa://',
  venmo: 'venmo://'
} as const;

// Empty arrays - these should now be loaded from database
export const allCards: Card[] = [];
export const multiChoicePerksConfig: Record<string, MultiChoicePerkConfig[]> = {};

// Mapping from multi-choice target perk names to app scheme keys
const TARGET_PERK_TO_APP_SCHEME_MAP: Record<string, string> = {
  'Apple TV+ Credit': 'appletv',
  'Apple Music Credit': 'applemusic',
  'Disney+ Credit': 'disneyPlus',
  'Hulu Credit': 'hulu',
  'ESPN+ Credit': 'espn',
  'Peacock Credit': 'peacock',
  'NYTimes Credit': 'nytimes',
  'WSJ Credit': 'wallstreetjournal',
  'Uber Ride Credit': 'uber',
  'Uber Eats Credit': 'uberEats',
  'Grubhub Credit': 'grubhub',
  'Resy Credit': 'resy',
  'Uber Credit': 'uber',
  'Lyft Credit': 'lyft',
  'DoorDash Credit': 'doordash',
  'Netflix Credit': 'netflix',
  'Peloton Credit': 'peloton',
  'Equinox Credit': 'equinox',
  'Uber Rideshare Credit': 'uber',
  'Curb Credit': 'curb',
  'Revel Credit': 'revel',
  'Alto Credit': 'alto',
  'Dunkin\' Credit': 'dunkin',
  'Saks Fifth Avenue Credit': 'saks',
  'Walmart+ Membership Credit': 'walmart',
  'CLEAR Plus Credit': 'clear',
  'Capital One Travel Credit': 'capitalOne',
  'Hilton Resort Credit': 'hilton',
  'Marriott Bonvoy Credit': 'marriott',
  'Chase Travel Credit': 'chase',
  'Delta Stays Credit': 'delta',
  'Airline Fee Credit': 'amex',
  'The Edit by Chase Travel Credit': 'chase',
  'StubHub / viagogo Credit': 'stubhub',
  'Exclusive Tables Dining Credit': 'opentable',
  'DoorDash Restaurant Credit': 'doordash',
  'DoorDash Non-Restaurant Credit #1': 'doordash',
  'DoorDash Non-Restaurant Credit #2': 'doordash',
  'DoorDash Grocery Credit': 'doordash'
};

// Helper function to check if an app is installed (similar to original)
async function isAppInstalled(appScheme: any): Promise<boolean> {
  try {
    if (Platform.OS === 'ios') {
      const schemes = Array.isArray(appScheme.ios) ? appScheme.ios : [appScheme.ios];
      for (const scheme of schemes) {
        if (scheme) {
          try {
            // For HTTPS URLs, they can always be opened
            if (scheme.startsWith('https://') || scheme.startsWith('http://')) {
              return true;
            }
            // For custom schemes, check if they can be opened
            if (await Linking.canOpenURL(scheme)) {
              return true;
            }
          } catch (error) {
            // If canOpenURL throws (scheme not in LSApplicationQueriesSchemes), continue
            console.log(`Cannot check URL ${scheme}:`, error);
          }
        }
      }
      
      // Try fallback URL
      if (appScheme.fallbackUrl) {
        try {
          if (await Linking.canOpenURL(appScheme.fallbackUrl)) {
            return true;
          }
        } catch {
          // Fallback URLs (HTTPS) should always work
          return true;
        }
      }
      
      return false;
    } else {
      // On Android, check if the package is installed
      if (appScheme.androidPackage) {
        try {
          const isPackageInstalled = await Linking.canOpenURL(`${appScheme.androidPackage}://`);
          if (isPackageInstalled) return true;
        } catch {
          // Continue to other checks
        }
      }
      
      // Check Android schemes
      const schemes = Array.isArray(appScheme.android) ? appScheme.android : [appScheme.android];
      for (const scheme of schemes) {
        if (scheme) {
          try {
            if (await Linking.canOpenURL(scheme)) {
              return true;
            }
          } catch {
            // Continue
          }
        }
      }
      
      return false;
    }
  } catch (error) {
    console.log('Error checking if app is installed:', error);
    return false;
  }
}

// Helper function to open an app using app scheme key
async function openAppWithScheme(appSchemeKey: string, perkName: string): Promise<{success: boolean, usedFallback: boolean}> {
  try {
    console.log('Opening app with scheme key:', appSchemeKey);

    // Get database-loaded app schemes
    const cardService = CardService.getInstance();
    const appSchemes = await cardService.getAppSchemes();
    
    const appScheme = appSchemes[appSchemeKey];
    if (!appScheme) {
      console.log('App scheme not found for key:', appSchemeKey);
      // Fallback: try to open a web search for the perk
      const searchTerm = encodeURIComponent(perkName);
      const googleSearchUrl = `https://www.google.com/search?q=${searchTerm}`;
      try {
        console.log('Opening fallback web search:', googleSearchUrl);
        await Linking.openURL(googleSearchUrl);
        return { success: true, usedFallback: true };
      } catch (error) {
        console.error('Failed to open fallback search:', error);
        return { success: false, usedFallback: true };
      }
    }

    console.log('Found app scheme:', appScheme);
    
    // Check if app is installed using similar logic to original
    const isInstalled = await isAppInstalled(appScheme);
    console.log(`App installed check for ${appSchemeKey}:`, isInstalled);

    if (Platform.OS === 'ios') {
      const schemes = Array.isArray(appScheme.ios) ? appScheme.ios : [appScheme.ios];
      
      // If app is installed or we have HTTPS URLs, try to open them
      if (isInstalled) {
        for (const scheme of schemes) {
          if (scheme) {
            try {
              console.log('Trying to open iOS URL:', scheme);
              
              // Use Linking.openURL for all URLs (both HTTPS and custom schemes)
              // This prevents the app from freezing when opening external apps
              await Linking.openURL(scheme);
              return { success: true, usedFallback: false };
            } catch (error) {
              console.log('Failed to open scheme:', scheme, error);
              // Continue to next scheme
            }
          }
        }
      }
      
      // Try fallback
      if (appScheme.fallbackUrl) {
        console.log('Opening fallback URL:', appScheme.fallbackUrl);
        try {
          await Linking.openURL(appScheme.fallbackUrl);
          return { success: true, usedFallback: true };
        } catch (error) {
          console.error('Failed to open fallback URL:', error);
          return { success: false, usedFallback: true };
        }
      }
    } else {
      // Android logic
      const schemes = Array.isArray(appScheme.android) ? appScheme.android : [appScheme.android];
      
      if (isInstalled && appScheme.androidPackage) {
        // Try intent URL first
        try {
          const scheme = schemes[0]?.replace('://', '') || appSchemeKey;
          const intentUrl = `intent://#Intent;package=${appScheme.androidPackage};scheme=${scheme};end`;
          console.log('Trying Android intent:', intentUrl);
          await Linking.openURL(intentUrl);
          return { success: true, usedFallback: false };
        } catch (error) {
          console.log('Intent failed:', error);
        }
      }
      
      // Try direct schemes
      for (const scheme of schemes) {
        if (scheme) {
          try {
            console.log('Trying Android scheme:', scheme);
            await Linking.openURL(scheme);
            return { success: true, usedFallback: false };
          } catch (error) {
            console.log('Failed to open scheme:', scheme, error);
          }
        }
      }
      
      // Fallback
      if (appScheme.fallbackUrl) {
        console.log('Opening fallback URL:', appScheme.fallbackUrl);
        try {
          await Linking.openURL(appScheme.fallbackUrl);
          return { success: true, usedFallback: true };
        } catch (error) {
          console.error('Failed to open fallback URL:', error);
          return { success: false, usedFallback: true };
        }
      }
    }
    
    // Last resort: try app store
    const storeUrl = Platform.select({
      ios: appScheme.appStoreUrl?.ios,
      android: appScheme.appStoreUrl?.android,
    });
    
    if (storeUrl) {
      console.log('Opening app store:', storeUrl);
      try {
        await Linking.openURL(storeUrl);
        return { success: true, usedFallback: true };
      } catch (error) {
        console.error('Failed to open app store:', error);
        return { success: false, usedFallback: true };
      }
    }
    
    return { success: false, usedFallback: false };
  } catch (error) {
    console.error('Error opening app with scheme:', error);
    return { success: false, usedFallback: false };
  }
}

// Keep all utility functions as components still need them
export async function openPerkTarget(perk: CardPerk): Promise<{success: boolean, usedFallback: boolean}> {
  try {
    // Get multi-choice configurations from database
    const cardService = CardService.getInstance();
    const multiChoiceConfigs = await cardService.getMultiChoiceConfig();
    
    // Check if this is a multi-choice perk
    const choices = multiChoiceConfigs[perk.name];
    
    if (choices && choices.length > 0) {
      console.log('Multi-choice perk detected:', perk.name, 'with choices:', choices);
      
      // Show choice dialog for multi-choice perks
      return new Promise((resolve) => {
        Alert.alert(
          `Redeem ${perk.name}`,
          "Choose an option to open:",
          [
            ...choices.map((choice: any) => ({
              text: choice.label,
              onPress: async () => {
                // Map the target perk name to app scheme key
                const appSchemeKey = TARGET_PERK_TO_APP_SCHEME_MAP[choice.targetPerkName];
                if (appSchemeKey) {
                  const result = await openAppWithScheme(appSchemeKey, choice.targetPerkName);
                  resolve(result);
                } else {
                  console.log('No app scheme mapping found for:', choice.targetPerkName);
                  // Fallback to web search
                  const searchTerm = encodeURIComponent(choice.targetPerkName);
                  const googleSearchUrl = `https://www.google.com/search?q=${searchTerm}`;
                  try {
                    await Linking.openURL(googleSearchUrl);
                    resolve({ success: true, usedFallback: true });
                  } catch (error) {
                    console.error('Failed to open fallback search:', error);
                    resolve({ success: false, usedFallback: true });
                  }
                }
              },
            })),
            {
              text: "Cancel",
              style: "cancel",
              onPress: () => resolve({ success: false, usedFallback: false })
            },
          ],
          {
            cancelable: true,
            onDismiss: () => resolve({ success: false, usedFallback: false })
          }
        );
      });
    } else {
      // Single-choice perk: use the app scheme directly
      const appSchemeKey = perk.appScheme;
      
      if (!appSchemeKey) {
        console.log('No app scheme found for perk:', perk.name);
        return { success: false, usedFallback: false };
      }

      return openAppWithScheme(appSchemeKey, perk.name);
    }
  } catch (error) {
    console.error('Error opening perk target:', error);
    return { success: false, usedFallback: false };
  }
}

export function getPeriodMonths(period: Benefit['period']): Benefit['periodMonths'] {
  switch (period) {
    case 'monthly': return 1;
    case 'quarterly': return 3;
    case 'semi_annual': return 6;
    case 'annual': return 12;
    default: return 1;
  }
}

export function isCalendarReset(benefit: Benefit): boolean {
  return benefit.period === 'annual' || 
         benefit.name.toLowerCase().includes('calendar') ||
         (benefit.description?.toLowerCase().includes('calendar') ?? false);
}

export function calculatePerkExpiryDate(periodMonths: number): Date {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  switch (periodMonths) {
    case 1:
      const nextMonth = new Date(currentYear, currentMonth + 1, 1);
      return nextMonth;

    case 3:
      const currentQuarter = Math.floor(currentMonth / 3);
      const nextQuarterMonth = (currentQuarter + 1) * 3;
      const nextQuarterYear = nextQuarterMonth >= 12 ? currentYear + 1 : currentYear;
      return new Date(nextQuarterYear, nextQuarterMonth % 12, 1);

    case 6:
      const isFirstHalf = currentMonth < 6;
      if (isFirstHalf) {
        return new Date(currentYear, 6, 1);
      } else {
        return new Date(currentYear + 1, 0, 1);
      }

    case 12:
      return new Date(currentYear + 1, 0, 1);

    default:
      return new Date(currentYear, currentMonth + periodMonths, 1);
  }
}