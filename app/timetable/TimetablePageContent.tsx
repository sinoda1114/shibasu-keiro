'use client'

import { useSyncExternalStore } from 'react'
import { useSearchParams } from 'next/navigation'
import { TimetableController } from '@/components/timetable/TimetableController'

const LAST_FROM_STOP_KEY = 'shibasu_keiro_last_from_stop'

export function TimetablePageContent() {
  const searchParams = useSearchParams()
  const fromParam = searchParams.get('stopName')
  const savedStop = useSyncExternalStore(
    () => () => {},
    () => localStorage.getItem(LAST_FROM_STOP_KEY),
    () => null,
  )
  const stopName = fromParam ?? savedStop ?? '栄'

  return <TimetableController stopName={stopName} />
}
