# Развёртывание МАБЛ LMS

Прежняя VM в Yandex Cloud потеряна вместе с Managed PostgreSQL и Object
Storage. Новый хостинг — **RelaxDEV**: PaaS, который сам собирает
Docker-образ из этого репозитория. Домен остаётся прежним — **course.mabl.ru**.

Два пути, выбирайте по тому, что даёт хостинг:

- **[Часть I. PaaS (RelaxDEV, Docker)](#часть-i-paas-relaxdev-docker)** —
  основной путь: платформа собирает образ по `Dockerfile`, база и диск —
  из её панели.
- **[Часть II. Своя VM](#часть-ii-своя-vm)** — запасной: голая машина с SSH,
  всё ставит `deploy/bootstrap.sh`.

Раздел «Ревизия данных» ([II.1](#1-ревизия-данных-что-можно-спасти)) и
восстановление дампа ([II.5](#5-данные)) нужны в обоих случаях.

Термины: **PaaS** (Platform as a Service, платформа как услуга) — хостинг,
который сам собирает и запускает приложение из git; **Docker-образ** —
упакованное приложение со всем окружением; **VM** (virtual machine,
виртуальная машина) — арендованный сервер; **DNS** — система, которая
превращает `course.mabl.ru` в адрес сервера.

---

# Часть I. PaaS (RelaxDEV, Docker)

Документацию RelaxDEV из нашей среды открыть не удалось, поэтому названия
пунктов ниже взяты из вкладок панели (Обзор, История деплоев, Домены, Логи,
База данных, Хранилище, Переменные), а детали — общие для PaaS. Если в
панели что-то называется иначе — ориентируйтесь на смысл шага.

**Как устроено:** один контейнер Node отдаёт и API, и фронтенд (nginx внутри
не нужен), слушает `0.0.0.0:$PORT`. Файлы пишутся в `/app/storage`, база —
PostgreSQL по `DATABASE_URL`.

## I.1. Сборка

1. Настройки сервиса → источник: репозиторий `HR-analyze/mabl_lms_v2`.
2. **Ветка:** `main` после мержа PR с `Dockerfile`; до мержа —
   `claude/site-migration-relaxdev-2oi9if`. В `main` пока нет `Dockerfile`, и
   платформа собирает образ сама — отсюда ошибка «COPY . . скопировал ничего».
3. **Root Directory:** пусто (корень репозитория) — `Dockerfile` лежит там.
4. Способ сборки, если есть выбор: **Dockerfile** (не автоопределение).
5. Порт приложения, если платформа спрашивает: `3000`. Если платформа сама
   задаёт переменную `PORT` — приложение её подхватит.

Проверка: в «Истории деплоев» сборка доходит до конца, в «Логах» строка
`[server] МАБЛ LMS слушает http://0.0.0.0:3000`.

> Если сборка падает на `FROM node:22-bookworm-slim` (Docker Hub недоступен
> или лимит запросов) — задайте аргумент сборки
> `NODE_IMAGE=mirror.gcr.io/library/node:22-bookworm-slim` или другое
> зеркало, которое доступно платформе.

## I.2. База данных

1. Вкладка **«База данных»** → создать PostgreSQL (16, если есть выбор —
   совпадает с версией прежнего кластера, важно для восстановления дампа).
2. Строка подключения должна попасть в переменную **`DATABASE_URL`**
   (платформа обычно подставляет её сама — проверьте во вкладке «Переменные»).
3. Если в логах `The server does not support SSL connections` — добавьте
   переменную `DATABASE_SSL=disable` и уберите `sslmode=require` из URL,
   если он там есть.

Восстановление дампа (если он есть, см. II.1): нужен внешний адрес базы из
панели. С локальной машины:

```bash
pg_restore --dbname="ВНЕШНИЙ_DATABASE_URL" --no-owner --no-privileges \
  --clean --if-exists --verbose mabl-backup.dump
```

Если внешнего доступа к базе платформа не даёт — спросите поддержку, как
залить дамп. Не могу подтвердить, как это устроено у RelaxDEV.

## I.3. Файлы — без этого шага они пропадут

Файловая система контейнера обычно **стирается при каждом деплое**: без
постоянного хранилища загруженные SCORM-пакеты и материалы исчезнут при
следующем обновлении. Один из двух вариантов:

- **Постоянный диск (volume)** → путь монтирования **`/app/storage`**.
  Права на него контейнер выставит сам при старте.
- **«Хранилище» как S3-совместимый бакет** → переменные `S3_BUCKET`,
  `S3_ENDPOINT`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`
  (значения — из вкладки «Хранилище»). Бакет приватный: файлы наружу отдаёт
  приложение.

Курсы из каталога `scorm-packages/` репозитория вшиты в образ и от
хранилища не зависят.

Проверка: загрузить материал в админке → сделать редеплой → материал
по-прежнему открывается.

## I.4. Переменные

Вкладка **«Переменные»** (полный список с пояснениями —
`deploy/mabl-lms.env.example`):

| Переменная | Значение |
|---|---|
| `DATABASE_URL` | из «Базы данных» |
| `AUTH_SECRET` | `openssl rand -hex 32` (или прежний, если сохранился) |
| `SETUP_SECRET` | `openssl rand -hex 24` |
| `CRON_SECRET` | `openssl rand -hex 24` |
| `SITE_URL` | `https://course.mabl.ru` — **не** `mabl.ru` |
| `ADMIN_EMAIL` | e-mail администратора |
| `YOOKASSA_SHOP_ID`, `YOOKASSA_SECRET_KEY` | ключи ЮKassa |
| `SMTP_*` + `MAIL_FROM` или `RESEND_API_KEY` | почта |
| `TELEGRAM_CHANNEL` | `mabl_academy` |
| `MAX_UPLOAD_MB` | `256` (если прокси платформы пропускает такие тела) |

`HOST`, `NODE_ENV`, `STORAGE_DIR` уже заданы в образе — не трогайте.
Секреты сохраните ещё и в менеджере паролей: в прошлый раз они пропали
вместе с машиной.

## I.5. Первый запуск

Чистая база (дампа нет) — по временному адресу, который выдала платформа:

```bash
curl -X POST "https://ВРЕМЕННЫЙ_АДРЕС/api/setup?secret=SETUP_SECRET"
```

В ответе `adminPassword` — показывается один раз, сохраните и смените после
входа. Дальше — приёмочная проверка по списку из
[II.7](#7-приёмочная-проверка-до-переключения-dns) на временном адресе.

## I.6. Домен

1. Вкладка **«Домены»** → добавить `course.mabl.ru`. Платформа покажет, какую
   запись создать (CNAME на свой адрес или A-запись на IP).
2. В DNS зоны `mabl.ru` создайте эту запись для `course`; **удалите старые
   A/AAAA `course`**, которые вели на Yandex Cloud.
3. Дождитесь, пока платформа выпустит TLS-сертификат, и проверьте
   `curl -s https://course.mabl.ru/healthz`.
4. ЮKassa: URL вебхука прежний — `https://course.mabl.ru/api/payments/webhook`;
   проведите боевой платёж на минимальную сумму.

## I.7. Новости по расписанию

systemd-таймеров на PaaS нет. Если у платформы есть планировщик (cron) —
раз в сутки:

```bash
curl -fsS -H "Authorization: Bearer $CRON_SECRET" https://course.mabl.ru/api/news/sync
```

Если нет — тот же запрос из любого внешнего cron-сервиса. Без расписания
сайт работает, новости просто не подтягиваются из Telegram сами.

## I.8. Резервные копии

Узнайте в панели/поддержке, делает ли RelaxDEV бэкапы базы и сколько их
хранит — не могу подтвердить это за них. В любом случае держите свою копию
вне платформы: раз в сутки `pg_dump` по внешнему адресу базы на другую
машину (подойдёт `deploy/backup.sh` с `DATABASE_URL` и
`BACKUP_RSYNC_TARGET`).

## I.9. Диагностика (PaaS)

| Симптом | Причина |
|---|---|
| «COPY . . скопировал ничего» / образ без исходников | сборка идёт из ветки без `Dockerfile` или Root Directory указывает не на корень |
| сборка падает на `FROM node:...` | Docker Hub недоступен — `NODE_IMAGE` с зеркала (I.1) |
| вход отвечает 503 | не задан `AUTH_SECRET` |
| `Не найдена строка подключения` в логах | нет `DATABASE_URL` |
| `The server does not support SSL connections` | `DATABASE_SSL=disable` (I.2) |
| платформа не видит приложение / 502 | порт: приложение слушает `PORT` (по умолчанию 3000) — сверьте с настройкой порта сервиса |
| файлы пропали после деплоя | нет постоянного хранилища (I.3) |
| 413 при загрузке SCORM | лимит размера запроса у прокси платформы меньше пакета |

Локальная проверка образа:

```bash
docker build -t mabl-lms .
docker run --rm -p 3000:3000 -e DATABASE_URL=... -e AUTH_SECRET=... mabl-lms
curl -s http://127.0.0.1:3000/healthz
```

---

# Часть II. Своя VM

Если вместо PaaS доступна голая машина с SSH. Почти всю установку делает
`deploy/bootstrap.sh`; ручными остаются данные, секреты внешних сервисов, DNS
и сертификат. После каждого блока указано, как убедиться, что шаг сработал.

**Архитектура:**

| Слой | Чем обслуживается |
|---|---|
| Фронтенд | статика `dist/`, раздаёт nginx |
| API | один процесс Node (Express) на `127.0.0.1:3000`, под systemd |
| База | PostgreSQL 16 на той же VM, слушает только localhost |
| Файлы | диск VM, каталог `/srv/mabl-lms/storage` |
| TLS | Let's Encrypt через certbot |
| Расписание | systemd-таймеры: новости (`mabl-news-sync`), бэкап (`mabl-backup`) |

Термины: **VM** (virtual machine, виртуальная машина) — арендованный сервер;
**systemd** — менеджер сервисов Linux, перезапускает приложение после сбоя;
**nginx** — веб-сервер перед приложением; **DNS** — система, которая
превращает `course.mabl.ru` в IP-адрес машины.

---

## 0. Что нужно приготовить заранее

1. **VM:** Ubuntu 24.04 LTS (подходят 22.04 и Debian 12),
   от 2 vCPU / 2–4 ГБ RAM, диск от 40 ГБ (SCORM-пакеты + бэкапы),
   публичный IPv4, вход по SSH-ключу.
2. **Доступ к DNS зоны `mabl.ru`** — чтобы перевести `course.mabl.ru` на новый IP.
3. **Ключи внешних сервисов:** ЮKassa (`YOOKASSA_SHOP_ID`, `YOOKASSA_SECRET_KEY`),
   почта (SMTP или Resend), канал Telegram.
4. **Данные со старого сервера, если хоть что-то уцелело** — см. раздел 1.

---

## 1. Ревизия данных: что можно спасти

Код и SCORM-пакеты из каталога `scorm-packages/` лежат в git — они вернутся
сами. Всё остальное (пользователи, заказы, прогресс, новости, материалы,
загруженные через админку файлы) жило в БД и хранилище старой машины.

Проверьте источники по порядку, прежде чем начинать с пустой базы:

| Источник | Где смотреть | Что даёт |
|---|---|---|
| Managed PostgreSQL | консоль YC → кластер `mabl-lms-db` → «Резервные копии» | восстановить копию в новый кластер и снять `pg_dump` |
| Локальные дампы | `/var/backups/mabl/*.dump` на диске старой VM (или снимке диска) | готовый дамп |
| Object Storage | бакет `mabl-lms-files` | файлы SCORM/материалов, если хранилище было S3 |
| Каталог `storage` | `/srv/mabl-lms/storage` на диске старой VM | файлы, если хранилище было на диске |
| `/etc/mabl-lms.env` | старая VM, менеджер паролей, переписка | прежний `AUTH_SECRET`, ключи ЮKassa и SMTP |

Если доступ к консоли YC вернётся хотя бы на чтение, дамп снимается так
(с любой машины, куда пустит группа безопасности кластера):

```bash
pg_dump "postgresql://mabl:ПАРОЛЬ@rc1a-xxxx.mdb.yandexcloud.net:6432/mabl?sslmode=require" \
  --format=custom --no-owner --file=mabl-backup.dump
```

**Если ничего не уцелело** — стартуем с пустой базы (раздел 5, вариант Б).
Это значит: все слушатели регистрируются заново, доступы к курсам выдаются
вручную из админки. История оплат сохранилась в личном кабинете ЮKassa —
по ней восстанавливаются оплаченные доступы.

> Прежний `AUTH_SECRET` нужен только для того, чтобы не разлогинить
> пользователей. Если он потерян — ничего страшного, генерируется новый
> (bootstrap делает это сам), все просто войдут заново.

---

## 2. Первый вход на VM и пользователь для сервиса

Сервис работает под обычным пользователем с `sudo`, не под root. Если
RelaxDEV выдал только root:

```bash
ssh root@НОВЫЙ_IP
adduser deploy
usermod -aG sudo deploy
mkdir -p /home/deploy/.ssh
cp ~/.ssh/authorized_keys /home/deploy/.ssh/
chown -R deploy:deploy /home/deploy/.ssh && chmod 700 /home/deploy/.ssh
exit
ssh deploy@НОВЫЙ_IP
```

Проверка: `sudo -v` проходит, `whoami` печатает `deploy`.

Дальше в инструкции пользователь называется `deploy`; если у вас другой —
подставьте свой.

---

## 3. Проверки сети с VM

До установки убедитесь, что машина дотягивается до всего, что нужно.
VPS-провайдеры нередко режут исходящую почту, а часть зарубежных хостов
может быть недоступна.

```bash
for u in https://github.com https://deb.nodesource.com https://apt.postgresql.org \
         https://registry.npmjs.org https://api.yookassa.ru https://t.me/s/mabl_academy \
         https://acme-v02.api.letsencrypt.org/directory; do
  printf '%-55s ' "$u"; curl -s -o /dev/null -m 10 -w '%{http_code}\n' "$u" || echo FAIL
done

# Исходящий SMTP (подставьте своего провайдера почты)
timeout 5 bash -c '</dev/tcp/smtp.yandex.ru/465' && echo "SMTP 465 открыт" || echo "SMTP 465 ЗАКРЫТ"
```

Что делать при FAIL:

| Хост | Последствие | Обход |
|---|---|---|
| github.com / npm / nodesource / PGDG | не установится | обращение в поддержку RelaxDEV |
| api.yookassa.ru | не работает оплата | обращение в поддержку RelaxDEV |
| t.me | не импортируются новости | сайт работает, новости ведутся вручную |
| SMTP закрыт | не уходят письма сброса пароля | попросить открыть порт или взять `RESEND_API_KEY` (HTTPS) |

---

## 4. Установка одним скриптом

```bash
sudo apt update && sudo apt install -y git
sudo mkdir -p /srv/mabl-lms && sudo chown "$USER:$USER" /srv/mabl-lms
git clone https://github.com/HR-analyze/mabl_lms_v2.git /srv/mabl-lms
cd /srv/mabl-lms
sudo DOMAIN=course.mabl.ru ./deploy/bootstrap.sh
```

> Пока PR с этой инструкцией не влит в `main`, добавьте ветку:
> `git clone -b claude/site-migration-relaxdev-2oi9if ...` и
> `sudo BRANCH=claude/site-migration-relaxdev-2oi9if DOMAIN=course.mabl.ru ./deploy/bootstrap.sh`.

Скрипт (подробности — в шапке `deploy/bootstrap.sh`):

1. включает swap, если RAM меньше 3 ГБ — иначе сборка падает по нехватке памяти;
2. ставит nginx, certbot, ufw, rsync, Node.js 22 и PostgreSQL 16;
3. создаёт локальную БД `mabl` и пользователя `mabl` со случайным паролем;
4. создаёт `/etc/mabl-lms.env` (chmod 600) с паролем БД и сгенерированными
   `AUTH_SECRET`, `SETUP_SECRET`, `CRON_SECRET` — **только если файла ещё нет**;
5. собирает приложение, ставит systemd-юниты, включает таймеры;
6. ставит конфиг nginx на домен `course.mabl.ru`;
7. открывает в ufw (файрвол) только SSH, 80 и 443.
   Если у RelaxDEV свой файрвол в панели — откройте там те же порты, а ufw
   можно пропустить: `SKIP_UFW=1`.

Повторный запуск безопасен: существующие env, клон и server-блок nginx не
перезаписываются.

Проверка:

```bash
curl -s http://127.0.0.1:3000/healthz                 # {"ok":true,...}
systemctl is-active mabl-lms postgresql nginx          # три раза active
systemctl list-timers 'mabl-*' --no-pager              # два таймера
```

---

## 5. Данные

### Вариант А. Есть дамп

Скопируйте дамп (и архив файлов, если есть) на VM со своей машины:

```powershell
scp mabl-backup.dump deploy@НОВЫЙ_IP:~/
scp storage.tar.gz   deploy@НОВЫЙ_IP:~/
```

Восстановление БД. Строку подключения достаём из env точечно: файл целиком
через `.` в shell не читается — значения вроде `MAIL_FROM=МАБЛ <noreply@...>`
ломают разбор.

```bash
DB_URL="$(sudo grep -m1 '^DATABASE_URL=' /etc/mabl-lms.env | cut -d= -f2-)"
sudo systemctl stop mabl-lms
pg_restore --dbname="$DB_URL" --no-owner --no-privileges --clean --if-exists \
  --verbose ~/mabl-backup.dump
sudo systemctl start mabl-lms
```

Ошибки вида `role "..." does not exist` из-за прав Managed PG безвредны —
`--no-owner --no-privileges` их и гасят. Проверка:

```bash
psql "$DB_URL" -c "\dt"
psql "$DB_URL" -c "SELECT collection, count(*) FROM content GROUP BY 1 ORDER BY 1;"
psql "$DB_URL" -c "SELECT count(*) FROM users;"
```

Ожидаем таблицы `courses`, `users`, `news`, `news_comments`, `news_reactions`,
`participants`, `orders`, `content`, `course_progress`. Недостающие таблицы
приложение создаст само при первом запросе (`ensureSchema`).

Файлы с диска старой VM:

```bash
sudo tar -C /srv/mabl-lms -xzf ~/storage.tar.gz          # распакуется в storage/
sudo chown -R deploy:deploy /srv/mabl-lms/storage
```

Файлы из бакета Object Storage — любым S3-клиентом в `storage/objects`:
ключ объекта в бакете и путь файла на диске совпадают
(`api/_storage.ts`, `diskPathFor`).

```bash
# пример с rclone, настроенным на бакет (remote yc:)
rclone copy yc:mabl-lms-files /srv/mabl-lms/storage/objects
sudo chown -R deploy:deploy /srv/mabl-lms/storage
```

Типы содержимого S3 хранит у себя, а на диске — в параллельном дереве
`storage/meta/`, которого при таком копировании не будет. Это не ломает
раздачу: тип определится по расширению. Но у файлов материалов без
расширения браузер может предложить скачивание вместо просмотра — такие
файлы проще перезалить через админку.

### Вариант Б. Чистый старт

```bash
SETUP_SECRET="$(sudo grep -m1 '^SETUP_SECRET=' /etc/mabl-lms.env | cut -d= -f2-)"
curl -s -X POST "http://127.0.0.1:3000/api/setup?secret=$SETUP_SECRET"
```

В ответе — `adminEmail` и, если `ADMIN_PASSWORD` не задан, сгенерированный
`adminPassword`. **Он показывается один раз** — сохраните. Сразу после входа
смените пароль в разделе «База данных» админки.

---

## 6. Секреты внешних сервисов

```bash
sudo nano /etc/mabl-lms.env
sudo systemctl restart mabl-lms
```

Заполните:

- `YOOKASSA_SHOP_ID`, `YOOKASSA_SECRET_KEY` — боевая оплата
- `SMTP_*` и `MAIL_FROM` **или** `RESEND_API_KEY` — письма
- `ADMIN_EMAIL` — до инициализации БД (вариант Б), если не `admin@mabl.ru`
- `BACKUP_RSYNC_TARGET` — копия бэкапов вне машины (раздел 10)
- если нашёлся прежний `AUTH_SECRET` — верните его, тогда старые сессии оживут

`SITE_URL` уже стоит `https://course.mabl.ru`. Не меняйте его на `mabl.ru`:
из него строятся ссылки сброса пароля и возврат после оплаты.

**Сохраните копию `/etc/mabl-lms.env` вне сервера** (менеджер паролей).
В прошлый раз секреты пропали вместе с машиной.

Проверка: `journalctl -u mabl-lms -n 50 --no-pager` — без ошибок; в админке
«База данных» → «Отправка писем» показывает, что почта настроена.

---

## 7. Приёмочная проверка до переключения DNS

nginx отдаёт сайт и по IP (стандартный server-блок удалён, наш стал
единственным), поэтому проверять можно в браузере по `http://НОВЫЙ_IP/`.

> Не проверяйте через подмену `course.mabl.ru` в файле hosts: браузер,
> который уже открывал сайт по HTTPS, запомнил HSTS и не пустит на
> HTTP-версию, а сертификата до переключения DNS ещё нет.

- [ ] Главная открывается, стили и шрифты на месте
- [ ] Вход администратора работает
- [ ] Программы, новости, материалы отображаются из БД
- [ ] SCORM-курс открывается и **отмечает прогресс**
- [ ] Файл материала скачивается по `/files/...`
- [ ] Загрузка нового SCORM-пакета через админку проходит до конца
- [ ] Заявка со страницы программы создаётся
- [ ] `journalctl -u mabl-lms -n 100` — без ошибок

Оплату по IP не проверяйте: ЮKassa вернёт пользователя на `SITE_URL`, то есть
на старый адрес. Её очередь — после DNS (раздел 9).

---

## 8. Переключение DNS и TLS

1. В DNS зоны `mabl.ru` снизьте TTL записи `course` до 300 секунд (если
   старая запись всё равно никуда не ведёт, ждать сутки смысла нет).
2. A-запись `course.mabl.ru` → `НОВЫЙ_IP`.
3. **Удалите AAAA-запись `course`, если она есть** и вела на IPv6 старой VM:
   иначе часть посетителей и сам Let's Encrypt пойдут по IPv6 в никуда.
4. Дождитесь распространения:
   ```bash
   dig +short course.mabl.ru A      # новый IP
   dig +short course.mabl.ru AAAA   # пусто (или IPv6 новой VM)
   ```
5. Сертификат:
   ```bash
   sudo certbot --nginx -d course.mabl.ru
   sudo systemctl status certbot.timer --no-pager    # автопродление
   ```
   certbot допишет в `/etc/nginx/sites-available/mabl-lms` блок `listen 443`
   и редирект с 80 — **этот файл после этого из репозитория не копируют**
   (см. раздел 11).
6. Проверка:
   ```bash
   curl -sI https://course.mabl.ru/ | head -1        # HTTP/2 200 или HTTP/1.1 200
   curl -s https://course.mabl.ru/healthz
   ```

---

## 9. ЮKassa

Домен не менялся, поэтому URL вебхука прежний. Убедитесь, что он на месте:
личный кабинет ЮKassa → Магазин → Интеграция → HTTP-уведомления →
`https://course.mabl.ru/api/payments/webhook`.

Проведите **боевой платёж на минимальную сумму** и проверьте, что заказ
перешёл в статус «оплачен», а после оплаты браузер вернулся на
`course.mabl.ru`.

---

## 10. Резервные копии

Managed-бэкапов больше нет — копии делает таймер `mabl-backup.timer`
(ежедневно в 03:30 МСК, скрипт `deploy/backup.sh`): дамп БД (хранится 14 дней)
и архив `storage` (3 дня) в `/var/backups/mabl`.

**Копия на той же машине от её потери не спасает.** Настройте копию наружу —
на любой другой сервер с SSH:

```bash
sudo ssh-keygen -t ed25519 -N '' -f /root/.ssh/id_ed25519   # если ключа нет
sudo cat /root/.ssh/id_ed25519.pub     # → в authorized_keys на сервере бэкапов
sudo nano /etc/mabl-lms.env            # BACKUP_RSYNC_TARGET=backup@host:/backups/mabl-lms/
```

Проверка:

```bash
sudo systemctl start mabl-backup
journalctl -u mabl-backup -n 20 --no-pager
ls -lh /var/backups/mabl
```

Дополнительно включите снимки диска в панели RelaxDEV, если они там есть.
Не могу подтвердить, что у RelaxDEV есть такая функция, — уточните у провайдера.

Раз в месяц проверяйте, что копия восстанавливается (раздел 5А на пустую БД):
непроверенный бэкап — это надежда, а не бэкап.

---

## 11. Обновление кода

```bash
cd /srv/mabl-lms && ./deploy/deploy.sh main
```

Скрипт забирает ветку, ставит зависимости, собирает и перезапускает сервис,
ждёт ответа `/healthz`, а при ошибке сборки возвращает код на прежний коммит.

Конфиг nginx разложен на два файла:

| Файл | Что внутри | Когда копировать |
|---|---|---|
| `deploy/mabl-lms-app.conf` | заголовки, маршруты, статика, SPA | при каждом изменении — безопасно |
| `deploy/nginx-mabl-lms.conf` | `listen`, `server_name`, TLS от certbot | **никогда после установки** |

```bash
sudo cp /srv/mabl-lms/deploy/mabl-lms-app.conf /etc/nginx/snippets/mabl-lms-app.conf
sudo nginx -t && sudo systemctl reload nginx
```

Если TLS-секцию всё же затёрли — сертификат цел в `/etc/letsencrypt`. Верните
`server_name course.mabl.ru;` и повторите `sudo certbot --nginx -d course.mabl.ru`,
выбрав **«Attempt to reinstall this existing certificate»**.

Изменились systemd-юниты в `deploy/` — повторите `sudo ./deploy/bootstrap.sh`:
он переустановит юниты, не трогая env и nginx.

---

## 12. Диагностика

| Симптом | Где смотреть | Обычная причина |
|---|---|---|
| 502 Bad Gateway | `journalctl -u mabl-lms -n 100` | сервис не запустился (ошибка в env) |
| «Не найдена строка подключения» | `/etc/mabl-lms.env` | пустой `DATABASE_URL` |
| `password authentication failed` | `DATABASE_URL` | пароль в env не совпадает с ролью `mabl` |
| `ECONNREFUSED 127.0.0.1:5432` | `systemctl status postgresql` | PostgreSQL не запущен |
| сборка убита, `Killed` в логе | `free -h`, `dmesg \| tail` | не хватило памяти — нужен swap |
| SCORM: «Материалы недоступны» | `journalctl -u mabl-lms` | файлы пакета не восстановлены — перезалейте через админку |
| 413 при загрузке файла | nginx `client_max_body_size`, `MAX_UPLOAD_MB` | лимит меньше размера файла |
| письма не уходят | админка → «Отправка писем» | исходящий SMTP закрыт провайдером |
| сертификат не выпускается | `dig course.mabl.ru A/AAAA` | DNS ещё не переключён или висит старый AAAA |
| сайт не открывается снаружи, локально ок | `sudo ufw status`, файрвол панели RelaxDEV | закрыты 80/443 |

Полезные команды:

```bash
sudo systemctl restart mabl-lms          # перезапуск
journalctl -u mabl-lms -f                # живые логи
journalctl -u mabl-lms --since "1 hour ago" | grep -i error
sudo tail -f /var/log/nginx/mabl-lms.error.log
df -h / && du -sh /srv/mabl-lms/storage /var/backups/mabl
```
