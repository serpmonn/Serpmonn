import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const i18nDir = path.join(root, 'shared', 'i18n');
const baseFile = path.join(i18nDir, 'en.base.json');
const localesFile = path.join(root, 'assembly', 'site', '_data', 'locales.json');

const RU = {
  'finding.saveLabel': 'Сохранить находку',
  'finding.saveTitle': 'Находка сохранена',
  'finding.visibilityPrivate': 'Только я',
  'finding.visibilityLink': 'Все, у кого есть ссылка',
  'finding.sendToUser': 'Отправить пользователю',
  'finding.usernamePlaceholder': '@username',
  'finding.messagePlaceholder': 'Сообщение (необязательно)',
  'finding.savedToast': 'Находка сохранена',
  'finding.openFinding': 'Открыть находку',
  'finding.shareSent': 'Отправлено @{username}',
  'finding.loginRequired': 'Войдите, чтобы сохранять находки',
  'finding.emptyAnswer': 'Пока нечего сохранять',
  'finding.saveFailed': 'Не удалось сохранить',
  'finding.shareFailed': 'Не удалось отправить',
  'finding.userNotFound': 'Пользователь не найден',
  'finding.selfShare': 'Нельзя отправить самому себе',
  'finding.inboxTitle': 'Входящие',
  'finding.myFindingsTitle': 'Мои находки',
  'finding.noFindings': 'Пока нет сохранённых находок',
  'finding.noInbox': 'Входящих находок пока нет',
  'finding.fromUser': 'От @{user}',
  'finding.viewFinding': 'Открыть',
  'finding.pageTitle': 'Находка',
  'finding.authorLabel': 'Автор',
  'finding.notFound': 'Находка не найдена',
  'finding.forbidden': 'Эта находка приватная',
  'finding.sourcesLabel': 'Источники',
  'finding.imagesLabel': 'Изображения',
  'finding.copyLinkPrompt': 'Скопировать ссылку',
  'finding.linkCopied': 'Ссылка скопирована',
  'finding.done': 'Готово',
  'finding.cancelLabel': 'Отмена',
  'finding.videosLabel': 'Видео',
  'finding.savedFindingLabel': 'Сохранённая находка',
  'finding.newSearchLabel': 'Новый поиск',
  'finding.inboxProfileLink': 'Профиль',
  'finding.inboxLink': 'Входящие',
  'finding.backToSearch': 'Поиск',
  'finding.inboxHint': 'Находки, которые другие пользователи прислали вам из ИИ-поиска.',
  'finding.sendToFriend': 'Отправить другу',
  'finding.visibilityPublic': 'Показать в ленте',
  'finding.feedTitle': 'Лента находок',
  'finding.feedHint': 'Публичные находки пользователей Serpmonn',
  'finding.noFeed': 'Пока нет публикаций',
  'finding.byUser': '@{user}',
  'finding.inboxLoading': 'Загружаем входящие…',
  'finding.loadFailed': 'Не удалось загрузить находки',
  'finding.deleteLabel': 'Удалить находку',
  'finding.deletedToast': 'Находка удалена',
  'finding.deleteFailed': 'Не удалось удалить находку',
};

const base = JSON.parse(fs.readFileSync(baseFile, 'utf8'));
const findingKeys = Object.keys(base).filter((k) => k.startsWith('finding.'));
const locales = JSON.parse(fs.readFileSync(localesFile, 'utf8'));

for (const locale of locales) {
  const filePath = path.join(i18nDir, `${locale}.json`);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  for (const key of findingKeys) {
    if (locale === 'ru' && RU[key]) {
      data[key] = RU[key];
    } else if (!data[key]) {
      data[key] = base[key];
    }
  }
  const ordered = {};
  for (const key of Object.keys(base)) {
    if (data[key] !== undefined) ordered[key] = data[key];
  }
  for (const key of Object.keys(data)) {
    if (!ordered[key]) ordered[key] = data[key];
  }
  fs.writeFileSync(filePath, `${JSON.stringify(ordered, null, 2)}\n`);
}

console.log(`Patched finding.* keys in ${locales.length} locales (${findingKeys.length} keys)`);
