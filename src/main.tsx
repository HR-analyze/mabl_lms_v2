import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'
import { AuthProvider } from './context/AuthContext'
import { CoursesProvider } from './context/CoursesContext'
import { PurchaseProvider } from './context/PurchaseContext'
import { NotificationsProvider } from './context/NotificationsContext'

// Service Worker для проигрывания загруженных через админку SCORM-пакетов.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/scorm-sw.js').catch(() => {
      /* без воркера загруженные SCORM просто не проигрываются — не критично */
    })
  })
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <CoursesProvider>
          <PurchaseProvider>
            <NotificationsProvider>
              <App />
            </NotificationsProvider>
          </PurchaseProvider>
        </CoursesProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
