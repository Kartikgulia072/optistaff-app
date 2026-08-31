// Supabase Edge Function: send-approval-push
//
// This is what makes notifications arrive even with the app fully closed.
// It's triggered by a Supabase Database Webhook whenever a row changes in
// employees or supervisors, figures out who needs to be told, and sends a
// real push through Firebase Cloud Messaging (FCM) -- which the OS delivers
// even if the app process isn't running at all.
//
// Deploy with:
//   npx supabase functions deploy send-approval-push --no-verify-jwt
//
// Requires two secrets set beforehand (see setup steps):
//   FIREBASE_SERVICE_ACCOUNT  -- the full JSON key file from Firebase, as one string
//   WEBHOOK_SECRET            -- a random string only you and the webhook know,
//                                so random people on the internet can't invoke this

import { createClient } from 'jsr:@supabase/supabase-js@2';

function base64url(input) {
  let str;
  if (typeof input === 'string') {
    str = btoa(input);
  } else {
    str = btoa(String.fromCharCode(...new Uint8Array(input)));
  }
  return str.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function importPrivateKey(pem) {
  const pemContents = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s/g, '');
  const binaryDer = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey(
    'pkcs8',
    binaryDer.buffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );
}

// FCM's modern API (HTTP v1) needs a short-lived Google OAuth2 access token,
// minted by signing a JWT with the service account's private key. There's no
// simple static "server key" anymore -- Google retired that in 2024.
async function getAccessToken() {
  const serviceAccount = JSON.parse(Deno.env.get('FIREBASE_SERVICE_ACCOUNT'));
  const now = Math.floor(Date.now() / 1000);

  const header = { alg: 'RS256', typ: 'JWT' };
  const claimSet = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };

  const encoder = new TextEncoder();
  const unsigned = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(claimSet))}`;
  const key = await importPrivateKey(serviceAccount.private_key);
  const signature = await crypto.subtle.sign({ name: 'RSASSA-PKCS1-v1_5' }, key, encoder.encode(unsigned));
  const jwt = `${unsigned}.${base64url(signature)}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });
  const data = await res.json();
  if (!data.access_token) throw new Error('Failed to get Google access token: ' + JSON.stringify(data));
  return { accessToken: data.access_token, projectId: serviceAccount.project_id };
}

async function sendPush(accessToken, projectId, token, title, body) {
  const res = await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: {
        token,
        notification: { title, body },
        android: { priority: 'high' },
      },
    }),
  });
  return res.json();
}

Deno.serve(async (req) => {
  try {
    if (req.headers.get('x-webhook-secret') !== Deno.env.get('WEBHOOK_SECRET')) {
      return new Response('unauthorized', { status: 401 });
    }

    const payload = await req.json();
    const { type, table, record, old_record } = payload;

    if (!['employees', 'supervisors'].includes(table)) {
      return new Response('ignored table', { status: 200 });
    }

    const isNewlyPending =
      record.approval_status === 'pending' &&
      (type === 'INSERT' || old_record?.approval_status !== 'pending');
    const isNewlyApproved =
      record.approval_status === 'approved' && old_record?.approval_status === 'pending';

    let targetRole, filterColumn, filterValue, title, body;

    if (isNewlyPending) {
      targetRole = 'admin';
      filterColumn = 'workspace_id';
      filterValue = record.workspace_id;
      title = 'New Approval Request';
      body = `${record.name} was submitted for approval.`;
    } else if (isNewlyApproved) {
      targetRole = 'supervisor';
      filterColumn = 'plant_id';
      filterValue = record.plant_id;
      title = 'Request Approved';
      body = `${record.name} has been approved by the Admin.`;
    } else {
      return new Response('no-op', { status: 200 });
    }

    const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'));
    const { data: tokens } = await supabase
      .from('device_tokens')
      .select('token')
      .eq('role', targetRole)
      .eq(filterColumn, filterValue);

    if (!tokens || tokens.length === 0) {
      return new Response('no device tokens for target', { status: 200 });
    }

    const { accessToken, projectId } = await getAccessToken();
    const results = await Promise.all(tokens.map((t) => sendPush(accessToken, projectId, t.token, title, body)));

    return new Response(JSON.stringify({ sent: results.length, results }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});
