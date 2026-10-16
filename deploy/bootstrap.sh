#!/usr/bin/env bash
# Первичная установка МАБЛ LMS на ЧИСТУЮ VM (Ubuntu 22.04/24.04, Debian 12).
#
#   sudo DOMAIN=course.mabl.ru ./deploy/bootstrap.sh
#
# Запускать через sudo от обычного пользователя с правом sudo — под ним будет
# работать сервис и выполняться deploy/deploy.sh. От чистого root скрипт
# откажется: сервис под root и git-клон, принадлежащий root, — плохая пара.
#
# Что делает (повторный запуск безопасен — существующее не перезаписывается):
#   1. swap, если памяти меньше 3 ГБ (иначе сборка фронтенда падает по OOM);
#   2. пакеты: nginx, certbot, ufw, rsync, Node.js 22, PostgreSQL 16 (PGDG);
#   3. локальная БД mabl и пользователь mabl со случайным паролем;
#   4. /etc/mabl-lms.env из шаблона — со сгенерированными секретами,
#      ТОЛЬКО если файла ещё нет;
#   5. код в /srv/mabl-lms (если клона ещё нет), npm ci, сборка;
#   6. systemd: приложение, синхронизация новостей, ежедневный бэкап;
#   7. nginx: сниппет — всегда, server-блок — только при первой установке;
#   8. ufw: открыты только SSH, 80 и 443 (SKIP_UFW=1 — не трогать файрвол).
#
# TLS-сертификат скрипт НЕ выпускает: certbot сработает только после того, как
# DNS домена укажет на эту машину. Команда печатается в конце.
set -euo pipefail

DOMAIN="${DOMAIN:-course.mabl.ru}"
BRANCH="${BRANCH:-main}"
REPO_URL="${REPO_URL:-https://github.com/HR-analyze/mabl_lms_v2.git}"
APP_DIR="${APP_DIR:-/srv/mabl-lms}"
APP_USER="${APP_USER:-${SUDO_USER:-}}"
ENV_FILE=/etc/mabl-lms.env
DB_NAME=mabl
DB_USER=mabl
PG_VERSION=16
NODE_MAJOR=22

log()  { printf '\n==> %s\n' "$*"; }
warn() { printf '!! %s\n' "$*" >&2; }
die()  { warn "$*"; exit 1; }

[ "$(id -u)" = "0" ] || die "Запустите через sudo: sudo ./deploy/bootstrap.sh"
if [ -z "$APP_USER" ] || [ "$APP_USER" = "root" ]; then
  die "Не задан пользователь сервиса. Создайте обычного пользователя и запустите от него:
     adduser deploy && usermod -aG sudo deploy
     (скопируйте ему ~/.ssh/authorized_keys), затем войдите как deploy и: sudo ./deploy/bootstrap.sh"
fi
id "$APP_USER" >/dev/null 2>&1 || die "Пользователь $APP_USER не существует"
APP_GROUP="$(id -gn "$APP_USER")"

# Каталог с шаблонами: рядом со скриптом (запуск из клона) или из клона в APP_DIR.
SRC_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

export DEBIAN_FRONTEND=noninteractive

# ---------- 1. swap ----------
mem_mb=$(awk '/MemTotal/ {print int($2/1024)}' /proc/meminfo)
if [ "$mem_mb" -lt 3000 ] && ! swapon --show | grep -q .; then
  log "Памяти ${mem_mb} МБ и нет swap — создаю /swapfile на 2 ГБ"
  fallocate -l 2G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=2048
  chmod 600 /swapfile
  mkswap /swapfile >/dev/null
  swapon /swapfile
  grep -q '^/swapfile ' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

# ---------- 2. пакеты ----------
log "Системные пакеты"
apt-get update -y
apt-get install -y ca-certificates curl gnupg git nginx ufw rsync openssl \
  certbot python3-certbot-nginx postgresql-common

