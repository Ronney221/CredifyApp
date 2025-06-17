//openai.ts
import { Card, CardPerk } from '../src/data/card-data';
import { supabase } from './supabase';

interface AvailablePerk {
  cardName: string;
  perks: {
    name: string;
    value: number;
    periodMonths: number;
  }[];
}

interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCost: number;
}

function calculateCost(usage: { promptTokens: number; completionTokens: number }): number {
  const promptCost = (usage.promptTokens / 1000) * 0.0015; // $0.0015 per 1K tokens for input
  const completionCost = (usage.completionTokens / 1000) * 0.002; // $0.002 per 1K tokens for output
  return promptCost + completionCost;
}

export async function getBenefitAdvice(query: string, availablePerks: AvailablePerk[]): Promise<{ advice: string; usage: TokenUsage }> {
  console.log('[OpenAI] Starting getBenefitAdvice function');
  console.log('[OpenAI] Query:', query);
  console.log('[OpenAI] Available cards:', JSON.stringify(availablePerks, null, 2));

  const apiKey = process.env.EXPO_PUBLIC_OPENAI_SECRET_KEY;
  
  if (!apiKey || apiKey.trim() === '') {
    console.error('[OpenAI] API Key is missing or empty');
    return {
      advice: 'Sorry, the AI service is currently unavailable. Please try again later.',
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
      advice: 'No available benefits found. Please add some cards to get started.',
      usage: {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        estimatedCost: 0
      }
    };
  }

  const system_prompt = `You are a financial assistant. Your tone is professional and confident.

Analyze the user's query and their JSON benefits list to find relevant perks.

Your response MUST follow one of these two formats exactly:

1.  **Benefit(s) found:**
    - Single: "It looks like the **[Benefit Name]** on your **[Card Name]** is a perfect match for this. Use it because [brief, compelling reason]."
    - Multiple: Start with "It looks like you have a few great options for this:" followed by a bulleted list using the "•" character. Each item should be: "The **$[Value Remaining]** **[Benefit Name]** on your **[Card Name]** is a good choice because [brief reason]."

2.  **No benefit found:** "Based on your query, none of your available benefits are a direct match for this situation."

**Rules:**
- ONLY recommend benefits from the user's list.
- MUST bold the benefit and card name using \`**\`.
- NO greetings, closings, or other filler. Your entire response must be one of the templates above.`;

  const user_prompt = `
Analyze the following user query based on their available benefits.

User Query:
${query}

Available Benefits (JSON):
${JSON.stringify(availablePerks, null, 2)}
`;

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
        max_tokens: 300
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

    const advice = data.choices[0].message.content.trim();
    console.log('[OpenAI] Clean AI advice:', advice);
    console.log('[OpenAI] Token Usage:', tokenUsage);

    return {
      advice,
      usage: tokenUsage
    };
  } catch (error) {
    console.error('[OpenAI] Error in getBenefitAdvice:', error);
    throw error;
  }
} 