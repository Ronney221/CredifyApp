import { testDatabaseConnection, fetchAllCards, fetchCardById, fetchAppSchemes } from './supabase-cards';
import { cardService } from './card-service';
import { allCards } from '../src/data/card-data'; // Original data for comparison

/**
 * Database Testing Suite
 * 
 * This file contains functions to test and validate the database migration
 */

export interface TestResult {
  name: string;
  success: boolean;
  duration: number;
  details?: any;
  error?: string;
}

export interface TestSuite {
  name: string;
  results: TestResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    totalDuration: number;
  };
}

/**
 * Run basic connectivity tests
 */
export async function runConnectivityTests(): Promise<TestSuite> {
  const results: TestResult[] = [];
  const startTime = Date.now();

  // Test 1: Database Connection
  const connectionStart = Date.now();
  try {
    const connectionResult = await testDatabaseConnection();
    results.push({
      name: 'Database Connection',
      success: connectionResult.success,
      duration: Date.now() - connectionStart,
      details: connectionResult.stats,
      error: connectionResult.success ? undefined : connectionResult.error?.message,
    });
  } catch (error) {
    results.push({
      name: 'Database Connection',
      success: false,
      duration: Date.now() - connectionStart,
      error: (error as Error).message,
    });
  }

  // Test 2: Fetch All Cards
  const cardsStart = Date.now();
  try {
    const cardsResult = await fetchAllCards();
    results.push({
      name: 'Fetch All Cards',
      success: !cardsResult.error,
      duration: Date.now() - cardsStart,
      details: { count: cardsResult.data?.length || 0 },
      error: cardsResult.error?.message,
    });
  } catch (error) {
    results.push({
      name: 'Fetch All Cards',
      success: false,
      duration: Date.now() - cardsStart,
      error: (error as Error).message,
    });
  }

  // Test 3: Fetch Single Card
  const singleCardStart = Date.now();
  try {
    const cardResult = await fetchCardById('amex_platinum');
    results.push({
      name: 'Fetch Single Card',
      success: !cardResult.error,
      duration: Date.now() - singleCardStart,
      details: { found: !!cardResult.data, benefitsCount: cardResult.data?.benefit_definitions?.length || 0 },
      error: cardResult.error?.message,
    });
  } catch (error) {
    results.push({
      name: 'Fetch Single Card',
      success: false,
      duration: Date.now() - singleCardStart,
      error: (error as Error).message,
    });
  }

  // Test 4: Fetch App Schemes
  const appSchemesStart = Date.now();
  try {
    const appSchemesResult = await fetchAppSchemes();
    results.push({
      name: 'Fetch App Schemes',
      success: !appSchemesResult.error,
      duration: Date.now() - appSchemesStart,
      details: { count: appSchemesResult.data?.length || 0 },
      error: appSchemesResult.error?.message,
    });
  } catch (error) {
    results.push({
      name: 'Fetch App Schemes',
      success: false,
      duration: Date.now() - appSchemesStart,
      error: (error as Error).message,
    });
  }

  const totalDuration = Date.now() - startTime;
  const passed = results.filter(r => r.success).length;
  const failed = results.length - passed;

  return {
    name: 'Connectivity Tests',
    results,
    summary: {
      total: results.length,
      passed,
      failed,
      totalDuration,
    },
  };
}

/**
 * Test data integrity by comparing with original hard-coded data
 */
