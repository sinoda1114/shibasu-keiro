'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { TimetableController } from '@/components/timetable/TimetableController'

const LAST_FROM_STOP_KEY = 'shibasu_keiro_last_from_stop'

export function TimetablePageContent() {
  const searchParams = useSearchParams()
  const fromParam = searchParams.get('stopName')
  const [stopName, setStopName] = useState(fromParam ?? '栄')

  useEffect(() => {
    if (!fromParam) {
      const saved = localStorage.getItem(LAST_FROM_STOP_KEY)
      if (saved) setStopName(saved)
    }
  }, [fromParam])

  return <TimetableController stopName={stopName} />
}
