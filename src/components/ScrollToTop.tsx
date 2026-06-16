import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/** Сброс прокрутки наверх при смене маршрута. */
export function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}