export async function runDataIntegrityTests(): Promise<TestSuite> {
  const results: TestResult[] = [];
  const startTime = Date.now();

  // Test 1: Card Count Comparison
  const countStart = Date.now();
  try {
    const dbCards = await cardService.getAllCards();
    const originalCount = allCards.length;
    const dbCount = dbCards.length;
    
    results.push({
      name: 'Card Count Comparison',
      success: dbCount === originalCount,
      duration: Date.now() - countStart,
      details: { 
        original: originalCount, 
        database: dbCount,
        difference: dbCount - originalCount 
      },
      error: dbCount !== originalCount ? `Expected ${originalCount} cards, got ${dbCount}` : undefined,
    });
  } catch (error) {
    results.push({
      name: 'Card Count Comparison',
      success: false,
      duration: Date.now() - countStart,
      error: (error as Error).message,
    });
  }

  // Test 2: Card Names Match
  const namesStart = Date.now();
  try {
    const dbCards = await cardService.getAllCards();
    const originalNames = allCards.map(c => c.name).sort();
    const dbNames = dbCards.map(c => c.name).sort();
    
    const missingInDb = originalNames.filter(name => !dbNames.includes(name));
    const extraInDb = dbNames.filter(name => !originalNames.includes(name));
    
    results.push({
      name: 'Card Names Match',
      success: missingInDb.length === 0 && extraInDb.length === 0,
      duration: Date.now() - namesStart,
      details: { 
        missingInDb, 
        extraInDb,
        totalOriginal: originalNames.length,
        totalDb: dbNames.length 
      },
      error: missingInDb.length > 0 || extraInDb.length > 0 ? 
        `Missing: ${missingInDb.join(', ')}, Extra: ${extraInDb.join(', ')}` : undefined,
    });
  } catch (error) {
    results.push({
      name: 'Card Names Match',
      success: false,
      duration: Date.now() - namesStart,
      error: (error as Error).message,
    });
  }

  // Test 3: Benefit Counts
  const benefitsStart = Date.now();
  try {
    const dbCards = await cardService.getAllCards();
    const originalBenefitCount = allCards.reduce((sum, card) => sum + card.benefits.length, 0);
    const dbBenefitCount = dbCards.reduce((sum, card) => sum + card.benefits.length, 0);
    
    results.push({
      name: 'Total Benefit Count',
      success: Math.abs(dbBenefitCount - originalBenefitCount) <= 5, // Allow small difference for new benefits
      duration: Date.now() - benefitsStart,
      details: { 
        original: originalBenefitCount, 
        database: dbBenefitCount,
        difference: dbBenefitCount - originalBenefitCount 
      },
      error: Math.abs(dbBenefitCount - originalBenefitCount) > 5 ? 
        `Large difference in benefit count: ${dbBenefitCount - originalBenefitCount}` : undefined,
    });
  } catch (error) {
    results.push({
      name: 'Total Benefit Count',
      success: false,
      duration: Date.now() - benefitsStart,
      error: (error as Error).message,
    });
  }

  // Test 4: Specific Card Data
  const specificCardStart = Date.now();
  try {
    const originalPlatinum = allCards.find(c => c.id === 'amex_platinum');
    const dbPlatinum = await cardService.getCardById('amex_platinum');
    
    const success = originalPlatinum && dbPlatinum && 
      originalPlatinum.name === dbPlatinum.name &&
      originalPlatinum.annualFee === dbPlatinum.annualFee;
    
    results.push({
      name: 'Amex Platinum Data Match',
      success: !!success,
      duration: Date.now() - specificCardStart,
      details: {
        originalName: originalPlatinum?.name,
        dbName: dbPlatinum?.name,
        originalFee: originalPlatinum?.annualFee,
        dbFee: dbPlatinum?.annualFee,
        benefitsCount: dbPlatinum?.benefits.length,
      },
      error: !success ? 'Amex Platinum data does not match original' : undefined,
    });
  } catch (error) {
    results.push({
      name: 'Amex Platinum Data Match',
      success: false,
      duration: Date.now() - specificCardStart,
      error: (error as Error).message,
    });
  }

  // Test 5: Detailed Benefit Comparison
  const benefitComparisonStart = Date.now();
  try {
    const dbCards = await cardService.getAllCards();
    
    // Get all benefits from hard-coded data
    const hardCodedBenefits = [];
    allCards.forEach(card => {
      card.benefits.forEach(benefit => {
        hardCodedBenefits.push({
          cardName: card.name,
          benefitName: benefit.name,
          benefitId: benefit.id,
        });
      });
    });
    
    // Get all benefits from database
    const dbBenefits = [];
    dbCards.forEach(card => {
      card.benefits.forEach(benefit => {
        dbBenefits.push({
          cardName: card.name,
          benefitName: benefit.name,
          benefitId: benefit.id,
        });
      });
    });
    
    // Find missing benefits
    const missingBenefits = hardCodedBenefits.filter(hardBenefit => {
      return !dbBenefits.some(dbBenefit => 
        dbBenefit.benefitName === hardBenefit.benefitName && 
        dbBenefit.cardName === hardBenefit.cardName
      );
    });
    
    console.log('❌ Missing benefits:', missingBenefits);
    
    results.push({
      name: 'Detailed Benefit Comparison',
      success: missingBenefits.length === 0,
      duration: Date.now() - benefitComparisonStart,
      details: {
        missingCount: missingBenefits.length,
        missingBenefits: missingBenefits.slice(0, 10), // Show first 10 missing
        hardCodedTotal: hardCodedBenefits.length,
        dbTotal: dbBenefits.length,
      },
      error: missingBenefits.length > 0 ? 
        `${missingBenefits.length} benefits missing from database` : undefined,
    });
  } catch (error) {
    results.push({
      name: 'Detailed Benefit Comparison',
      success: false,
      duration: Date.now() - benefitComparisonStart,
      error: (error as Error).message,
    });
  }

  const totalDuration = Date.now() - startTime;
  const passed = results.filter(r => r.success).length;
  const failed = results.length - passed;

  return {
    name: 'Data Integrity Tests',
    results,
    summary: {
      total: results.length,
      passed,
      failed,
      totalDuration,
    },
  };
}

/**
 * Test performance of various database operations
 */
