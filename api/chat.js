export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { 'Content-Type': 'application/json' }
    });
  }

  const origin = req.headers.get('origin') || '';
  const allowedOrigins = [
    'https://supportpup.com',
    'https://www.supportpup.com',
    'https://talktomydog.com',
    'https://www.talktomydog.com',
  ];
  const isAllowed = allowedOrigins.includes(origin) || /\.vercel\.app$/.test(origin);
  const corsHeaders = {
    'Access-Control-Allow-Origin': isAllowed ? origin : 'null',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'Service unavailable' }), {
      status: 503, headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }

  let body;
  try { body = await req.json(); }
  catch { return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
    status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders }
  }); }

  // Support both: full messages array (conversation) or legacy single userText
  let messages = body.messages;
  if (!messages && body.userText) {
    messages = [{ role: 'user', content: String(body.userText).slice(0, 2000) }];
  }
  if (!Array.isArray(messages) || messages.length === 0) {
    return new Response(JSON.stringify({ error: 'Invalid input' }), {
      status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }

  // Sanitize messages — only user/assistant roles, max 2000 chars each, last 20 turns
  const clean = messages
    .filter(m => ['user','assistant'].includes(m.role) && typeof m.content === 'string')
    .slice(-20)
    .map(m => ({ role: m.role, content: m.content.slice(0, 2000) }));

  const systemPrompt = `You are SupportPup, a warm and loyal emotional support companion — like a gentle, attentive dog who truly listens and never judges. You are NOT a therapist and never claim to be.

CONVERSATION STYLE:
- You hold the full context of this conversation and refer back to what the person shared
- Responses are warm, calm, grounding, and concise (max 120 words)
- You never repeat the same phrase twice in a conversation
- You follow the person's lead — if they want to keep talking, you listen and respond naturally
- You gently weave in grounding when appropriate, not every single message
- You never moralize, shame, or tell them what they "should" feel

STRUCTURE (adapt naturally across a conversation):
- First response: acknowledge → ground → one small step
- Follow-up responses: feel like a real warm exchange, not a formula
- Occasionally suggest a grounding tool by name (don't explain it, just offer it)

SAFETY: If crisis language appears, warmly include: "Pup is right here. Please also consider reaching out to 988 or someone you trust."`;

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
        max_tokens: 250,
        system: systemPrompt,
        messages: clean
      })
    });

    if (!anthropicRes.ok) {
      const err = await anthropicRes.text();
      console.error('Anthropic error:', err);
      return new Response(JSON.stringify({ error: 'AI service error' }), {
        status: 502, headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    const data = await anthropicRes.json();
    const text = data.content?.[0]?.text || "I'm right here with you. 🐾";

    return new Response(JSON.stringify({ response: text }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });

  } catch (err) {
    console.error('Proxy error:', err);
    return new Response(JSON.stringify({ error: 'Server error' }), {
      status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
}
