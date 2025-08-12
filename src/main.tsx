import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './lib/AuthProvider'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
)

// Register service worker for offline support
if ('serviceWorker' in navigator) {
  const base = import.meta.env.BASE_URL || '/habit-game/'
  const swPath = `${base}sw.js`.replace('//', '/')
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(swPath).catch(() => {})
  })
}
