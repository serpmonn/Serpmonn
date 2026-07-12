import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const profileFile = path.join(root, 'assembly', 'site', '_data', 'profile.json');
const localesFile = path.join(root, 'assembly', 'site', '_data', 'locales.json');

const RU = {
  profile: 'Профиль',
  findings: 'Находки',
  plan: 'Тариф и баллы',
  tools: 'Инструменты',
};

const EN = {
  profile: 'Profile',
  findings: 'Findings',
  plan: 'Plan & points',
  tools: 'Tools',
};

const RU_FINDINGS = {
  summary: '{total} находок · {public} в ленте',
  filterAll: 'Все',
  filterPrivate: 'Приватные',
  filterPublic: 'В ленте',
  filterFollowers: 'Подписчикам',
  goSearch: 'Перейти к поиску',
};

const EN_FINDINGS = {
  summary: '{total} findings · {public} in feed',
  filterAll: 'All',
  filterPrivate: 'Private',
  filterPublic: 'In feed',
  filterFollowers: 'Followers',
  goSearch: 'Go to search',
};

const data = JSON.parse(fs.readFileSync(profileFile, 'utf8'));
const locales = JSON.parse(fs.readFileSync(localesFile, 'utf8'));

for (const locale of locales) {
  const block = data[locale];
  if (!block?.profile) continue;

  const tabs = locale === 'ru' ? RU : EN;
  const findings = locale === 'ru' ? RU_FINDINGS : EN_FINDINGS;

  block.profile.tabsSection = { ...tabs };
  block.profile.findingsSection = { ...findings };
  block.profile.planSection.referralCompactLabel = locale === 'ru' ? 'Реферальная ссылка' : 'Referral link';
  block.profile.planSection.exchangeToggle = locale === 'ru' ? 'Обменять баллы на Pro' : 'Exchange points for Pro';
  block.profile.extraSection.sectionTitle = locale === 'ru' ? 'Почта @onnmail' : '@onnmail email';
}

fs.writeFileSync(profileFile, `${JSON.stringify(data, null, 2)}\n`);
console.log(`Patched profile UI i18n for ${locales.length} locales`);
