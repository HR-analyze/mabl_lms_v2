# Развёртывание МАБЛ LMS на VM Yandex Cloud

Пошаговая инструкция: что нажать в консоли Yandex Cloud и какие команды выполнить
на сервере. Все команды проверяемые — после каждого блока указано, как убедиться,
что шаг сработал.

**Архитектура:**

| Слой | Чем обслуживается |
|---|---|
| Фронтенд | статика `dist/`, раздаёт nginx на VM |
| API | один процесс Node (Express) на порту 3000, под systemd |
| База | Managed Service for PostgreSQL, драйвер `pg` |
| Файлы | диск ВМ или Object Storage (S3), приватный бакет |
| Маршруты | nginx + `server/index.ts` |
| Расписание | systemd-таймер `mabl-news-sync.timer` |

Термины: **VM** (virtual machine, виртуальная машина) — арендованный сервер;
**Object Storage** — файловое хранилище, совместимое с протоколом S3;
**systemd** — стандартный менеджер сервисов Linux, следит, чтобы приложение
работало и перезапускалось после сбоя.

---

## 0. Что нужно приготовить заранее

1. Доступ к консоли Yandex Cloud с правами на создание ресурсов.
2. SSH-доступ к VM:
   ```powershell
   ssh -i "%USERPROFILE%\.ssh\ssh-key-1787832426561-hr-ai-01" user-hr@37.230.169.206
   ```
3. Домен и доступ к его DNS-записям.
4. Значения секретов приложения — список в разделе 4. Главный из них —
   `AUTH_SECRET`: его смена разлогинивает всех пользователей, поэтому при
   переустановке сервера значение переносят как есть, а не генерируют заново.

---

## 1. Managed Service for PostgreSQL

Консоль YC → **Managed Service for PostgreSQL** → «Создать кластер».

| Параметр | Значение |
|---|---|
| Имя кластера | `mabl-lms-db` |
| Версия | PostgreSQL 16 |
| Класс хоста | s3-c2-m8 (2 vCPU, 8 ГБ) или меньше — `b2.medium` для старта |
| Размер хранилища | 20 ГБ, network-ssd |
| Сеть | **та же, что у VM** (VM смотрит в подсеть с адресом 10.129.0.12) |
| Зона доступности | та же, что у VM |
| Имя БД | `mabl` |
| Пользователь | `mabl`, пароль — сгенерировать длинный |
| Публичный доступ к хосту | выключен (VM ходит по внутренней сети) |
| Резервное копирование | включено, срок 7–30 дней |

После создания: кластер → **Хосты** → скопируйте FQDN вида
`rc1a-xxxxxxxxxxxx.mdb.yandexcloud.net`. Порт — **6432**.

Разрешите VM ходить в кластер: в группе безопасности кластера должно быть
правило «входящий TCP 6432 из подсети VM» (или из группы безопасности VM).

---

## 2. Object Storage (файловое хранилище)

1. Консоль YC → **Object Storage** → «Создать бакет».
   - Имя: `mabl-lms-files` (имя глобально уникальное — при занятости добавьте суффикс).
   - Доступ на чтение объектов: **закрытый**. Наружу файлы отдаёт приложение,
     поэтому публичность не нужна.
   - Класс хранения: стандартный.
2. Консоль YC → **Сервисные аккаунты** → «Создать»:
   - Имя: `mabl-lms-storage`, роль: `storage.editor`.
3. Откройте созданный сервисный аккаунт → «Создать новый ключ» →
   **статический ключ доступа**. Сохраните `key_id` и `secret` — секрет
   показывается один раз.

---

## 3. Подготовка VM

Подключитесь к серверу и выполните:

```bash
# --- системные обновления и базовые пакеты ---
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git nginx postgresql-client-16

# --- Node.js 22 LTS ---
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
node -v && npm -v      # ожидаем v22.x и 10.x

# --- корневой сертификат Яндекса для TLS-подключения к БД ---
sudo mkdir -p /etc/ssl/certs
sudo curl -fsSL https://storage.yandexcloud.net/cloud-certs/CA.pem \
  -o /etc/ssl/certs/yandex-root.crt
sudo chmod 644 /etc/ssl/certs/yandex-root.crt
```

