#!/usr/bin/env bash
# Резервная копия МАБЛ LMS: дамп БД + архив файлового хранилища.
#
# Запускается таймером mabl-backup.timer (ежедневно) через mabl-backup.service,
# который подставляет переменные из /etc/mabl-lms.env. Вручную:
#   sudo systemctl start mabl-backup && journalctl -u mabl-backup -n 30
#
# Переменные (все из /etc/mabl-lms.env):
#   DATABASE_URL              — откуда снимать дамп (обязательна)
#   STORAGE_DIR               — каталог файлов (по умолчанию /srv/mabl-lms/storage)
#   BACKUP_DIR                — куда класть копии (по умолчанию /var/backups/mabl)
#   BACKUP_KEEP_DAYS          — срок хранения дампов БД, дней (14)
#   BACKUP_STORAGE_KEEP_DAYS  — срок хранения архивов файлов, дней (3)
#   BACKUP_RSYNC_TARGET       — (опц.) копия вне машины: user@host:/path/
#
# Без BACKUP_RSYNC_TARGET копии живут на том же диске, что и сайт, и пропадут
# вместе с машиной. Прошлый сервер потерялся ровно так — задайте цель.
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL не задан — запускайте через systemctl start mabl-backup}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/mabl}"
KEEP_DAYS="${BACKUP_KEEP_DAYS:-14}"
STORAGE_KEEP_DAYS="${BACKUP_STORAGE_KEEP_DAYS:-3}"
STORAGE="${STORAGE_DIR:-/srv/mabl-lms/storage}"
stamp="$(date +%F-%H%M)"

umask 077
mkdir -p "$BACKUP_DIR"

# Пишем во временный файл и переименовываем по готовности: оборванный дамп
# не должен выглядеть как свежая рабочая копия.
db_file="$BACKUP_DIR/mabl-$stamp.dump"
pg_dump "$DATABASE_URL" --format=custom --no-owner --file="$db_file.part"
mv "$db_file.part" "$db_file"
echo "БД: $db_file ($(du -h "$db_file" | cut -f1))"

if [ -d "$STORAGE" ]; then
  st_file="$BACKUP_DIR/storage-$stamp.tar.gz"
  tar -C "$(dirname "$STORAGE")" -czf "$st_file.part" "$(basename "$STORAGE")"
  mv "$st_file.part" "$st_file"
  echo "Файлы: $st_file ($(du -h "$st_file" | cut -f1))"
else
  echo "Файлы: каталога $STORAGE нет — пропускаю"
fi

find "$BACKUP_DIR" -name 'mabl-*.dump' -mtime +"$KEEP_DAYS" -delete
find "$BACKUP_DIR" -name 'storage-*.tar.gz' -mtime +"$STORAGE_KEEP_DAYS" -delete
find "$BACKUP_DIR" -name '*.part' -mmin +60 -delete

if [ -n "${BACKUP_RSYNC_TARGET:-}" ]; then
  # Без --delete: сбой или очистка локального каталога не должны стирать
  # удалённые копии. Сроком хранения там управляет удалённая сторона.
  rsync -a --partial -e "ssh -o BatchMode=yes -o StrictHostKeyChecking=accept-new" \
    "$BACKUP_DIR/" "$BACKUP_RSYNC_TARGET"
  echo "Копия вне машины: $BACKUP_RSYNC_TARGET"
else
  echo "ВНИМАНИЕ: BACKUP_RSYNC_TARGET не задан — копии только на этой машине" >&2
fi
