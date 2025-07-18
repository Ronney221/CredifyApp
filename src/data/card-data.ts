import { Platform, Linking, Alert , ImageSourcePropType } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
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
  'Alto Credit': 'alto'
};

// Helper function to open an app using app scheme key
async function openAppWithScheme(appSchemeKey: string, perkName: string): Promise<boolean> {
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
        await WebBrowser.openBrowserAsync(googleSearchUrl);
        return true;
      } catch (error) {
        console.error('Failed to open fallback search:', error);
        return false;
      }
    }

    console.log('Found app scheme:', appScheme);

    // Select the appropriate scheme based on platform
    let targetUrl: string | undefined;
    
    if (Platform.OS === 'ios' && appScheme.ios) {
      targetUrl = Array.isArray(appScheme.ios) ? appScheme.ios[0] : appScheme.ios;
    } else if (Platform.OS === 'android' && appScheme.android) {
      targetUrl = Array.isArray(appScheme.android) ? appScheme.android[0] : appScheme.android;
    }

    if (!targetUrl) {
      // Fallback to web URL if no app scheme available
      if (appScheme.fallbackUrl) {
        console.log('Opening fallback URL:', appScheme.fallbackUrl);
        await WebBrowser.openBrowserAsync(appScheme.fallbackUrl);
        return true;
      }
      console.log('No target URL available for app scheme:', appSchemeKey);
      return false;
    }

    console.log(`Opening ${Platform.OS} app with URL:`, targetUrl);
    
    // Try to open the app
    const canOpen = await Linking.canOpenURL(targetUrl);
    if (canOpen) {
      await Linking.openURL(targetUrl);
      return true;
    } else {
      console.log('Cannot open URL, trying fallback options...');
      
      // For Android, try intent URL with package
      if (Platform.OS === 'android' && appScheme.androidPackage) {
        const intentUrl = `intent://#Intent;package=${appScheme.androidPackage};end`;
        try {
          await Linking.openURL(intentUrl);
          return true;
        } catch (error) {
          console.log('Intent URL failed:', error);
        }
      }
      
      // Try fallback URL
      if (appScheme.fallbackUrl) {
        console.log('Opening fallback URL:', appScheme.fallbackUrl);
        await WebBrowser.openBrowserAsync(appScheme.fallbackUrl);
        return true;
      }
      
      // Finally, try app store
      const storeUrl = Platform.select({
        ios: appScheme.appStoreUrl?.ios,
        android: appScheme.appStoreUrl?.android,
      });
      
      if (storeUrl) {
        console.log('Opening app store:', storeUrl);
        await WebBrowser.openBrowserAsync(storeUrl);
        return true;
      }
      
      return false;
    }
  } catch (error) {
    console.error('Error opening app with scheme:', error);
    return false;
  }
}

// Keep all utility functions as components still need them
export async function openPerkTarget(perk: CardPerk): Promise<boolean> {
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
                const appSchemeKey = TARGET_PERK_TO_APP_SCHEME_MAP[choice.target_perk_name];
                if (appSchemeKey) {
                  const success = await openAppWithScheme(appSchemeKey, choice.target_perk_name);
                  resolve(success);
                } else {
                  console.log('No app scheme mapping found for:', choice.target_perk_name);
                  // Fallback to web search
                  const searchTerm = encodeURIComponent(choice.target_perk_name);
                  const googleSearchUrl = `https://www.google.com/search?q=${searchTerm}`;
                  try {
                    await WebBrowser.openBrowserAsync(googleSearchUrl);
                    resolve(true);
                  } catch (error) {
                    console.error('Failed to open fallback search:', error);
                    resolve(false);
                  }
                }
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
      // Single-choice perk: use the app scheme directly
      const appSchemeKey = perk.appScheme;
      
      if (!appSchemeKey) {
        console.log('No app scheme found for perk:', perk.name);
        return false;
      }

      return openAppWithScheme(appSchemeKey, perk.name);
    }
  } catch (error) {
    console.error('Error opening perk target:', error);
    return false;
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