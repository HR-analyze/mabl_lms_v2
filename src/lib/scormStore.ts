/**
 * Клиентское «хранилище» загруженных SCORM-пакетов (демо-режим, без бэкенда).
 *
 * Пакет распаковывается в браузере, файлы кладутся в Cache Storage под путями
 * /scorm-store/<id>/<путь>, откуда их отдаёт Service Worker (см. public/scorm-sw.js).
 * Метаданные пакетов хранятся в localStorage.
 *
 * В http-режиме всё это делает бэкенд — см. src/api/scorm.ts.
 */

const CACHE = 'scorm-packages'
const META_KEY = 'mabl.scorm.packages'
const BASE = '/scorm-store'

export interface ScormPackage {
  id: string
  title: string
  /** URL точки входа: /scorm-store/<id>/<launch>. */
  launchUrl: string
  fileCount: number
  uploadedAt: string
}

const MIME: Record<string, string> = {
  html: 'text/html;charset=utf-8',
  htm: 'text/html;charset=utf-8',
  js: 'text/javascript',
  mjs: 'text/javascript',
  css: 'text/css',
  json: 'application/json',
  xml: 'application/xml',
  txt: 'text/plain;charset=utf-8',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  svg: 'image/svg+xml',
  ico: 'image/x-icon',
  cur: 'image/x-icon',
  webp: 'image/webp',
  mp4: 'video/mp4',
  webm: 'video/webm',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  woff: 'font/woff',
  woff2: 'font/woff2',
  ttf: 'font/ttf',
  otf: 'font/otf',
  eot: 'application/vnd.ms-fontobject',
}

function mimeFor(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() ?? ''
  return MIME[ext] ?? 'application/octet-stream'
}

function slugify(value: string): string {
  const base = value
    .toLowerCase()
    .replace(/[^a-z0-9а-яё]+/gi, '-')
    .replace(/^-|-$/g, '')
  return (base || 'scorm').slice(0, 40)
}

function readMeta(): ScormPackage[] {
  try {
    const raw = localStorage.getItem(META_KEY)
    return raw ? (JSON.parse(raw) as ScormPackage[]) : []
  } catch {
    return []
  }
}

function writeMeta(list: ScormPackage[]): void {
  localStorage.setItem(META_KEY, JSON.stringify(list))
}

/** Достать название и точку входа из imsmanifest.xml. */
function parseManifest(xml: string): { title?: string; launch?: string } {
  const doc = new DOMParser().parseFromString(xml, 'application/xml')
  const resources = Array.from(doc.getElementsByTagName('resource'))
  // Предпочитаем SCO; иначе первый ресурс с href.
  const sco =
    resources.find((r) => (r.getAttribute('adlcp:scormtype') || r.getAttribute('scormtype')) === 'sco') ??
    resources.find((r) => r.getAttribute('href'))
  const launch = sco?.getAttribute('href') ?? undefined

  const titleNode =
    doc.getElementsByTagName('langstring')[0] ||
    doc.getElementsByTagName('lom:langstring')[0] ||
    doc.querySelector('organization > title') ||
    doc.getElementsByTagName('title')[0]
  const title = titleNode?.textContent?.trim() || undefined

  return { title, launch }
}

export const scormStore = {
  list(): ScormPackage[] {
    return readMeta()
  },

  /** Распаковать zip, разложить файлы в кэш, вернуть метаданные пакета. */
  async upload(file: File): Promise<ScormPackage> {
    // JSZip подгружается отдельным чанком только при загрузке пакета.
    const { default: JSZip } = await import('jszip')
    const zip = await JSZip.loadAsync(file)

    // Находим манифест (обычно в корне).
    const manifestPath = Object.keys(zip.files).find((p) =>
      p.toLowerCase().endsWith('imsmanifest.xml'),
    )
    if (!manifestPath) {
      throw new Error('Это не SCORM-пакет: не найден imsmanifest.xml.')
    }
    const manifestDir = manifestPath.includes('/')
      ? manifestPath.slice(0, manifestPath.lastIndexOf('/') + 1)
      : ''

    const manifestXml = await zip.files[manifestPath].async('text')
    const { title, launch } = parseManifest(manifestXml)
    if (!launch) {
      throw new Error('В манифесте не найдена точка входа (resource href).')
    }

    const existing = new Set(readMeta().map((p) => p.id))
    let id = slugify(title ?? file.name.replace(/\.zip$/i, ''))
    if (existing.has(id)) id = `${id}-${Date.now().toString(36)}`

    const cache = await caches.open(CACHE)
    let fileCount = 0
    const entries = Object.values(zip.files).filter(
      (f) => !f.dir && f.name.startsWith(manifestDir),
    )
    for (const entry of entries) {
      const rel = entry.name.slice(manifestDir.length)
      const blob = await entry.async('blob')
      const body = new Blob([blob], { type: mimeFor(rel) })
      await cache.put(
        `${BASE}/${id}/${rel}`,
        new Response(body, { headers: { 'Content-Type': mimeFor(rel) } }),
      )
      fileCount += 1
    }

    const pkg: ScormPackage = {
      id,
      title: title || id,
      launchUrl: `${BASE}/${id}/${launch}`,
      fileCount,
      uploadedAt: new Date().toISOString(),
    }
    writeMeta([pkg, ...readMeta()])
    return pkg
  },

  async remove(id: string): Promise<void> {
    const cache = await caches.open(CACHE)
    const keys = await cache.keys()
    await Promise.all(
      keys
        .filter((req) => new URL(req.url).pathname.startsWith(`${BASE}/${id}/`))
        .map((req) => cache.delete(req)),
    )
    writeMeta(readMeta().filter((p) => p.id !== id))
  },
}
