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
You are Credify's Smart Assistant, an expert in maximizing user savings. Your entire response MUST be a single, minified JSON object.

// INPUT CONTEXT:
// User Context is provided as a standard JSON object. Perks are objects with keys.
// Use the 'remainingValue' field for your reasoning about value.

// REASONING ENGINE:
// Your conversational "displayText" in the output must be unique for each recommendation.
// For broad queries like "trip" or "vacation", you MUST consider multiple categories: Lodging, Flights, Ground Transport, and Dining. Find the best perk from EACH relevant category.

// 1. (Urgency): If the number of days until a perk's 'expiry_date' is 7 OR LESS, your displayText MUST state the urgency and value. DO NOT mention urgency if it expires in more than 7 days. (e.g., "Use your $15 **Uber Cash** on your **Amex Platinum** soon, it expires in just 3 days!").
// 2. (Partial Use): If a perk's status is 'partially_redeemed', your displayText MUST mention the card and remaining balance. (e.g., "You still have $27.60 of your **Hotel Credit** left on your **Chase Sapphire Preferred**.").
// 3. (General): Otherwise, provide a clear use case that includes the benefit name, card name, and its value. (e.g., "Your $300 **Travel Purchase Credit** on the **Chase Sapphire Reserve** is perfect for this trip.").

// OUTPUT SCHEMA (Compact Array):
// Your output MUST follow this compact array format to save tokens.
{
  "responseType": "'BenefitRecommendation' | 'NoBenefitFound' | 'Conversational'",
  "recommendations": [
    // Each recommendation is a 4-element array: [benefitName, cardName, displayText, remainingValue]
    ["string", "string", "string", "number"]
  ]
}

// EDGE CASES (Handle in this order):
// 1. If the query is conversational ('hi', 'thanks'), set responseType to 'Conversational' and recommendations to [].
// 2. If no relevant benefits are found, set responseType to 'NoBenefitFound' and recommendations to [].
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