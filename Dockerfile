# Образ МАБЛ LMS для PaaS (RelaxDEV и аналоги): один процесс Node отдаёт и
# API, и собранный фронтенд — nginx внутри контейнера не нужен.
#
#   docker build -t mabl-lms .
#   docker run -p 3000:3000 --env-file .env -v mabl-storage:/app/storage mabl-lms
#
# Переменные окружения — те же, что в deploy/mabl-lms.env.example. Платформа
# обычно задаёт PORT сама; слушаем 0.0.0.0, иначе прокси платформы до
# приложения не достучится.

# Базовый образ вынесен в аргумент: если Docker Hub недоступен или упирается в
# лимит запросов, его можно взять с зеркала, например
#   --build-arg NODE_IMAGE=mirror.gcr.io/library/node:22-bookworm-slim
ARG NODE_IMAGE=node:22-bookworm-slim

# ---------- сборка ----------
FROM ${NODE_IMAGE} AS build
WORKDIR /app

# Сначала только манифесты: слой с зависимостями переиспользуется, пока
# package-lock.json не менялся.
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .
# prebuild нормализует scorm-packages/, затем собираются dist/ и dist-server/.
RUN npm run build \
 && test -f dist/index.html \
 && test -f dist-server/server/index.js

# Отдельный набор зависимостей без dev-пакетов для рантайма.
RUN npm ci --omit=dev --no-audit --no-fund

# ---------- рантайм ----------
FROM ${NODE_IMAGE}
WORKDIR /app

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000 \
    STORAGE_DIR=/app/storage

# package.json нужен рантайму: "type": "module" включает ESM для dist-server.
COPY --from=build --chown=node:node /app/package.json ./
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/dist-server ./dist-server
# Пакеты курсов из репозитория раздаются в рантайме (после prebuild-нормализации).
COPY --from=build --chown=node:node /app/scorm-packages ./scorm-packages
COPY --chmod=755 deploy/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh

RUN mkdir -p /app/storage && chown node:node /app/storage

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "dist-server/server/index.js"]
