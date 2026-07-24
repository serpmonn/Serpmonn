# Dev / Prod — как работать

## Карта

| | Prod | Dev |
|---|---|---|
| Код | `/var/www/serpmonn.ru` ветка `master` | `/var/www/serpmonn-dev` ветка `develop` |
| Сайт | https://serpmonn.ru | https://dev.serpmonn.ru (Basic Auth) |
| Frontend | `/var/www/serpmonn.ru/frontend` | `/var/www/serpmonn-dev/frontend` |
| API (пока) | prod PM2 `:5000` | тот же prod API |

Старая ветка `develop` (v0.91) сохранена локально как `develop-legacy-v091`.

## DNS и SSL

1. У регистратора (reg.ru) добавьте **A-запись**:
   - имя: `dev`
   - значение: `188.235.13.20`
2. Дождитесь распространения DNS.
3. Выпустите Let's Encrypt:

```bash
bash /var/www/serpmonn.ru/scripts/enable-dev-ssl.sh
```

Пока DNS не готов, на стенде самоподписанный сертификат  
(`/etc/nginx/ssl/dev.serpmonn.ru/`). Браузер предупредит — это нормально.

Логин/пароль Basic Auth (только с интернета): файл `/var/www/serpmonn-dev/.dev-auth` (не в git).
С домашней сети `192.168.0.0/24` пароль не спрашивается.

## День за днём

```bash
# работаем в develop worktree
cd /var/www/serpmonn-dev
# ... правки ...

# выкатить сборку ТОЛЬКО на dev (не трогает prod frontend)
npm run deploy:dev
# или из assembly:
# cd assembly && npm run deploy:dev

# проверить
# https://dev.serpmonn.ru/frontend/mini/miniapp.html
```

## В прод

```bash
cd /var/www/serpmonn.ru   # master
git merge develop         # или PR develop → master
npm run deploy:prod       # только с ветки master; пишет в prod frontend
```

`deploy:prod` **запрещён** из worktree `/var/www/serpmonn-dev` и с любой ветки кроме `master`/`main`.

## Переменные

- `DEPLOY_TARGET=dev|prod` — куда копирует `assembly/deploy-locales.js` и `scripts/write-news-redirects.mjs`
- либо `DEPLOY_FRONTEND=/custom/path/frontend`

## VK Mini App

URL модерации указывает на **prod**:  
`https://serpmonn.ru/frontend/mini/miniapp.html`  
Не меняйте его на `dev.serpmonn.ru`. Сначала проверяйте на dev, потом `deploy:prod`.

## Remote `github/develop`

Локальный `develop` пересоздан от `master` и расходится со старым `github/develop`.  
При первой публикации новой истории:

```bash
git push --force-with-lease origin develop
```

Только если уверены, что старый remote develop больше не нужен.
