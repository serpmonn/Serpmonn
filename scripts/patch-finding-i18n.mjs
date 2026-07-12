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
  'finding.visibilityPrivateShort': 'Только я',
  'finding.noFindingsFilter': 'Нет находок с выбранным фильтром',
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
  'finding.inboxTitle': 'Сообщения',
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
  'finding.inboxLink': 'Сообщения',
  'finding.backToSearch': 'Поиск',
  'finding.inboxHint': 'Находки, которые вы отправили и получили от других пользователей.',
  'finding.sendToFriend': 'Отправить другу',
  'finding.shareMenuTitle': 'Поделиться',
  'finding.visibilityPublic': 'Показать в ленте',
  'finding.feedTitle': 'Лента находок',
  'finding.feedHint': 'Публичные находки пользователей Serpmonn',
  'finding.noFeed': 'Пока нет публикаций',
  'finding.byUser': '@{user}',
  'finding.inboxLoading': 'Загружаем сообщения…',
  'finding.loadFailed': 'Не удалось загрузить находки',
  'finding.deleteLabel': 'Удалить находку',
  'finding.deleteConfirm': 'Удалить находку «{query}»? Это действие нельзя отменить.',
  'finding.deletedToast': 'Находка удалена',
  'finding.deleteFailed': 'Не удалось удалить находку',
  'finding.saveToProfile': 'Сохранить в профиль',
  'finding.publishToFeed': 'Опубликовать в ленте',
  'finding.saveToProfileHint': 'Видно только вам',
  'finding.publishToFeedHint': 'Видно всем в ленте',
  'finding.sendToFriendHint': 'Отправить во входящие пользователю',
  'finding.saveHint': 'В профиль — только вы. В ленте — для всех. Другие варианты видимости — в профиле.',
  'finding.publishedToast': 'Опубликовано в ленте',
  'finding.privacyTitle': 'Приватность находок',
  'finding.privacyHint': 'Находки в профиле видите только вы. Опубликованные — в общей ленте. Видимость можно изменить у каждой находки ниже.',
  'finding.replyToSender': 'Ответить отправителю',
  'finding.replySend': 'Отправить ответ',
  'finding.replySent': 'Ответ отправлен @{username}',
  'finding.detailsLabel': 'Подробнее',
  'finding.visibilityPublicShort': 'В ленте',
  'finding.makePrivate': 'Сделать приватной',
  'finding.makePrivateConfirm': 'Сделать находку «{query}» приватной? Она исчезнет из общей ленты.',
  'finding.publishConfirm': 'Опубликовать находку «{query}» в ленте? Её смогут видеть все.',
  'finding.madePrivateToast': 'Находка скрыта из ленты',
  'finding.visibilityFailed': 'Не удалось изменить видимость',
  'finding.feedTabAll': 'Все',
  'finding.feedTabFollowing': 'Подписки',
  'finding.feedHintFollowing': 'Публичные находки и посты «для подписчиков» от тех, на кого вы подписаны.',
  'finding.feedSearchPlaceholder': 'Поиск по находкам…',
  'finding.likeLabel': 'Нравится ({count}) · {comments} комм.',
  'finding.unlikeLabel': 'Убрать лайк ({count}) · {comments} комм.',
  'finding.likeAction': 'Лайкнуть',
  'finding.unlikeAction': 'Убрать лайк',
  'finding.viewsLabel': 'Просмотры',
  'finding.commentsTitle': 'Комментарии',
  'finding.commentPlaceholder': 'Написать комментарий…',
  'finding.commentSend': 'Отправить',
  'finding.commentFailed': 'Не удалось отправить комментарий',
  'finding.noComments': 'Комментариев пока нет',
  'finding.followUser': 'Подписаться',
  'finding.authorFollowersLabel': '{count} подписчиков',
  'finding.unfollowUser': 'Отписаться',
  'finding.followingToast': 'Вы подписались на пользователя',
  'finding.unfollowedToast': 'Подписка отменена',
  'finding.saveToMine': 'Сохранить себе',
  'finding.savedToMineShort': 'Сохранено',
  'finding.savedToMineToast': 'Добавлено в ваши находки',
  'finding.alreadySavedToast': 'Уже есть в ваших находках',
  'finding.saveToMineFailed': 'Не удалось сохранить',
  'finding.alreadyOwner': 'Это уже ваша находка',
  'finding.publishToFollowers': 'Для подписчиков',
  'finding.followersToast': 'Видно вашим подписчикам',
  'finding.followersConfirm': 'Показать находку «{query}» только подписчикам?',
  'finding.visibilityFollowersShort': 'Подписч.',
  'finding.changeVisibility': 'Изменить видимость',
  'finding.notificationsTitle': 'Уведомления',
  'finding.noNotifications': 'Уведомлений пока нет',
  'finding.notificationNewFinding': '@{user} опубликовал «{query}»',
  'finding.notificationComment': '@{user} прокомментировал «{query}»',
  'finding.authorFindingsTitle': 'Находки @{user}',
  'finding.noAuthorFindings': 'Публичных находок пока нет',
  'finding.loadMore': 'Загрузить ещё',
  'finding.loginForFollowing': 'Войдите, чтобы видеть находки подписок',
  'finding.inboxBack': 'Назад',
  'finding.inboxDialogCount': '{count} сообщ.',
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
    } else {
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
