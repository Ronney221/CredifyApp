import { Card, CardPerk } from '../src/data/card-data';

interface AvailablePerk {
  cardName: string;
  perks: {
    name: string;
    value: number;
    periodMonths: number;
  }[];
}

interface CardWithPerks {
  cardName: string;
  perks: AvailablePerk[];
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

function formatMarkdownToReadable(markdown: string): string {
  console.log('[OpenAI] Raw markdown input:', markdown);
  
  let text = markdown;

  // Remove markdown code block markers
  text = text.replace(/```markdown\n?/g, '');
  text = text.replace(/```\n?/g, '');
  
  // Remove markdown headers and convert to plain text
  text = text.replace(/^#+\s+/gm, '');
  
  // Convert bullet points to readable format
  text = text.replace(/^\s*[-*]\s+/gm, '• ');
  
  // Remove code blocks and their content
  text = text.replace(/```[\s\S]*?```/g, '');
  
  // Remove inline code
  text = text.replace(/`([^`]+)`/g, '$1');
  
  // Remove bold/italic markers
  text = text.replace(/\*\*/g, '');
  text = text.replace(/\*/g, '');
  text = text.replace(/_/g, '');
  
  // Remove links but keep the text
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  
  // Remove horizontal rules
  text = text.replace(/^[-*_]{3,}$/gm, '');
  
  // Clean up extra whitespace
  text = text.replace(/\n{3,}/g, '\n\n');
  text = text.replace(/^\s+/gm, '');
  text = text.replace(/\s+$/gm, '');
  
  // Add proper spacing between sections
  text = text.split('\n').map(line => line.trim()).join('\n');
  
  // Remove any remaining markdown artifacts
  text = text.replace(/\[|\]|\(|\)/g, '');
  
  const finalText = text.trim();
  console.log('[OpenAI] Formatted text output:', finalText);
  
  return finalText;
}

export async function getBenefitAdvice(query: string, availablePerks: AvailablePerk[]): Promise<{ advice: string; usage: TokenUsage }> {
  console.log('[OpenAI] Starting getBenefitAdvice function');
  console.log('[OpenAI] Query:', query);
  console.log('[OpenAI] Available cards:', JSON.stringify(availablePerks, null, 2));

  const apiKey = process.env.EXPO_PUBLIC_OPENAI_SECRET_KEY;
  console.log('[OpenAI] API Key present:', !!apiKey);
  console.log('[OpenAI] API Key length:', apiKey?.length);
  console.log('[OpenAI] API Key first 4 chars:', apiKey?.substring(0, 4));

  if (!apiKey) {
    throw new Error('OpenAI API key not found in environment variables');
  }

  // Construct a more focused prompt that emphasizes relevance
  const prompt = `As a credit card benefits expert, help the user maximize their available benefits based on their specific query. Focus ONLY on benefits that are directly relevant to their question - do not list every available perk.

User Query: ${query}

Available Benefits:
${availablePerks.map(card => `
Card: ${card.cardName}
Perks:
${card.perks.map(perk => `- ${perk.name} (Value: $${perk.value}, Renews every ${perk.periodMonths} months)`).join('\n')}
`).join('\n')}

Please provide a concise, actionable response that:
1. Focuses ONLY on benefits directly relevant to the user's query
2. Ignores perks that aren't applicable to their situation
3. Provides specific, actionable steps they can take
4. Explains why each recommended benefit is relevant to their query

Format the response in a clear, easy-to-read way.`;

  console.log('[OpenAI] Constructed prompt:', prompt);
  console.log('[OpenAI] Making API request to OpenAI...');

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
          {
            role: 'system',
            content: 'You are a credit card benefits expert who provides focused, relevant advice. Only mention benefits that directly relate to the user\'s query.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 500
      }),
    });

    console.log('[OpenAI] Response status:', response.status);
    console.log('[OpenAI] Response headers:', response.headers);

    if (!response.ok) {
      const errorData = await response.json();
      console.error('[OpenAI] API Error:', errorData);
      throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    console.log('[OpenAI] API Response:', data);

    const completionTokens = data.usage.completion_tokens;
    const promptTokens = data.usage.prompt_tokens;
    const totalTokens = data.usage.total_tokens;
    const estimatedCost = calculateCost({ promptTokens, completionTokens });

    const tokenUsage: TokenUsage = {
      promptTokens,
      completionTokens,
      totalTokens,
      estimatedCost
    };

    console.log('[OpenAI] Token Usage:', tokenUsage);

    const rawMarkdownAdvice = data.choices[0].message.content;
    console.log('[OpenAI] Raw markdown advice:', rawMarkdownAdvice);

    const formattedAdvice = formatMarkdownToReadable(rawMarkdownAdvice);
    console.log('[OpenAI] Final formatted advice:', formattedAdvice);

    return {
      advice: formattedAdvice,
      usage: tokenUsage
    };
  } catch (error) {
    console.error('[OpenAI] Error in getBenefitAdvice:', error);
    throw error;
  }
} 