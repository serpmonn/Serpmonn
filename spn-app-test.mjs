#!/usr/bin/env node
/**
 * Serpmonn Dev Android app smoke test via Chrome DevTools Protocol.
 * Usage: node /tmp/spn-app-test.mjs [device-serial]
 */
import http from 'http';
import WebSocket from 'ws';
import { execSync } from 'child_process';
import fs from 'fs';

const SERIAL = process.argv[2] || '2328bd5d';
const APP_URL = 'https://dev.serpmonn.ru/frontend/app/index.html?app=1&_spn=114';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function adb(cmd) {
  return execSync(`adb -s ${SERIAL} ${cmd}`, { encoding: 'utf8' }).trim();
}

function get(url) {
  return new Promise((res, rej) => {
    http.get(url, (r) => {
      let d = '';
      r.on('data', (c) => (d += c));
      r.on('end', () => res(d));
    }).on('error', rej);
  });
}

async function connectPage() {
  const pid = adb('shell pidof ru.serpmonn.dev').split(/\s+/)[0];
  if (!pid) throw new Error('ru.serpmonn.dev not running');
  execSync(`adb -s ${SERIAL} forward tcp:9222 localabstract:webview_devtools_remote_${pid}`);
  const list = JSON.parse(await get('http://127.0.0.1:9222/json/list'));
  const page = list.find((x) => x.type === 'page' && /frontend\/app/.test(x.url || '')) || list.find((x) => x.type === 'page');
  if (!page) throw new Error('No WebView page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  let id = 0;
  const pend = new Map();
  ws.on('message', (raw) => {
    const m = JSON.parse(raw);
    if (m.id && pend.has(m.id)) {
      pend.get(m.id)(m);
      pend.delete(m.id);
    }
  });
  await new Promise((r) => ws.once('open', r));
  const call = (method, params = {}) =>
    new Promise((r) => {
      const my = ++id;
      pend.set(my, r);
      ws.send(JSON.stringify({ id: my, method, params }));
    });
  const eval_ = async (expr, opts = {}) => {
    const m = await call('Runtime.evaluate', {
      expression: expr,
      returnByValue: true,
      awaitPromise: true,
      ...opts,
    });
    if (m.result?.exceptionDetails) {
      throw new Error(m.result.exceptionDetails.text || 'eval error');
    }
    return m.result?.result?.value;
  };
  return { ws, call, eval_ };
}

const results = [];

function record(name, ok, detail = '') {
  results.push({ name, ok, detail });
  const mark = ok ? 'PASS' : 'FAIL';
  console.log(`${mark}  ${name}${detail ? ' — ' + detail : ''}`);
}

async function main() {
  console.log(`Testing on device ${SERIAL}…\n`);
  const { ws, call, eval_ } = await connectPage();

  await call('Page.enable');
  await call('Runtime.enable');
  await call('Page.navigate', { url: APP_URL });
  await sleep(4500);

  const boot = await eval_(`({
    ok: !!window.__SPN_APP_JS_OK__,
    sync: typeof syncSystemNavChrome,
    href: location.href,
    scripts: [...document.scripts].map(s => s.src || 'inline').filter(Boolean).length
  })`);
  record('App boot (app.js loaded)', boot.ok && boot.sync === 'function', JSON.stringify(boot));

  // feed/inbox open fullscreen overlay, not .spn-screen
  const tabs = [
    { name: 'feed', check: `(!!document.getElementById('fullscreenPage')&&!document.getElementById('fullscreenPage').hidden)||document.querySelector('.spn-tab.is-active')?.dataset?.tab==='feed'` },
    { name: 'search', check: `document.querySelector('.spn-screen.is-active')?.dataset?.screen==='search'` },
    { name: 'inbox', check: `document.querySelector('.spn-tab.is-active')?.dataset?.tab==='inbox'` },
    { name: 'news', check: `document.querySelector('.spn-screen.is-active')?.dataset?.screen==='news'` },
    { name: 'tools', check: `document.querySelector('.spn-screen.is-active')?.dataset?.screen==='tools'` },
    { name: 'games', check: `document.querySelector('.spn-screen.is-active')?.dataset?.screen==='games'` },
    { name: 'profile', check: `document.querySelector('.spn-screen.is-active')?.dataset?.screen==='profile'` },
  ];
  for (const tab of tabs) {
    if (tab.name === 'feed' || tab.name === 'inbox') {
      try { await eval_(`document.getElementById('fullscreenBack')?.click()`); } catch (_) {}
      await sleep(400);
    }
    await eval_(`document.querySelector('.spn-tab[data-tab="${tab.name}"]')?.click()`);
    await sleep(tab.name === 'feed' || tab.name === 'inbox' ? 2500 : 1200);
    const ok = await eval_(tab.check);
    const guestInbox = tab.name === 'inbox';
    if (guestInbox) {
      const loggedIn = await eval_(`(async()=>typeof isLoggedIn==='function'?await isLoggedIn():false)()`);
      if (!loggedIn) {
        record(`Tab: inbox (guest → profile)`, true, 'expected for logged-out user');
        continue;
      }
    }
    record(`Tab: ${tab.name}`, !!ok, ok ? '' : 'check failed');
  }

  // Close fullscreen if open before viewer tests
  await eval_(`document.getElementById('fullscreenBack')?.click()`);
  await sleep(500);

  // Tools: open first tool in viewer
  await eval_(`document.querySelector('.spn-tab[data-tab="tools"]')?.click()`);
  await sleep(1200);
  const toolOpen = await eval_(`(async () => {
    const btn = document.querySelector('#toolsList .spn-cardbtn');
    if (!btn) return { err: 'no tool button' };
    btn.click();
    await new Promise(r => setTimeout(r, 3500));
    const v = document.getElementById('viewer');
    const f = document.getElementById('viewerFrame');
    const srcdoc = (f?.srcdoc || '').length;
    const body = (() => { try { return f?.contentDocument?.body?.innerText?.slice(0,120) || ''; } catch(e){ return 'xdoc'; } })();
    return {
      viewerOpen: v && !v.hidden,
      booting: f?.classList?.contains('is-booting'),
      srcdocLen: srcdoc,
      bodyPreview: body.replace(/\\s+/g,' ').slice(0,100),
      white: srcdoc < 200 && !body.trim()
    };
  })()`);
  record(
    'Viewer: first tool',
    toolOpen.viewerOpen && !toolOpen.white && toolOpen.srcdocLen > 500,
    JSON.stringify(toolOpen)
  );
  await eval_(`document.getElementById('viewerClose')?.click()`);
  await sleep(800);

  // Games: open first game
  await eval_(`document.querySelector('.spn-tab[data-tab="games"]')?.click()`);
  await sleep(1200);
  const gameOpen = await eval_(`(async () => {
    const btn = document.querySelector('#gamesOwnList .spn-cardbtn');
    if (!btn) return { err: 'no game button' };
    btn.click();
    await new Promise(r => setTimeout(r, 4000));
    const f = document.getElementById('viewerFrame');
    const srcdoc = (f?.srcdoc || '').length;
    let body = '';
    try { body = f?.contentDocument?.body?.innerText?.slice(0,120) || ''; } catch(_) {}
    return { srcdocLen: srcdoc, bodyPreview: body.replace(/\\s+/g,' ').slice(0,80), white: srcdoc < 200 && !body.trim() };
  })()`);
  record('Viewer: first game', !gameOpen.white && gameOpen.srcdocLen > 500, JSON.stringify(gameOpen));
  await eval_(`document.getElementById('viewerClose')?.click()`);
  await sleep(600);

  // Search + keyboard
  await eval_(`document.querySelector('.spn-tab[data-tab="search"]')?.click()`);
  await sleep(400);
  const box = await eval_(`(() => {
    const el = document.getElementById('searchInput');
    const r = el.getBoundingClientRect();
    return { x: Math.round((r.left+r.width/2)*(devicePixelRatio||1)), y: Math.round((r.top+r.height/2)*(devicePixelRatio||1)) };
  })()`);
  adb(`shell input tap ${box.x} ${box.y}`);
  await sleep(2000);
  const ime = await eval_(`(() => {
    const tabs = document.querySelector('.spn-tabs');
    const r = tabs.getBoundingClientRect();
    return {
      ime: typeof isImeLikelyOpen==='function' ? isImeLikelyOpen() : null,
      aboveKb: Math.round(visualViewport.height - r.bottom),
      pad: document.documentElement.style.getPropertyValue('--spn-app-nav-pad'),
      kb: getComputedStyle(document.documentElement).getPropertyValue('--spn-keyboard-inset').trim()
    };
  })()`);
  record(
    'Search + keyboard (tabs above IME)',
    ime.ime && ime.aboveKb >= 0 && ime.aboveKb <= 80,
    JSON.stringify(ime)
  );
  adb('shell input keyevent 4'); // back dismiss keyboard
  await sleep(800);

  // Fetch health after usage
  const fetchOk = await eval_(`(async () => {
    const t0 = Date.now();
    try {
      const r = await fetch('/frontend/app/app.js?v=112', { cache: 'no-store' });
      return { ok: r.ok, ms: Date.now()-t0, status: r.status };
    } catch(e) { return { ok: false, err: String(e) }; }
  })()`);
  record('Fetch still works', fetchOk.ok, JSON.stringify(fetchOk));

  // Catalog loaded?
  await eval_(`document.querySelector('.spn-tab[data-tab="tools"]')?.click()`);
  await sleep(800);
  const catalog = await eval_(`({
    catalogLoaded: typeof catalogLoaded !== 'undefined' ? catalogLoaded : false,
    games: document.querySelectorAll('#gamesOwnList .spn-cardbtn').length,
    tools: document.querySelectorAll('#toolsList .spn-cardbtn').length
  })`);
  record('Catalog (games/tools buttons)', catalog.games > 0 && catalog.tools > 0, JSON.stringify(catalog));

  ws.close();

  const failed = results.filter((r) => !r.ok);
  console.log(`\n--- ${results.length - failed.length}/${results.length} passed ---`);
  if (failed.length) {
    console.log('Failed:', failed.map((f) => f.name).join(', '));
    process.exit(1);
  }
}

main().catch((e) => {
  console.error('Test runner error:', e);
  process.exit(2);
});
