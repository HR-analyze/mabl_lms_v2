# Шрифт TT Rationalist

Фирменный шрифт МАБЛ — **TT Rationalist** (TypeType Foundry), подключён
как self-hosted web-font. Файлы лежат здесь же:

| Начертание | Файлы | Веса CSS |
| --- | --- | --- |
| Regular | `TT_Rationalist_Regular.woff2`, `.woff` | 300–400 |
| Medium  | `TT_Rationalist_Medium.woff2`, `.woff`  | 500–700 |

`@font-face` описаны в `src/styles/fonts.css`. Стек шрифтов и токены —
в `tailwind.config.js` и `src/theme/tokens.ts`.

> Лицензия: Web-font License от TypeType (входит в исходный комплект
> шрифта). Используйте файлы только в рамках приобретённой лицензии.

Если понадобятся дополнительные начертания (Light, DemiBold, Bold) —
добавьте их `.woff2`/`.woff` сюда и опишите новые `@font-face` с нужным
`font-weight` в `src/styles/fonts.css`.
