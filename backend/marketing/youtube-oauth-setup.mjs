#!/usr/bin/env node
/**
 * One-time YouTube OAuth setup (no googleapis).
 *
 * 1) Google Cloud Console → OAuth client (Desktop) + YouTube Data API v3
 * 2) In backend/.env:
 *      MARKETING_YOUTUBE_CLIENT_ID=...
 *      MARKETING_YOUTUBE_CLIENT_SECRET=...
 * 3) node backend/marketing/youtube-oauth-setup.mjs
 * 4) Open URL → paste code → save MARKETING_YOUTUBE_REFRESH_TOKEN
 */
import dotenv from 'dotenv';
import { createInterface } from 'readline';

dotenv.config({ path: '/var/www/serpmonn.ru/backend/.env' });

const clientId = process.env.MARKETING_YOUTUBE_CLIENT_ID;
const clientSecret = process.env.MARKETING_YOUTUBE_CLIENT_SECRET;
const redirectUri =
  process.env.MARKETING_YOUTUBE_REDIRECT_URI || 'urn:ietf:wg:oauth:2.0:oob';

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

console.log('\nOpen this URL in a browser:\n');
console.log(url);
console.log('\n');

const rl = createInterface({ input: process.stdin, output: process.stdout });
rl.question('Paste the authorization code: ', async (code) => {
  try {
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
      console.log('\n(No refresh_token — revoke access and retry)');
    }
  } catch (err) {
    console.error('Failed:', err.message);
  } finally {
    rl.close();
  }
});
