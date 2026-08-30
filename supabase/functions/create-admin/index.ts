// Supabase Edge Function: create-admin
//
// This exists because creating another person's login account requires the
// service role key, which can never be shipped to the browser. This function
// runs server-side (inside Supabase's infrastructure), holds that key as a
// secret, and is only reachable by an already-verified super admin.
//
// Deploy with:
//   npx supabase functions deploy create-admin
//
// It automatically has access to SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
// as environment variables -- Supabase injects these for every Edge
// Function, you don't need to set them yourself.

import { createClient } from 'jsr:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), { status: 401 });
    }

    // Client using the CALLER's own token, purely to verify who is asking.
    const callerClient = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_ANON_KEY'),
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await callerClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid session' }), { status: 401 });
    }

    // Confirm the caller is actually whitelisted as a super admin -- this is
    // the real security boundary, not just "is logged in".
    const { data: superAdminRow } = await callerClient
      .from('super_admins')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!superAdminRow) {
      return new Response(JSON.stringify({ error: 'Not authorized' }), { status: 403 });
    }

    const { email, name } = await req.json();
    if (!email || !name) {
      return new Response(JSON.stringify({ error: 'email and name are required' }), { status: 400 });
    }

    // Admin client, using the service role key -- this is the only piece of
    // code in the whole app allowed to hold this key.
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    );

    const temporaryPassword = crypto.randomUUID().slice(0, 12);

    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password: temporaryPassword,
      email_confirm: true,
    });
    if (createError) throw createError;

    const { error: wsError } = await adminClient.from('workspaces').insert([
      { id: newUser.user.id, name: 'Main Workspace', admin_name: name, admin_email: email },
    ]);
    if (wsError) throw wsError;

    return new Response(JSON.stringify({ temporaryPassword }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});
