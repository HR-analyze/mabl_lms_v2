/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Источник данных: 'mock' (по умолчанию) или 'http'. */
  readonly VITE_API_MODE?: 'mock' | 'http'
  /** Базовый URL реального API (используется при VITE_API_MODE=http). */
  readonly VITE_API_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