# PostgreSQL 16 из официального репозитория PGDG: та же версия, что была у
# Managed PostgreSQL, — иначе pg_restore из старого дампа может не открыть его.
if ! dpkg -s "postgresql-$PG_VERSION" >/dev/null 2>&1; then
  log "PostgreSQL $PG_VERSION (репозиторий PGDG)"
  /usr/share/postgresql-common/pgdg/apt.postgresql.org.sh -y
  apt-get install -y "postgresql-$PG_VERSION" "postgresql-client-$PG_VERSION"
fi
systemctl enable --now postgresql

if ! node -v 2>/dev/null | grep -q "^v${NODE_MAJOR}\."; then
  log "Node.js $NODE_MAJOR"
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash -
  apt-get install -y nodejs
fi
log "Node $(node -v), npm $(npm -v), $(psql --version)"

# ---------- 3–4. база и окружение ----------
pg() { sudo -u postgres psql -v ON_ERROR_STOP=1 -qtAX "$@"; }

if [ -f "$ENV_FILE" ]; then
  log "$ENV_FILE уже есть — не трогаю (секреты и пароль БД остаются прежними)"
  grep -qE '^DATABASE_URL=postgresql://[^@]+@(127\.0\.0\.1|localhost)[:/]' "$ENV_FILE" \
    || warn "DATABASE_URL в $ENV_FILE смотрит не на локальную БД — проверьте, что так и задумано"
  if ! pg -c "SELECT 1 FROM pg_roles WHERE rolname = '$DB_USER'" | grep -q 1; then
    warn "Роли $DB_USER в локальном PostgreSQL нет. Если БД локальная — удалите $ENV_FILE и запустите скрипт снова"
  fi
else
  log "Создаю БД $DB_NAME и $ENV_FILE"
  db_pass="$(openssl rand -hex 24)"
  if pg -c "SELECT 1 FROM pg_roles WHERE rolname = '$DB_USER'" | grep -q 1; then
    pg -c "ALTER ROLE $DB_USER WITH LOGIN PASSWORD '$db_pass'"
  else
    pg -c "CREATE ROLE $DB_USER WITH LOGIN PASSWORD '$db_pass'"
  fi
  pg -c "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME'" | grep -q 1 \
    || sudo -u postgres createdb -O "$DB_USER" "$DB_NAME"

  install -m 600 -o root -g root "$SRC_DIR/deploy/mabl-lms.env.example" "$ENV_FILE"
  set_env() { sed -i "s|^$1=.*|$1=$2|" "$ENV_FILE"; }
  set_env DATABASE_URL "postgresql://$DB_USER:$db_pass@127.0.0.1:5432/$DB_NAME?sslmode=disable"
  set_env AUTH_SECRET  "$(openssl rand -hex 32)"
  set_env SETUP_SECRET "$(openssl rand -hex 24)"
  set_env CRON_SECRET  "$(openssl rand -hex 24)"
  set_env SITE_URL     "https://$DOMAIN"
  NEW_ENV=1
fi

# ---------- 5. код и сборка ----------
if [ ! -d "$APP_DIR/.git" ]; then
  log "Клонирую $REPO_URL ($BRANCH) в $APP_DIR"
  install -d -o "$APP_USER" -g "$APP_GROUP" "$APP_DIR"
  sudo -u "$APP_USER" git clone --branch "$BRANCH" "$REPO_URL" "$APP_DIR"
else
  log "Клон $APP_DIR уже есть — код не обновляю (для этого deploy/deploy.sh)"
fi
install -d -o "$APP_USER" -g "$APP_GROUP" "$APP_DIR/storage"

log "Зависимости и сборка (несколько минут)"
sudo -u "$APP_USER" -H bash -c "cd '$APP_DIR' && npm ci && npm run build"