Проверка Node: `node -v` печатает `v22.*`.

### 3.1. Код с GitHub

```bash
sudo mkdir -p /srv/mabl-lms
sudo chown user-hr:user-hr /srv/mabl-lms
git clone https://github.com/HR-analyze/mabl_lms_v2.git /srv/mabl-lms
cd /srv/mabl-lms
git checkout main         # или ветку миграции, пока PR не влит
npm ci
```

Проверка: `ls /srv/mabl-lms/server/index.ts` — файл существует.

---

## 4. Переменные окружения

```bash
sudo cp /srv/mabl-lms/deploy/mabl-lms.env.example /etc/mabl-lms.env
sudo chmod 600 /etc/mabl-lms.env
sudo nano /etc/mabl-lms.env
```

Заполните:

- `DATABASE_URL` — `postgresql://mabl:ПАРОЛЬ@rc1a-xxxx.mdb.yandexcloud.net:6432/mabl?sslmode=verify-full`
- `DATABASE_CA_FILE=/etc/ssl/certs/yandex-root.crt`
- `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` — из шага 2
- `AUTH_SECRET` — `openssl rand -base64 48`. При переустановке сервера
  перенесите ПРЕЖНЕЕ значение: новое разлогинит всех слушателей
- `YOOKASSA_SHOP_ID`, `YOOKASSA_SECRET_KEY` — боевая оплата
- `TELEGRAM_CHANNEL` — импорт новостей
- `CRON_SECRET` — закрывает маршрут синхронизации новостей (раздел 8)
- `ADMIN_EMAIL`, `SETUP_SECRET` — стартовый администратор и инициализация БД

Проверка подключения к БД:

```bash
set -a; . /etc/mabl-lms.env; set +a
psql "$DATABASE_URL" -c "SELECT version();"
```

Должна напечататься версия PostgreSQL. Если висит без ответа — не открыт порт
6432 в группе безопасности кластера.

---

## 5. Данные: восстановление из резервной копии

Нужно, только если разворачиваете сервер заново или поднимаете базу из бэкапа
(как их снимать — раздел 12). На чистой установке пропустите: схему приложение
создаст само, а стартового администратора заведёт инициализация из раздела 6.

```bash
cd ~
# дамп скопируйте на VM, например через scp с локальной машины:
#   scp -i "%USERPROFILE%\.ssh\ssh-key-..." mabl-backup.dump user-hr@37.230.169.206:~/

set -a; . /etc/mabl-lms.env; set +a
pg_restore --dbname="$DATABASE_URL" --no-owner --no-privileges --clean --if-exists \
  --verbose mabl-backup.dump
```

Проверка — таблицы и количество строк:

```bash
psql "$DATABASE_URL" -c "\dt"
psql "$DATABASE_URL" -c "SELECT collection, count(*) FROM content GROUP BY collection ORDER BY 1;"
psql "$DATABASE_URL" -c "SELECT count(*) FROM users;"
```

Ожидаем таблицы `courses`, `users`, `news`, `news_comments`, `news_reactions`,
`participants`, `orders`, `content`, `course_progress`.

> Если в дампе не хватает какой-то таблицы (например, `course_progress` —
> она появилась позже остальных), приложение создаст её само при первом
> запросе (`ensureSchema`), отдельная миграция не нужна.

### Файловое хранилище

Файлы SCORM-пакетов и материалов по умолчанию лежат на диске VM — в каталоге
`storage` рядом с приложением (`/srv/mabl-lms/storage`) или там, куда указывает
`STORAGE_DIR`. Никаких ключей и внешних сервисов для этого не нужно, каталог
создаётся при первой загрузке.

Проверить, что сервис пишет туда, куда ожидается:

```bash
sudo -u user-hr ls -la /srv/mabl-lms/storage/objects 2>/dev/null || echo 'каталога ещё нет — ничего не загружали'
df -h /srv
```

Каталог не отслеживается git, поэтому `deploy/deploy.sh` его не трогает. При
переносе на другую машину копируйте его вместе с дампом базы:

