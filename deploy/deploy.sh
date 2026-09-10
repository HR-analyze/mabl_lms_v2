#!/usr/bin/env bash
# Обновление приложения на VM: забрать код с GitHub, собрать, перезапустить.
#
#   cd /srv/mabl-lms && ./deploy/deploy.sh [ветка]
#
# По умолчанию берётся ветка main.
#
# Деплой откатывается сам. Рабочая копия переключается на новую ветку ДО сборки,
# поэтому неудачная сборка раньше оставляла на диске непригодный код: сервис
# продолжал крутить прежнюю версию, но повторить деплой было нечем — если в
# выбранной ветке нет каталога deploy/, исчезал и сам этот скрипт. Теперь при
# любой ошибке рабочая копия возвращается на исходный коммит.
set -euo pipefail

BRANCH="${1:-main}"
APP_DIR="${APP_DIR:-/srv/mabl-lms}"
SERVICE="${SERVICE:-mabl-lms}"

cd "$APP_DIR"

# Куда возвращаться, если что-то пойдёт не так. Ветку запоминаем отдельно от
# коммита: на отсоединённой HEAD не окажется ни git pull, ни этого скрипта.
PREV_REF="$(git symbolic-ref --quiet --short HEAD || git rev-parse HEAD)"
PREV_COMMIT="$(git rev-parse HEAD)"
ROLLED_BACK=0

rollback() {
  local code=$?
  # Откатываем только пока сервис ещё не перезапущен: после перезапуска на
  # диске и в systemd уже новая версия, и тихий откат кода сделал бы их
  # состояния разными — это хуже честной ошибки.
  if [ "$ROLLED_BACK" = "0" ] && [ "$code" != "0" ]; then
    echo "!! Ошибка на шаге деплоя. Возвращаю рабочую копию на $PREV_REF ($PREV_COMMIT)" >&2
    git checkout --force "$PREV_REF" >/dev/null 2>&1 || git checkout --force "$PREV_COMMIT" >/dev/null 2>&1 || true
    git reset --hard "$PREV_COMMIT" >/dev/null 2>&1 || true
    echo "!! Код на диске прежний, сервис не тронут. Исправьте причину и повторите." >&2
  fi
  exit $code
}
trap rollback EXIT

echo "==> Забираю ветку $BRANCH"
git fetch origin "$BRANCH"
git checkout "$BRANCH"
git reset --hard "origin/$BRANCH"

echo "==> Устанавливаю зависимости"
npm ci

echo "==> Собираю фронтенд и сервер"
npm run build

# Дальше откат кода уже не нужен: сборка удалась, версия на диске рабочая.
ROLLED_BACK=1

echo "==> Перезапускаю сервис $SERVICE"
sudo systemctl restart "$SERVICE"

echo "==> Жду готовности"
for i in $(seq 1 30); do
  if curl -fsS "http://127.0.0.1:${PORT:-3000}/healthz" >/dev/null 2>&1; then
    echo "==> Готово: $(curl -fsS "http://127.0.0.1:${PORT:-3000}/healthz")"
    exit 0
  fi
  sleep 1
done

echo "!! Сервис не ответил за 30 секунд. Логи:" >&2
sudo journalctl -u "$SERVICE" -n 50 --no-pager >&2
exit 1
