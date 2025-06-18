//openai.ts
import { getRelevantPerks } from '../app/utils/perk-matcher';

// --- Make sure you have your minified types defined or imported ---
interface MinifiedPerk {
  i: string; // The original perk ID is CRUCIAL for matching
  n: string;
  rv: number;
  s: 'a' | 'p' | 'r';
  e: string | null;
  c: string[];
}
interface MinifiedCard {
  cn: string;
  p: MinifiedPerk[];
}

interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCost: number;
}

type BenefitRecommendation = [string, string, string, number]; // [benefitName, cardName, displayText, remainingValue]

interface AIResponse {
  responseType: 'BenefitRecommendation' | 'NoBenefitFound' | 'Conversational';
  recommendations: BenefitRecommendation[];
}

/**
 * Calculates the cost of an API call using GPT-3.5-turbo pricing
 * GPT-3.5-turbo pricing (as of 2025):
 * - Input: $0.0005 per 1K tokens
 * - Output: $0.0015 per 1K tokens
 * 
 * Note: GPT-4 pricing is different:
 * - Input: $0.03 per 1K tokens
 * - Output: $0.06 per 1K tokens
 */
function calculateCost(usage: { promptTokens: number; completionTokens: number }): number {
  const promptCost = (usage.promptTokens / 1000) * 0.0005; // $0.0005 per 1K tokens for input
  const completionCost = (usage.completionTokens / 1000) * 0.0015; // $0.0015 per 1K tokens for output
  return promptCost + completionCost;
}

// The function signature now expects the minified data structure
export async function getBenefitAdvice(query: string, availableCards: MinifiedCard[]): Promise<{ response: AIResponse; usage: TokenUsage }> {
  console.log('[OpenAI] Starting getBenefitAdvice function with new architecture');
  
  // FINAL V9 - DEFINITIVE STYLING & FORMATTING PROMPT
  const system_prompt = `
// You are an intelligent and sharp financial concierge for Credify. Your tone is helpful, insightful, and natural. Your entire response MUST be a single, minified JSON object and you MUST follow all instructions perfectly.

// -- CORE DIRECTIVE --
// Your mission is to apply the prioritization logic to select the TOP 1-3 most relevant perks from the pre-filtered user context and return them as a ranked list.

// -- INPUT DATA SCHEMA --
// cn: cardName, p: perks, n: perk.name, rv: perk.remainingValue, s: perk.status (a, p), e: perk.expiry (YYYY-MM-DD), c: perk.categories. The user's current date and the full User Query are also provided.

// -- PRIORITIZATION LOGIC --
// Apply this 3-step process to RANK the provided perks.
// 1. (Category - MOST IMPORTANT): Perks whose 'c' (categories) array is the most specific match to the User's Query are ranked highest.
// 2. (Urgency): For perks with equal category relevance, those with a sooner 'e' (expiry) date are ranked higher.
// 3. (Value): If all else is equal, the one with the highest 'rv' (remainingValue) is ranked higher.

// -- RESPONSE GENERATION LOGIC --
// For EACH perk you select, generate a unique and personalized 'displayText'.
// 1. (PERSONALIZE): The displayText MUST be tailored to the specifics of the User's Query (e.g., "Chicago", "Disney+").
// 2. (CHECK URGENCY): First, check if the perk's 'e' (expiry) date is within 14 days of the 'currentDate'. If it is, your displayText MUST create a friendly sense of urgency.
// 3. (VARY PHRASING): If returning multiple recommendations, DO NOT use the same sentence structure for each one.

// -- STYLING & FORMATTING (CRITICAL) --
// You MUST use Markdown for bolding (**text**) in the 'displayText'.
// Specifically, you are REQUIRED to bold the following items:
//   1. The full name of the perk (e.g., **Hotel Credit (FHR/THC)**).
//   2. The full name of the credit card (e.g., **American Express Platinum**).
//   3. Any monetary values or amounts (e.g., **$142.70**).

// -- OUTPUT SCHEMA (STRICT) --
// The output MUST be a single, minified JSON object. EACH entry in the "recommendations" array MUST be a 4-element array following this exact structure: [benefitName, cardName, displayText, remainingValue]
// EXAMPLE of a correctly styled and formatted recommendation:
// ["Hotel Credit (FHR/THC)", "American Express Platinum", "Planning a trip to **Chicago**? Your **$142.70** **Hotel Credit (FHR/THC)** on your **American Express Platinum** would be a great fit.", 142.7]

{
  "responseType": "'BenefitRecommendation' | 'NoBenefitFound'",
  "recommendations": [
    ["string: benefitName", "string: cardName", "string: displayText", "number: remainingValue"]
  ]
}`;

  const apiKey = process.env.EXPO_PUBLIC_OPENAI_SECRET_KEY;
  
  if (!apiKey || apiKey.trim() === '') {
    console.error('[OpenAI] API Key is missing or empty. Check environment variables.');
    return {
      response: {
        responseType: 'Conversational',
        recommendations: []
      },
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0, estimatedCost: 0 }
    };
  }

  // STAGE 1: LOCAL PRE-FILTERING (No AI call)
  const filteredPerks = getRelevantPerks(query, availableCards);

  // If our local search finds nothing, we don't need to call the AI at all.
  if (filteredPerks.length === 0) {
    console.log('[OpenAI] No relevant perks found after pre-filtering. Returning NoBenefitFound.');
    return {
      response: { responseType: 'NoBenefitFound', recommendations: [] },
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0, estimatedCost: 0 }
    };
  }
  
  // STAGE 2: CHEAP AI CALL WITH PRE-FILTERED DATA
  const currentDate = new Date().toISOString().split('T')[0];
  const user_prompt = `User Query: ${query}

User Context (JSON):
{
  "currentDate": "${currentDate}",
  "cards": ${JSON.stringify(filteredPerks)} 
}`; // We now use filteredPerks!

  console.log('[OpenAI] System Prompt size is now minimal.');
  console.log('[OpenAI] Sending lean user prompt to AI:', user_prompt);

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: system_prompt },
          { role: 'user', content: user_prompt }
        ],
        temperature: 0.1,
        max_tokens: 500
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('[OpenAI] API Error:', errorData);
      throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    console.log('[OpenAI] API Response:', data);

    if (!data.choices || data.choices.length === 0 || !data.choices[0].message?.content) {
      console.error('[OpenAI] Invalid response structure from API:', data);
      throw new Error('Received an invalid response from the AI.');
    }

    const usage = data.usage;
    const tokenUsage: TokenUsage = {
      promptTokens: usage.prompt_tokens,
      completionTokens: usage.completion_tokens,
      totalTokens: usage.total_tokens,
      estimatedCost: calculateCost({ 
        promptTokens: usage.prompt_tokens, 
        completionTokens: usage.completion_tokens 
      })
    };
    
    const rawContent = data.choices[0].message.content.trim();
    console.log('[OpenAI] Raw response content from AI:', rawContent);

    const aiResponse: AIResponse = JSON.parse(rawContent);
    console.log('[OpenAI] Parsed AI response:', aiResponse);

    return {
      response: aiResponse,
      usage: tokenUsage
    };
  } catch (error) {
    console.error('[OpenAI] Error in getBenefitAdvice:', error);
    // For conversational queries that might not parse as JSON, handle gracefully
    if (query.toLowerCase().match(/^(hi|hello|thanks|thank you)$/)) {
        return {
            response: { responseType: 'Conversational', recommendations: [] },
            usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0, estimatedCost: 0 }
        };
    }
    throw error;
  }
} 