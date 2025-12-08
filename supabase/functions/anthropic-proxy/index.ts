// supabase/functions/anthropic-proxy/index.ts
// Proxy for Anthropic API calls to avoid CORS issues in browser environments
// deno-lint-ignore-file no-explicit-any

const Deno = (globalThis as any).Deno;

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
// Supabase Edge Functions have different timeout limits:
// - Free plan: ~10 seconds
// - Pro plan: ~150 seconds
// Set internal timeout slightly below to provide better error messages
const FETCH_TIMEOUT_MS = 120000; // 120 seconds - allows for long AI responses

function corsHeaders(origin = "*") {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-anthropic-api-key",
  };
}

function json(body: any, status = 200, origin = "*") {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders(origin),
    },
  });
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin") ?? "*";
  const startTime = Date.now();

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(origin) });
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405, origin);
  }

  try {
    // Get the API key from the request header
    const apiKey = req.headers.get('x-anthropic-api-key');
    if (!apiKey) {
      return json({ error: 'Missing Anthropic API key' }, 400, origin);
    }

    // Get the request body
    const body = await req.json();

    // Validate required fields
    if (!body.model || !body.messages) {
      return json({ error: 'Missing required fields: model and messages' }, 400, origin);
    }

    console.log(`[anthropic-proxy] Starting request to model: ${body.model}, max_tokens: ${body.max_tokens || 4096}`);

    // Create AbortController for timeout management
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
      console.error(`[anthropic-proxy] Request timed out after ${FETCH_TIMEOUT_MS}ms`);
    }, FETCH_TIMEOUT_MS);

    try {
      // Forward the request to Anthropic with timeout
      const anthropicResponse = await fetch(ANTHROPIC_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: body.model,
          max_tokens: body.max_tokens || 4096,
          messages: body.messages,
          system: body.system,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const elapsed = Date.now() - startTime;
      console.log(`[anthropic-proxy] Anthropic responded in ${elapsed}ms with status ${anthropicResponse.status}`);

      // Check for errors from Anthropic
      if (!anthropicResponse.ok) {
        const errorText = await anthropicResponse.text();
        console.error('[anthropic-proxy] Anthropic API error:', errorText);
        return json(
          { error: `Anthropic API error: ${anthropicResponse.status} ${anthropicResponse.statusText}`, details: errorText },
          anthropicResponse.status,
          origin
        );
      }

      // Return the Anthropic response
      const data = await anthropicResponse.json();
      return json(data, 200, origin);

    } catch (fetchError: any) {
      clearTimeout(timeoutId);

      if (fetchError.name === 'AbortError') {
        console.error(`[anthropic-proxy] Request aborted due to timeout (${FETCH_TIMEOUT_MS}ms)`);
        return json({
          error: `Request timed out after ${FETCH_TIMEOUT_MS / 1000} seconds. The Anthropic API may be slow or your Supabase plan may have lower timeout limits.`,
          suggestion: 'Try a simpler request or upgrade your Supabase plan for longer timeouts.'
        }, 504, origin);
      }

      throw fetchError;
    }

  } catch (error: any) {
    const elapsed = Date.now() - startTime;
    console.error(`[anthropic-proxy] Function error after ${elapsed}ms:`, error);
    return json({
      error: error.message || 'Internal server error',
      elapsed_ms: elapsed
    }, 500, origin);
  }
});
