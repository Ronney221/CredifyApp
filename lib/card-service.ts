import { fetchAllCards, fetchCardById, fetchAppSchemes, fetchMultiChoiceConfigs, testDatabaseConnection } from './supabase-cards';
import { 
  transformCards, 
  transformCard,
  dbCardToAppCard,
  createAppSchemesFromDb,
  createMultiChoiceConfigFromDb,
  validateTransformedCard 
} from './data-transform';
import type { Card, Benefit } from '../src/data/card-data';

/**
 * CardService - High-level API for fetching card data
 * 
 * This service provides a clean interface that matches the existing app structure
 * while fetching data from Supabase instead of hard-coded files.
 */
export class CardService {
  private static _instance: CardService;
  private _cards: Card[] | null = null;
  private _appSchemes: Record<string, any> | null = null;
  private _multiChoiceConfig: Record<string, any> | null = null;
  private _isLoading = false;
  
  public static getInstance(): CardService {
    if (!CardService._instance) {
      CardService._instance = new CardService();
    }
    return CardService._instance;
  }

  /**
   * Initialize the service by loading all data from database
   */
  public async initialize(forceRefresh = false): Promise<{ success: boolean; error?: any }> {
    if (this._isLoading) {
      console.log('CardService already initializing, waiting...');
      return { success: false, error: new Error('Service is already initializing') };
    }

    if (!forceRefresh && this._cards && this._appSchemes && this._multiChoiceConfig) {
      console.log('CardService already initialized');
      return { success: true };
    }

    this._isLoading = true;
    
    try {
      console.log('Initializing CardService from database...');
      
      // Test database connection first
      const connectionTest = await testDatabaseConnection();
      if (!connectionTest.success) {
        throw new Error(`Database connection failed: ${connectionTest.error}`);
      }
      
      console.log('Database connection successful:', connectionTest.stats);

      // Fetch all data in parallel
      const [cardsResult, appSchemesResult, multiChoiceResult] = await Promise.all([
        fetchAllCards({ includeServices: true }),
        fetchAppSchemes(),
        fetchMultiChoiceConfigs(),
      ]);

      // Handle errors
      if (cardsResult.error) {
        throw new Error(`Failed to fetch cards: ${cardsResult.error.message}`);
      }
      if (appSchemesResult.error) {
        throw new Error(`Failed to fetch app schemes: ${appSchemesResult.error.message}`);
      }
      if (multiChoiceResult.error) {
        throw new Error(`Failed to fetch multi-choice configs: ${multiChoiceResult.error.message}`);
      }

      // Transform and validate data
      const transformedCards = cardsResult.data?.map(dbCard => {
        const card = dbCardToAppCard(dbCard);
        const validation = validateTransformedCard(card as any);
        
        if (!validation.isValid) {
          console.warn(`Card validation warnings for ${card.name}:`, validation.errors);
        }
        
        return card;
      }) || [];

      // Store transformed data
      this._cards = transformedCards;
      this._appSchemes = createAppSchemesFromDb(appSchemesResult.data || []);
      this._multiChoiceConfig = createMultiChoiceConfigFromDb(multiChoiceResult.data || []);

      console.log('CardService initialized successfully:', {
        cardsCount: this._cards.length,
        appSchemesCount: Object.keys(this._appSchemes).length,
        multiChoiceConfigCount: Object.keys(this._multiChoiceConfig).length,
      });

      return { success: true };
    } catch (error) {
      console.error('Failed to initialize CardService:', error);
      return { success: false, error };
    } finally {
      this._isLoading = false;
    }
  }

  /**
   * Get all cards (replaces import from card-data.ts)
   */
  public async getAllCards(): Promise<Card[]> {
    const initResult = await this.initialize();
    if (!initResult.success) {
      throw new Error(`Failed to initialize CardService: ${initResult.error}`);
    }
    
    return this._cards || [];
  }

  /**
   * Get a specific card by ID
   */
  public async getCardById(cardId: string): Promise<Card | null> {
    const cards = await this.getAllCards();
    return cards.find(card => card.id === cardId) || null;
  }

  /**
   * Get cards by network (e.g., 'American Express', 'Visa')
   */
  public async getCardsByNetwork(network: string): Promise<Card[]> {
    const cards = await this.getAllCards();
    return cards.filter(card => card.network === network);
  }

  /**
   * Get benefits by category
   */
  public async getBenefitsByCategory(category: string): Promise<Benefit[]> {
    const cards = await this.getAllCards();
    const benefits: Benefit[] = [];
    
    cards.forEach(card => {
      card.benefits.forEach(benefit => {
        if (benefit.categories.includes(category)) {
          benefits.push(benefit);
        }
      });
    });
    
    return benefits;
  }

