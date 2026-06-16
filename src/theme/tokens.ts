/**
 * Design tokens МАБЛ — единый источник истины для бренда.
 * Значения соответствуют бренд-гайду MABL_GUIDE.pdf и продублированы
 * в tailwind.config.js. Импортируйте отсюда, если нужны токены в JS/TS
 * (например, для inline-стилей, canvas, графиков).
 */

export const colors = {
  /** Нефть — основной тёмный цвет бренда */
  neft: '#212128',
  /** Океан — основной акцентный синий */
  ocean: '#3552AF',
  /** Мудрость — белый, эталонная среда логотипа */
  wisdom: '#FFFFFF',

  // Производные нейтрали (третичная гармония, «температура» бренда)
  ink80: '#3A3A41',
  ink60: '#6B6B72',
  ink40: '#9A9AA0',
  ink20: '#D7D7DB',
  ink10: '#ECECEE',
  ink05: '#F6F6F7',
  oceanSoft: '#E2E7F4',
} as const

export const typography = {
  /** Фирменный шрифт TT Rationalist (self-hosted) + системный fallback */
  fontFamily: '"TT Rationalist", Georgia, "Times New Roman", serif',
  weight: {
    light: 300,
    regular: 400,
    demibold: 600,
  },
  /** Трекинг для крупных заголовков с разрядкой */
  letterSpacing: {
    title: '0.22em',
    wide: '0.12em',
    mid: '0.06em',
    normal: '0',
  },
  scale: {
    display: '3.25rem',
    h1: '2.5rem',
    h2: '1.875rem',
    h3: '1.375rem',
    body: '1rem',
    small: '0.875rem',
    caption: '0.75rem',
  },
} as const

export const spacing = {
  xs: '0.5rem',
  sm: '0.75rem',
  md: '1rem',
  lg: '1.5rem',
  xl: '2.5rem',
  '2xl': '4rem',
  '3xl': '6rem',
  page: '1240px',
} as const

export const radius = {
  token: '2px',
  card: '4px',
  lg: '8px',
  pill: '999px',
} as const

export const brand = { colors, typography, spacing, radius } as const
export default brand
