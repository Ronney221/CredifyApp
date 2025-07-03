// deno-lint-ignore-file
// @ts-nocheck

/* eslint-disable import/no-unresolved */
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
/* eslint-enable import/no-unresolved */

serve(async (req) => {
  // Log incoming request details
  console.log('[Edge Function] Incoming request:', {
    method: req.method,
    url: req.url,
    headers: Object.fromEntries(req.headers.entries())
  });

  // Enable CORS for browser requests
  if (req.method === 'OPTIONS') {
    console.log('[Edge Function] Handling CORS preflight request');
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Log environment check
    const openAIKey = Deno.env.get('OPENAI_API_KEY');
    console.log('[Edge Function] Environment check:', {
      hasOpenAIKey: !!openAIKey,
      envKeys: Object.keys(Deno.env.toObject())
    });

    if (!openAIKey) {
      throw new Error('OpenAI API key is missing');
    }

    // Parse and validate request body
    let requestBody;
    try {
      requestBody = await req.json();
      console.log('[Edge Function] Request body parsed successfully');
    } catch (error) {
      console.error('[Edge Function] Failed to parse request body:', error);
      throw new Error('Invalid request body');
    }

    const { system_prompt, user_prompt } = requestBody;

    if (!system_prompt || !user_prompt) {
      console.error('[Edge Function] Missing required fields:', { 
        hasSystemPrompt: !!system_prompt, 
        hasUserPrompt: !!user_prompt 
      });
      throw new Error('Missing required fields');
    }

    // Log OpenAI request
    console.log('[Edge Function] Sending request to OpenAI');

    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: system_prompt },
          { role: 'user', content: user_prompt }
        ],
      }),
    });

    // Log OpenAI response status
    console.log('[Edge Function] OpenAI response status:', openAIResponse.status);

    if (!openAIResponse.ok) {
      const errorData = await openAIResponse.text();
      console.error('[Edge Function] OpenAI API error:', {
        status: openAIResponse.status,
        statusText: openAIResponse.statusText,
        error: errorData
      });
      throw new Error(`OpenAI API error: ${openAIResponse.status} ${openAIResponse.statusText}`);
    }

    const data = await openAIResponse.json();
    console.log('[Edge Function] Successfully processed OpenAI response');

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('[Edge Function] Error:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });

    return new Response(JSON.stringify({ 
      error: error.message,
      type: error.name,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
}); 