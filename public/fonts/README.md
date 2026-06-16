# Шрифт TT Rationalist

Фирменный шрифт МАБЛ — **TT Rationalist** (TypeType Foundry). Это
коммерческий шрифт, поэтому файлы не входят в репозиторий по
лицензионным причинам.

## Как подключить лицензионные файлы

1. Приобретите/получите лицензию TT Rationalist (web).
2. Положите файлы в эту папку (`public/fonts/`) со следующими именами:

   - `TTRationalist-Light.woff2`
   - `TTRationalist-Regular.woff2`
   - `TTRationalist-DemiBold.woff2`

3. `@font-face` уже описаны в `src/styles/fonts.css` и подхватятся
   автоматически.

Пока файлы не добавлены, сайт использует системный serif-fallback
(Georgia / Times New Roman), визуально близкий по строю к TT Rationalist,
чтобы вёрстка оставалась академичной и читаемой.