```bash
sudo tar -C /srv/mabl-lms -czf /var/backups/mabl/storage-$(date +%F).tar.gz storage
```

Object Storage (`S3_BUCKET` и ключи) остаётся опцией — включайте, когда машин
станет больше одной. Смена бэкенда файлы не переносит: пакеты придётся залить
заново через админку.

> Если дампа нет и база создаётся с нуля — пропустите этот шаг: приложение само
> создаст схему при первом запуске (`POST /api/setup?secret=$SETUP_SECRET`).

---

## 6. Сборка и запуск сервиса

```bash
cd /srv/mabl-lms
npm run build            # собирает фронтенд (dist/) и сервер (dist-server/)

sudo cp deploy/mabl-lms.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now mabl-lms
sudo systemctl status mabl-lms --no-pager
```

Проверка:

```bash
curl -s http://127.0.0.1:3000/healthz        # {"ok":true,"uptime":...}
curl -s http://127.0.0.1:3000/api/courses | head -c 300
```

Логи в реальном времени: `journalctl -u mabl-lms -f`

---

## 7. nginx и TLS

Конфиг разложен на два файла, и это важно:

| Файл | Что внутри | Когда копировать |
|---|---|---|
| `deploy/mabl-lms-app.conf` | заголовки, маршруты, статика, SPA | при каждом обновлении — безопасно |
| `deploy/nginx-mabl-lms.conf` | `listen`, `server_name`, TLS от certbot | **один раз**, при установке |

Второй файл трогать после установки нельзя: в нём живут домен и TLS-секция,
которую дописывает certbot. Копирование его поверх рабочего конфига стирает и
то и другое — домен перестаёт совпадать, 443-й порт уходит в чужой server-блок,
и сайт открывается чужой страницей с ошибкой сертификата.

Первая установка:

```bash
sudo mkdir -p /etc/nginx/snippets
sudo cp /srv/mabl-lms/deploy/mabl-lms-app.conf /etc/nginx/snippets/mabl-lms-app.conf
sudo cp /srv/mabl-lms/deploy/nginx-mabl-lms.conf /etc/nginx/sites-available/mabl-lms
sudo nano /etc/nginx/sites-available/mabl-lms      # подставить свой домен в server_name
sudo ln -sf /etc/nginx/sites-available/mabl-lms /etc/nginx/sites-enabled/mabl-lms
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

Обновление правил раздачи в дальнейшем — только сниппет:

```bash
sudo cp /srv/mabl-lms/deploy/mabl-lms-app.conf /etc/nginx/snippets/mabl-lms-app.conf
sudo nginx -t && sudo systemctl reload nginx
```

Проверка по IP (до переключения DNS):

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://37.230.169.206/
curl -s http://37.230.169.206/healthz
```

Сертификат Let's Encrypt (после того, как домен начнёт указывать на VM):

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d course.mabl.ru
sudo systemctl status certbot.timer     # автопродление
```

> Если TLS-секцию всё же затёрли — сертификат цел, он лежит в `/etc/letsencrypt`
> и nginx его не трогает. Верните правильный `server_name` и повторите команду
> `certbot --nginx`; на вопрос о существующем сертификате выбирайте
> **«Attempt to reinstall this existing certificate»** — перевыпускать нечего,
> а второй вариант зря расходует лимит Let's Encrypt.

> Certificate Manager Яндекса здесь не подходит: он выдаёт сертификаты для
> Application Load Balancer и CDN, а не для nginx на «голой» VM.

---

## 8. Ежедневная синхронизация новостей

```bash
sudo cp /srv/mabl-lms/deploy/mabl-news-sync.service /etc/systemd/system/
sudo cp /srv/mabl-lms/deploy/mabl-news-sync.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now mabl-news-sync.timer
systemctl list-timers mabl-news-sync.timer --no-pager
```

Проверка вручную: `sudo systemctl start mabl-news-sync && journalctl -u mabl-news-sync -n 20`

> Задайте `CRON_SECRET` в `/etc/mabl-lms.env`: таймер присылает его в заголовке
> `Authorization`, и маршрут закрывается от посторонних. Без секрета запустить
> синхронизацию может кто угодно — её сдерживает только лимит частоты, а каждый
> вызов ходит в Telegram и переписывает таблицу новостей.

Отдельно убедитесь, что с VM вообще доступен Telegram:

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://t.me/s/mabl_academy
```

