import { promises as fs } from 'fs';
import path from 'path';

async function fileExists(filePath) {
  try {
    const stat = await fs.stat(filePath);
    return stat.isFile();
  } catch {
    return false;
  }
}

async function main() {
  const root = process.cwd();
  const i18nPath = path.join(root, 'site/_data/i18n.json');
  const frontendPath = path.join(root, 'frontend');

  const i18nRaw = await fs.readFile(i18nPath, 'utf8');
  const i18n = JSON.parse(i18nRaw);
  const en = i18n.en || i18n.ru || {
    heading: 'Serpmonn — search, read, play!',
    subheading: 'Ad‑free search, fresh news and mini‑games. All in one place.',
    cookie: {
      text: 'This site uses cookies. See <a href="/frontend/en/privacy-policy.html">privacy policy</a>.',
      accept: 'Accept',
      decline: 'Decline'
    },
    title: 'Serpmonn - Smart Search Engine, News & Mini Games Platform',
    description: 'Discover Serpmonn - smart search with latest news, mini-games, and tools.'
  };

  const localePattern = /^[a-z]{2}(-[a-z0-9]{2,4})?$/;
  const dirents = await fs.readdir(frontendPath, { withFileTypes: true });
  const locales = [];
  for (const d of dirents) {
    if (!d.isDirectory()) continue;
    const loc = d.name;
    if (!localePattern.test(loc)) continue;
    const indexPath = path.join(frontendPath, loc, 'index.html');
    if (await fileExists(indexPath)) {
      locales.push(loc);
    }
  }

  const added = [];
  for (const loc of locales) {
    if (!i18n[loc]) {
      i18n[loc] = {
        heading: en.heading,
        subheading: en.subheading,
        cookie: {
          text: (en.cookie?.text || '').replace('/frontend/en/privacy-policy.html', `/frontend/${loc}/privacy-policy.html`),
          accept: en.cookie?.accept || 'Accept',
          decline: en.cookie?.decline || 'Decline'
        },
        title: en.title,
        description: en.description
      };
      added.push(loc);
    }
  }

  if (added.length > 0) {
    await fs.writeFile(i18nPath, JSON.stringify(i18n, null, 2) + '\n', 'utf8');
  }
  process.stdout.write(JSON.stringify({ added, locales }) + '\n');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