# ---------- 6. systemd ----------
log "systemd-юниты"
sed -e "s/^User=.*/User=$APP_USER/" -e "s/^Group=.*/Group=$APP_GROUP/" \
  "$APP_DIR/deploy/mabl-lms.service" > /etc/systemd/system/mabl-lms.service
install -m 644 "$APP_DIR/deploy/mabl-news-sync.service" "$APP_DIR/deploy/mabl-news-sync.timer" \
  "$APP_DIR/deploy/mabl-backup.timer" /etc/systemd/system/
sed "s|/srv/mabl-lms|$APP_DIR|g" "$APP_DIR/deploy/mabl-backup.service" \
  > /etc/systemd/system/mabl-backup.service
systemctl daemon-reload
systemctl enable mabl-lms
systemctl restart mabl-lms
systemctl enable --now mabl-news-sync.timer mabl-backup.timer

# ---------- 7. nginx ----------
log "nginx"
install -d /etc/nginx/snippets
install -m 644 "$APP_DIR/deploy/mabl-lms-app.conf" /etc/nginx/snippets/mabl-lms-app.conf
if [ ! -f /etc/nginx/sites-available/mabl-lms ]; then
  sed "s/^\(\s*server_name\s\+\).*;/\1$DOMAIN;/" "$APP_DIR/deploy/nginx-mabl-lms.conf" \
    > /etc/nginx/sites-available/mabl-lms
else
  log "server-блок /etc/nginx/sites-available/mabl-lms уже есть — не трогаю (в нём TLS от certbot)"
fi
ln -sf /etc/nginx/sites-available/mabl-lms /etc/nginx/sites-enabled/mabl-lms
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

# ---------- 8. файрвол ----------
if [ "${SKIP_UFW:-0}" != "1" ]; then
  # Порт SSH берём из реального конфига sshd: открыть 22, когда sshd слушает
  # другой порт, значит запереть себя снаружи.
  ssh_port="$(sshd -T 2>/dev/null | awk '/^port / {print $2; exit}')"
  ssh_port="${ssh_port:-22}"
  log "ufw: SSH ($ssh_port/tcp), 80, 443"
  ufw allow "$ssh_port/tcp" >/dev/null
  ufw allow 80/tcp >/dev/null
  ufw allow 443/tcp >/dev/null
  ufw --force enable >/dev/null
fi

# ---------- проверка ----------
log "Жду ответа приложения"
ok=0
for _ in $(seq 1 30); do
  if curl -fsS http://127.0.0.1:3000/healthz >/dev/null 2>&1; then ok=1; break; fi
  sleep 1
done
if [ "$ok" = "1" ]; then
  echo "healthz: $(curl -fsS http://127.0.0.1:3000/healthz)"
else
  warn "Приложение не ответило за 30 секунд. Логи:"
  journalctl -u mabl-lms -n 50 --no-pager >&2
  exit 1
fi

ip_addr="$(hostname -I | awk '{print $1}')"
cat <<EOF

==================================================================
Готово. Дальше по DEPLOY.md:

  1. Данные: восстановить дамп (раздел 5) ИЛИ инициализировать пустую БД:
       sudo grep ^SETUP_SECRET= $ENV_FILE
       curl -X POST "http://127.0.0.1:3000/api/setup?secret=<SETUP_SECRET>"
  2. Заполнить в $ENV_FILE: ЮKassa, почта, ADMIN_EMAIL/ADMIN_PASSWORD
       sudo nano $ENV_FILE && sudo systemctl restart mabl-lms
  3. Проверка до DNS:  curl -H "Host: $DOMAIN" http://$ip_addr/healthz
  4. DNS: A-запись $DOMAIN → $ip_addr
  5. TLS после DNS:    sudo certbot --nginx -d $DOMAIN
==================================================================
EOF
[ "${NEW_ENV:-0}" = "1" ] && echo "Секреты сгенерированы в $ENV_FILE (chmod 600). Сохраните копию $ENV_FILE вне сервера."
exit 0
