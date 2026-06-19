import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles.css'

const SERVICE_WORKER_RELOAD_KEY = 'marketos-sw-reloaded-once'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    void registerMarketOsServiceWorker()
  })
}

async function registerMarketOsServiceWorker() {
  try {
    if (sessionStorage.getItem(SERVICE_WORKER_RELOAD_KEY) === 'done') {
      sessionStorage.removeItem(SERVICE_WORKER_RELOAD_KEY)
    }

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (sessionStorage.getItem(SERVICE_WORKER_RELOAD_KEY) === 'done') return
      sessionStorage.setItem(SERVICE_WORKER_RELOAD_KEY, 'done')
      window.location.reload()
    })

    const registration = await navigator.serviceWorker.register('/sw.js')
    await registration.update()

    if (registration.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' })
    }
  } catch {
    // The app should still work if a browser blocks service worker updates.
  }
}