export async function runPerformanceTests(): Promise<TestSuite> {
  const results: TestResult[] = [];
  const startTime = Date.now();

  // Test 1: Cold Start Performance
  const coldStartTime = Date.now();
  try {
    cardService.clearCache(); // Clear any existing cache
    // Wait a bit to ensure cache is cleared
    await new Promise(resolve => setTimeout(resolve, 100));
    const cards = await cardService.getAllCards();
    const duration = Date.now() - coldStartTime;
    
    results.push({
      name: 'Cold Start Load Time',
      success: duration < 5000, // Increased threshold for more reliable tests
      duration,
      details: { cardsLoaded: cards.length, threshold: '5000ms' },
      error: duration >= 5000 ? `Slow cold start: ${duration}ms` : undefined,
    });
  } catch (error) {
    results.push({
      name: 'Cold Start Load Time',
      success: false,
      duration: Date.now() - coldStartTime,
      error: (error as Error).message,
    });
  }

  // Test 2: Cached Access Performance
  const cachedStartTime = Date.now();
  try {
    const cards = await cardService.getAllCards(); // Should use cache
    const duration = Date.now() - cachedStartTime;
    
    results.push({
      name: 'Cached Access Time',
      success: duration < 500, // More reasonable threshold
      duration,
      details: { cardsLoaded: cards.length, threshold: '500ms' },
      error: duration >= 500 ? `Slow cached access: ${duration}ms` : undefined,
    });
  } catch (error) {
    results.push({
      name: 'Cached Access Time',
      success: false,
      duration: Date.now() - cachedStartTime,
      error: (error as Error).message,
    });
  }

  // Test 3: Single Card Lookup Performance
  const lookupStartTime = Date.now();
  try {
    const card = await cardService.getCardById('amex_platinum');
    const duration = Date.now() - lookupStartTime;
    
    results.push({
      name: 'Single Card Lookup',
      success: duration < 200, // More reasonable threshold
      duration,
      details: { found: !!card, threshold: '200ms' },
      error: duration >= 200 ? `Slow card lookup: ${duration}ms` : undefined,
    });
  } catch (error) {
    results.push({
      name: 'Single Card Lookup',
      success: false,
      duration: Date.now() - lookupStartTime,
      error: (error as Error).message,
    });
  }

  // Test 4: Benefit Search Performance
  const searchStartTime = Date.now();
  try {
    const benefits = await cardService.getBenefitsByCategory('Travel');
    const duration = Date.now() - searchStartTime;
    
    results.push({
      name: 'Benefit Category Search',
      success: duration < 500, // More reasonable threshold
      duration,
      details: { benefitsFound: benefits.length, threshold: '500ms' },
      error: duration >= 500 ? `Slow benefit search: ${duration}ms` : undefined,
    });
  } catch (error) {
    results.push({
      name: 'Benefit Category Search',
      success: false,
      duration: Date.now() - searchStartTime,
      error: (error as Error).message,
    });
  }

  const totalDuration = Date.now() - startTime;
  const passed = results.filter(r => r.success).length;
  const failed = results.length - passed;

  return {
    name: 'Performance Tests',
    results,
    summary: {
      total: results.length,
      passed,
      failed,
      totalDuration,
    },
  };
}

/**
 * Run all tests and return comprehensive results
 */
export async function runAllTests(): Promise<TestSuite[]> {
  console.log('🧪 Starting comprehensive database tests...');
  
  // Run tests sequentially to avoid initialization conflicts
  const connectivitySuite = await runConnectivityTests();
  const integritySuite = await runDataIntegrityTests();
  const performanceSuite = await runPerformanceTests();
  
  const suites = [connectivitySuite, integritySuite, performanceSuite];
  
  // Log summary
  const totalTests = suites.reduce((sum, suite) => sum + suite.summary.total, 0);
  const totalPassed = suites.reduce((sum, suite) => sum + suite.summary.passed, 0);
  const totalFailed = suites.reduce((sum, suite) => sum + suite.summary.failed, 0);
  const totalDuration = suites.reduce((sum, suite) => sum + suite.summary.totalDuration, 0);
  
  console.log('📊 Test Results Summary:');
  console.log(`Total Tests: ${totalTests}`);
  console.log(`Passed: ${totalPassed}`);
  console.log(`Failed: ${totalFailed}`);
  console.log(`Total Duration: ${totalDuration}ms`);
  console.log(`Success Rate: ${((totalPassed / totalTests) * 100).toFixed(1)}%`);
  
  return suites;
}

/**
 * Log detailed test results to console
 */
export function logTestResults(suites: TestSuite[]) {
  suites.forEach(suite => {
    console.log(`\n📋 ${suite.name}:`);
    console.log(`  Summary: ${suite.summary.passed}/${suite.summary.total} passed (${suite.summary.totalDuration}ms)`);
    
    suite.results.forEach(result => {
      const status = result.success ? '✅' : '❌';
      console.log(`  ${status} ${result.name} (${result.duration}ms)`);
      
      if (result.details) {
        console.log(`     Details:`, result.details);
      }
      
      if (result.error) {
        console.log(`     Error: ${result.error}`);
      }
    });
  });
}