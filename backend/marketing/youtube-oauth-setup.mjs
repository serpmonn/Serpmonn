#!/usr/bin/env node
/**
 * One-time YouTube OAuth setup (no googleapis).
 *
 * 1) Google Cloud Console → OAuth client (Desktop) + YouTube Data API v3
 * 2) In backend/.env:
 *      MARKETING_YOUTUBE_CLIENT_ID=...
 *      MARKETING_YOUTUBE_CLIENT_SECRET=...
 * 3) node backend/marketing/youtube-oauth-setup.mjs
 * 4) Open URL on YOUR PC (same Google that can open the Ads channel on youtube.com)
 * 5) After allow — browser goes to http://127.0.0.1:8765/?code=...
 *    If page doesn't load, copy code= from the address bar and paste here
 * 6) Save MARKETING_YOUTUBE_REFRESH_TOKEN
 *
 * Note: redirect is localhost on the machine where the BROWSER runs (your PC),
 * not on the server. Paste the code into this script over SSH.
 */
import dotenv from 'dotenv';
import { createInterface } from 'readline';

dotenv.config({ path: '/var/www/serpmonn.ru/backend/.env' });

const clientId = process.env.MARKETING_YOUTUBE_CLIENT_ID;
const clientSecret = process.env.MARKETING_YOUTUBE_CLIENT_SECRET;
/** Loopback — works for Desktop clients; oob is deprecated and often breaks. */
const redirectUri =
  process.env.MARKETING_YOUTUBE_REDIRECT_URI || 'http://127.0.0.1:8765';

if (!clientId || !clientSecret) {
  console.error('Set MARKETING_YOUTUBE_CLIENT_ID and MARKETING_YOUTUBE_CLIENT_SECRET first');
  process.exit(1);
}

const scope = encodeURIComponent(
  'https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly'
);
const url =
  `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(clientId)}` +
  `&redirect_uri=${encodeURIComponent(redirectUri)}` +
  `&response_type=code&access_type=offline&prompt=consent&scope=${scope}`;

async function exchangeCode(code) {
  const body = new URLSearchParams({
    code: String(code).trim(),
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code'
  });
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  });
  const tokens = await res.json();
  if (!res.ok) {
    console.error('Failed:', tokens);
    process.exit(1);
  }
  console.log('\nAdd to backend/.env:\n');
  console.log(`MARKETING_YOUTUBE_REFRESH_TOKEN=${tokens.refresh_token || ''}`);
  if (!tokens.refresh_token) {
    console.log('\n(No refresh_token — revoke app access at myaccount.google.com/permissions and retry)');
  }
}

console.log(`
========================================
YouTube OAuth (Desktop / loopback)
========================================
1) On youtube.com switch to the ADS channel first.
2) Open this URL in the SAME browser / Google account
   (incognito is fine if that account is the only one):

${url}

3) Allow access. Browser redirects to:
   ${redirectUri}/?code=...
4) Copy the value of "code" from the address bar
   (even if the page says connection refused).
5) Paste it below.
========================================
`);

const rl = createInterface({ input: process.stdin, output: process.stdout });
rl.question('Paste the authorization code: ', async (code) => {
  try {
    // Support full URL paste
    let raw = String(code || '').trim();
    try {
      if (raw.includes('code=')) {
        const u = new URL(raw.includes('://') ? raw : `http://local/?${raw.replace(/^\?/, '')}`);
        raw = u.searchParams.get('code') || raw;
      }
    } catch {
      /* use raw */
    }
    await exchangeCode(raw);
  } catch (err) {
    console.error('Failed:', err.message);
  } finally {
    rl.close();
  }
});
