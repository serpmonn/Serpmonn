#!/usr/bin/env node
import https from 'https';
import { URL } from 'url';
import fs from 'fs';
import path from 'path';

// Usage:
//   INDEXNOW_KEY=yourkey INDEXNOW_HOST=www.serpmonn.ru INDEXNOW_KEY_LOCATION=https://www.serpmonn.ru/yourkey.txt \
//   node scripts/indexnow-ping.mjs https://www.serpmonn.ru/ https://www.serpmonn.ru/frontend/en/index.html
//
//   # Ping only changed URLs (since last run):
//   node scripts/indexnow-ping.mjs --changed-only
//
// Notes:
// - Create a file at https://<host>/<key>.txt that contains the key as plain text
// - You can send up to 10,000 URLs in one POST
// - --changed-only mode scans frontend/ for modified HTML files since last run

const KEY = process.env.INDEXNOW_KEY || '';
const HOST = process.env.INDEXNOW_HOST || '';
const KEY_LOCATION = process.env.INDEXNOW_KEY_LOCATION || (KEY && HOST ? `https://${HOST}/${KEY}.txt` : '');

// State file to track last run timestamp
const STATE_FILE = path.join(process.cwd(), '.indexnow-state.json');

// Parse command line arguments
const args = process.argv.slice(2);
const isChangedOnly = args.includes('--changed-only');
const urls = args.filter(arg => arg !== '--changed-only' && Boolean(arg));

// Helper functions for --changed-only mode
function getLastRunTime() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const data = fs.readFileSync(STATE_FILE, 'utf8');
      const state = JSON.parse(data);
      return new Date(state.lastRun || 0);
    }
  } catch (e) {
    console.warn('IndexNow: could not read state file, using current time');
  }
  return new Date();
}

function saveLastRunTime() {
  try {
    const state = { lastRun: new Date().toISOString() };
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  } catch (e) {
    console.warn('IndexNow: could not save state file');
  }
}

function findChangedHtmlFiles(since) {
  const changedFiles = [];
  const frontendDir = path.join(process.cwd(), 'frontend');
  
  if (!fs.existsSync(frontendDir)) {
    console.warn('IndexNow: frontend/ directory not found');
    return changedFiles;
  }

  function scanDir(dir) {
    const items = fs.readdirSync(dir);
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        // Skip certain directories
        if (!['scripts', 'styles', 'images', 'dev'].includes(item)) {
          scanDir(fullPath);
        }
      } else if (item.endsWith('.html') && stat.mtime > since) {
        changedFiles.push(fullPath);
      }
    }
  }
  
  scanDir(frontendDir);
  return changedFiles;
}

function htmlFileToUrl(filePath) {
  const relativePath = path.relative(path.join(process.cwd(), 'frontend'), filePath);
  const urlPath = relativePath.replace(/\\/g, '/');
  
  // Handle special cases
  if (urlPath === 'index.html') {
    return `https://${HOST}/`;
  }
  
  return `https://${HOST}/frontend/${urlPath}`;
}

if (!KEY || !HOST || !KEY_LOCATION) {
  console.error('IndexNow: please set env vars INDEXNOW_KEY, INDEXNOW_HOST, INDEXNOW_KEY_LOCATION');
  process.exit(1);
}

// Handle --changed-only mode
if (isChangedOnly) {
  const lastRun = getLastRunTime();
  console.log(`IndexNow: scanning for files changed since ${lastRun.toISOString()}`);
  
  const changedFiles = findChangedHtmlFiles(lastRun);
  console.log(`IndexNow: found ${changedFiles.length} changed HTML files`);
  
  if (changedFiles.length === 0) {
    console.log('IndexNow: no changes detected, skipping ping');
    saveLastRunTime();
    process.exit(0);
  }
  
  // Convert file paths to URLs
  const changedUrls = changedFiles.map(htmlFileToUrl);
  urls.push(...changedUrls);
  
  console.log('IndexNow: will ping URLs:', changedUrls);
}

if (urls.length === 0) {
  console.error('IndexNow: provide at least one URL to ping as CLI argument');
  process.exit(1);
}

// Validate URLs belong to HOST
for (const u of urls) {
  try {
    const parsed = new URL(u);
    if (parsed.host !== HOST) {
      console.error(`IndexNow: URL host mismatch for ${u} (expected ${HOST})`);
      process.exit(1);
    }
  } catch (e) {
    console.error(`IndexNow: invalid URL: ${u}`);
    process.exit(1);
  }
}

const body = JSON.stringify({
  host: HOST,
  key: KEY,
  keyLocation: KEY_LOCATION,
  urlList: urls,
});

const options = {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body).toString(),
  },
};

const req = https.request('https://api.indexnow.org/indexnow', options, (res) => {
  let data = '';
  res.on('data', (chunk) => (data += chunk));
  res.on('end', () => {
    console.log('IndexNow response:', res.statusCode, res.statusMessage);
    if (data) console.log(data);
    
    // Save last run time if successful
    if (res.statusCode >= 200 && res.statusCode < 300) {
      saveLastRunTime();
    }
    
    process.exit(res.statusCode >= 200 && res.statusCode < 300 ? 0 : 1);
  });
});

req.on('error', (err) => {
  console.error('IndexNow error:', err.message);
  process.exit(1);
});

req.write(body);
req.end();

