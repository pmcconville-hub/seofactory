// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// --- START Inlined Utility Functions ---
function corsHeaders(origin = "*") {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
}

function getEnvVar(name: string): string {
  const Deno = (globalThis as any).Deno;
  const value = Deno.env.get(name);
  if (!value) {
    throw new Error(`FATAL: Environment variable ${name} is not set.`);
  }
  return value;
}

function json(
  body: any,
  status = 200,
  origin = "*",
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders(origin),
    },
  });
}
// --- END Inlined Utility Functions ---

const Deno = (globalThis as any).Deno;

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin") ?? "*";
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(origin) })
  }

  try {
    // 1. Initialize Supabase Admin Client (Service Role)
    // This allows us to bypass RLS and access the auth.users schema
    const supabaseAdmin = createClient(
        getEnvVar('PROJECT_URL'),
        getEnvVar('SERVICE_ROLE_KEY')
    );

    // 2. Verify the caller is authenticated (even if we don't strictly check "admin" role yet)
    // In a production app, you would check if 'user.role === admin' here.
    const authHeader = req.headers.get('Authorization')!;
    const { error: authError } = await supabaseAdmin.auth.getUser(authHeader.replace('Bearer ', ''));
    
    if (authError) {
        return json({ error: 'Unauthorized' }, 401, origin);
    }

    // 3. List Users
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();

    if (listError) {
        throw listError;
    }

    // 4. Map to a safe response format
    const safeUsers = users.map(u => ({
        id: u.id,
        email: u.email,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
        role: u.role || 'authenticated' // Default role
    }));

    return json({ users: safeUsers }, 200, origin);

  } catch (error) {
    console.error("Error in get-users:", error);
    return json({ ok: false, error: error.message }, 500, origin)
  }
})