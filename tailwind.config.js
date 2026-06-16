/** @type {import('tailwindcss').Config} */
// Design tokens мирроред из src/theme/tokens.ts.
// Палитра строго по бренд-гайду МАБЛ: Нефть, Океан, Мудрость.
// Нейтральные оттенки — производные от Нефти (третичная гармония),
// используются только для тонких линий и фоновых плоскостей.
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Основная палитра бренда
        neft: '#212128', // Нефть
        ocean: '#3552AF', // Океан
        wisdom: '#FFFFFF', // Мудрость
        // Производные нейтрали (сохраняют «температуру» бренда)
        ink: {
          DEFAULT: '#212128',
          80: '#3A3A41',
          60: '#6B6B72',
          40: '#9A9AA0',
          20: '#D7D7DB',
          10: '#ECECEE',
          5: '#F6F6F7',
        },
        oceanc: {
          DEFAULT: '#3552AF',
          80: '#4A66BC',
          60: '#7C90D0',
          20: '#E2E7F4',
          10: '#EFF2FA',
        },
      },
      fontFamily: {
        // TT Rationalist — фирменный шрифт. Bitter — близкий бесплатный fallback
        // (низкоконтрастный slab-serif с кириллицей и весами 300/400/600),
        // пока не подключены лицензионные файлы (см. public/fonts/README.md).
        serif: ['"TT Rationalist"', '"Bitter"', 'Georgia', '"Times New Roman"', 'serif'],
        sans: ['"TT Rationalist"', '"Bitter"', 'Georgia', 'serif'],
      },
      letterSpacing: {
        title: '0.22em',
        wide: '0.12em',
        mid: '0.06em',
      },
      borderRadius: {
        // Минимализм: радиусы небольшие, строгие
        token: '2px',
        card: '4px',
        lg: '8px',
      },
      maxWidth: {
        content: '1240px',
      },
      boxShadow: {
        card: '0 1px 0 0 #ECECEE',
        soft: '0 16px 48px -24px rgba(33,33,40,0.18)',
      },
      letterSpacings: {},
    },
  },
  plugins: [],
}
