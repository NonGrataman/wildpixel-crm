export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    });
  }

  const body = await req.json();

  // Convert Anthropic format to OpenRouter format
  const orBody = {
    model: 'anthropic/claude-sonnet-4-5',
    max_tokens: body.max_tokens || 1000,
    messages: body.messages
  };

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + process.env.OPENROUTER_API_KEY,
      'HTTP-Referer': 'https://wildpixel-crm.vercel.app',
      'X-Title': 'Wild Pixel CRM'
    },
    body: JSON.stringify(orBody)
  });

  const data = await res.json();

  // Convert OpenRouter response back to Anthropic format
  const anthropicFormat = {
    content: [{
      type: 'text',
      text: data.choices?.[0]?.message?.content || ''
    }]
  };

  return new Response(JSON.stringify(anthropicFormat), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    }
  });
}
