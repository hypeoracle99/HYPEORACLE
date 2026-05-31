'use client';

import { useEffect } from 'react';

export function PwaRegister() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      if (process.env.NODE_ENV === 'development') {
        // Automatically unregister active service workers in development to prevent chunk caching 404s
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          for (const registration of registrations) {
            registration.unregister().then((success) => {
              if (success) {
                console.log('[PWA] Unregistered active development Service Worker to restore dev server chunks');
              }
            });
          }
        });
      } else {
        // Register only in production
        window.addEventListener('load', () => {
          navigator.serviceWorker
            .register('/sw.js')
            .then((registration) => {
              console.log('[PWA] Service Worker registered successfully:', registration.scope);
            })
            .catch((error) => {
              console.error('[PWA] Service Worker registration failed:', error);
            });
        });
      }
    }
  }, []);

  return null;
}
