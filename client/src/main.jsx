import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { seedDatabase } from './db/seed'

// Seed database on first load
seedDatabase().then(seeded => {
  if (seeded) console.log('✅ Database seeded with demo data');
});

// Unregister service workers in development mode to fix caching issues (503 Cache-Only)
if ('serviceWorker' in navigator && import.meta.env.DEV) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (let registration of registrations) {
      registration.unregister();
    }
  }).catch((err) => {
    console.error('Failed to unregister service worker in dev mode:', err);
  });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
