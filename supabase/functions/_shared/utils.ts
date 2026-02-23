

// deno-lint-ignore-file no-explicit-any

// This file contains shared utility functions for Deno Edge Functions.
// It's intended to be copied or imported into other functions.

const ALLOWED_ORIGINS = [
  'https://holistic-seo-topical-map-generator.vercel.app',
  'https://app.cutthecrap.net',
  'https://cost-of-retreival-reducer.vercel.app',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'http://localhost:5173',
];

export function corsHeaders(requestOrigin?: string | null) {
  const origin = requestOrigin && ALLOWED_ORIGINS.includes(requestOrigin)
    ? requestOrigin
    : ALLOWED_ORIGINS[0]; // Default to production origin
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
  };
}

// Map legacy custom secret names to auto-injected SUPABASE_* equivalents.
// Supabase auto-injects SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
// into all edge functions. Custom secrets may become stale after key rotations.
const ENV_VAR_PREFERRED: Record<string, string> = {
  'PROJECT_URL': 'SUPABASE_URL',
  'ANON_KEY': 'SUPABASE_ANON_KEY',
  'SERVICE_ROLE_KEY': 'SUPABASE_SERVICE_ROLE_KEY',
};

export function getEnvVar(name: string): string {
  const Deno = (globalThis as any).Deno;
  // For known aliases, prefer the auto-injected SUPABASE_* var (always correct)
  const preferred = ENV_VAR_PREFERRED[name];
  const value = preferred
    ? (Deno.env.get(preferred) || Deno.env.get(name))
    : Deno.env.get(name);
  if (!value) {
    console.warn(`Environment variable ${name} is not set.`);
  }
  return value;
}

export function getSupabaseUrl(req: Request): string {
  // Prefer auto-injected SUPABASE_URL (via getEnvVar alias mapping)
  const envUrl = getEnvVar("SUPABASE_URL") || getEnvVar("PROJECT_URL");
  if (envUrl) return envUrl;
  
  // Fallback for client-side headers if needed, though env var is better.
  const headerUrl = req.headers.get("x-supabase-api-base");
  if (headerUrl) return headerUrl;

  // Last resort, try to parse from host (less reliable)
  const host = req.headers.get("host") ?? "";
  const m = host.match(/^([a-z0-9]{20})\./i);
  if (m && m[1]) {
    return `https://${m[1].toLowerCase()}.supabase.co`;
  }

  throw new Error(
    "Missing PROJECT_URL. It should be set as a secret for the function.",
  );
}

export function getFunctionsBase(supabaseUrl: string): string {
  return `${supabaseUrl}/functions/v1`;
}

export function json(
  body: any,
  status = 200,
  origin?: string | null,
  headers: Record<string, string> = {},
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders(origin),
      ...headers,
    },
  });
}

export async function fetchWithTimeout(resource: string | URL, options: RequestInit & { timeout?: number } = {}) {
  const { timeout = 8000 } = options;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(resource, {
      ...options,
      signal: controller.signal  
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}