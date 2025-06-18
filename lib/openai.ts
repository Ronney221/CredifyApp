//openai.ts
import { Card, CardPerk } from '../src/data/card-data';
import { supabase } from './supabase';

interface AvailablePerk {
  cardName: string;
  annualFee?: number;
  breakEvenProgress?: number;
  perks: {
    name: string;
    totalValue: number;
    remainingValue: number;
    status: string;
    expiry: string | undefined;
    categories: string[];
  }[];
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

export async function getBenefitAdvice(query: string, availablePerks: AvailablePerk[]): Promise<{ response: AIResponse; usage: TokenUsage }> {
  console.log('[OpenAI] Starting getBenefitAdvice function');
  console.log('[OpenAI] Query:', query);
  console.log('[OpenAI] Available cards:', JSON.stringify(availablePerks, null, 2));

  const apiKey = process.env.EXPO_PUBLIC_OPENAI_SECRET_KEY;
  
  if (!apiKey || apiKey.trim() === '') {
    console.error('[OpenAI] API Key is missing or empty');
    return {
      response: {
        responseType: 'Conversational',
        recommendations: []
      },
      usage: {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        estimatedCost: 0
      }
    };
  }

  if (!availablePerks || !Array.isArray(availablePerks) || availablePerks.length === 0) {
    console.error('[OpenAI] No available perks provided');
    return {
      response: {
        responseType: 'NoBenefitFound',
        recommendations: []
      },
      usage: {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        estimatedCost: 0
      }
    };
  }

  // FINAL PRODUCTION system_prompt for openai.ts
  const system_prompt = `
  You are Credify's Smart Assistant, a hyper-intelligent and FLAWLESSLY ACCURATE expert in maximizing user savings. Your entire response MUST be a single, minified JSON object and you must follow all instructions with perfect precision.
  
  // -- STRATEGY --
  // Follow this two-step process rigorously:
  // 1. First, identify the key concepts, nouns, and verbs in the User's Query (e.g., for "my netflix subscription is due", keywords are "netflix", "subscription", "due", "bill").
  // 2. Second, search the User Context JSON. A perk is considered a "relevant match" if the extracted keywords OR their direct synonyms are found within the perk's 'name' field OR its 'categories' array.
  // 3. Find all relevant matches and generate your response using the Reasoning Engine below.
  
  // -- REASONING ENGINE --
  // Your conversational "displayText" in the output must be unique for each recommendation.
  // IF the query contains broad keywords like "trip" or "vacation", you MUST try to find the single best available perk for EACH relevant sub-category: Lodging, Flights, and Ground Transport.
  
  // For each recommended perk, apply ONE of the following rules in order:
  // 1. (Urgency): If a perk's 'expiry' is within 7 days of 'currentDate', your displayText MUST state the urgency and value.
  // 2. (Partial Use): If a perk's 'status' is 'partially_redeemed', your displayText MUST mention the card and the exact remaining balance.
  // 3. (General): Otherwise, provide a clear use case that includes the benefit name, card name, and its value.
  
  // -- EXAMPLES FOR RULE #3 (General) --
  // - For Dining: "Your $10 **Grubhub Credit** on the **American Express Gold** is perfect for dinner tonight."
  // - For Travel: "Your $300 **Travel Purchase Credit** on the **Chase Sapphire Reserve** is perfect for this trip."
  // - For Bills: "Your $20 **Digital Entertainment Credit** on your **Amex Platinum** is perfect for covering your Netflix subscription."
  
  // -- OUTPUT SCHEMA (Compact Array) --
  {
    "responseType": "'BenefitRecommendation' | 'NoBenefitFound' | 'Conversational'",
    "recommendations": [
      // Each recommendation is a 4-element array: [benefitName, cardName, displayText, remainingValue]
      ["string", "string", "string", "number"]
    ]
  }
  
  // -- EDGE CASES --
  // 1. If the query is conversational ('hi', 'thanks'), set responseType to 'Conversational'.
  // 2. If no perks are a relevant match after following the strategy, set responseType to 'NoBenefitFound'.
`;

  const currentDate = new Date().toISOString().split('T')[0];
  const user_prompt = `User Query: ${query}

User Context (JSON):
{
  "currentDate": "${currentDate}",
  "cards": ${JSON.stringify(availablePerks)}
}`;

  console.log('[OpenAI] System Prompt:', system_prompt);
  console.log('[OpenAI] User Prompt:', user_prompt);

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

    const aiResponse: AIResponse = JSON.parse(data.choices[0].message.content.trim());
    console.log('[OpenAI] Parsed AI response:', aiResponse);

    return {
      response: aiResponse,
      usage: tokenUsage
    };
  } catch (error) {
    console.error('[OpenAI] Error in getBenefitAdvice:', error);
    throw error;
  }
} 