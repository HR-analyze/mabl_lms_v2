import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'
import { AuthProvider } from './context/AuthContext'
import { PurchaseProvider } from './context/PurchaseContext'
import { NotificationsProvider } from './context/NotificationsContext'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <PurchaseProvider>
          <NotificationsProvider>
            <App />
          </NotificationsProvider>
        </PurchaseProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
