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

  const { prompt, company_name, company_email } = await req.json();

  const API_KEY = process.env.OPENROUTER_API_KEY;

  let companyInfo = '';
  try {
    const searchRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + API_KEY,
        'HTTP-Referer': 'https://wildpixel-crm.vercel.app',
        'X-Title': 'Wild Pixel CRM'
      },
      body: JSON.stringify({
        model: 'perplexity/sonar',
        max_tokens: 400,
        messages: [{
          role: 'user',
          content: 'Research this company in 5-7 sentences: "' + company_name + '" ' + (company_email ? '(domain: ' + company_email.split('@')[1] + ')' : '') + '. Focus on: what they do, their recent projects, clients they work with, their scale and reputation. Be specific and factual.'
        }]
      })
    });
    const searchData = await searchRes.json();
    companyInfo = searchData.choices?.[0]?.message?.content || '';
  } catch(e) {
    companyInfo = '';
  }

  const finalPrompt = prompt + (companyInfo ? '\n\nCOMPANY RESEARCH (use these specific facts to personalize):\n' + companyInfo : '');

  let messageText = '';
  let debugInfo = '';

  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + API_KEY,
        'HTTP-Referer': 'https://wildpixel-crm.vercel.app',
        'X-Title': 'Wild Pixel CRM'
      },
      body: JSON.stringify({
        model: 'anthropic/claude-sonnet-4.5',
        max_tokens: 1200,
        messages: [{ role: 'user', content: finalPrompt }]
      })
    });

    const rawText = await res.text();
    let data;
    try {
      data = JSON.parse(rawText);
    } catch(parseErr) {
      debugInfo = 'PARSE_ERROR: ' + rawText.substring(0, 300);
      data = {};
    }

    messageText = data.choices?.[0]?.message?.content || '';

    if (!messageText) {
      debugInfo = debugInfo || ('EMPTY_RESPONSE: ' + JSON.stringify(data).substring(0, 500));
    }
  } catch(e) {
    debugInfo = 'FETCH_ERROR: ' + e.message;
  }

  return new Response(JSON.stringify({
    content: [{ type: 'text', text: messageText }],
    research: companyInfo,
    debug: debugInfo || undefined
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    }
  });
}
