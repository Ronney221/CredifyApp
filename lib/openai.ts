import { Card, CardPerk } from '../src/data/card-data';

interface AvailablePerk {
  name: string;
  value: number;
  periodMonths?: number;
}

interface CardWithPerks {
  cardName: string;
  perks: AvailablePerk[];
}

export async function getBenefitAdvice(
  query: string,
  availableCards: CardWithPerks[]
): Promise<string> {
  console.log('[OpenAI] Starting getBenefitAdvice function');
  console.log('[OpenAI] Query:', query);
  console.log('[OpenAI] Available cards:', JSON.stringify(availableCards, null, 2));

  // Check for API key
  const apiKey = process.env.EXPO_PUBLIC_OPENAI_SECRET_KEY;
  console.log('[OpenAI] API Key present:', !!apiKey);
  console.log('[OpenAI] API Key length:', apiKey?.length);
  console.log('[OpenAI] API Key first 4 chars:', apiKey?.substring(0, 4));

  if (!apiKey) {
    console.error('[OpenAI] No API key found in environment variables');
    throw new Error('OpenAI API key is not configured');
  }

  try {
    // Construct the prompt
    const prompt = `As a credit card benefits expert, help the user maximize their available benefits based on their query.
User Query: ${query}

Available Benefits:
${availableCards.map(card => `
Card: ${card.cardName}
Perks:
${card.perks.map(perk => `- ${perk.name} (Value: $${perk.value}${perk.periodMonths ? `, Renews every ${perk.periodMonths} months` : ''})`).join('\n')}
`).join('\n')}

Please provide a concise, actionable checklist in Markdown format based on their question.`;

    console.log('[OpenAI] Constructed prompt:', prompt);

    // Make the API call
    console.log('[OpenAI] Making API request to OpenAI...');
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a credit card benefits expert helping users maximize their rewards and perks.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    console.log('[OpenAI] Response status:', response.status);
    console.log('[OpenAI] Response headers:', JSON.stringify(Object.fromEntries(response.headers.entries()), null, 2));

    if (!response.ok) {
      const errorData = await response.json();
      console.error('[OpenAI] API Error Response:', JSON.stringify(errorData, null, 2));
      throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    console.log('[OpenAI] API Response:', JSON.stringify(data, null, 2));

    const advice = data.choices[0]?.message?.content;
    if (!advice) {
      console.error('[OpenAI] No advice content in response');
      throw new Error('No advice content in response');
    }

    console.log('[OpenAI] Successfully extracted advice:', advice);
    return advice;
  } catch (error) {
    console.error('[OpenAI] Error in getBenefitAdvice:', error);
    throw error;
  }
} 