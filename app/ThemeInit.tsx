'use client';

import { useEffect } from 'react';

export default function ThemeInit() {
  useEffect(() => {
    // 1) Prefer a user-chosen theme if you already store one
    const stored = typeof window !== 'undefined' ? localStorage.getItem('theme') : null;
    if (stored) {
      document.documentElement.setAttribute('data-theme', stored);
      return;
    }

    // 2) Otherwise read operator default from /public/.theme (spec)
    fetch('/.theme', { cache: 'no-store' })
      .then(r => r.ok ? r.text() : null)
      .then(txt => {
        const theme = (txt || '').trim();
        if (theme === 'light' || theme === 'dark') {
          document.documentElement.setAttribute('data-theme', theme);
        }
      })
      .catch(() => { /* silent fallback to current data-theme */ });
  }, []);

  return null;
}