Если код не 200 — импорт новостей работать не будет; это ограничение сети, а не кода.

---

## 9. Приёмочная проверка перед переключением DNS

Проверяйте по IP или временному поддомену:

- [ ] Главная открывается, стили и шрифты на месте
- [ ] Вход администратора работает (прежние сессии живы, если `AUTH_SECRET` не менялся)
- [ ] Список программ, новости, материалы отображаются из БД
- [ ] SCORM-курс открывается и **отмечает прогресс** (проверка same-origin)
- [ ] Файл материала скачивается по ссылке `/files/...`
- [ ] Загрузка нового SCORM-пакета через админку проходит до конца
- [ ] Заявка со страницы программы создаётся (`POST /api/applications`)
- [ ] `journalctl -u mabl-lms -n 100` — без ошибок

---

## 10. Переключение домена и ЮKassa

1. **За сутки** снизьте TTL DNS-записи до 300 секунд.
2. Направьте A-запись домена на `37.230.169.206`.
3. Дождитесь распространения: `dig +short course.mabl.ru`
4. Выпустите TLS-сертификат (шаг 7).
5. **ЮKassa** → Личный кабинет → Магазин → Интеграция → HTTP-уведомления:
   URL вебхука — `https://course.mabl.ru/api/payments/webhook`.
6. Проведите **боевой платёж на минимальную сумму** и убедитесь, что заказ
   перешёл в статус «оплачен».

---

## 11. Обновление кода в дальнейшем

Код по-прежнему живёт на GitHub. Деплой — одна команда на сервере:

```bash
cd /srv/mabl-lms && ./deploy/deploy.sh main
```

Скрипт забирает ветку, ставит зависимости, собирает и перезапускает сервис,
после чего ждёт ответа от `/healthz`.

---

## 12. Резервные копии

**База.** Автоматические бэкапы включены на стороне Managed PostgreSQL
(кластер → «Резервные копии»). Дополнительный локальный дамп по расписанию:

```bash
sudo tee /etc/cron.daily/mabl-db-dump >/dev/null <<'SH'
#!/bin/sh
set -a; . /etc/mabl-lms.env; set +a
mkdir -p /var/backups/mabl
pg_dump "$DATABASE_URL" --format=custom \
  --file="/var/backups/mabl/mabl-$(date +%F).dump"
find /var/backups/mabl -name 'mabl-*.dump' -mtime +14 -delete
SH
sudo chmod +x /etc/cron.daily/mabl-db-dump
```

**Файлы.** Object Storage хранит данные с тройной репликацией, но от ошибочного
удаления это не спасает — включите версионирование бакета в консоли YC.

---

## 13. Диагностика

| Симптом | Где смотреть | Обычная причина |
|---|---|---|
| 502 Bad Gateway | `journalctl -u mabl-lms -n 100` | сервис не запустился (ошибка в env) |
| API отвечает «Не найдена строка подключения» | `/etc/mabl-lms.env` | пустой `DATABASE_URL` |
| Запросы к БД висят | группа безопасности кластера | закрыт порт 6432 из подсети VM |
| «Файловое хранилище не настроено» | `/etc/mabl-lms.env` | нет ключей `S3_*` |
| SCORM: «Материалы недоступны» | `journalctl -u mabl-lms` | пакет не загружен в хранилище — перезалейте его через админку |
| 413 при загрузке файла | nginx `client_max_body_size`, `MAX_UPLOAD_MB` | лимит меньше размера файла |
| Сессии слетели после переезда | `AUTH_SECRET` | секрет не совпал с прежним |

Полезные команды:

```bash
sudo systemctl restart mabl-lms          # перезапуск
journalctl -u mabl-lms -f                # живые логи
journalctl -u mabl-lms --since "1 hour ago" | grep -i error
sudo tail -f /var/log/nginx/mabl-lms.error.log
psql "$DATABASE_URL" -c "SELECT count(*) FROM content;"
```
