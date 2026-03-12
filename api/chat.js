export const config = { runtime: 'edge' };

export default async function handler(req) {
  // Only allow POST
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // CORS — lock this down to your domain in production
  const origin = req.headers.get('origin') || '';
  const allowedOrigins = [
    'https://supportpup.com',
    'https://www.supportpup.com',
    'https://talktomydog.com',
    'https://www.talktomydog.com',
    // Vercel preview URLs
    /\.vercel\.app$/
  ];
  const isAllowed = allowedOrigins.some(o =>
    typeof o === 'string' ? o === origin : o.test(origin)
  );

  const corsHeaders = {
    'Access-Control-Allow-Origin': isAllowed ? origin : 'null',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  // Preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // Key lives ONLY in Vercel env — never in client
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'Service unavailable' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }

  const { userText, preDistress } = body;

  if (!userText || typeof userText !== 'string' || userText.length > 2000) {
    return new Response(JSON.stringify({ error: 'Invalid input' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }

  const systemPrompt = `You are SupportPup, a warm and gentle emotional support companion — like having a loyal dog who truly listens. You are NOT a therapist. Your role is to provide grounding, validation, and calm support.

STRICT RULES:
- Maximum 100 words total response
- Never diagnose, never prescribe, never claim to be therapy
- Always follow this 3-part structure:
  1. Acknowledge what the person shared (1-2 sentences, validating, warm)
  2. Ground them in the present (1 sentence — e.g. "Right now, you are safe")
  3. One small supportive action (1 sentence)
- Tone: calm, warm, non-judgmental, like a gentle dog who loves you unconditionally
- Avoid toxic positivity — be real and gentle instead
- End with a soft offer of one grounding tool (just name it, don't explain it)
- If the person expresses severe distress or crisis: include "Pup is right here with you. Please also consider reaching out to someone you trust or calling 988."`;

  try {
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 200,
        system: systemPrompt,
        messages: [{ role: 'user', content: userText }]
      })
    });

    if (!anthropicRes.ok) {
      const err = await anthropicRes.text();
      console.error('Anthropic error:', err);
      return new Response(JSON.stringify({ error: 'AI service error' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    const data = await anthropicRes.json();
    const text = data.content?.[0]?.text || "I'm here with you. Take one slow breath. You're safe right now. 🐾";

    return new Response(JSON.stringify({ response: text }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });

  } catch (err) {
    console.error('Proxy error:', err);
    return new Response(JSON.stringify({ error: 'Server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
}
