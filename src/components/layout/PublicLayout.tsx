import { Outlet } from 'react-router-dom'
import { Header } from './Header'
import { Footer } from './Footer'

/** Каркас публичных страниц: шапка + контент + подвал. */
export function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-wisdom">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
