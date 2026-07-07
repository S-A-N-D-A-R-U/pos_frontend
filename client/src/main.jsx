import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { seedDatabase } from './db/seed'

// Seed database on first load
seedDatabase().then(seeded => {
  if (seeded) console.log('✅ Database seeded with demo data');
});

// PWA Service Worker Registration
if ('serviceWorker' in navigator) {
  if (import.meta.env.DEV) {
    // Unregister in dev mode to fix aggressive caching issues
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (let registration of registrations) {
        registration.unregister();
      }
    }).catch(console.error);
  } else {
    // Register PWA service worker in production
    import('virtual:pwa-register').then(({ registerSW }) => {
      registerSW({ immediate: true });
    }).catch(console.error);
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
