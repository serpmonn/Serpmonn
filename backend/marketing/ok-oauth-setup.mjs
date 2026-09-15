#!/usr/bin/env node
/**
 * One-time OK.ru OAuth: получить access_token + session_secret_key.
 *
 * Нужно в backend/.env:
 *   MARKETING_OK_APPLICATION_ID=...   (числовой ID приложения в OK, не VK)
 *   MARKETING_OK_APPLICATION_KEY=...
 *   MARKETING_OK_APPLICATION_SECRET=...
 *
 * Права GROUP_CONTENT / PHOTO_CONTENT / VALUABLE_ACCESS / LONG_ACCESS_TOKEN
 * обычно выдаёт api-support@ok.ru по заявке.
 *
 * 1) node backend/marketing/ok-oauth-setup.mjs
 * 2) Открой URL в браузере под аккаунтом АДМИНА группы OK
 * 3) После согласия попадёшь на blank.html#access_token=...&session_secret_key=...
 * 4) Вставь строку из адресной строки сюда
 */
import dotenv from 'dotenv';
import { createInterface } from 'readline';

dotenv.config({ path: '/var/www/serpmonn.ru/backend/.env' });

const appId = String(process.env.MARKETING_OK_APPLICATION_ID || '').trim();
const redirectUri =
  process.env.MARKETING_OK_REDIRECT_URI || 'https://oauth.mycdn.me/blank.html';
const scope = [
  'VALUABLE_ACCESS',
  'GROUP_CONTENT',
  'PHOTO_CONTENT',
  'LONG_ACCESS_TOKEN'
].join(';');

if (!appId) {
  console.error(`
Нужен MARKETING_OK_APPLICATION_ID в backend/.env
Это числовой ID приложения именно в Одноклассниках
(после привязки Mini App → OK он может отличаться от VK app id).
Ищи в OK: Игры → Мои загруженные → приложение, или в письме/настройках.
`);
  process.exit(1);
}

const url =
  `https://connect.ok.ru/oauth/authorize` +
  `?client_id=${encodeURIComponent(appId)}` +
  `&scope=${encodeURIComponent(scope)}` +
  `&response_type=token` +
  `&redirect_uri=${encodeURIComponent(redirectUri)}` +
  `&layout=w`;

function parseHash(raw) {
  const s = String(raw || '').trim();
  const hash = s.includes('#') ? s.split('#')[1] : s.replace(/^\?/, '');
  const params = new URLSearchParams(hash);
  return {
    access_token: params.get('access_token') || '',
    session_secret_key: params.get('session_secret_key') || '',
    error: params.get('error') || '',
    permissions_granted: params.get('permissions_granted') || ''
  };
}

console.log(`
========================================
OK.ru OAuth (client / token)
========================================
Группа: ${process.env.MARKETING_OK_GROUP_URL || ''}
App ID: ${appId}
Redirect: ${redirectUri}

1) Открой URL под аккаунтом админа группы:

${url}

2) Разреши доступ.
3) Скопируй ВЕСЬ адрес из строки браузера
   (там будет #access_token=...&session_secret_key=...)
4) Вставь сюда и нажми Enter.
`);

const rl = createInterface({ input: process.stdin, output: process.stdout });
rl.question('URL или hash: ', (answer) => {
  rl.close();
  const parsed = parseHash(answer);
  if (parsed.error) {
    console.error('Ошибка OAuth:', parsed.error);
    process.exit(1);
  }
  if (!parsed.access_token) {
    console.error('access_token не найден. Вставь полный URL с #access_token=...');
    process.exit(1);
  }
  console.log('\nДобавь в backend/.env:\n');
  console.log(`MARKETING_OK_ACCESS_TOKEN=${parsed.access_token}`);
  if (parsed.session_secret_key) {
    console.log(`MARKETING_OK_SESSION_SECRET_KEY=${parsed.session_secret_key}`);
  }
  if (parsed.permissions_granted) {
    console.log(`\nВыданные права: ${parsed.permissions_granted}`);
  }
  console.log('\nПотом: pm2 restart admin-server && включи OK.ru в админке.\n');
});
