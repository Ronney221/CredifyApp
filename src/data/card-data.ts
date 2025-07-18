import { Platform, Linking, Alert , ImageSourcePropType } from 'react-native';
import * as WebBrowser from 'expo-web-browser';

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

// Keep all utility functions as components still need them
export async function openPerkTarget(perk: CardPerk): Promise<boolean> {
  const handleOpen = async (targetName: string): Promise<boolean> => {
    // Implementation depends on perk name and app scheme
    console.log('Opening perk target:', targetName);
    return true;
  };

  // For multi-choice perks, show alert
  if (perk.eligibleServices && perk.eligibleServices.length > 1) {
    return new Promise((resolve) => {
      Alert.alert(
        'Choose redemption method',
        `How would you like to redeem "${perk.name}"?`,
        [
          ...perk.eligibleServices!.map(service => ({
            text: service,
            onPress: () => handleOpen(service).then(resolve)
          })),
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => resolve(false)
          }
        ],
        {
          cancelable: true,
          onDismiss: () => resolve(false)
        }
      );
    });
  } else {
    return handleOpen(perk.name);
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