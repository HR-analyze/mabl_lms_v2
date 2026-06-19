import { Fragment } from 'react'

/** Находит URL-ы в тексте (с http/https). */
const URL_RE = /(https?:\/\/[^\s<]+)/g

/**
 * Превращает URL-ы в обычном тексте в кликабельные ссылки, сохраняя остальной
 * текст как есть. Завершающая пунктуация (точка, запятая, скобка) выносится за
 * пределы ссылки.
 */
export function Linkify({ text }: { text: string }) {
  const parts = text.split(URL_RE)
  return (
    <>
      {parts.map((part, i) => {
        // Чётные индексы — обычный текст, нечётные — захваченные URL.
        if (i % 2 === 0) return <Fragment key={i}>{part}</Fragment>
        const m = part.match(/^(.*?)([.,;:!?)\]]*)$/)
        const url = m ? m[1] : part
        const tail = m ? m[2] : ''
        return (
          <Fragment key={i}>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="break-words text-ocean underline underline-offset-2 hover:text-oceanc-80"
            >
              {url}
            </a>
            {tail}
          </Fragment>
        )
      })}
    </>
  )
}
