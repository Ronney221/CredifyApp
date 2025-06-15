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

  // Define the new, powerful system prompt
  const system_prompt = `You are Credify's "Benefit Concierge," an AI expert specializing in credit card rewards. Your primary directive is to help users maximize their card benefits by providing concise, actionable, and hyper-relevant advice.

You must strictly adhere to the following rules:

1.  **Relevance is Paramount:** ONLY mention benefits that are directly and immediately applicable to the user's specific query. Do not list or allude to any perks that are not relevant, even if they are available.

2.  **Be Direct and Concise:** Do not use conversational filler, greetings, or closing remarks. Omit phrases like "Hello!", "Certainly!", "I can help with that," or "I hope this helps." Get straight to the recommendation.

3.  **Action and Justification:** For each recommended benefit, you must state a clear **action** and a brief **justification**. Frame it as "Use [Benefit] on [Card Name] because..."

4.  **Handle No Relevant Perks:** If absolutely none of the user's available benefits apply to their query, you must state that clearly and concisely. For example: "Based on your query, none of your available benefits are a direct match for this situation." Do not apologize or suggest benefits the user does not have.

5.  **Formatting:** Structure your response using simple Markdown. Use a \`##\` header for the main recommendation and bullet points (\`-\`) for individual actions.`;

  // Construct the clean, data-only user prompt
  const user_prompt = `User Query: "${query}"

Available User Benefits:
${availablePerks.map(card => `
Card: ${card.cardName}
Perks:
${card.perks.map(perk => `- ${perk.name} (Value: $${perk.value})`).join('\n')}
`).join('\n')}`;

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
        model: 'gpt-4', // Using GPT-4 for better rule adherence
        messages: [
          {
            role: 'system',
            content: system_prompt
          },
          {
            role: 'user',
            content: user_prompt
          }
        ],
        temperature: 0.2, // Lower temperature for more deterministic output
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