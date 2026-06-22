'use client'

import { useSearchParams } from 'next/navigation'
import { TimetableController } from '@/components/timetable/TimetableController'

export function TimetablePageContent() {
  const searchParams = useSearchParams()
  const stopName = searchParams.get('stopName') ?? '栄'

  return <TimetableController stopName={stopName} />
}
