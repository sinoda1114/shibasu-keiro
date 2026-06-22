'use client'

import { useEffect } from 'react'

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // SW 登録失敗は無視（HTTPS でない環境等）
      })
    }
  }, [])

  return null
}
