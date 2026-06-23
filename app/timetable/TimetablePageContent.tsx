'use client'

import { useSyncExternalStore } from 'react'
import { useSearchParams } from 'next/navigation'
import { TimetableController } from '@/components/timetable/TimetableController'
import { LAST_FROM_STOP_KEY } from '@/lib/storage-keys'

export function TimetablePageContent() {
  const searchParams = useSearchParams()
  const fromParam = searchParams.get('stopName')
  const savedStop = useSyncExternalStore(
    (callback) => {
      window.addEventListener('storage', callback)
      return () => window.removeEventListener('storage', callback)
    },
    () => localStorage.getItem(LAST_FROM_STOP_KEY),
    () => null,
  )
  const stopName = fromParam ?? savedStop ?? '栄'

  return <TimetableController stopName={stopName} />
}
