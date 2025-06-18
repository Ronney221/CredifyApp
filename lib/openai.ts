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
  
  const system_prompt = `
You are an intelligent assistant for Credify. Your goal is to select the single best credit card perk from the pre-filtered list provided and explain why it's the best choice. Your entire response MUST be a single, minified JSON object.

// -- CORE DIRECTIVE --
// The user context you receive has already been pre-filtered to be relevant to the user's query. Your SOLE mission is to apply the 3-step prioritization logic to select the SINGLE BEST perk from this list.

// -- INPUT DATA SCHEMA --
// cn: cardName, p: perks, n: perk.name, rv: perk.remainingValue, s: perk.status (a, p), e: perk.expiry, c: perk.categories.

// -- PRIORITIZATION LOGIC --
// Apply this 3-step process to the provided list of perks to find the single best one.
// 1. (Category): The perk whose 'c' array is the most specific match to the user's query wins.
// 2. (Urgency): If category matches are equal, the perk with the soonest 'e' (expiry) date wins.
// 3. (Value): If urgency is equal, the perk with the highest 'rv' (remainingValue) wins.

// -- RESPONSE GENERATION --
// For the winning perk, generate a friendly and suggestive 'displayText' including the perk's name, card name, and value.
// EXAMPLE: "Good choice for dinner! How about using the **$10 Grubhub Credit** on your **American Express Gold**?"

// -- OUTPUT SCHEMA --
{
  "responseType": "'BenefitRecommendation' | 'NoBenefitFound'",
  "recommendations": [
    ["string", "string", "string", "number"]
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