  /**
   * Get app schemes (replaces APP_SCHEMES from card-data.ts)
   */
  public async getAppSchemes(): Promise<Record<string, any>> {
    const initResult = await this.initialize();
    if (!initResult.success) {
      throw new Error(`Failed to initialize CardService: ${initResult.error}`);
    }
    
    return this._appSchemes || {};
  }

  /**
   * Get multi-choice perk configuration (replaces multiChoicePerksConfig from card-data.ts)
   */
  public async getMultiChoiceConfig(): Promise<Record<string, any>> {
    const initResult = await this.initialize();
    if (!initResult.success) {
      throw new Error(`Failed to initialize CardService: ${initResult.error}`);
    }
    
    return this._multiChoiceConfig || {};
  }

  /**
   * Search benefits by name or description
   */
  public async searchBenefits(searchTerm: string): Promise<Benefit[]> {
    const cards = await this.getAllCards();
    const benefits: Benefit[] = [];
    const lowerSearchTerm = searchTerm.toLowerCase();
    
    cards.forEach(card => {
      card.benefits.forEach(benefit => {
        if (
          benefit.name.toLowerCase().includes(lowerSearchTerm) ||
          benefit.description?.toLowerCase().includes(lowerSearchTerm)
        ) {
          benefits.push(benefit);
        }
      });
    });
    
    return benefits;
  }

  /**
   * Get benefits by period (e.g., 'monthly', 'annual')
   */
  public async getBenefitsByPeriod(period: string): Promise<Benefit[]> {
    const cards = await this.getAllCards();
    const benefits: Benefit[] = [];
    
    cards.forEach(card => {
      card.benefits.forEach(benefit => {
        if (benefit.period === period) {
          benefits.push(benefit);
        }
      });
    });
    
    return benefits;
  }

  /**
   * Get high-value benefits (above specified threshold)
   */
  public async getHighValueBenefits(minValue: number = 100): Promise<Benefit[]> {
    const cards = await this.getAllCards();
    const benefits: Benefit[] = [];
    
    cards.forEach(card => {
      card.benefits.forEach(benefit => {
        if (benefit.value >= minValue) {
          benefits.push(benefit);
        }
      });
    });
    
    // Sort by value descending
    return benefits.sort((a, b) => b.value - a.value);
  }

  /**
   * Refresh data from database
   */
  public async refresh(): Promise<{ success: boolean; error?: any }> {
    console.log('Refreshing CardService data...');
    this._cards = null;
    this._appSchemes = null;
    this._multiChoiceConfig = null;
    return this.initialize(true);
  }

  /**
   * Get service status
   */
  public getStatus() {
    return {
      isInitialized: this._cards !== null,
      isLoading: this._isLoading,
      cardsCount: this._cards?.length || 0,
      appSchemesCount: this._appSchemes ? Object.keys(this._appSchemes).length : 0,
      multiChoiceConfigCount: this._multiChoiceConfig ? Object.keys(this._multiChoiceConfig).length : 0,
    };
  }

  /**
   * Clear cached data (useful for testing)
   */
  public clearCache() {
    console.log('Clearing CardService cache...');
    this._cards = null;
    this._appSchemes = null;
    this._multiChoiceConfig = null;
  }
}

// Export singleton instance
export const cardService = CardService.getInstance();

/**
 * Utility functions that maintain compatibility with existing code
 */

/**
 * Drop-in replacement for allCards from card-data.ts
 */
export async function getAllCards(): Promise<Card[]> {
  return cardService.getAllCards();
}

/**
 * Drop-in replacement for APP_SCHEMES from card-data.ts
 */
export async function getAppSchemes(): Promise<Record<string, any>> {
  return cardService.getAppSchemes();
}

/**
 * Drop-in replacement for multiChoicePerksConfig from card-data.ts
 */
export async function getMultiChoicePerksConfig(): Promise<Record<string, any>> {
  return cardService.getMultiChoiceConfig();
}

/**
 * Helper function to find a card by ID (commonly used pattern)
 */
export async function findCardById(cardId: string): Promise<Card | undefined> {
  const cards = await getAllCards();
  return cards.find(card => card.id === cardId);
}

/**
 * Helper function to get benefits for a specific card
 */
export async function getBenefitsForCard(cardId: string): Promise<Benefit[]> {
  const card = await findCardById(cardId);
  return card?.benefits || [];
}